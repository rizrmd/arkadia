package sim

import (
	"reflect"
	"testing"
)

func TestBurnSoilDeadlinesAcrossCadences(t *testing.T) {
	for _, dt := range []float64{1000.0 / 144, 1000.0 / 60, 1000.0 / 30, 200, 750, 1200} {
		z := burnSoilZone{}
		var got []float64
		for z.Elapsed < 1300 {
			z.advance(dt, func(at float64) { got = append(got, at) })
		}
		if !reflect.DeepEqual(got, []float64{200, 400, 600, 800, 1000}) {
			t.Fatalf("dt %v: %v", dt, got)
		}
	}
}
func TestBurnSoilLevelGateAndPendingBalance(t *testing.T) {
	for rank := 1; rank <= 5; rank++ {
		w := newTestWorld(t)
		p := w.AddPlayer("burn", "Burn", 100)
		p.Hero = "ember-warden"
		p.Run = newProgressionForHero("ember-warden")
		p.Run.Skills["flame-fan"] = rank
		at := Vec{gateTile + 4, gateTile + 4}
		px := TilePoint(at.X, at.Y)
		p.X, p.Y, p.F.Pos = px.X, px.Y, at
		pos := Vec{at.X + 1.2, at.Y + .3}
		e := &Enemy{ID: 1, F: newFighter(Revenant, pos), Home: pos}
		e.F.HP = 100
		w.Enemies = []*Enemy{e}
		w.autoCastInAoE(p)
		hp := e.F.HP
		if hp >= 100 {
			t.Fatal("initial hit missing")
		}
		if rank < 3 && len(p.burnSoils) != 0 {
			t.Fatal("low rank soil")
		}
		if rank >= 3 && len(p.burnSoils) != 1 {
			t.Fatal("high rank soil missing")
		}
		w.stepBurnSoil(p, 199)
		if p.burnSoilTicks != 0 {
			t.Fatal("early tick")
		}
		w.stepBurnSoil(p, 801)
		want := 0
		if rank >= 3 {
			want = 5
		}
		if p.burnSoilTicks != want || len(p.burnSoils) != 0 {
			t.Fatalf("rank %d ticks=%d", rank, p.burnSoilTicks)
		}
		if e.F.HP != hp || burnSoilDamagePerTick != nil {
			t.Fatal("unapproved damage")
		}
	}
}
