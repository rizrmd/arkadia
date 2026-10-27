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
	if p.F.Pos != start {
		t.Fatal("dash teleported at cast")
	}
	w.stepRiftDash(p, 130)
	if d := hypot(p.F.Pos.X-start.X, p.F.Pos.Y-start.Y); d <= 0 || d > 1.5001 {
		t.Fatalf("invalid displacement %v", d)
	}
	if p.F.Pos.Y != start.Y || p.F.Pos.X <= start.X {
		t.Fatal("direction ignored")
	}
	w.stepRiftDash(p, 130)
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

func TestRiftDashEightDirectionsTimed(t *testing.T) {
	for i := 0; i < 8; i++ {
		w := newTestWorld(t)
		p := w.AddPlayer("dash", "Dash", 100)
		p.Hero = "rift-runner"
		p.Run.Skills["rift-dash"] = 1
		p.Run.Slots = []string{"rift-bolt", "rift-dash"}
		// Wide navigable clearing, outside auto-combat range.
		at := Vec{}
		found := false
		for u := 18.; u < 60 && !found; u += .5 {
			for v := 18.; v < 60 && !found; v += .5 {
				ok := true
				for j := 0; j < 32; j++ {
					a := float64(j) * math.Pi / 16
					q := TilePoint(u+math.Cos(a)*1.6, v+math.Sin(a)*1.6)
					if w.nav.Blocked(q.X, q.Y, true) {
						ok = false
						break
					}
				}
				if ok {
					at = Vec{u, v}
					found = true
				}
			}
		}
		if !found {
			t.Fatal("no clearing")
		}
		px := TilePoint(at.X, at.Y)
		p.X, p.Y, p.F.Pos = px.X, px.Y, at
		a := float64(i) * math.Pi / 4
		du, dv := math.Cos(a), math.Sin(a)
		if !w.manualRiftDash(p, du, dv) {
			t.Fatalf("direction %d rejected", i)
		}
		if p.F.Pos != at {
			t.Fatal("instant cast")
		}
		for frame := 1; frame <= 13; frame++ {
			w.stepRiftDash(p, 20)
			expected := 1.5 * float64(frame) / 13
			got := p.F.Pos
			if math.Abs(got.X-(at.X+du*expected)) > .0001 || math.Abs(got.Y-(at.Y+dv*expected)) > .0001 {
				t.Fatalf("heading %d frame %d: %v", i, frame, got)
			}
		}
		if p.dashTravel != nil {
			t.Fatal("travel never ended")
		}
	}
}

func TestRiftDashDamageWaitsForArrival(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-dash"}
	start := p.F.Pos
	if !w.manualRiftDash(p, 1, 0) {
		t.Fatal("dash rejected")
	}
	end := p.dashTravel.to
	e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{end.X + .1, end.Y}), Home: start}
	e.F.HP = 100
	w.Enemies = []*Enemy{e}
	w.stepRiftDash(p, 240)
	if e.F.HP != 100 {
		t.Fatal("damage before arrival")
	}
	w.stepRiftDash(p, 20)
	if e.F.HP >= 100 {
		t.Fatal("arrival did not damage")
	}
}

func TestRiftDashQueuedBurstDoesNotAccelerateTravel(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-dash"}
	start := p.F.Pos
	for i := 1; i <= 8; i++ {
		p.Queue(Input{Seq: uint32(i), X: 1, Dash: i == 1, DashU: 1})
	}
	w.Step()
	if p.Run.ManualDashes != 1 || p.Run.DashElapsed != TickMS {
		t.Fatalf("burst accelerated dash: %v", p.Run.DashElapsed)
	}
	if d := hypot(p.F.Pos.X-start.X, p.F.Pos.Y-start.Y); math.Abs(d-1.5*TickMS/260) > .0001 {
		t.Fatalf("burst displacement %v", d)
	}
}

func TestRiftDashLateInputClearsGuessesAfterReplay(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("dash", "Dash", 100)
	p.Hero = "rift-runner"
	p.Run.Skills["rift-dash"] = 1
	p.Run.Slots = []string{"rift-dash"}
	p.Queue(Input{Seq: 1, X: 1})
	w.Step()
	w.Step()
	w.Step()
	if p.Owed == 0 {
		t.Fatal("test must exercise late replay")
	}
	p.Queue(Input{Seq: 2, Dash: true, DashU: 1})
	p.Queue(Input{Seq: 3})
	w.Step()
	if p.Owed != 0 || p.Run.DashElapsed != TickMS || p.Run.ManualDashes != 1 {
		t.Fatalf("invalid replay accounting: owed=%d elapsed=%v", p.Owed, p.Run.DashElapsed)
	}
}
