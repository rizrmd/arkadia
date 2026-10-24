package server

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	maxStoredTracelogs = 200
	maxTracelogBody    = 128 * 1024
	maxTracelogFrames  = 120
	maxLongTasks       = 32
	maxTracelogFileSz  = 2 * 1024 * 1024
)

// TracelogClient describes the browser environment that experienced the FPS drop.
type TracelogClient struct {
	URL                 string  `json:"url"`
	UserAgent           string  `json:"userAgent"`
	ViewportWidth       int     `json:"viewportWidth"`
	ViewportHeight      int     `json:"viewportHeight"`
	DPR                 float64 `json:"dpr"`
	HardwareConcurrency int     `json:"hardwareConcurrency,omitempty"`
	DeviceMemoryGB      float64 `json:"deviceMemoryGb,omitempty"`
}

// TracelogPhaseBreakdown breaks down frame time across game subsystems in milliseconds.
type TracelogPhaseBreakdown struct {
	WorldDrawMs        float64 `json:"worldDrawMs"`
	WorldPaintMs       float64 `json:"worldPaintMs"`
	ShadowCastMs       float64 `json:"shadowCastMs"`
	EncountersStepMs   float64 `json:"encountersStepMs"`
	EncountersRenderMs float64 `json:"encountersRenderMs"`
	PixiRenderMs       float64 `json:"pixiRenderMs"`
	NetMs              float64 `json:"netMs"`
	UnaccountedMs      float64 `json:"unaccountedMs"`
	// Sub-phases of EncountersRenderMs (the 3D hero pass and NixieFX), not added to the frame sum.
	Hero3DMs float64 `json:"hero3dMs,omitempty"`
	VfxMs    float64 `json:"vfxMs,omitempty"`
}

// TracelogMetrics summarizes the FPS drop window and identifies the primary bottleneck.
type TracelogMetrics struct {
	FPS           float64                `json:"fps"`
	MinFPS        float64                `json:"minFps"`
	TargetFPS     float64                `json:"targetFps"`
	ThresholdFPS  float64                `json:"thresholdFps"`
	WindowMs      float64                `json:"windowMs"`
	SampleCount   int                    `json:"sampleCount"`
	SlowFrames    int                    `json:"slowFrames"`
	DroppedFrames int                    `json:"droppedFrames"`
	AvgFrameMs    float64                `json:"avgFrameMs"`
	P50FrameMs    float64                `json:"p50FrameMs"`
	P95FrameMs    float64                `json:"p95FrameMs"`
	P99FrameMs    float64                `json:"p99FrameMs"`
	MaxFrameMs    float64                `json:"maxFrameMs"`
	PhasesAvg     TracelogPhaseBreakdown `json:"phasesAvg"`
	PhasesMax     TracelogPhaseBreakdown `json:"phasesMax"`
	Bottleneck    string                 `json:"bottleneck"`
}

// TracelogScene captures the live Stronghold world and combat state when the FPS drop occurred.
type TracelogScene struct {
	Mode          string  `json:"mode"`
	Room          string  `json:"room,omitempty"`
	PlayerID      string  `json:"playerId,omitempty"`
	RTTMs         float64 `json:"rttMs,omitempty"`
	Hero          string  `json:"hero"`
	HeroState     string  `json:"heroState"`
	HeroU         float64 `json:"heroU"`
	HeroV         float64 `json:"heroV"`
	SafeZone      bool    `json:"safeZone"`
	Level         int     `json:"level"`
	HeroesCount   int     `json:"heroesCount"`
	FoesTotal     int     `json:"foesTotal"`
	FoesRendered  int     `json:"foesRendered"`
	Particles     int     `json:"particles"`
	LiveEffects   int     `json:"liveEffects"`
	ActiveFloats  int     `json:"activeFloats"`
	Projectiles   int     `json:"projectiles"`
	AoEs          int     `json:"aoes"`
	Scale         float64 `json:"scale"`
	Camera        string  `json:"camera"`
	Gate          string  `json:"gate"`
	Lighting      string  `json:"lighting"`
	Torches       string  `json:"torches"`
	Sun           string  `json:"sun"`
	SurfacePaints int     `json:"surfacePaints"`
	LightPaints   int     `json:"lightPaints"`
	ShadowPaints  int     `json:"shadowPaints"`
	// Adaptive NixieFX particle budget at the time of the drop (shrinks on devices that cannot hold 60 fps).
	ParticleBudget int `json:"particleBudget,omitempty"`
}

// TracelogFrameSample is a single animation frame sample leading up to and during the FPS drop.
type TracelogFrameSample struct {
	T                  float64 `json:"t"`
	DtMs               float64 `json:"dtMs"`
	FPS                float64 `json:"fps"`
	WorldDrawMs        float64 `json:"worldDrawMs,omitempty"`
	WorldPaintMs       float64 `json:"worldPaintMs,omitempty"`
	ShadowCastMs       float64 `json:"shadowCastMs,omitempty"`
	EncountersStepMs   float64 `json:"encountersStepMs,omitempty"`
	EncountersRenderMs float64 `json:"encountersRenderMs,omitempty"`
	PixiRenderMs       float64 `json:"pixiRenderMs,omitempty"`
	NetMs              float64 `json:"netMs,omitempty"`
	Hero3DMs           float64 `json:"hero3dMs,omitempty"`
	VfxMs              float64 `json:"vfxMs,omitempty"`
	FoesRendered       int     `json:"foesRendered,omitempty"`
	Particles          int     `json:"particles,omitempty"`
	SurfaceRepainted   bool    `json:"surfaceRepainted,omitempty"`
}

// TracelogLongTask records a browser PerformanceObserver longtask (>50ms main thread block).
type TracelogLongTask struct {
	StartTime float64 `json:"startTime"`
	Duration  float64 `json:"duration"`
	Name      string  `json:"name,omitempty"`
}

// TracelogEntry is a complete FPS drop diagnostic tracelog stored on the server.
type TracelogEntry struct {
	ID         string                `json:"id"`
	ReceivedAt string                `json:"receivedAt"`
	ClientTime string                `json:"clientTime,omitempty"`
	Reason     string                `json:"reason"`
	Seq        int                   `json:"seq"`
	Client     TracelogClient        `json:"client"`
	Metrics    TracelogMetrics       `json:"metrics"`
	Scene      TracelogScene         `json:"scene"`
	Frames     []TracelogFrameSample `json:"frames"`
	LongTasks  []TracelogLongTask    `json:"longTasks,omitempty"`
}

// TracelogSummary aggregates received FPS drop tracelogs by reason and bottleneck.
type TracelogSummary struct {
	ByReason     map[string]int `json:"byReason"`
	ByBottleneck map[string]int `json:"byBottleneck"`
	LowestFPS    float64        `json:"lowestFps"`
	WorstFrameMs float64        `json:"worstFrameMs"`
}

type tracelogStore struct {
	mu      sync.RWMutex
	entries []TracelogEntry
	seq     int
}

func (s *Server) ensureTracelogStore() *tracelogStore {
	if existing, ok := s.tracelogOnce.Load("store"); ok {
		return existing.(*tracelogStore)
	}
	initial := &tracelogStore{
		entries: make([]TracelogEntry, 0, 32),
	}
	// The rotated file (older entries) is read first so the newest entries win the 200-entry window.
	if p := s.tracelogFilePath(); p != "" {
		for _, path := range []string{p + ".1", p} {
			f, err := os.Open(path)
			if err != nil {
				continue
			}
			sc := bufio.NewScanner(f)
			sc.Buffer(make([]byte, 64*1024), maxTracelogBody*2)
			for sc.Scan() {
				line := strings.TrimSpace(sc.Text())
				if line == "" {
					continue
				}
				var entry TracelogEntry
				if err := json.Unmarshal([]byte(line), &entry); err == nil && entry.ID != "" {
					if entry.Seq > initial.seq {
						initial.seq = entry.Seq
					} else {
						initial.seq++
						entry.Seq = initial.seq
					}
					if len(initial.entries) >= maxStoredTracelogs {
						copy(initial.entries, initial.entries[1:])
						initial.entries[len(initial.entries)-1] = entry
					} else {
						initial.entries = append(initial.entries, entry)
					}
				}
			}
			_ = f.Close()
		}
	}
	actual, _ := s.tracelogOnce.LoadOrStore("store", initial)
	return actual.(*tracelogStore)
}

func newTracelogID() string {
	var b [6]byte
	_, _ = rand.Read(b[:])
	return "tl-" + strconv.FormatInt(time.Now().UnixMilli(), 36) + "-" + hex.EncodeToString(b[:])
}

func cleanFloat(v float64) float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return math.Round(v*100) / 100
}

func truncStr(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		return s[:max]
	}
	return s
}

func classifyBottleneck(m TracelogMetrics, longTasks []TracelogLongTask) string {
	if existing := truncStr(m.Bottleneck, 48); existing != "" {
		return existing
	}
	type candidate struct {
		name string
		ms   float64
	}
	candidates := []candidate{
		{"world-paint", m.PhasesMax.WorldPaintMs},
		{"shadow-cast", m.PhasesMax.ShadowCastMs},
		{"world-draw", math.Max(0, m.PhasesMax.WorldDrawMs-m.PhasesMax.WorldPaintMs-m.PhasesMax.ShadowCastMs)},
		{"encounters-render", m.PhasesMax.EncountersRenderMs},
		{"encounters-step", m.PhasesMax.EncountersStepMs},
		{"pixi-render", m.PhasesMax.PixiRenderMs},
		{"net-reconcile", m.PhasesMax.NetMs},
	}
	best := candidate{name: "unclassified", ms: 0}
	for _, c := range candidates {
		if c.ms > best.ms {
			best = c
		}
	}
	if m.PhasesMax.UnaccountedMs > math.Max(40, best.ms*2.5) {
		if len(longTasks) > 0 {
			return "main-thread-longtask"
		}
		return "browser-compositor"
	}
	if best.ms >= 2.0 {
		return best.name
	}
	if len(longTasks) > 0 {
		return "main-thread-longtask"
	}
	return "browser-compositor"
}

func (s *Server) tracelogFilePath() string {
	dir := s.webpCacheDir()
	if dir == "" {
		return ""
	}
	return filepath.Join(dir, "fps-tracelogs.jsonl")
}

func (s *Server) appendTracelogToDisk(entry TracelogEntry) {
	p := s.tracelogFilePath()
	if p == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return
	}
	// Rotate instead of deleting, so a full file never wipes the whole history (logs are now sent for any
	// drop below 60 fps, which fills the file much faster).
	if st, err := os.Stat(p); err == nil && st.Size() > maxTracelogFileSz {
		_ = os.Rename(p, p+".1")
	}
	f, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	if line, err := json.Marshal(entry); err == nil {
		_, _ = f.Write(append(line, '\n'))
	}
}

func (s *Server) postTracelog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	r.Body = http.MaxBytesReader(w, r.Body, maxTracelogBody)
	defer r.Body.Close()

	var entry TracelogEntry
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&entry); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "invalid_json",
			"message": "Invalid FPS tracelog JSON payload.",
		})
		return
	}

	entry.Reason = truncStr(entry.Reason, 40)
	if entry.Reason == "" {
		entry.Reason = "sustained_low_fps"
	}
	switch entry.Reason {
	case "sustained_low_fps", "frame_spike", "manual":
	default:
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "invalid_reason",
			"message": "Reason must be sustained_low_fps, frame_spike, or manual.",
		})
		return
	}

	if len(entry.Frames) > maxTracelogFrames {
		entry.Frames = entry.Frames[len(entry.Frames)-maxTracelogFrames:]
	}
	if len(entry.LongTasks) > maxLongTasks {
		entry.LongTasks = entry.LongTasks[len(entry.LongTasks)-maxLongTasks:]
	}

	// Derive metrics from frames if omitted or sanitize numbers.
	if len(entry.Frames) > 0 {
		var sumDt, maxDt, minFps float64
		for i := range entry.Frames {
			f := &entry.Frames[i]
			f.T = cleanFloat(f.T)
			f.DtMs = cleanFloat(f.DtMs)
			if f.FPS <= 0 && f.DtMs > 0 {
				f.FPS = cleanFloat(1000.0 / f.DtMs)
			} else {
				f.FPS = cleanFloat(f.FPS)
			}
			f.WorldDrawMs = cleanFloat(f.WorldDrawMs)
			f.WorldPaintMs = cleanFloat(f.WorldPaintMs)
			f.ShadowCastMs = cleanFloat(f.ShadowCastMs)
			f.EncountersStepMs = cleanFloat(f.EncountersStepMs)
			f.EncountersRenderMs = cleanFloat(f.EncountersRenderMs)
			f.PixiRenderMs = cleanFloat(f.PixiRenderMs)
			f.NetMs = cleanFloat(f.NetMs)
			f.Hero3DMs = cleanFloat(f.Hero3DMs)
			f.VfxMs = cleanFloat(f.VfxMs)
			sumDt += f.DtMs
			if f.DtMs > maxDt {
				maxDt = f.DtMs
			}
			if f.FPS > 0 && (minFps == 0 || f.FPS < minFps) {
				minFps = f.FPS
			}
		}
		if entry.Metrics.SampleCount == 0 {
			entry.Metrics.SampleCount = len(entry.Frames)
		}
		if entry.Metrics.MaxFrameMs <= 0 {
			entry.Metrics.MaxFrameMs = cleanFloat(maxDt)
		}
		if entry.Metrics.AvgFrameMs <= 0 && sumDt > 0 {
			entry.Metrics.AvgFrameMs = cleanFloat(sumDt / float64(len(entry.Frames)))
		}
		if entry.Metrics.FPS <= 0 && sumDt > 0 {
			entry.Metrics.FPS = cleanFloat(1000.0 * float64(len(entry.Frames)) / sumDt)
		}
		if entry.Metrics.MinFPS <= 0 {
			entry.Metrics.MinFPS = cleanFloat(minFps)
		}
	}

	entry.Metrics.FPS = cleanFloat(entry.Metrics.FPS)
	entry.Metrics.MinFPS = cleanFloat(entry.Metrics.MinFPS)
	entry.Metrics.AvgFrameMs = cleanFloat(entry.Metrics.AvgFrameMs)
	entry.Metrics.P50FrameMs = cleanFloat(entry.Metrics.P50FrameMs)
	entry.Metrics.P95FrameMs = cleanFloat(entry.Metrics.P95FrameMs)
	entry.Metrics.P99FrameMs = cleanFloat(entry.Metrics.P99FrameMs)
	entry.Metrics.MaxFrameMs = cleanFloat(entry.Metrics.MaxFrameMs)
	if entry.Metrics.FPS <= 0 && entry.Metrics.MaxFrameMs <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "missing_metrics",
			"message": "Tracelog must include positive frame metrics or frame samples.",
		})
		return
	}

	entry.ID = truncStr(entry.ID, 64)
	if entry.ID == "" {
		entry.ID = newTracelogID()
	}
	entry.ReceivedAt = time.Now().UTC().Format(time.RFC3339Nano)
	entry.ClientTime = truncStr(entry.ClientTime, 64)
	entry.Client.URL = truncStr(entry.Client.URL, 256)
	entry.Client.UserAgent = truncStr(entry.Client.UserAgent, 256)
	if entry.Client.UserAgent == "" {
		entry.Client.UserAgent = truncStr(r.UserAgent(), 256)
	}
	entry.Scene.Mode = truncStr(entry.Scene.Mode, 24)
	if entry.Scene.Mode == "" {
		entry.Scene.Mode = "solo"
	}
	entry.Scene.Room = strings.ToUpper(truncStr(entry.Scene.Room, 16))
	entry.Scene.PlayerID = truncStr(entry.Scene.PlayerID, 32)
	entry.Scene.Hero = truncStr(entry.Scene.Hero, 32)
	entry.Scene.HeroState = truncStr(entry.Scene.HeroState, 32)
	entry.Scene.Camera = truncStr(entry.Scene.Camera, 32)
	entry.Scene.Gate = truncStr(entry.Scene.Gate, 32)
	entry.Scene.Lighting = truncStr(entry.Scene.Lighting, 32)
	entry.Scene.Torches = truncStr(entry.Scene.Torches, 32)
	entry.Scene.Sun = truncStr(entry.Scene.Sun, 32)
	entry.Metrics.Bottleneck = classifyBottleneck(entry.Metrics, entry.LongTasks)

	store := s.ensureTracelogStore()
	store.mu.Lock()
	store.seq++
	entry.Seq = store.seq
	if len(store.entries) >= maxStoredTracelogs {
		copy(store.entries, store.entries[1:])
		store.entries[len(store.entries)-1] = entry
	} else {
		store.entries = append(store.entries, entry)
	}
	stored := len(store.entries)
	store.mu.Unlock()

	s.appendTracelogToDisk(entry)

	if s.Log != nil {
		s.Log.Info("fps_drop_tracelog",
			"id", entry.ID,
			"seq", entry.Seq,
			"reason", entry.Reason,
			"fps", entry.Metrics.FPS,
			"minFps", entry.Metrics.MinFPS,
			"p95Ms", entry.Metrics.P95FrameMs,
			"maxMs", entry.Metrics.MaxFrameMs,
			"bottleneck", entry.Metrics.Bottleneck,
			"mode", entry.Scene.Mode,
			"room", entry.Scene.Room,
			"hero", entry.Scene.Hero,
			"foes", entry.Scene.FoesRendered,
			"particles", entry.Scene.Particles,
		)
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":         true,
		"id":         entry.ID,
		"seq":        entry.Seq,
		"stored":     stored,
		"bottleneck": entry.Metrics.Bottleneck,
	})
}

func (s *Server) listTracelogs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	q := r.URL.Query()
	limit := 50
	if raw := q.Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			if n > maxStoredTracelogs {
				n = maxStoredTracelogs
			}
			limit = n
		}
	}
	roomFilter := strings.ToUpper(strings.TrimSpace(q.Get("room")))
	reasonFilter := strings.TrimSpace(q.Get("reason"))
	bottleneckFilter := strings.TrimSpace(q.Get("bottleneck"))

	store := s.ensureTracelogStore()
	store.mu.RLock()
	snapshot := make([]TracelogEntry, len(store.entries))
	copy(snapshot, store.entries)
	store.mu.RUnlock()

	summary := TracelogSummary{
		ByReason:     map[string]int{},
		ByBottleneck: map[string]int{},
	}
	items := make([]TracelogEntry, 0, len(snapshot))
	for i := len(snapshot) - 1; i >= 0; i-- {
		e := snapshot[i]
		if roomFilter != "" && !strings.EqualFold(e.Scene.Room, roomFilter) {
			continue
		}
		if reasonFilter != "" && e.Reason != reasonFilter {
			continue
		}
		if bottleneckFilter != "" && e.Metrics.Bottleneck != bottleneckFilter {
			continue
		}
		summary.ByReason[e.Reason]++
		summary.ByBottleneck[e.Metrics.Bottleneck]++
		if e.Metrics.FPS > 0 && (summary.LowestFPS == 0 || e.Metrics.FPS < summary.LowestFPS) {
			summary.LowestFPS = e.Metrics.FPS
		}
		if e.Metrics.MaxFrameMs > summary.WorstFrameMs {
			summary.WorstFrameMs = e.Metrics.MaxFrameMs
		}
		if len(items) < limit {
			items = append(items, e)
		}
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"total":   len(items),
		"stored":  len(snapshot),
		"summary": summary,
		"items":   items,
	})
}

func (s *Server) getTracelog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	id := strings.TrimSpace(r.PathValue("id"))
	store := s.ensureTracelogStore()
	store.mu.RLock()
	defer store.mu.RUnlock()
	for i := len(store.entries) - 1; i >= 0; i-- {
		if store.entries[i].ID == id {
			_ = json.NewEncoder(w).Encode(store.entries[i])
			return
		}
	}
	w.WriteHeader(http.StatusNotFound)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": "tracelog_not_found",
	})
}
