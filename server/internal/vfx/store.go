// Package vfx stores visual-only overrides independently of maps, combat and player saves.
package vfx

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

type Patch struct {
	Name       string   `json:"name,omitempty"`
	Source     string   `json:"source,omitempty"`
	Order      *float64 `json:"order,omitempty"`
	Deleted    bool     `json:"deleted,omitempty"`
	Color      string   `json:"color,omitempty"`
	Opacity    *float64 `json:"opacity,omitempty"`
	Size       *float64 `json:"size,omitempty"`
	Count      *float64 `json:"count,omitempty"`
	Rate       *float64 `json:"rate,omitempty"`
	Lifetime   *float64 `json:"lifetime,omitempty"`
	Speed      *float64 `json:"speed,omitempty"`
	Direction  *float64 `json:"direction,omitempty"`
	Spread     *float64 `json:"spread,omitempty"`
	Gravity    *float64 `json:"gravity,omitempty"`
	X          *float64 `json:"x,omitempty"`
	Y          *float64 `json:"y,omitempty"`
	Z          *float64 `json:"z,omitempty"`
	Delay      *float64 `json:"delay,omitempty"`
	Duration   *float64 `json:"duration,omitempty"`
	Texture    string   `json:"texture,omitempty"`
	Blend      string   `json:"blend,omitempty"`
	Columns    *float64 `json:"columns,omitempty"`
	Rows       *float64 `json:"rows,omitempty"`
	FPS        *float64 `json:"fps,omitempty"`
	FrameCount *float64 `json:"frameCount,omitempty"`
	PivotX     *float64 `json:"pivotX,omitempty"`
	PivotY     *float64 `json:"pivotY,omitempty"`
	Loop       *bool    `json:"loop,omitempty"`
	Enabled    *bool    `json:"enabled,omitempty"`
}
type Document struct {
	Version  int                         `json:"version"`
	Revision int                         `json:"revision"`
	Effects  map[string]map[string]Patch `json:"effects"`
}
type State struct {
	GitCommit string   `json:"gitCommit,omitempty"`
	Saved     Document `json:"saved"`
	Applied   Document `json:"applied"`
}
type Store struct {
	mu  sync.Mutex
	dir string
}

func Empty() Document { return Document{Version: 1, Effects: map[string]map[string]Patch{}} }
func Open(dir string) (*Store, error) {
	if e := os.MkdirAll(dir, 0700); e != nil {
		return nil, e
	}
	return &Store{dir: dir}, nil
}

var keyPattern = regexp.MustCompile(`^[a-zA-Z0-9_./-]{1,160}$`)
var colorPattern = regexp.MustCompile(`^#[a-fA-F0-9]{6}$`)

func (d Document) Validate() error {
	if d.Version != 1 || d.Revision < 0 || d.Effects == nil || len(d.Effects) > 128 {
		return fmt.Errorf("unsupported visual document")
	}
	total := 0
	for key, layers := range d.Effects {
		if !keyPattern.MatchString(key) || len(layers) > 64 {
			return fmt.Errorf("invalid effect key or layer count")
		}
		for id, p := range layers {
			total++
			if !keyPattern.MatchString(id) {
				return fmt.Errorf("invalid layer id")
			}
			if len(p.Name) > 120 || (p.Source != "" && (!keyPattern.MatchString(p.Source) || p.Source == id || layers[p.Source].Source != "")) {
				return fmt.Errorf("invalid layer metadata")
			}
			if p.Color != "" && !colorPattern.MatchString(p.Color) {
				return fmt.Errorf("invalid color")
			}
			if p.Texture != "" && (!keyPattern.MatchString(p.Texture) || regexp.MustCompile(`(^|/)\.\.(/|$)`).MatchString(p.Texture)) {
				return fmt.Errorf("invalid texture")
			}
			if p.FrameCount != nil && math.Trunc(*p.FrameCount) != *p.FrameCount {
				return fmt.Errorf("frame count must be a whole number")
			}
			if p.Columns != nil && math.Trunc(*p.Columns) != *p.Columns || p.Rows != nil && math.Trunc(*p.Rows) != *p.Rows {
				return fmt.Errorf("flipbook grid must use whole numbers")
			}
			if p.Blend != "" && p.Blend != "alpha" && p.Blend != "additive" && p.Blend != "screen" && p.Blend != "multiply" {
				return fmt.Errorf("invalid blend")
			}
			for _, v := range []struct {
				p      *float64
				lo, hi float64
			}{{p.Order, 0, 512}, {p.Opacity, 0, 1}, {p.Size, .02, 8}, {p.Count, 0, 4}, {p.Rate, 0, 4}, {p.Lifetime, .05, 8}, {p.Speed, 0, 8}, {p.Direction, -180, 180}, {p.Spread, 0, 360}, {p.Gravity, -20, 20}, {p.X, -10, 10}, {p.Y, -10, 10}, {p.Z, -10, 10}, {p.Delay, 0, 10}, {p.Duration, .01, 10}, {p.Columns, 1, 16}, {p.Rows, 1, 16}, {p.FPS, 1, 120}, {p.FrameCount, 1, 256}, {p.PivotX, 0, 1}, {p.PivotY, 0, 1}} {
				if v.p != nil && (math.IsNaN(*v.p) || math.IsInf(*v.p, 0) || *v.p < v.lo || *v.p > v.hi) {
					return fmt.Errorf("visual parameter out of range")
				}
			}
		}
	}
	if total > 512 {
		return fmt.Errorf("too many visual layers")
	}
	return nil
}

// Remove obsolete authored layers from saved and applied settings after the Fan Flame reset.
func resetFanLayers(d *Document) {
	for key := range d.Effects {
		if key == "runtime/flame-fan" || strings.HasPrefix(key, "ember-warden/flame-fan.") {
			delete(d.Effects, key)
		}
	}
}
func (s *Store) read() (State, error) {
	b, e := os.ReadFile(filepath.Join(s.dir, "visuals.json"))
	if os.IsNotExist(e) {
		return State{Saved: Empty(), Applied: Empty()}, nil
	}
	if e != nil {
		return State{}, e
	}
	var v State
	if e = json.Unmarshal(b, &v); e != nil {
		return v, e
	}
	if e = v.Saved.Validate(); e != nil {
		return v, e
	}
	if e = v.Applied.Validate(); e != nil {
		return v, e
	}
	resetFanLayers(&v.Saved)
	resetFanLayers(&v.Applied)
	return v, nil
}
func (s *Store) Get() (State, error) { s.mu.Lock(); defer s.mu.Unlock(); return s.read() }
func (s *Store) Write(d Document, apply bool) (State, error) {
	resetFanLayers(&d)
	s.mu.Lock()
	defer s.mu.Unlock()
	if e := d.Validate(); e != nil {
		return State{}, e
	}
	v, e := s.read()
	if e != nil {
		return v, e
	}
	if d.Revision != v.Saved.Revision {
		return v, fmt.Errorf("saved revision changed; reload before saving")
	}
	if apply {
		a, _ := json.Marshal(d.Effects)
		b, _ := json.Marshal(v.Saved.Effects)
		if string(a) != string(b) {
			return v, fmt.Errorf("save draft before applying")
		}
		v.Applied = v.Saved
	} else {
		d.Revision++
		v.Saved = d
	}
	b, e := json.Marshal(v)
	if e != nil {
		return v, e
	}

	tmp := filepath.Join(s.dir, "visuals.json.tmp")
	if e = os.WriteFile(tmp, b, 0600); e != nil {
		return v, e
	}
	if e = os.Rename(tmp, filepath.Join(s.dir, "visuals.json")); e != nil {
		return v, e
	}
	return v, nil
}
