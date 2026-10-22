package sim

import (
	"math"
	"testing"
)

func TestRunRewardsAndChoices(t *testing.T) {
	w := NewWorld(nil, .5, 1)
	p := &Player{Run: newProgression(), MaxHP: 100, F: newFighter(Hero, Vec{})}
	if math.Abs(p.Run.critChance()-.15) > 1e-6 || math.Abs(p.Run.critMultiplier()-1.5) > 1e-6 {
		t.Fatalf("unexpected base crit stats: chance=%v mult=%v", p.Run.critChance(), p.Run.critMultiplier())
	}
	w.reward(p)
	if p.Run.Gold != 5 || p.Run.XP != 10 || p.Run.Level != 1 {
		t.Fatal(p.Run)
	}
	w.reward(p)
	if p.Run.Level != 2 || p.Run.Pending != 1 || len(p.Run.Offers) != 3 {
		t.Fatal(p.Run)
	}
	seen := map[string]bool{}
	for _, id := range p.Run.Offers {
		if seen[id] {
			t.Fatal("duplicate offer")
		}
		seen[id] = true
	}
	p.choose("forged", 2)
	p.choose(p.Run.Offers[0], 1)
	if p.Run.Pending != 1 {
		t.Fatal("accepted invalid choice")
	}
	id := p.Run.Offers[0]
	p.choose(id, 2)
	if p.Run.Pending != 0 {
		t.Fatal("did not consume choice")
	}
	p.choose(id, 2)
	for i := 0; i < 100; i++ {
		w.reward(p)
	}
	if p.Run.Level < 10 || p.Run.Pending < 2 {
		t.Fatal("lost overflow levels", p.Run)
	}
}
func TestRunUpgradeEffects(t *testing.T) {
	p := &Player{Run: newProgression(), MaxHP: 100, F: newFighter(Hero, Vec{})}
	p.F.HP = 20
	for _, id := range []string{"might", "nova", "leech", "star", "vitality", "heal"} {
		p.Run.Pending = 1
		p.Run.Offers = []string{id}
		p.choose(id, 1)
	}
	if p.Run.damage() != 1.75 || p.Run.reach() != 1.2 || p.MaxHP != 130 || p.F.HP != 95.5 {
		t.Fatalf("wrong effects: %+v hp %v max %v", p.Run, p.F.HP, p.MaxHP)
	}
	if p.Run.critChance() <= .15 || p.Run.critMultiplier() <= 1.5 {
		t.Fatalf("crit stats did not scale with blessings: chance=%v mult=%v", p.Run.critChance(), p.Run.critMultiplier())
	}
}
