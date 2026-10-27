package sim

import (
	"bytes"
	"testing"
)

func TestCheckpointResumesExactSimulation(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("secret", "A", 140)
	p.SetHero("ember-warden")
	p.Run.Level = 6
	p.Run.XP = 31
	p.Run.Gold = 95
	p.Run.Skills["flame-fan"] = 3
	p.slotCD[0] = 987
	p.burnSoils = []burnSoilZone{{Elapsed: 430, Ticks: 2, Area: 2}}
	p.F.HP = 42
	p.F.Immune = 321
	p.F.Play(Attack)
	p.F.ImpactDone = true
	w.dropSoul(p, p.F.Pos, 3)
	w.Step()
	raw, err := w.Checkpoint()
	if err != nil {
		t.Fatal(err)
	}
	r, err := RestoreCheckpoint(w.nav, raw)
	if err != nil {
		t.Fatal(err)
	}
	// Disconnected player timers do not run, and RNG resumes at precisely the next draw.
	if r.random() != w.random() {
		t.Fatal("RNG restarted")
	}
	q := r.ResumePlayer(p.ID, p.Name, 140)
	if q == nil {
		t.Fatal("resume failed")
	}
	if q.F.HP != p.F.HP || q.F.Immune != p.F.Immune || q.slotCD != p.slotCD || q.burnSoils[0].Ticks != p.burnSoils[0].Ticks || q.Run.Gold != p.Run.Gold || !q.F.ImpactDone {
		t.Fatalf("state lost: %+v", q)
	}
	if got := r.State().Players[0].Cooldowns["flame-fan"]; got != p.slotCD[0] {
		t.Fatal("authoritative cooldown missing from reconnect snapshot")
	}
	// Normalize the old connection bookkeeping as reconnect does before comparing future ticks.
	w.ResumePlayer(p.ID, p.Name, 140)
	for i := 0; i < 100; i++ {
		w.Step()
		r.Step()
		a, _ := w.Checkpoint()
		b, _ := r.Checkpoint()
		if !bytes.Equal(a, b) {
			t.Fatalf("diverged at resumed tick %d", i)
		}
	}
}
func TestDeadCheckpointDoesNotRespawnOrReplayReward(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("secret", "A", 100)
	p.F.HP = 0
	p.F.Play(Die)
	p.F.DeadFor = 1400
	w.dropSoul(p, p.F.Pos, 1)
	gold := p.Run.Gold
	w.RemovePlayer(p.ID)
	raw, _ := w.Checkpoint()
	r, err := RestoreCheckpoint(w.nav, raw)
	if err != nil {
		t.Fatal(err)
	}
	q := r.ResumePlayer(p.ID, p.Name, 100)
	if q.F.Alive() || q.F.DeadFor != 1400 || q.Run.Gold != gold || len(r.Souls) != 1 {
		t.Fatal("disconnect reset death or reward")
	}
}
