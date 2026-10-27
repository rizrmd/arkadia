package sim

import (
	"math"
	"testing"
)

func TestDetourEscapesConcaveFootprint(t *testing.T) {
	free := func(p Vec) bool {
		return !(p.X > -2 && p.X < 2 && p.Y > -1 && p.Y < 0) && !(math.Abs(p.X) > 1.5 && math.Abs(p.X) < 2 && p.Y >= 0 && p.Y < 3)
	}
	clear := func(a, b Vec) bool { return navClear(a, b, free, func(Vec, Vec) bool { return false }) }
	p, target := Vec{0, 1}, Vec{0, -2}
	s := detourState{}
	away := false
	for i := 0; i < 600 && hypot(p.X-target.X, p.Y-target.Y) > .08; i++ {
		next, ok := detourDirection(&s, p, target, 50, clear)
		if !ok {
			t.Fatal("no escape route")
		}
		dx, dy := next.X-p.X, next.Y-p.Y
		d := hypot(dx, dy)
		step := math.Min(d, .04)
		q := Vec{p.X + dx/d*step, p.Y + dy/d*step}
		if !clear(p, q) {
			t.Fatalf("route crossed obstacle: %v -> %v", p, q)
		}
		p = q
		away = away || p.Y > 2.8
	}
	if !away || hypot(p.X-target.X, p.Y-target.Y) >= .08 {
		t.Fatalf("did not escape U: %v", p)
	}
	target = Vec{4, 2}
	if _, ok := detourDirection(&s, p, target, 50, clear); !ok {
		t.Fatal("moving target did not replan")
	}
}
func TestDetourSweepsThinObstaclesAndCliffs(t *testing.T) {
	a, b := Vec{0, 0}, Vec{1, 0}
	if navClear(a, b, func(p Vec) bool { return p.X < .45 || p.X > .55 }, func(Vec, Vec) bool { return false }) {
		t.Fatal("crossed thin footprint")
	}
	if navClear(a, b, func(Vec) bool { return true }, func(a, b Vec) bool { return a.X < .5 && b.X >= .5 }) {
		t.Fatal("crossed cliff")
	}
	free := func(p Vec) bool { return hypot(p.X, p.Y) < 1 }
	clear := func(a, b Vec) bool { return navClear(a, b, free, func(Vec, Vec) bool { return false }) }
	points := planDetour(a, Vec{3, 0}, clear)
	for _, p := range points {
		if !clear(a, p) {
			t.Fatal("unreachable target produced illegal route")
		}
		a = p
	}
}
