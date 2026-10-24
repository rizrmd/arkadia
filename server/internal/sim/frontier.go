package sim

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
)

// The Frozen Frontier scenery (src/world/maps/frozen-frontier.json): ruins, landmarks and winter plants on the
// snow around the Stronghold. frozen-frontier.json is a byte-identical copy of the client's file;
// TestFrontierMatchesClient fails when they differ. Its solid footprints become columns by the client's rule
// (src/world/frontier.ts rectColumns), step for step, so the server blocks exactly where the hero is blocked.
type frontierFile struct {
	Kit map[string]struct {
		Layer string       `json:"layer"`
		Block [][4]float64 `json:"block"`
	} `json:"kit"`
	Placements []struct {
		A string   `json:"a"`
		U float64  `json:"u"`
		V float64  `json:"v"`
		S *float64 `json:"s"`
	} `json:"placements"`
}

//go:embed frozen-frontier.json
var frontierJSON []byte

// frontierColumns are the scenery's solid footprint columns, appended to the court's (NewBlocker).
var frontierColumns = mustFrontier(frontierJSON, mapJSON)

// frontierColumn is the column width in world px (frontier.ts COLUMN).
const frontierColumn = 4.0

// rectColumns mirrors frontier.ts rectColumns: the tile rectangle r around (u, v), scaled by s, as columns
// frontierColumn px wide spanning its back and front edges on screen.
func rectColumns(u, v, s float64, r [4]float64) []Column {
	corners := [4][2]float64{{r[0], r[1]}, {r[2], r[1]}, {r[2], r[3]}, {r[0], r[3]}}
	var pts [4]Vec
	x0, x1 := math.Inf(1), math.Inf(-1)
	for i, c := range corners {
		pts[i] = TilePoint(u+c[0]*s, v+c[1]*s)
		x0, x1 = math.Min(x0, pts[i].X), math.Max(x1, pts[i].X)
	}
	n := math.Max(1, math.Ceil((x1-x0)/frontierColumn))
	w := (x1 - x0) / n
	cols := make([]Column, 0, int(n))
	for i := 0.0; i < n; i++ {
		x := x0 + (i+.5)*w
		back, front := math.Inf(1), math.Inf(-1)
		for j := 0; j < 4; j++ {
			p, q := pts[j], pts[(j+1)%4]
			if p.X == q.X || x < math.Min(p.X, q.X) || x > math.Max(p.X, q.X) {
				continue
			}
			y := p.Y + (q.Y-p.Y)*(x-p.X)/(q.X-p.X)
			back, front = math.Min(back, y), math.Max(front, y)
		}
		cols = append(cols, Column{X: x, W: w, Back: back, Front: front})
	}
	return cols
}

func mustFrontier(b, mapBytes []byte) []Column {
	var f frontierFile
	if err := json.Unmarshal(b, &f); err != nil {
		panic(fmt.Errorf("frozen-frontier.json: %w", err))
	}
	var m mapFile
	if err := json.Unmarshal(mapBytes, &m); err != nil {
		panic(fmt.Errorf("arkodia-01.json: %w", err))
	}
	var ou, ov float64
	for _, p := range m.Prefabs {
		if p.Prefab == "stronghold" {
			ou, ov = p.At.U-stronghold.Anchor.U, p.At.V-stronghold.Anchor.V
		}
	}
	var cols []Column
	for _, p := range f.Placements {
		k, ok := f.Kit[p.A]
		if !ok {
			panic("frozen-frontier.json: unknown sprite " + p.A)
		}
		if k.Layer == "cap" {
			continue
		}
		s := 1.0
		if p.S != nil {
			s = *p.S
		}
		for _, r := range k.Block {
			cols = append(cols, rectColumns(p.U-ou, p.V-ov, s, r)...)
		}
	}
	return cols
}
