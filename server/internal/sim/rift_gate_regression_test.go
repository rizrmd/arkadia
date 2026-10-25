package sim

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"testing"
)

// Golden digest from the completed Stage 2 Go baseline (2de5e4d).
func TestRiftGateRegressionDigest(t *testing.T) {
	h := sha256.New()
	for seed := uint64(1); seed <= 300; seed++ {
		w := &World{rng: rand.New(rand.NewPCG(seed, seed^0x123456))}
		p := &Player{Hero: "rift-runner", Run: newProgressionForHero("rift-runner"), MaxHP: 100, F: newFighter(Hero, Vec{})}
		for lv := 2; lv <= 20; lv++ {
			p.Run.Level, p.Run.Pending = lv, 1
			w.rollForHero(&p.Run, p.Hero)
			b, _ := json.Marshal(p.Run)
			h.Write(b)
			p.choose(p.Run.Offers[int(w.random()*3)], lv)
		}
	}
	got := fmt.Sprintf("%x", h.Sum(nil))
	const want = "ae06c3d3a1c047b472e79c6a5edff76c30d91dcfd5264b213271bc4e968e36f0"
	if got != want {
		t.Fatalf("Rift baseline digest: %s", got)
	}
}
