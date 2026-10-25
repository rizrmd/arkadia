package sim

import (
	"encoding/json"
	"math/rand/v2"
	"os"
	"testing"
)

func emberPlayer() *Player {
	return &Player{Hero: "ember-warden", Run: newProgressionForHero("ember-warden"), MaxHP: 100, F: newFighter(Hero, Vec{})}
}
func cloneGateRun(p Progression) Progression {
	b, _ := json.Marshal(p)
	var q Progression
	_ = json.Unmarshal(b, &q)
	return q
}
func checkEmberOffer(t *testing.T, p *Progression) {
	t.Helper()
	if len(p.Offers) != 3 {
		t.Fatalf("blank offer: %+v", p)
	}
	seen := map[string]bool{}
	for _, id := range p.Offers {
		if seen[id] || !p.emberCardEligible(id) {
			t.Fatalf("invalid offer %s: %+v", id, p)
		}
		seen[id] = true
	}
	if p.offerLevel() == 20 && p.Offers[0] != "star" {
		t.Fatal("missing Lv.20 capstone")
	}
}

// Export actual Go offers/choices and their random tape for the client parity check.
func TestEmberTierGates(t *testing.T) {
	fixtures := []any{}
	for strategy := 0; strategy < 4; strategy++ {
		for seed := uint64(1); seed <= 300; seed++ {
			p := emberPlayer()
			for lv := 2; lv <= 20; lv++ {
				p.Run.Level, p.Run.Pending = lv, 1
				if p.Run.pointsSpent() != lv-2 {
					t.Fatalf("points != picks: %+v", p.Run)
				}
				before := cloneGateRun(p.Run)
				a, b := seed+uint64(lv)*1009, uint64(strategy+1)
				w := &World{rng: rand.New(rand.NewPCG(a, b))}
				tapeRng := rand.New(rand.NewPCG(a, b))
				tape := []float64{tapeRng.Float64(), tapeRng.Float64(), tapeRng.Float64()}
				w.rollForHero(&p.Run, p.Hero)
				checkEmberOffer(t, &p.Run)
				offers := append([]string{}, p.Run.Offers...)
				idx := int(seed+uint64(lv)) % 3
				if strategy == 1 {
					idx = 0
				}
				if strategy == 2 {
					for i, id := range offers {
						if id == "flame-fan" {
							idx = i
						}
					}
				}
				if strategy == 3 {
					for i, id := range offers {
						if isActiveSkill(id) {
							idx = i
							break
						}
					}
				}
				id := offers[idx]
				p.choose(id, lv)
				if p.Run.Pending != 0 {
					t.Fatalf("offered choice refused %s", id)
				}
				if len(p.Run.emberLearnedActives()) > 4 || len(p.Run.Slots) > 3 {
					t.Fatal("active limit")
				}
				for _, skill := range heroActivePools[p.Hero] {
					if p.Run.Skills[skill] > 5 {
						t.Fatal("rank cap")
					}
				}
				if seed <= 8 {
					fixtures = append(fixtures, map[string]any{"before": before, "random": tape, "offers": offers, "pick": id, "after": cloneGateRun(p.Run)})
				}
			}
		}
	}
	if out := os.Getenv("EMBER_PARITY_OUT"); out != "" {
		b, _ := json.Marshal(fixtures)
		if err := os.WriteFile(out, b, 0644); err != nil {
			t.Fatal(err)
		}
	}
}
func TestEmberGateBoundariesAndFallback(t *testing.T) {
	for _, points := range []int{0, 3, 4, 7, 8} {
		p := emberPlayer()
		p.Run.Skills["heal"] = points
		p.Run.Level = 10
		p.Run.Pending = 1
		if p.Run.emberCardEligible("cleave") != (points >= 4) || p.Run.emberCardEligible("haste") != (points >= 8) {
			t.Fatalf("boundary %d", points)
		}
		w := &World{rng: rand.New(rand.NewPCG(1, 2))}
		w.rollForHero(&p.Run, p.Hero)
		checkEmberOffer(t, &p.Run)
	}
	p := emberPlayer()
	p.Run.Level, p.Run.Pending = 20, 19
	if p.Run.emberCardEligible("star") {
		t.Fatal("batched capstone unlocked early")
	}
	p.Run.Skills["cleave"] = 1
	if !p.Run.emberCardEligible("cleave") {
		t.Fatal("owned rank bypass")
	}
	p.Run.Skills = map[string]int{"flame-fan": 5, "cinder-step": 5, "ember-snare": 5, "cleave": 5}
	p.Run.Slots = []string{"flame-fan", "cinder-step", "ember-snare"}
	p.Run.Level, p.Run.Pending = 19, 1
	if p.Run.emberCardEligible("shockwave") || p.Run.emberCardEligible("cleave") {
		t.Fatal("learned/rank cap")
	}
	w := &World{rng: rand.New(rand.NewPCG(1, 2))}
	w.rollForHero(&p.Run, p.Hero)
	checkEmberOffer(t, &p.Run)
	for _, id := range p.Run.Offers {
		if isActiveSkill(id) {
			t.Fatal("capped active offered")
		}
	}
	p.Run.Skills["cleave"] = 4
	p.Run.Offers = []string{"cleave"}
	p.choose("cleave", 19)
	if p.Run.Skills["cleave"] != 5 || len(p.Run.Slots) != 3 {
		t.Fatal("unequipped rank-up")
	}
	p.Run.Pending = 1
	p.Run.Offers = []string{"cleave"}
	p.choose("cleave", 19)
	if p.Run.Pending != 1 || p.Run.Skills["cleave"] != 5 {
		t.Fatal("capped stale choice accepted")
	}
	p = emberPlayer()
	p.Run.Level, p.Run.Pending = 2, 1
	p.Run.Offers = []string{"cleave"}
	p.choose("cleave", 2)
	if p.Run.Pending != 1 {
		t.Fatal("locked stale choice accepted")
	}
}
