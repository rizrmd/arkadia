package sim

import (
	"math/rand/v2"
	"testing"
)

// Seeded Rift Runner runs from Lv. 1 to Lv. 20: every offer holds three distinct cards (one passive, two actives
// while actives are available), never a card from a locked tier, and Ascendant Star only from Lv. 20.
func TestRiftRunnerTierGates(t *testing.T) {
	for seed := uint64(1); seed <= 300; seed++ {
		w := &World{rng: rand.New(rand.NewPCG(seed, seed^0x9e3779b97f4a7c15))}
		p := &Player{Hero: "rift-runner", Run: newProgressionForHero("rift-runner"), MaxHP: 100, F: newFighter(Hero, Vec{})}
		for lv := 2; lv <= 20; lv++ {
			p.Run.Level, p.Run.Pending = lv, 1
			points := p.Run.pointsSpent()
			if points != lv-2 {
				t.Fatalf("seed %d Lv.%d: %d points spent, want %d", seed, lv, points, lv-2)
			}
			w.rollForHero(&p.Run, p.Hero)
			offers := p.Run.Offers
			if len(offers) != 3 || offers[0] == offers[1] || offers[1] == offers[2] || offers[0] == offers[2] {
				t.Fatalf("seed %d Lv.%d: bad offer %v", seed, lv, offers)
			}
			if isActiveSkill(offers[0]) {
				t.Fatalf("seed %d Lv.%d: first card %q is not a passive", seed, lv, offers[0])
			}
			for _, id := range offers {
				if id == "star" {
					if lv < CapstoneLevel {
						t.Fatalf("seed %d Lv.%d: Ascendant Star before Lv. 20", seed, lv)
					}
					continue
				}
				gate, ok := riftTierPoints[id]
				if !ok {
					t.Fatalf("seed %d Lv.%d: %q is not a Rift Runner card", seed, lv, id)
				}
				if gate > points && p.Run.Skills[id] == 0 {
					t.Fatalf("seed %d Lv.%d: %q needs %d points, only %d spent (offer %v)", seed, lv, id, gate, points, offers)
				}
			}
			if lv == CapstoneLevel && offers[0] != "star" {
				t.Fatalf("seed %d: Lv. 20 passive card is %q, want star", seed, offers[0])
			}
			p.choose(offers[int(w.random()*3)], lv)
			if p.Run.Pending != 0 {
				t.Fatalf("seed %d Lv.%d: pick %v not taken", seed, lv, offers)
			}
		}
	}
}
