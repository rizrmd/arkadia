package sim

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
)

// Column is one ground-footprint column of an upright sprite (world-view.ts footprint()): it blocks a hero whose
// foot is within W/2+radius across and between Back and Front on screen.
type Column struct {
	X     float64 `json:"x"`
	W     float64 `json:"w"`
	Back  float64 `json:"back"`
	Front float64 `json:"front"`
}

// Nav is the collision data the browser derives from the sprite art, exported by scripts/export-coop-nav.mjs for
// the camp layout every room uses. The gate's towers and doors are not in it: they follow gateColumns.
type Nav struct {
	Version int      `json:"version"`
	Layout  []string `json:"layout"`
	Columns []Column `json:"columns"`
}

//go:embed nav.json
var navJSON []byte

// LoadNav parses the embedded collision data.
func LoadNav() (*Nav, error) {
	var n Nav
	if err := json.Unmarshal(navJSON, &n); err != nil {
		return nil, fmt.Errorf("nav.json: %w", err)
	}
	if n.Version != 1 || len(n.Columns) == 0 {
		return nil, fmt.Errorf("nav.json: unsupported version %d or no columns", n.Version)
	}
	return &n, nil
}

// heroRadius is the hero's foot radius in world px (hero.ts RADIUS).
const heroRadius = 9.0

// gateColumns mirrors world-view.ts gateFootprint(): both towers always, the closed doors until passable.
func gateColumns(passable bool) []Column {
	var cols []Column
	for _, side := range []float64{-1, 1} {
		for d := 36.0; d <= 135; d += 3 {
			front := gateTowerFront(d)
			cols = append(cols, Column{X: 577 + side*d, W: 3, Back: front - 34, Front: front})
		}
	}
	if !passable {
		for d := -35.0; d <= 35; d += 3 {
			cols = append(cols, Column{X: 577 + d, W: 3, Back: 763, Front: 775})
		}
	}
	return cols
}

// Blocker answers whether a hero foot may stand at a world px (hero.ts blocked()). Columns are bucketed by
// 32 px of x so a check scans only its neighbours.
type Blocker struct {
	static, open, closed map[int][]Column
}

const bucket = 32.0

func buckets(cols []Column) map[int][]Column {
	m := map[int][]Column{}
	for _, c := range cols {
		reach := c.W/2 + heroRadius
		for k := int(math.Floor((c.X - reach) / bucket)); k <= int(math.Floor((c.X+reach)/bucket)); k++ {
			m[k] = append(m[k], c)
		}
	}
	return m
}

// NewBlocker prepares the static columns plus both gate states.
func NewBlocker(n *Nav) *Blocker {
	return &Blocker{static: buckets(n.Columns), open: buckets(gateColumns(true)), closed: buckets(gateColumns(false))}
}

func hits(cols map[int][]Column, x, y float64) bool {
	for _, b := range cols[int(math.Floor(x/bucket))] {
		if math.Abs(x-b.X) < b.W/2+heroRadius && y > b.Back-heroRadius*.5 && y < b.Front+heroRadius*.5 {
			return true
		}
	}
	return false
}

// Blocked reports whether the point is off walkable ground or inside a footprint.
func (b *Blocker) Blocked(x, y float64, gatePassable bool) bool {
	if !walkableGround(x, y) {
		return true
	}
	gate := b.closed
	if gatePassable {
		gate = b.open
	}
	return hits(b.static, x, y) || hits(gate, x, y)
}
