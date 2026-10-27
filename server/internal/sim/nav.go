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
	step, doors := gateSpec.ColumnStep, &gateSpec.Doors
	for _, side := range []float64{-1, 1} {
		for d := gateSpec.ArchHalfWidth; d <= gateSpec.TowerHalfSpan; d += step {
			front := gateTowerFront(d)
			cols = append(cols, Column{X: gateSpec.X + side*d, W: step, Back: front - gateSpec.TowerDepth, Front: front})
		}
	}
	if !passable {
		for d := -doors.HalfWidth; d <= doors.HalfWidth; d += step {
			cols = append(cols, Column{X: gateSpec.X + d, W: step, Back: doors.Back, Front: doors.Front})
		}
	}
	return cols
}

// Blocker answers whether a hero foot may stand at a world px (hero.ts blocked()). Columns are bucketed by
// 32 px of x so a check scans only its neighbours.
type Blocker struct {
	static, open, closed map[int][]Column
	extra                map[int][]Column
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

// NewBlocker prepares the static columns (the court's plus the Frozen Frontier's) and both gate states.
func NewBlocker(n *Nav) *Blocker {
	static := append(append([]Column{}, n.Columns...), frontierColumns...)
	return &Blocker{static: buckets(static), open: buckets(gateColumns(true)), closed: buckets(gateColumns(false))}
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
	if !walkableGround(x, y) || reliefBlockedTile(ToTile(x, y)) {
		return true
	}
	gate := b.closed
	if gatePassable {
		gate = b.open
	}
	return hits(b.extra, x, y) || hits(b.static, x, y) || hits(gate, x, y)
}
