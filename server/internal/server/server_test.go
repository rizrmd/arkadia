package server

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
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
	"golang.org/x/image/webp"
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

func TestAutomaticPNGToWebPLosslessConversionAndCache(t *testing.T) {
	nav, err := sim.LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	site := t.TempDir()
	cacheDir := t.TempDir()

	// Create a synthetic 64x64 NRGBA PNG with both opaque and dirty-transparent pixels.
	srcImg := image.NewNRGBA(image.Rect(0, 0, 64, 64))
	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			if (x+y)%3 == 0 {
				// Transparent pixel with non-zero RGB noise
				srcImg.SetNRGBA(x, y, color.NRGBA{R: 123, G: 45, B: 67, A: 0})
			} else {
				srcImg.SetNRGBA(x, y, color.NRGBA{R: uint8(x * 3), G: uint8(y * 3), B: 180, A: 255})
			}
		}
	}
	pngDir := filepath.Join(site, "modular-stronghold", "v2")
	if err := os.MkdirAll(pngDir, 0o755); err != nil {
		t.Fatal(err)
	}
	pngPath := filepath.Join(pngDir, "bastion.png")
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, srcImg); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pngPath, pngBuf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
	// Write initial asset-sizes.json with the raw PNG byte size.
	initialSizes, _ := json.Marshal(map[string]int{"/modular-stronghold/v2/bastion.png": pngBuf.Len()})
	if err := os.WriteFile(filepath.Join(site, "asset-sizes.json"), initialSizes, 0o644); err != nil {
		t.Fatal(err)
	}

	reg := room.NewRegistry(nav, time.Minute, 10)
	s := &Server{Rooms: reg, Site: site, CacheDir: cacheDir, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(ts.Close)

	// 1. First request converts PNG -> lossless WebP (MISS) and caches on disk.
	res1, err := http.Get(ts.URL + "/modular-stronghold/v2/bastion.png")
	if err != nil {
		t.Fatal(err)
	}
	webpBytes1, _ := io.ReadAll(res1.Body)
	res1.Body.Close()
	if res1.StatusCode != 200 || res1.Header.Get("Content-Type") != "image/webp" {
		t.Fatalf("status=%d content-type=%q", res1.StatusCode, res1.Header.Get("Content-Type"))
	}
	if res1.Header.Get("X-Asset-Cache") != "MISS" {
		t.Fatalf("expected MISS on first request, got %q", res1.Header.Get("X-Asset-Cache"))
	}

	// Verify decoded WebP is 100% visually/mathematically lossless for all visible pixels
	// and has cleaned RGB=(0,0,0) on alpha=0 pixels.
	decImg, err := webp.Decode(bytes.NewReader(webpBytes1))
	if err != nil {
		t.Fatalf("webp decode failed: %v", err)
	}
	decNRGBA := cleanTransparentNRGBA(decImg)
	expectedNRGBA := cleanTransparentNRGBA(srcImg)
	if !bytes.Equal(decNRGBA.Pix, expectedNRGBA.Pix) {
		t.Fatal("decoded WebP pixels differ from lossless source PNG")
	}

	// 2. Second request serves directly from disk cache (HIT).
	res2, err := http.Get(ts.URL + "/modular-stronghold/v2/bastion.png")
	if err != nil {
		t.Fatal(err)
	}
	webpBytes2, _ := io.ReadAll(res2.Body)
	res2.Body.Close()
	if res2.Header.Get("X-Asset-Cache") != "HIT" || !bytes.Equal(webpBytes1, webpBytes2) {
		t.Fatalf("expected cache HIT with identical bytes, got %q", res2.Header.Get("X-Asset-Cache"))
	}

	// 3. /asset-sizes.json reports the cached WebP byte size instead of the raw PNG size.
	resSizes, err := http.Get(ts.URL + "/asset-sizes.json")
	if err != nil {
		t.Fatal(err)
	}
	var gotSizes map[string]int
	json.NewDecoder(resSizes.Body).Decode(&gotSizes)
	resSizes.Body.Close()
	if gotSizes["/modular-stronghold/v2/bastion.png"] != len(webpBytes1) {
		t.Fatalf("asset-sizes.json reported %d, want cached WebP size %d", gotSizes["/modular-stronghold/v2/bastion.png"], len(webpBytes1))
	}

	// 4. Explicit ?format=png serves the original PNG untouched.
	resPNG, err := http.Get(ts.URL + "/modular-stronghold/v2/bastion.png?format=png")
	if err != nil {
		t.Fatal(err)
	}
	rawBody, _ := io.ReadAll(resPNG.Body)
	resPNG.Body.Close()
	if resPNG.Header.Get("Content-Type") != "image/png" || !bytes.Equal(rawBody, pngBuf.Bytes()) {
		t.Fatalf("?format=png returned content-type=%q len=%d", resPNG.Header.Get("Content-Type"), len(rawBody))
	}
}

func TestReconnectingPlayerResumesInTheWildsWithoutResettingToTent(t *testing.T) {
	ts, _ := newTestServer(t)
	a, wa := dial(t, ts, hello("Wanderer", ""))
	code := wa["room"].(string)
	you := wa["you"].(string)

	// Walk south out of the stronghold toward the Wilds.
	for i := 1; i <= 40; i++ {
		a.send(map[string]any{"t": "in", "seq": i, "x": 0, "y": 1})
		time.Sleep(15 * time.Millisecond)
	}
	s1 := a.snapshot(30)
	for s1["ack"].(float64) < 40 {
		s1 = a.snapshot(0)
	}
	p1 := s1["players"].([]any)[0].(map[string]any)
	x1, y1 := p1["x"].(float64), p1["y"].(float64)
	if y1 <= 450 {
		t.Fatalf("expected hero to walk south from tent (420), got y=%.1f", y1)
	}

	// Reconnect with "you" while the old socket is still open (simulating a mobile network drop).
	reHello := hello("Wanderer", code)
	reHello["you"] = you
	b, wb := dial(t, ts, reHello)
	if wb["t"] != "welcome" || wb["you"] != you {
		t.Fatalf("expected welcome with same player id %q, got %v", you, wb)
	}
	players := wb["state"].(map[string]any)["players"].([]any)
	if len(players) != 1 {
		t.Fatalf("expected 1 player (no ghost duplicate), got %d: %v", len(players), players)
	}
	resumed := players[0].(map[string]any)
	if resumed["x"].(float64) != x1 || resumed["y"].(float64) != y1 {
		t.Fatalf("expected resumed position (%.1f, %.1f), got (%.1f, %.1f)", x1, y1, resumed["x"], resumed["y"])
	}

	// Continue walking from the resumed position with fresh sequence numbers starting at 1.
	for i := 1; i <= 10; i++ {
		b.send(map[string]any{"t": "in", "seq": i, "x": 0, "y": 1})
		time.Sleep(15 * time.Millisecond)
	}
	s2 := b.snapshot(0)
	for s2["ack"].(float64) < 10 {
		s2 = b.snapshot(0)
	}
	p2 := s2["players"].([]any)[0].(map[string]any)
	if p2["y"].(float64) <= y1 {
		t.Fatalf("expected resumed player to keep walking south past %.1f, got %.1f", y1, p2["y"])
	}
}


