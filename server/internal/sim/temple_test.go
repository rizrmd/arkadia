package sim

import (
	"math"
	"testing"
)

func TestTempleHeightAndTraversal(t *testing.T) {
	for _, c := range []struct{ u, v, h float64 }{{18.4, 32, 25.3 / 24}, {19.679, 32, 12.65 / 24}, {20.1, 32, 0}} {
		if h := HeightAtTile(Vec{c.u, c.v}); math.Abs(h-c.h) > 1e-8 {
			t.Fatalf("height at %.3f,%.3f = %v, want %v", c.u, c.v, h, c.h)
		}
	}
	w := newTestWorld(t)
	up := walk(w, Vec{20.15, 32}, Vec{-64, -32}, 1.15)
	if up.X >= 19.379 || HeightAtTile(up) < 1 {
		t.Fatalf("stair climb did not reach altar: %+v", up)
	}
	down := walk(w, Vec{19, 32}, Vec{64, 32}, 1.05)
	if down.X <= 19.979 || HeightAtTile(down) != 0 {
		t.Fatalf("stair descent did not reach snow: %+v", down)
	}
	side := walk(w, Vec{20.15, 31.4}, Vec{-64, -32}, 1.3)
	if side.X < 19.379 {
		t.Fatalf("walked through podium side: %+v", side)
	}
	if !w.nav.Blocked(TilePoint(19.18, 30.2).X, TilePoint(19.18, 30.2).Y, true) {
		t.Fatal("pillar footprint should remain solid")
	}
}
