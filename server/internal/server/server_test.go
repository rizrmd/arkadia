package server

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/rizrmd/arkadia/server/internal/room"
	"github.com/rizrmd/arkadia/server/internal/sim"
)

func newTestServer(t *testing.T) (*httptest.Server, *room.Registry) {
	t.Helper()
	nav, err := sim.LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	site := t.TempDir()
	os.WriteFile(filepath.Join(site, "index.html"), []byte("<!doctype html>index"), 0o644)
	os.MkdirAll(filepath.Join(site, "assets"), 0o755)
	os.WriteFile(filepath.Join(site, "assets", "index-abc123.js"), []byte("console.log(1)"), 0o644)
	reg := room.NewRegistry(nav, time.Minute, 10)
	s := &Server{Rooms: reg, Site: site, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(ts.Close)
	return ts, reg
}

type conn struct {
	t *testing.T
	c *websocket.Conn
}

func dial(t *testing.T, ts *httptest.Server, hello map[string]any) (*conn, map[string]any) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(ts.URL, "http")+"/ws", nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.CloseNow() })
	k := &conn{t, c}
	k.send(hello)
	return k, k.read()
}

func (k *conn) send(m map[string]any) {
	b, _ := json.Marshal(m)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := k.c.Write(ctx, websocket.MessageText, b); err != nil {
		k.t.Fatal(err)
	}
}

func (k *conn) read() map[string]any {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, b, err := k.c.Read(ctx)
	if err != nil {
		k.t.Fatal(err)
	}
	var m map[string]any
	json.Unmarshal(b, &m)
	return m
}

// snapshot reads until a snapshot at or after the tick.
func (k *conn) snapshot(tick float64) map[string]any {
	for {
		if m := k.read(); m["t"] == "s" && m["tick"].(float64) >= tick {
			return m
		}
	}
}

func hello(name, code string) map[string]any {
	return map[string]any{"t": "hello", "v": room.Version, "name": name, "room": code, "maxHp": 100}
}

func TestTwoPlayersShareOneServerOwnedWorld(t *testing.T) {
	ts, _ := newTestServer(t)
	a, wa := dial(t, ts, hello("Ayu", ""))
	if wa["t"] != "welcome" || len(wa["room"].(string)) != 5 {
		t.Fatalf("welcome %v", wa)
	}
	code := wa["room"].(string)
	b, wb := dial(t, ts, hello("  Bima\t the   Bold ", strings.ToLower(code)))
	if wb["t"] != "welcome" || wb["room"] != code || wb["you"] == wa["you"] {
		t.Fatalf("second welcome %v", wb)
	}
	// Both walk for two seconds; then both see the same tick with the same revenant ids and hit points.
	for i := 1; i <= 40; i++ {
		a.send(map[string]any{"t": "in", "seq": i, "x": 0, "y": 1})
		b.send(map[string]any{"t": "in", "seq": i, "x": 0.89, "y": -0.45})
		time.Sleep(50 * time.Millisecond)
	}
	sa := a.snapshot(45)
	sb := b.snapshot(sa["tick"].(float64))
	for sb["tick"].(float64) > sa["tick"].(float64) {
		sa = a.snapshot(sb["tick"].(float64))
	}
	if !reflect.DeepEqual(sa["enemies"], sb["enemies"]) || !reflect.DeepEqual(sa["players"], sb["players"]) {
		t.Fatalf("clients disagree at tick %v", sa["tick"])
	}
	if len(sa["enemies"].([]any)) == 0 {
		t.Fatal("no revenants spawned")
	}
	players := sa["players"].([]any)
	if len(players) != 2 || players[1].(map[string]any)["name"] != "Bima the Bold" {
		t.Fatalf("players %v", players)
	}
	// Every input is applied exactly once and acknowledged.
	for _, k := range []*conn{a, b} {
		m := k.snapshot(0)
		for i := 0; i < 100 && m["ack"].(float64) < 40; i++ {
			m = k.snapshot(0)
		}
		if m["ack"] != 40.0 {
			t.Fatalf("ack %v after 40 inputs", m["ack"])
		}
	}
}

func TestRoomsRefuseBadHellosAndAFifthPlayer(t *testing.T) {
	ts, _ := newTestServer(t)
	if _, m := dial(t, ts, hello("X", "ZZZZZ")); m["code"] != room.ErrRoomNotFound {
		t.Fatalf("unknown room: %v", m)
	}
	if _, m := dial(t, ts, hello("   ", "")); m["code"] != room.ErrBadName {
		t.Fatalf("blank name: %v", m)
	}
	if _, m := dial(t, ts, map[string]any{"t": "hello", "v": 99, "name": "X"}); m["code"] != room.ErrBadVersion {
		t.Fatalf("version: %v", m)
	}
	_, w := dial(t, ts, hello("One", ""))
	code := w["room"].(string)
	for _, n := range []string{"Two", "Three", "Four"} {
		if _, m := dial(t, ts, hello(n, code)); m["t"] != "welcome" {
			t.Fatalf("%s refused: %v", n, m)
		}
	}
	if _, m := dial(t, ts, hello("Five", code)); m["code"] != room.ErrRoomFull {
		t.Fatalf("fifth player: %v", m)
	}
}

func TestAnEmptyRoomPausesAndResumes(t *testing.T) {
	ts, reg := newTestServer(t)
	a, w := dial(t, ts, hello("Solo", ""))
	code := w["room"].(string)
	a.snapshot(10)
	a.c.Close(websocket.StatusNormalClosure, "")
	time.Sleep(200 * time.Millisecond)
	rm := reg.Get(code)
	info := rm.Info()
	if info.Players != 0 {
		t.Fatalf("players after leaving: %d", info.Players)
	}
	time.Sleep(300 * time.Millisecond)
	if rm.Info().Tick != info.Tick {
		t.Fatalf("empty room kept ticking: %d -> %d", info.Tick, rm.Info().Tick)
	}
	// The invite still works, and the world resumes where it paused.
	b, wb := dial(t, ts, hello("Back", code))
	if wb["t"] != "welcome" || wb["state"].(map[string]any)["tick"].(float64) != float64(info.Tick) {
		t.Fatalf("rejoin %v", wb)
	}
	b.snapshot(float64(info.Tick) + 5)
	res, _ := http.Get(ts.URL + "/api/rooms/" + strings.ToLower(code))
	var got room.Info
	json.NewDecoder(res.Body).Decode(&got)
	if res.StatusCode != 200 || got.Players != 1 || got.Max != 4 {
		t.Fatalf("room info %d %+v", res.StatusCode, got)
	}
}

func TestStaticSiteKeepsSinglePageRoutes(t *testing.T) {
	ts, _ := newTestServer(t)
	noRedirect := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, _ := noRedirect.Get(ts.URL + "/stronghold.html?time=0.5")
	if res.StatusCode != 302 || res.Header.Get("Location") != "/?time=0.5" {
		t.Fatalf("retired page: %d %s", res.StatusCode, res.Header.Get("Location"))
	}
	for _, p := range []string{"/", "/some/deep/path", "/?room=ABCDE"} {
		res, _ := http.Get(ts.URL + p)
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 || !strings.Contains(string(body), "index") {
			t.Fatalf("%s: %d %q", p, res.StatusCode, body)
		}
	}
	res, _ = http.Get(ts.URL + "/assets/index-abc123.js")
	if !strings.Contains(res.Header.Get("Cache-Control"), "immutable") {
		t.Fatalf("hashed asset cache: %q", res.Header.Get("Cache-Control"))
	}
	if res, _ := http.Get(ts.URL + "/missing.png"); res.StatusCode != 404 {
		t.Fatalf("missing file: %d", res.StatusCode)
	}
	if res, _ := http.Get(ts.URL + "/..%2f..%2fetc/passwd.txt"); res.StatusCode == 200 {
		t.Fatal("path traversal served a file")
	}
}

// heroes maps each player's name to the hero the snapshot carries.
func heroes(s map[string]any) map[string]any {
	out := map[string]any{}
	for _, p := range s["players"].([]any) {
		out[p.(map[string]any)["name"].(string)] = p.(map[string]any)["h"]
	}
	return out
}

func TestEveryPlayerSeesEachOthersHeroPick(t *testing.T) {
	ts, _ := newTestServer(t)
	ember := hello("Ayu", "")
	ember["hero"] = "ember-warden"
	a, wa := dial(t, ts, ember)
	if got := heroes(wa["state"].(map[string]any)); got["Ayu"] != "ember-warden" {
		t.Fatalf("welcome heroes %v", got)
	}
	// A client from before hero picks sends none and plays the default; an unknown hero changes nothing.
	b, _ := dial(t, ts, hello("Bima", wa["room"].(string)))
	b.send(map[string]any{"t": "hero", "h": "knight-of-nothing"})
	s := a.snapshot(0)
	for len(s["players"].([]any)) < 2 {
		s = a.snapshot(0)
	}
	if got := heroes(s); got["Ayu"] != "ember-warden" || got["Bima"] != "rift-runner" {
		t.Fatalf("heroes after join %v", got)
	}
	a.send(map[string]any{"t": "hero", "h": "rift-runner"})
	b.send(map[string]any{"t": "hero", "h": "ember-warden"})
	tick := s["tick"].(float64) + 4
	if got := heroes(b.snapshot(tick)); got["Ayu"] != "rift-runner" || got["Bima"] != "ember-warden" {
		t.Fatalf("heroes after picks %v", got)
	}
}
