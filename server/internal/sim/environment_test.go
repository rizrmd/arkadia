package sim

import (
	"github.com/rizrmd/arkadia/server/internal/environment"
	"math"
	"testing"
)

func TestAuthoredSpawnDistributionAndCheckpoint(t *testing.T) {
	defer environment.SetPublished(environment.Empty())
	m := environment.Empty()
	m.Revision = 4
	m.Objects = []environment.Object{{ID: "north", Asset: "spawn", U: 430, V: 430, Count: 4, Radius: 12, Interval: 3}, {ID: "south", Asset: "spawn", U: 520, V: 520, Count: 3, Radius: 9, Interval: 7}}
	environment.SetPublished(m)
	nav, e := LoadNav()
	if e != nil {
		t.Fatal(e)
	}
	w := NewWorld(NewBlocker(nav), .5, 4)
	w.AddPlayer("hero", "Hero", 100)
	w.Step()
	if len(w.Enemies) != 7 {
		t.Fatalf("spawn population %d", len(w.Enemies))
	}
	for _, e := range w.Enemies {
		var marker environment.Object
		for _, o := range m.Objects {
			if o.ID == e.SpawnID {
				marker = o
			}
		}
		if math.Hypot(e.Home.X-(marker.U-460.5), e.Home.Y-(marker.V-460.5))*3 > marker.Radius {
			t.Fatal("spawn outside marker radius")
		}
	}
	raw, e := w.Checkpoint()
	if e != nil {
		t.Fatal(e)
	}
	environment.SetPublished(environment.Empty())
	restored, e := RestoreCheckpoint(NewBlocker(nav), raw)
	if e != nil || restored.Environment.Revision != 4 || len(restored.Enemies) != 7 || restored.SpawnTimers["south"] != w.SpawnTimers["south"] {
		t.Fatal("saved map or timers changed", e)
	}
	for i := 0; i < 100; i++ {
		w.Step()
	}
	if len(w.Enemies) != 7 {
		t.Fatal("spawn cap exceeded")
	}
}
func TestAuthoredCollisionAndPondTraversal(t *testing.T) {
	nav, _ := LoadNav()
	for _, kind := range []string{"pond-small", "pond-large", "tent", "cliff", "stronghold"} {
		m := environment.Empty()
		m.Revision = 2
		m.Objects = []environment.Object{{ID: "asset", Asset: kind, U: 520, V: 520}}
		w := NewWorld(NewBlocker(nav), .5, 3)
		w.Environment = m
		w.initEnvironment()
		p := TilePoint(59.5, 59.5)
		blocked := w.nav.Blocked(p.X, p.Y, true)
		if kind == "pond-small" || kind == "pond-large" {
			if blocked {
				t.Fatal("pond blocked actor", kind)
			}
		} else if kind != "stronghold" && !blocked {
			t.Fatal("solid asset walkable", kind)
		}
	}
}
