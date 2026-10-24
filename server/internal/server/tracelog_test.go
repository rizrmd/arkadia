package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestFPSDropTracelogIngestionAndQuery(t *testing.T) {
	ts, _ := newTestServer(t)

	// 1. Submit a sustained_low_fps tracelog where encountersRenderMs dominates.
	payload1 := map[string]any{
		"id":         "tl-client-001",
		"clientTime": "2026-10-23T02:00:00.000Z",
		"reason":     "sustained_low_fps",
		"client": map[string]any{
			"url":                 "/?room=ARK01",
			"userAgent":           "TestBrowser/1.0",
			"viewportWidth":       1280,
			"viewportHeight":      800,
			"dpr":                 2,
			"hardwareConcurrency": 8,
		},
		"metrics": map[string]any{
			"fps":           21.4,
			"minFps":        14.2,
			"targetFps":     60,
			"thresholdFps":  30,
			"windowMs":      1020,
			"sampleCount":   22,
			"slowFrames":    18,
			"droppedFrames": 39,
			"avgFrameMs":    46.7,
			"p50FrameMs":    44.1,
			"p95FrameMs":    68.5,
			"p99FrameMs":    70.4,
			"maxFrameMs":    70.4,
			"phasesAvg": map[string]any{
				"worldDrawMs":        1.8,
				"encountersStepMs":   2.4,
				"encountersRenderMs": 28.6,
				"pixiRenderMs":       5.2,
			},
			"phasesMax": map[string]any{
				"worldDrawMs":        3.1,
				"encountersStepMs":   4.2,
				"encountersRenderMs": 49.5,
				"pixiRenderMs":       9.4,
			},
		},
		"scene": map[string]any{
			"mode":          "coop",
			"room":          "ark01",
			"playerId":      "p1",
			"rttMs":         42.5,
			"hero":          "ember-warden",
			"heroState":     "attack",
			"heroU":         9.4,
			"heroV":         14.2,
			"safeZone":      false,
			"level":         4,
			"heroesCount":   3,
			"foesTotal":     14,
			"foesRendered":  11,
			"particles":     184,
			"liveEffects":   6,
			"activeFloats":  9,
			"projectiles":   4,
			"aoes":          2,
			"scale":         0.85,
			"camera":        "idle",
			"gate":          "open",
			"lighting":      "on",
			"torches":       "lit",
			"sun":           "none",
			"surfacePaints": 2,
			"lightPaints":   4,
			"shadowPaints":  1,
		},
		"frames": []map[string]any{
			{"t": 1000, "dtMs": 45.2, "fps": 22.1, "encountersRenderMs": 29.1, "pixiRenderMs": 5.1, "foesRendered": 11, "particles": 180},
			{"t": 1070.4, "dtMs": 70.4, "fps": 14.2, "encountersRenderMs": 49.5, "pixiRenderMs": 9.4, "foesRendered": 11, "particles": 184},
		},
	}

	b1, _ := json.Marshal(payload1)
	res1, err := http.Post(ts.URL+"/api/tracelogs", "application/json", bytes.NewReader(b1))
	if err != nil {
		t.Fatal(err)
	}
	defer res1.Body.Close()
	if res1.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", res1.StatusCode)
	}
	var postReply1 map[string]any
	json.NewDecoder(res1.Body).Decode(&postReply1)
	if postReply1["ok"] != true || postReply1["id"] != "tl-client-001" || postReply1["bottleneck"] != "encounters-render" {
		t.Fatalf("unexpected post reply: %+v", postReply1)
	}

	// 2. Submit a frame_spike tracelog where shadowCastMs dominates (and metrics are auto-derived from frames).
	payload2 := map[string]any{
		"reason": "frame_spike",
		"metrics": map[string]any{
			"phasesMax": map[string]any{
				"worldDrawMs":  64.0,
				"shadowCastMs": 58.5,
			},
		},
		"scene": map[string]any{
			"mode": "solo",
			"hero": "rift-runner",
		},
		"frames": []map[string]any{
			{"t": 2000, "dtMs": 16.6, "shadowCastMs": 0},
			{"t": 2112, "dtMs": 112.0, "shadowCastMs": 58.5, "surfaceRepainted": true},
		},
	}
	b2, _ := json.Marshal(payload2)
	res2, err := http.Post(ts.URL+"/api/tracelogs", "application/json", bytes.NewReader(b2))
	if err != nil {
		t.Fatal(err)
	}
	defer res2.Body.Close()
	if res2.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", res2.StatusCode)
	}
	var postReply2 map[string]any
	json.NewDecoder(res2.Body).Decode(&postReply2)
	if postReply2["bottleneck"] != "shadow-cast" {
		t.Fatalf("expected shadow-cast bottleneck, got %+v", postReply2)
	}
	id2 := postReply2["id"].(string)

	// 3. List all tracelogs and verify summary and ordering (newest first).
	listRes, err := http.Get(ts.URL + "/api/tracelogs")
	if err != nil {
		t.Fatal(err)
	}
	defer listRes.Body.Close()
	var listBody struct {
		OK      bool            `json:"ok"`
		Total   int             `json:"total"`
		Stored  int             `json:"stored"`
		Summary TracelogSummary `json:"summary"`
		Items   []TracelogEntry `json:"items"`
	}
	if err := json.NewDecoder(listRes.Body).Decode(&listBody); err != nil {
		t.Fatal(err)
	}
	if !listBody.OK || listBody.Total != 2 || len(listBody.Items) != 2 {
		t.Fatalf("unexpected list response: %+v", listBody)
	}
	if listBody.Items[0].ID != id2 || listBody.Items[1].ID != "tl-client-001" {
		t.Fatalf("expected newest first, got %s then %s", listBody.Items[0].ID, listBody.Items[1].ID)
	}
	if listBody.Summary.WorstFrameMs != 112.0 || listBody.Summary.ByReason["sustained_low_fps"] != 1 || listBody.Summary.ByReason["frame_spike"] != 1 {
		t.Fatalf("unexpected summary: %+v", listBody.Summary)
	}

	// 4. Filter by room code (?room=ark01).
	roomRes, err := http.Get(ts.URL + "/api/tracelogs?room=ark01")
	if err != nil {
		t.Fatal(err)
	}
	defer roomRes.Body.Close()
	var roomBody struct {
		Total int             `json:"total"`
		Items []TracelogEntry `json:"items"`
	}
	json.NewDecoder(roomRes.Body).Decode(&roomBody)
	if roomBody.Total != 1 || roomBody.Items[0].Scene.Room != "ARK01" {
		t.Fatalf("room filter failed: %+v", roomBody)
	}

	// 5. Fetch single tracelog by ID and verify 404 for unknown ID.
	singleRes, err := http.Get(ts.URL + "/api/tracelogs/tl-client-001")
	if err != nil {
		t.Fatal(err)
	}
	defer singleRes.Body.Close()
	if singleRes.StatusCode != http.StatusOK {
		t.Fatalf("getTracelog status=%d", singleRes.StatusCode)
	}
	var singleEntry TracelogEntry
	json.NewDecoder(singleRes.Body).Decode(&singleEntry)
	if singleEntry.Scene.Particles != 184 || len(singleEntry.Frames) != 2 {
		t.Fatalf("single entry mismatch: %+v", singleEntry)
	}

	notFoundRes, err := http.Get(ts.URL + "/api/tracelogs/tl-does-not-exist")
	if err != nil {
		t.Fatal(err)
	}
	notFoundRes.Body.Close()
	if notFoundRes.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown tracelog, got %d", notFoundRes.StatusCode)
	}

	// 6. Reject invalid payloads.
	badRes, err := http.Post(ts.URL+"/api/tracelogs", "application/json", bytes.NewReader([]byte(`{"reason":"unknown_reason","metrics":{"fps":20}}`)))
	if err != nil {
		t.Fatal(err)
	}
	badRes.Body.Close()
	if badRes.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid reason, got %d", badRes.StatusCode)
	}

	emptyMetricsRes, err := http.Post(ts.URL+"/api/tracelogs", "application/json", bytes.NewReader([]byte(`{"reason":"manual"}`)))
	if err != nil {
		t.Fatal(err)
	}
	emptyMetricsRes.Body.Close()
	if emptyMetricsRes.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty metrics, got %d", emptyMetricsRes.StatusCode)
	}
}

func TestTracelogDiskPersistence(t *testing.T) {
	site := t.TempDir()
	s1 := &Server{Site: site}
	ts1 := httptest.NewServer(s1.Handler())
	t.Cleanup(ts1.Close)

	body := []byte(`{"id":"tl-disk-check","reason":"manual","metrics":{"fps":24.5,"maxFrameMs":55.2}}`)
	res, err := http.Post(ts1.URL+"/api/tracelogs", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("status=%d", res.StatusCode)
	}

	// Simulate server restart pointing at the same Site directory and verify disk reload.
	s2 := &Server{Site: site}
	ts2 := httptest.NewServer(s2.Handler())
	t.Cleanup(ts2.Close)

	getRes, err := http.Get(ts2.URL + "/api/tracelogs/tl-disk-check")
	if err != nil {
		t.Fatal(err)
	}
	defer getRes.Body.Close()
	if getRes.StatusCode != http.StatusOK {
		t.Fatalf("expected persisted tracelog after restart, got status=%d", getRes.StatusCode)
	}
	_ = os.RemoveAll(filepath.Join(t.TempDir(), "unused"))
}

// The 3D hero / NixieFX sub-phases and the adaptive particle budget survive ingestion and come back from GET.
func TestTracelogRenderSubPhasesRoundTrip(t *testing.T) {
	ts, _ := newTestServer(t)
	payload := map[string]any{
		"id":     "tl-subphases",
		"reason": "sustained_low_fps",
		"metrics": map[string]any{
			"fps":       28.4,
			"phasesAvg": map[string]any{"encountersRenderMs": 24.1, "hero3dMs": 1.6, "vfxMs": 11.2},
			"phasesMax": map[string]any{"encountersRenderMs": 31.5, "hero3dMs": 2.4, "vfxMs": 16.8},
		},
		"scene":  map[string]any{"mode": "solo", "hero": "ember-warden", "particles": 412, "particleBudget": 330},
		"frames": []map[string]any{{"t": 10, "dtMs": 35.2, "encountersRenderMs": 24.1, "hero3dMs": 1.6, "vfxMs": 11.2}},
	}
	b, _ := json.Marshal(payload)
	res, err := http.Post(ts.URL+"/api/tracelogs", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", res.StatusCode)
	}
	got, err := http.Get(ts.URL + "/api/tracelogs/tl-subphases")
	if err != nil {
		t.Fatal(err)
	}
	defer got.Body.Close()
	var e TracelogEntry
	if err := json.NewDecoder(got.Body).Decode(&e); err != nil {
		t.Fatal(err)
	}
	if e.Metrics.PhasesAvg.Hero3DMs != 1.6 || e.Metrics.PhasesMax.VfxMs != 16.8 {
		t.Fatalf("sub-phases lost: avg %+v max %+v", e.Metrics.PhasesAvg, e.Metrics.PhasesMax)
	}
	if e.Scene.ParticleBudget != 330 {
		t.Fatalf("particleBudget lost: %d", e.Scene.ParticleBudget)
	}
	if len(e.Frames) != 1 || e.Frames[0].Hero3DMs != 1.6 || e.Frames[0].VfxMs != 11.2 {
		t.Fatalf("frame sub-phases lost: %+v", e.Frames)
	}
}

// A full log file is rotated to .1 rather than deleted, and both files are reloaded after a restart.
func TestTracelogRotationKeepsHistory(t *testing.T) {
	site := t.TempDir()
	s1 := &Server{Site: site}
	ts1 := httptest.NewServer(s1.Handler())
	t.Cleanup(ts1.Close)
	post := func(id string) {
		body := []byte(`{"id":"` + id + `","reason":"sustained_low_fps","metrics":{"fps":52.1,"maxFrameMs":33.4}}`)
		res, err := http.Post(ts1.URL+"/api/tracelogs", "application/json", bytes.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
	}
	post("tl-before-rotation")
	p := s1.tracelogFilePath()
	// Pad the file past the limit so the next write rotates it.
	f, err := os.OpenFile(p, os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		t.Fatal(err)
	}
	f.Write(bytes.Repeat([]byte(" "), maxTracelogFileSz+1))
	f.Write([]byte("\n"))
	f.Close()
	post("tl-after-rotation")
	if _, err := os.Stat(p + ".1"); err != nil {
		t.Fatalf("expected rotated file: %v", err)
	}

	s2 := &Server{Site: site}
	ts2 := httptest.NewServer(s2.Handler())
	t.Cleanup(ts2.Close)
	for _, id := range []string{"tl-before-rotation", "tl-after-rotation"} {
		res, err := http.Get(ts2.URL + "/api/tracelogs/" + id)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			t.Fatalf("%s lost after rotation + restart: status=%d", id, res.StatusCode)
		}
	}
}
