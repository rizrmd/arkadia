package sim

import (
	"bytes"
	"math"
	"os"
	"testing"
)

// The embedded map must be the client's file, byte for byte.
func TestMapMatchesClient(t *testing.T) {
	client, err := os.ReadFile("../../../src/world/maps/arkodia-01.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(client, mapJSON) {
		t.Fatal("server/internal/sim/arkodia-01.json and src/world/maps/arkodia-01.json differ; copy the client's file")
	}
}

func TestReliefHeights(t *testing.T) {
	for _, c := range []struct {
		u, v, want float64
	}{
		{25.5, 7.5, 3}, {23, 5, 3}, {27.99, 9.99, 3}, {28, 7.5, 0}, {22.99, 7.5, 0},
		{25, 10, 3}, {25, 11.5, 1.5}, {25, 12.99, 3 * .01 / 3}, {25, 13, 0},
		{5, 25, 1.5}, {9.5, 25, .75}, {7.5, 7.5, 0}, {590, 420, 0},
	} {
		if got := HeightAtTile(Vec{c.u, c.v}); math.Abs(got-c.want) > 1e-9 {
			t.Errorf("HeightAtTile(%v, %v) = %v, want %v", c.u, c.v, got, c.want)
		}
	}
}

// walk holds a screen-space direction for seconds of 50 ms ticks and returns the final ground tile.
func walk(w *World, from Vec, d Vec, seconds float64) Vec {
	p := TilePoint(from.X, from.Y)
	l := hypot(d.X, d.Y)
	for i := 0.0; i < seconds*20; i++ {
		p.X, p.Y, _ = WalkStep(w.nav, p.X, p.Y, Vec{d.X / l, d.Y / l}, TickMS, false)
	}
	return ToTile(p.X, p.Y)
}

func TestCliffsBlockAndRampsClimb(t *testing.T) {
	w := newTestWorld(t)
	up, down, left, right := Vec{-64, -32}, Vec{64, 32}, Vec{64, -32}, Vec{-64, 32} // -u, +u, -v, +v on the ground
	// Into the ridge's lit face from the snow below: stopped at the foot.
	if g := walk(w, Vec{29.5, 7.5}, up, 3); g.X < 28-.05 || HeightAtTile(g) != 0 {
		t.Errorf("walked into the cliff face: ended at %v (height %v)", g, HeightAtTile(g))
	}
	// Up the ramp onto the ridge.
	if g := walk(w, Vec{25.5, 13.8}, left, 4); HeightAtTile(g) != 3 || g.Y > 9.5 {
		t.Errorf("ramp climb ended at %v (height %v), want on top of the ridge", g, HeightAtTile(g))
	}
	// Off the ridge's back edge: no drop.
	if g := walk(w, Vec{25.5, 6}, left, 3); HeightAtTile(g) != 3 || g.Y < 5-.05 {
		t.Errorf("walked off the ridge's back edge: ended at %v (height %v)", g, HeightAtTile(g))
	}
	// Off the ramp's open side: blocked at its edge.
	if g := walk(w, Vec{25.5, 11.5}, down, 3); g.X > 26+.05 || HeightAtTile(g) < .4 {
		t.Errorf("walked off the ramp's side: ended at %v (height %v)", g, HeightAtTile(g))
	}
	// Flat ground is untouched: the court walk is unchanged.
	if g := walk(w, Vec{7.5, 9}, right, .5); HeightAtTile(g) != 0 || math.Abs(g.Y-9) < .5 {
		t.Errorf("court walk changed: ended at %v", g)
	}
	if !cliffTile(Vec{29, 7.5}, Vec{27.9, 7.5}) || cliffTile(Vec{25, 12.9}, Vec{25, 12.8}) {
		t.Error("cliffTile must block the face and pass the ramp")
	}
}
