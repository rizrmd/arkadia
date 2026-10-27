package sim

import (
	"math"
	"testing"
)

func TestFlameFanSectorEveryRank(t *testing.T) {
	for rank := 1; rank <= 5; rank++ {
		area := 1 + float64(rank-1)*.18
		for _, angle := range []float64{0, .7, -.7} {
			if !flameFanContains(Vec{}, Vec{1, 0}, Vec{2 * math.Cos(angle), 2 * math.Sin(angle)}, area) {
				t.Fatalf("rank %d misses fan target", rank)
			}
		}
		for _, target := range []Vec{{-1, 0}, {0, 2}, {4.4*area + .4, 0}} {
			if flameFanContains(Vec{}, Vec{1, 0}, target, area) {
				t.Fatalf("rank %d hits excluded target %v", rank, target)
			}
		}
	}
}

func TestFlameFanAutoCastHitsAllTargetsAtLevelOne(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("fan", "Fan", 100)
	p.Hero = "ember-warden"
	p.Run = newProgressionForHero("ember-warden")
	at := Vec{gateTile + 4, gateTile + 4}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	w.Enemies = nil
	for i := 0; i < 6; i++ {
		pos := Vec{at.X + 1.2 + float64(i)*.1, at.Y + .3}
		e := &Enemy{ID: i + 1, F: newFighter(Revenant, pos), Home: pos}
		e.F.HP = 100
		w.Enemies = append(w.Enemies, e)
	}
	w.autoCastInAoE(p)
	w.stepFlameFans(p, 420)
	for _, e := range w.Enemies {
		if e.F.HP >= 100 {
			t.Fatalf("Lv.1 missed target %d", e.ID)
		}
	}
}

func TestFlameFanReleaseCapturesGeometryRankAndDamageEveryRank(t *testing.T) {
	for rank := 1; rank <= 5; rank++ {
		w := newTestWorld(t)
		p := w.AddPlayer("capture", "Capture", 100)
		p.Hero = "ember-warden"
		p.Run = newProgressionForHero(p.Hero)
		p.Run.Skills["flame-fan"] = rank
		at := Vec{gateTile + 4, gateTile + 4}
		px := TilePoint(at.X, at.Y)
		p.X, p.Y, p.F.Pos = px.X, px.Y, at
		positions := []Vec{{at.X + 1.3, at.Y}, {at.X + 2, at.Y + .5}, {at.X + 2, at.Y - .5}, {at.X - 2, at.Y}, {at.X + 9, at.Y}}
		w.Enemies = nil
		for i, pos := range positions {
			e := &Enemy{ID: i + 1, F: newFighter(Revenant, pos), Home: pos}
			e.F.HP = 100
			w.Enemies = append(w.Enemies, e)
		}
		w.autoCastInAoE(p)
		if len(p.flameFans) != 1 {
			t.Fatalf("rank %d missing queued cast", rank)
		}
		cast := p.flameFans[0]
		if cast.Rank != rank || math.Abs(cast.Area-(1+float64(rank-1)*.18)) > 1e-7 {
			t.Fatal("rank contract changed")
		}
		if p.Run.CastGeometry == nil || p.Run.CastGeometry.FromU != at.X || p.Run.CastGeometry.TargetU != positions[0].X {
			t.Fatal("snapshot geometry missing")
		}
		// Movement and upgrade during windup cannot retarget or upgrade the already cast fan.
		p.F.Pos = Vec{at.X + 10, at.Y + 10}
		p.Run.Skills["flame-fan"] = 5
		w.stepFlameFans(p, 419)
		for _, e := range w.Enemies {
			if e.F.HP != 100 {
				t.Fatal("damage before release")
			}
		}
		w.stepFlameFans(p, 1)
		for i, e := range w.Enemies {
			want := 100.0
			if i < 3 {
				want -= cast.Damage
			}
			if e.F.HP != want {
				t.Fatalf("rank %d target %d hp=%v want=%v", rank, i, e.F.HP, want)
			}
		}
		if len(p.flameFans) != 0 {
			t.Fatal("released fan retained")
		}
		wantSoil := 0
		if rank >= 3 {
			wantSoil = 1
		}
		if len(p.burnSoils) != wantSoil {
			t.Fatalf("rank %d soil gate changed during windup", rank)
		}
		hp := w.Enemies[0].F.HP
		w.stepFlameFans(p, 1000)
		if w.Enemies[0].F.HP != hp {
			t.Fatal("duplicate damage")
		}
	}
}

func TestFlameFanPendingReleaseSurvivesCheckpoint(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("resume-fan", "Resume", 100)
	p.Hero = "ember-warden"
	p.Run = newProgressionForHero(p.Hero)
	p.Run.Skills["flame-fan"] = 5
	p.F.Pos = Vec{gateTile + 4, gateTile + 4}
	at := Vec{p.F.Pos.X + 1.3, p.F.Pos.Y}
	e := &Enemy{ID: 1, F: newFighter(Revenant, at), Home: at}
	e.F.HP = 100
	w.Enemies = []*Enemy{e}
	w.autoCastInAoE(p)
	w.stepFlameFans(p, 200)
	raw, err := w.Checkpoint()
	if err != nil {
		t.Fatal(err)
	}
	restored, err := RestoreCheckpoint(w.nav, raw)
	if err != nil {
		t.Fatal(err)
	}
	rp := restored.retired[p.ID]
	if rp == nil || len(rp.flameFans) != 1 || rp.flameFans[0].Elapsed != 200 {
		t.Fatal("pending release lost")
	}
	restored.stepFlameFans(rp, 219)
	if restored.Enemies[0].F.HP != 100 {
		t.Fatal("offline time advanced cast")
	}
	restored.stepFlameFans(rp, 1)
	hp := restored.Enemies[0].F.HP
	if hp >= 100 || len(rp.burnSoils) != 1 {
		t.Fatal("restored release missing")
	}
	restored.stepFlameFans(rp, 1000)
	if restored.Enemies[0].F.HP != hp {
		t.Fatal("restored release duplicated")
	}
}
