package sim

import (
	"bytes"
	"encoding/json"
	"math"
	"os"
	"testing"
)

// The embedded scenery must be the client's file, byte for byte.
func TestFrontierMatchesClient(t *testing.T) {
	client, err := os.ReadFile("../../../src/world/maps/frozen-frontier.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(client, frontierJSON) {
		t.Fatal("server/internal/sim/frozen-frontier.json and src/world/maps/frozen-frontier.json differ; copy the client's file")
	}
}

// The columns equal the ones the browser builds (window.__FROZEN_FRONTIER__.columns(), exported by
// scripts/frozen-frontier-map/verify.mjs into docs/frozen-frontier-map/columns-parity.json).
func TestFrontierColumnsMatchClient(t *testing.T) {
	b, err := os.ReadFile("../../../docs/frozen-frontier-map/columns-parity.json")
	if err != nil {
		t.Skip("no browser export yet:", err)
	}
	var client struct {
		Columns []Column `json:"columns"`
	}
	if err := json.Unmarshal(b, &client); err != nil {
		t.Fatal(err)
	}
	if len(client.Columns) != len(frontierColumns) {
		t.Fatalf("browser has %d frontier columns, server %d", len(client.Columns), len(frontierColumns))
	}
	for i, c := range client.Columns {
		s := frontierColumns[i]
		if math.Abs(c.X-s.X) > 1e-6 || math.Abs(c.W-s.W) > 1e-6 || math.Abs(c.Back-s.Back) > 1e-6 || math.Abs(c.Front-s.Front) > 1e-6 {
			t.Fatalf("column %d: browser %+v, server %+v", i, c, s)
		}
	}
}

type frontierPlacement struct {
	A, Zone string
	U, V    float64
	S       float64
}

func frontierPlacements(t *testing.T) ([]frontierPlacement, frontierFile) {
	var f frontierFile
	if err := json.Unmarshal(frontierJSON, &f); err != nil {
		t.Fatal(err)
	}
	var raw struct {
		Placements []struct {
			Zone string `json:"zone"`
		} `json:"placements"`
	}
	if err := json.Unmarshal(frontierJSON, &raw); err != nil {
		t.Fatal(err)
	}
	var m mapFile
	if err := json.Unmarshal(mapJSON, &m); err != nil {
		t.Fatal(err)
	}
	ou, ov := m.Prefabs[0].At.U-stronghold.Anchor.U, m.Prefabs[0].At.V-stronghold.Anchor.V
	var out []frontierPlacement
	for i, p := range raw.Placements {
		q, s := f.Placements[i], 1.0
		if q.S != nil {
			s = *q.S
		}
		out = append(out, frontierPlacement{A: q.A, Zone: p.Zone, U: q.U - ou, V: q.V - ov, S: s})
	}
	return out, f
}

// Scenery stands on flat snow: no prop on a plateau, hill or ramp (they draw over the scenery layer).
func TestFrontierOffRelief(t *testing.T) {
	ps, f := frontierPlacements(t)
	for _, p := range ps {
		if h := HeightAtTile(Vec{p.U, p.V}); h != 0 {
			t.Errorf("%s at (%.2f, %.2f) stands %.2f m up", p.A, p.U, p.V, h)
		}
		for _, r := range f.Kit[p.A].Block {
			for _, c := range [][2]float64{{r[0], r[1]}, {r[2], r[1]}, {r[2], r[3]}, {r[0], r[3]}} {
				if h := HeightAtTile(Vec{p.U + c[0]*p.S, p.V + c[1]*p.S}); h != 0 {
					t.Errorf("%s footprint at (%.2f, %.2f) reaches raised terrain", p.A, p.U, p.V)
				}
			}
		}
	}
}

// Solid props block the server's walk, walk-through plants and paths do not, and the combat ground before the
// gate (where revenants spawn) stays clear.
func TestFrontierCollision(t *testing.T) {
	nav, err := LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	b := NewBlocker(nav)
	ps, f := frontierPlacements(t)
	solid, paths := 0, 0
	for _, p := range ps {
		k := f.Kit[p.A]
		for _, r := range k.Block {
			c := TilePoint(p.U+(r[0]+r[2])/2*p.S, p.V+(r[1]+r[3])/2*p.S)
			if !b.Blocked(c.X, c.Y, true) {
				t.Errorf("%s at (%.2f, %.2f): footprint centre is walkable", p.A, p.U, p.V)
			}
			solid++
		}
		if p.A == "paving" && (p.Zone == "Frontier road" || p.Zone == "Watch road" || p.Zone == "Shrine trail") {
			c := TilePoint(p.U, p.V)
			if b.Blocked(c.X, c.Y, true) {
				t.Errorf("path slab at (%.2f, %.2f) is blocked", p.U, p.V)
			}
			paths++
		}
	}
	if solid < 100 || paths < 30 {
		t.Fatalf("expected many solid footprints and path slabs, got %d and %d", solid, paths)
	}
	// The revenants' spawn arc, 10 m out from the gate (safe-zone.ts spawnPoint), is free of scenery.
	gate := ToTile(stronghold.Gate.Threshold.X, stronghold.Gate.Threshold.Y)
	r := stronghold.SafeZone.SpawnDistanceM / stronghold.SafeZone.MetersPerTile
	for a := math.Pi/4 - math.Pi/3; a <= math.Pi/4+math.Pi/3; a += .05 {
		p := TilePoint(gate.X+math.Cos(a)*r, gate.Y+math.Sin(a)*r)
		if hits(buckets(frontierColumns), p.X, p.Y) {
			t.Errorf("scenery blocks the spawn arc at angle %.2f", a)
		}
	}
	// The road runs through the ruined gate between its piers.
	for _, p := range ps {
		if p.A != "ruined-gate" {
			continue
		}
		mid := TilePoint(p.U+(-0.65+0.35)/2, p.V)
		if b.Blocked(mid.X, mid.Y, true) {
			t.Errorf("the passage through the ruined gate at (%.2f, %.2f) is blocked", p.U, p.V)
		}
	}
}
