package sim

import (
	"bytes"
	"math"
	"os"
	"testing"
)

// The embedded prefab must be the client's file, byte for byte.
func TestPrefabMatchesClient(t *testing.T) {
	client, err := os.ReadFile("../../../src/stronghold/prefabs/stronghold.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(client, strongholdJSON) {
		t.Fatal("server/internal/sim/stronghold.json and src/stronghold/prefabs/stronghold.json differ; copy the client's file")
	}
}

// The prefab reproduces the court numbers the simulation hard-coded before it became data.
func TestPrefabKeepsCourtGeometry(t *testing.T) {
	for _, c := range []struct {
		name      string
		got, want float64
	}{
		{"courtX", courtX, 577}, {"courtY", courtY, -160}, {"courtSize", courtSize, 15},
		{"gateTile", gateTile, 958.0 / 64}, {"safeLine", safeLine, 958.0 / 32},
		{"metersPerTile", metersPerTile, 3}, {"spawnDistanceM", spawnDistanceM, 10},
		{"towerFront(36)", gateTowerFront(36), 782}, {"towerFront(60)", gateTowerFront(60), 782 + 24*.42},
		{"towerFront(86)", gateTowerFront(86), 803}, {"towerFront(135)", gateTowerFront(135), 803 - 49*.62},
		{"heroSpawn.X", heroSpawn.X, 590}, {"heroSpawn.Y", heroSpawn.Y, 420},
	} {
		if c.got != c.want {
			t.Errorf("%s = %v, want %v", c.name, c.got, c.want)
		}
	}
	if gateFrames != 16 || (Gate{Frame: 11}).Passable() || !(Gate{Frame: 12}).Passable() {
		t.Errorf("gate frames %d: passable must start at frame 12 of 16", gateFrames)
	}
	if open, closed := len(gateColumns(true)), len(gateColumns(false)); open != 68 || closed != 68+24 {
		t.Errorf("gate columns open %d closed %d, want 68 and 92", open, closed)
	}
	for _, p := range []struct {
		x, y float64
		want bool
	}{
		{577, 420, true}, {577, 750, true}, {577, 709, true}, {650, 740, false}, {650, 760, false}, {650, 800, true},
		{577, 900, true}, {-300, 300, false}, {1500, 400, false}, {1500, 700, true},
		{577, -300, true}, {250, -300, true},
	} {
		if got := walkableGround(p.x, p.y); got != p.want {
			t.Errorf("walkableGround(%v, %v) = %v, want %v", p.x, p.y, got, p.want)
		}
	}
}

// walkableGround from the prefab agrees everywhere with the hard-coded rule it replaced.
func TestPrefabWalkableMatchesHardcoded(t *testing.T) {
	front := func(d float64) float64 {
		if d < 86 {
			return 782 + (d-36)*.42
		}
		return 803 - (d-86)*.62
	}
	old := func(x, y float64) bool {
		g := unproject(x-577, y+160)
		court := g.X >= .5 && g.Y >= .5 && g.X <= 14.5 && g.Y <= 14.5
		d := math.Abs(x - 577)
		return court || y >= 710 && (d < 36 || d <= 135 && y >= front(d)) || g.X <= -1.5 || g.Y <= -1.5 || g.X >= 16.5 || g.Y >= 16.5
	}
	for y := -400.0; y <= 1500; y += 1.5 {
		for x := -800.0; x <= 2000; x += 1.5 {
			if walkableGround(x, y) != old(x, y) {
				t.Fatalf("walkableGround(%v, %v) changed", x, y)
			}
		}
	}
}
