package sim

import (
	"math"
	"testing"
)

func TestRiftDashManualDisplacementAndCooldown(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-bolt", "rift-dash"}
	start := p.F.Pos
	if !w.manualRiftDash(p, 1, 0) {
		t.Fatal("equipped dash rejected")
	}
	if d := hypot(p.F.Pos.X-start.X, p.F.Pos.Y-start.Y); d <= 0 || d > 1.5001 {
		t.Fatalf("invalid displacement %v", d)
	}
	if p.F.Pos.Y != start.Y || p.F.Pos.X <= start.X {
		t.Fatal("direction ignored")
	}
	after := p.F.Pos
	if w.manualRiftDash(p, -1, 0) || p.F.Pos != after {
		t.Fatal("cooldown allows recast")
	}
	p.slotCD[1] = 0
	if w.manualRiftDash(p, math.NaN(), 1) || w.manualRiftDash(p, 0, 0) || w.manualRiftDash(p, math.Inf(1), 0) {
		t.Fatal("invalid aim accepted")
	}
	p.Run.Slots = []string{"rift-bolt"}
	if w.manualRiftDash(p, 1, 0) {
		t.Fatal("unequipped dash accepted")
	}
}

func TestRiftDashExcludedFromAutoCast(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-bolt", "rift-dash"}
	at := Vec{gateTile + 4, gateTile + 4}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{at.X + 1, at.Y}), Home: at}
	e.F.HP = 100
	w.Enemies = []*Enemy{e}
	w.autoCastInAoE(p)
	if p.slotCD[1] != 0 || p.Run.ManualDashes != 0 || p.F.Pos != at {
		t.Fatal("dash auto-cast")
	}
	if p.slotCD[0] <= 0 || e.F.HP >= 100 {
		t.Fatal("Rift Bolt auto-cast changed")
	}
}

func TestRiftDashQueuedInput(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-bolt", "rift-dash"}
	start := p.F.Pos
	p.Queue(Input{Seq: 1, Dash: true, DashU: 1, DashV: 0})
	w.Step()
	if p.Run.ManualDashes != 1 || p.F.Pos.X <= start.X || p.Ack != 1 {
		t.Fatal("queued dash did not reach simulation")
	}
}
