// Package environment owns durable authored maps independently from room checkpoints.
package environment

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sync"
)

//go:embed catalog.json
var catalogJSON []byte

type Column struct {
	X     float64 `json:"x"`
	W     float64 `json:"w"`
	Back  float64 `json:"back"`
	Front float64 `json:"front"`
}
type Asset struct {
	Columns   []Column     `json:"columns"`
	ID        string       `json:"id"`
	Blocks    [][4]float64 `json:"blocks"`
	Footprint float64      `json:"footprint"`
}

var Occupied [][4]float64
var Assets = func() map[string]Asset {
	var c struct {
		Assets   []Asset      `json:"assets"`
		Occupied [][4]float64 `json:"occupied"`
	}
	if err := json.Unmarshal(catalogJSON, &c); err != nil {
		panic(err)
	}
	Occupied = c.Occupied
	m := map[string]Asset{}
	for _, a := range c.Assets {
		m[a.ID] = a
	}
	return m
}()

type Object struct {
	ID       string  `json:"id"`
	Asset    string  `json:"asset"`
	U        float64 `json:"u"`
	V        float64 `json:"v"`
	Count    int     `json:"count,omitempty"`
	Radius   float64 `json:"radius,omitempty"`
	Interval float64 `json:"interval,omitempty"`
}
type Map struct {
	Schema   int      `json:"schema"`
	Revision int      `json:"revision"`
	Name     string   `json:"name"`
	Objects  []Object `json:"objects"`
}

func Empty() Map { return Map{Schema: 1, Name: "Arkodia environment", Objects: []Object{}} }
func (m Map) Validate() error {
	if m.Schema != 1 || len(m.Objects) > 1000 || len(m.Name) > 80 {
		return fmt.Errorf("unsupported schema or map size")
	}
	ids := map[string]bool{}
	total := 0
	for _, o := range m.Objects {
		_, ok := Assets[o.Asset]
		if !ok || o.ID == "" || len(o.ID) > 80 || ids[o.ID] || math.IsNaN(o.U) || math.IsInf(o.U, 0) || math.IsNaN(o.V) || math.IsInf(o.V, 0) || o.U < 0 || o.U > 936 || o.V < 0 || o.V > 936 {
			return fmt.Errorf("invalid object %s", o.ID)
		}
		ids[o.ID] = true
		if o.Asset == "spawn" {
			if o.Count < 1 || o.Count > 50 || o.Radius < .5 || o.Radius > 150 || o.Interval < .5 || o.Interval > 3600 {
				return fmt.Errorf("invalid spawn properties")
			}
			total += o.Count
		}
		if total > 200 {
			return fmt.Errorf("spawn budget exceeds 200")
		}
	}
	for i, a := range m.Objects {
		if a.Asset != "pond-small" && a.Asset != "pond-large" {
			continue
		}
		r := Assets[a.Asset].Footprint/2 + .2
		for _, b := range Occupied {
			if a.U+r > b[0] && a.U-r < b[2] && a.V+r > b[1] && a.V-r < b[3] {
				return fmt.Errorf("pond overlaps existing terrain")
			}
		}
		for j, b := range m.Objects {
			if i == j || b.Asset == "spawn" {
				continue
			}
			r := (Assets[a.Asset].Footprint+Assets[b.Asset].Footprint)/2 + .2
			if math.Abs(a.U-b.U) < r && math.Abs(a.V-b.V) < r {
				return fmt.Errorf("pond requires empty ground")
			}
		}
	}
	return nil
}

type Store struct {
	mu  sync.Mutex
	dir string
	Key string
}

func Open(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	p := filepath.Join(dir, "editor-key")
	key, e := os.ReadFile(p)
	if os.IsNotExist(e) {
		b := make([]byte, 32)
		if _, e = rand.Read(b); e != nil {
			return nil, e
		}
		key = []byte(hex.EncodeToString(b))
		if e = os.WriteFile(p, key, 0600); e != nil {
			return nil, e
		}
	} else if e != nil {
		return nil, e
	}
	return &Store{dir: dir, Key: string(key)}, nil
}

type state struct {
	Version   int         `json:"version"`
	Draft     Map         `json:"draft"`
	Published Map         `json:"published"`
	Revisions map[int]Map `json:"revisions"`
}

func (s *Store) read() (state, error) {
	b, e := os.ReadFile(filepath.Join(s.dir, "maps-state.json"))
	if os.IsNotExist(e) {
		return state{1, Empty(), Empty(), map[int]Map{}}, nil
	}
	if e != nil {
		return state{}, e
	}
	var v state
	if e = json.Unmarshal(b, &v); e != nil {
		return v, e
	}
	if v.Version != 1 || v.Revisions == nil {
		return v, fmt.Errorf("unsupported map storage; original retained")
	}
	for _, m := range append([]Map{v.Draft, v.Published}, values(v.Revisions)...) {
		if e = m.Validate(); e != nil {
			return v, e
		}
	}
	return v, nil
}
func values(m map[int]Map) []Map {
	v := []Map{}
	for _, a := range m {
		v = append(v, a)
	}
	return v
}
func (s *Store) Published(rev int) (Map, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, e := s.read()
	if e != nil {
		return Map{}, e
	}
	if rev == 0 {
		return v.Published, nil
	}
	m, ok := v.Revisions[rev]
	if !ok {
		return Map{}, fmt.Errorf("published revision unavailable")
	}
	return m, nil
}
func (s *Store) Draft() (Map, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, e := s.read()
	return v.Draft, e
}
func (s *Store) Save(m Map, publish bool) (Map, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if e := m.Validate(); e != nil {
		return m, e
	}
	v, e := s.read()
	if e != nil {
		return m, e
	}
	if m.Revision != v.Draft.Revision {
		return m, fmt.Errorf("map changed: reload before saving")
	}
	m.Revision++
	v.Draft = m
	if publish {
		v.Published = m
		v.Revisions[m.Revision] = m
	}
	b, e := json.Marshal(v)
	if e != nil {
		return m, e
	}
	f, e := os.CreateTemp(s.dir, ".maps-")
	if e != nil {
		return m, e
	}
	defer os.Remove(f.Name())
	if _, e = f.Write(b); e == nil {
		e = f.Sync()
	}
	ce := f.Close()
	if e == nil {
		e = ce
	}
	if e != nil {
		return m, e
	}
	if e = os.Rename(f.Name(), filepath.Join(s.dir, "maps-state.json")); e != nil {
		return m, e
	}
	d, e := os.Open(s.dir)
	if e == nil {
		e = d.Sync()
		d.Close()
	}
	return m, e
}

var currentMu sync.RWMutex
var current = Empty()

func SetPublished(m Map) { currentMu.Lock(); defer currentMu.Unlock(); current = m }
func Current() Map       { currentMu.RLock(); defer currentMu.RUnlock(); return current }
