// Package server is the one deployable: the built Vite client (single-page routes as in server.mjs), the co-op
// WebSocket at /ws and a small room API, all on one port.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"math"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/rizrmd/arkadia/server/internal/room"
	"github.com/rizrmd/arkadia/server/internal/sim"
)

// BuildCommit is supplied by the supported release build for public verification.
var BuildCommit = "development"

// Server routes HTTP requests.
type Server struct {
	Rooms        *room.Registry
	Site         string // directory of the built client
	CacheDir     string // directory for cached lossless WebP conversions (defaults to <Site>/.webp-cache)
	Log          *slog.Logger
	webpLocks    sync.Map
	tracelogOnce sync.Map
}

// Handler returns the HTTP routes.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /ws", s.ws)
	mux.HandleFunc("GET /api/rooms/{code}", s.roomInfo)
	mux.HandleFunc("POST /api/tracelogs", s.postTracelog)
	mux.HandleFunc("GET /api/tracelogs", s.listTracelogs)
	mux.HandleFunc("GET /api/tracelogs/{id}", s.getTracelog)
	mux.HandleFunc("GET /asset-sizes.json", s.serveAssetSizes)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "rooms": s.Rooms.Count(), "protocol": room.Version, "build": BuildCommit, "movementBoundary": sim.TerrainBoundaryVersion})
	})
	mux.HandleFunc("/", s.static)
	return mux
}

func (s *Server) roomInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	rm := s.Rooms.Get(r.PathValue("code"))
	if rm == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": room.ErrRoomNotFound})
		return
	}
	json.NewEncoder(w).Encode(rm.Info())
}

// One page: directory and extensionless paths serve index.html (the SPA router picks the view); retired .html
// pages, including /stronghold.html, redirect to / with their query. Hashed build assets are immutable.
func (s *Server) static(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if strings.HasSuffix(p, ".html") && p != "/index.html" {
		http.Redirect(w, r, "/"+query(r), http.StatusFound)
		return
	}
	if strings.HasSuffix(p, "/") || path.Ext(p) == "" {
		p = "/index.html"
	}
	file := filepath.Join(s.Site, filepath.FromSlash(path.Clean(p)))
	if !strings.HasPrefix(file, filepath.Clean(s.Site)+string(filepath.Separator)) {
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	f, err := os.Open(file)
	if err != nil {
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil || st.IsDir() {
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if strings.EqualFold(path.Ext(p), ".png") && s.servePNGAsWebP(w, r, p, file, st) {
		return
	}
	if strings.HasPrefix(p, "/assets/") && strings.Contains(path.Base(p), "-") && (path.Ext(p) == ".js" || path.Ext(p) == ".css") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	http.ServeContent(w, r, st.Name(), st.ModTime(), f)
}

func query(r *http.Request) string {
	if r.URL.RawQuery == "" {
		return ""
	}
	return "?" + r.URL.RawQuery
}

// Client messages. Hello must come first; then inputs at the tick rate, occasional pings and a hero message
// whenever the player picks another hero.
type clientMsg struct {
	T      string                  `json:"t"`
	V      int                     `json:"v"`
	Name   string                  `json:"name"`
	Room   string                  `json:"room"`
	You    string                  `json:"you"`
	MaxHP  float64                 `json:"maxHp"`
	Hero   string                  `json:"hero"` // hello: the picked hero (clients before heroes send none)
	H      string                  `json:"h"`    // hero: a new pick
	Dash   *struct{ U, V float64 } `json:"dash"`
	Seq    uint32                  `json:"seq"`
	X      float64                 `json:"x"`
	Y      float64                 `json:"y"`
	Choice string                  `json:"choice"`
	Level  int                     `json:"level"`
	A      []string                `json:"a"` // actions; none are defined yet (auto attack is server-side)
	C      float64                 `json:"c"` // client clock echoed in pong
}

type errorMsg struct {
	T       string `json:"t"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

var errorText = map[string]string{
	room.ErrRoomFull:     "This room already has four players.",
	room.ErrRoomNotFound: "No room with that code. Check the code or create a new room.",
	room.ErrBadName:      "Enter a name of 1 to 16 characters.",
	room.ErrBadVersion:   "This game version is out of date. Reload the page.",
	room.ErrBadHello:     "Unexpected first message.",
	room.ErrServerFull:   "The server has no free rooms right now. Try again soon.",
}

func (s *Server) ws(w http.ResponseWriter, r *http.Request) {
	// Any origin: guests open invite links from many hosts (and the Vite dev server runs on its own port).
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	defer c.CloseNow()
	c.SetReadLimit(4096)
	ctx := r.Context()
	fail := func(code string) {
		msg, _ := json.Marshal(errorMsg{T: "error", Code: code, Message: errorText[code]})
		wctx, cancel := context.WithTimeout(ctx, 3*time.Second)
		defer cancel()
		c.Write(wctx, websocket.MessageText, msg)
		c.Close(websocket.StatusPolicyViolation, code)
	}

	hctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	_, data, err := c.Read(hctx)
	cancel()
	if err != nil {
		return
	}
	var hello clientMsg
	if json.Unmarshal(data, &hello) != nil || hello.T != "hello" {
		fail(room.ErrBadHello)
		return
	}
	if hello.V != room.Version {
		fail(room.ErrBadVersion)
		return
	}
	name, ok := room.CleanName(hello.Name)
	if !ok {
		fail(room.ErrBadName)
		return
	}
	var rm *room.Room
	if strings.TrimSpace(hello.Room) == "" {
		if rm, ok = s.Rooms.Create(); !ok {
			fail(room.ErrServerFull)
			return
		}
	} else if rm = s.Rooms.Get(hello.Room); rm == nil {
		fail(room.ErrRoomNotFound)
		return
	}
	client := room.NewClient()
	hero, _ := room.CleanHero(hello.Hero)
	if code := rm.Join(client, name, hero, hello.MaxHP, hello.You); code != "" {
		fail(code)
		return
	}
	s.Log.Info("join", "room", rm.Code, "name", name, "players", rm.Info().Players)
	defer s.Log.Info("leave", "room", rm.Code, "name", name)

	// Writer: the room closes Send on leave; a write that stalls for 5 s drops the connection.
	done := make(chan struct{})
	go func() {
		defer close(done)
		for msg := range client.Send {
			wctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err := c.Write(wctx, websocket.MessageText, msg)
			cancel()
			if err != nil {
				c.CloseNow()
				for range client.Send {
				}
				return
			}
		}
		c.CloseNow()
	}()
	defer func() { rm.Leave(client); <-done }()

	// Reader: inputs and pings. A client sends 20 inputs and about one ping per second; one flooding past 200
	// messages in a second is cut off, and one silent for 30 s is gone.
	window, count := time.Now(), 0
	for {
		rctx, cancel := context.WithTimeout(ctx, 30*time.Second)
		_, data, err := c.Read(rctx)
		cancel()
		if err != nil {
			if !errors.Is(err, context.Canceled) && websocket.CloseStatus(err) == -1 {
				s.Log.Debug("read", "room", rm.Code, "err", err)
			}
			return
		}
		if now := time.Now(); now.Sub(window) > time.Second {
			window, count = now, 0
		}
		if count++; count > 200 {
			c.Close(websocket.StatusPolicyViolation, "too many messages")
			return
		}
		var m clientMsg
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		switch m.T {
		case "in":
			if !math.IsNaN(m.X) && !math.IsNaN(m.Y) {
				in := sim.Input{Seq: m.Seq, X: m.X, Y: m.Y, Choice: m.Choice, Level: m.Level}
				if m.Dash != nil {
					in.Dash = true
					in.DashU = m.Dash.U
					in.DashV = m.Dash.V
				}
				rm.Input(client, in)
			}
		case "hero":
			if hero, ok := room.CleanHero(m.H); ok {
				rm.SetHero(client, hero)
			}
		case "ping":
			msg, _ := json.Marshal(map[string]any{"t": "pong", "c": m.C, "tick": rm.Info().Tick})
			select {
			case client.Send <- msg:
			default:
			}
		}
	}
}
