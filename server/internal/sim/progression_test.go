package sim

import (
	"math"
	"testing"
)

func TestRunRewardsAndChoices(t *testing.T) {
	w := NewWorld(nil, .5, 1)
	p := &Player{Run: newProgression(), MaxHP: 100, F: newFighter(Hero, Vec{})}
	if len(p.Run.Slots) != 1 || p.Run.Slots[0] != "rift-bolt" || p.Run.skillRank("rift-bolt") != 1 {
		t.Fatalf("unexpected default Lv.1 Slot 1 loadout: %+v", p.Run)
	}
	if math.Abs(p.Run.critChance()-.15) > 1e-6 || math.Abs(p.Run.critMultiplier()-1.5) > 1e-6 {
		t.Fatalf("unexpected base crit stats: chance=%v mult=%v", p.Run.critChance(), p.Run.critMultiplier())
	}
	w.reward(p)
	if p.Run.Gold != 5 || p.Run.XP != 10 || p.Run.Level != 1 {
		t.Fatal(p.Run)
	}
	for i := 1; i < KillsForLevel(1); i++ {
		w.reward(p)
	}
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
	for i := 0; i < 500; i++ {
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

func TestThreeSlotLoadoutAndSimultaneousAoEAutoCast(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "Hero", 100)
	p.SetHero("ember-warden")
	if len(p.Run.Slots) != 1 || p.Run.Slots[0] != "flame-fan" || p.Run.skillRank("flame-fan") != 1 {
		t.Fatalf("Ember Warden Lv.1 Slot 1 should be flame-fan Lv.1, got %+v", p.Run)
	}

	// Unlock Slot 2 (cinder-step)
	p.Run.Pending = 1
	p.Run.Offers = []string{"cinder-step", "might", "nova"}
	p.choose("cinder-step", p.Run.Level)
	if len(p.Run.Slots) != 2 || p.Run.Slots[1] != "cinder-step" || p.Run.skillRank("cinder-step") != 1 {
		t.Fatalf("Slot 2 did not equip cinder-step: %+v", p.Run)
	}

	// Upgrade Slot 1 (flame-fan -> Lv.2)
	baseCd := p.Run.skillCooldownMs("flame-fan")
	p.Run.Pending = 1
	p.Run.Offers = []string{"flame-fan", "vitality", "heal"}
	p.choose("flame-fan", p.Run.Level)
	if len(p.Run.Slots) != 2 || p.Run.skillRank("flame-fan") != 2 {
		t.Fatalf("picking equipped skill should upgrade rank to 2: %+v", p.Run)
	}
	if p.Run.skillDamageMultiplier("flame-fan") <= 1.0 || p.Run.skillCooldownMs("flame-fan") >= baseCd {
		t.Fatalf("rank 2 should boost damage and reduce cooldown")
	}

	// Unlock Slot 3 (ember-snare)
	p.Run.Pending = 1
	p.Run.Offers = []string{"ember-snare", "star", "leech"}
	p.choose("ember-snare", p.Run.Level)
	if len(p.Run.Slots) != 3 || p.Run.Slots[2] != "ember-snare" {
		t.Fatalf("Slot 3 did not equip ember-snare: %+v", p.Run)
	}

	// Verify 3/3 pool restriction: active skill offers must only come from the 3 equipped slots
	for i := 0; i < 40; i++ {
		w.rollForHero(&p.Run, p.Hero)
		for _, off := range p.Run.Offers {
			if isActiveSkill(off) && !containsStr(p.Run.Slots, off) {
				t.Fatalf("3/3 full loadout offered unequipped active skill %q (slots=%v)", off, p.Run.Slots)
			}
		}
	}
	p.Run.Offers = nil

	// Place hero in the wilds with a Revenant inside AoE radius -> verify Trinity Simultaneous Cast fires all 3 slots at once
	at := Vec{gateTile + 3, gateTile + 3}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	w.spawnTimer = 1e9
	e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{at.X + 1.2, at.Y + 0.5}), Home: at}
	e.F.HP = 20
	e.F.Cooldown = 1e9
	w.Enemies = []*Enemy{e}

	w.Step()
	if p.Run.AutoCasts != 1 || p.Run.TrinityCasts != 1 || len(p.Run.LastCast) != 3 {
		t.Fatalf("expected Trinity Simultaneous Cast of all 3 slots on AoE engagement, got autoCasts=%d trinity=%d last=%v", p.Run.AutoCasts, p.Run.TrinityCasts, p.Run.LastCast)
	}
	if e.F.HP >= 20 {
		t.Fatalf("expected simultaneous AoE auto-cast to damage revenant in AoE radius, hp=%v", e.F.HP)
	}
}

func TestProgressiveXPCurveAndMonsterLevelScaling(t *testing.T) {
	wantThresholds := map[int]int{
		1: 100,
		2: 280,
		3: 540,
		4: 880,
		5: 1300,
		6: 1800,
	}
	prevDelta := 0
	for lv := 1; lv <= 6; lv++ {
		got := ThresholdForLevel(lv)
		if got != wantThresholds[lv] {
			t.Fatalf("ThresholdForLevel(%d) = %d, want %d", lv, got, wantThresholds[lv])
		}
		if lv > 1 {
			delta := got - ThresholdForLevel(lv-1)
			if delta <= prevDelta {
				t.Fatalf("XP delta at level %d (%d) must be strictly greater than previous delta (%d)", lv, delta, prevDelta)
			}
			prevDelta = delta
		}
	}

	w := newTestWorld(t)
	p := w.AddPlayer("a", "Hero", 100)
	w.spawn(nil)
	if len(w.Enemies) == 0 {
		t.Fatal("expected initial enemy pack to spawn")
	}
	for _, e := range w.Enemies {
		if e.enemyLevel() != 1 || e.maxHP() != 2 || e.F.HP != 2 || e.damage() != 4 {
			t.Fatalf("Lv.1 Revenant unexpected stats: lv=%d max=%v hp=%v dmg=%v", e.enemyLevel(), e.maxHP(), e.F.HP, e.damage())
		}
	}

	// Level hero up from Lv.1 -> Lv.2 (needs 100 XP = 10 Lv.1 kills)
	for i := 0; i < 9; i++ {
		w.rewardFoe(p, 1)
	}
	if p.Run.Level != 1 {
		t.Fatalf("9 Lv.1 kills must not clear Lv.1 yet, got lv=%d xp=%d", p.Run.Level, p.Run.XP)
	}
	w.rewardFoe(p, 1)
	if p.Run.Level != 2 || p.Run.threshold() != 280 {
		t.Fatalf("expected Hero Lv.2 with next threshold 280 XP, got lv=%d threshold=%d", p.Run.Level, p.Run.threshold())
	}
	for _, e := range w.Enemies {
		if e.enemyLevel() != 2 || e.maxHP() != 3 || e.damage() != 5 {
			t.Fatalf("expected existing Revenant to scale to Lv.2 (max=3, dmg=5), got lv=%d max=%v dmg=%v", e.enemyLevel(), e.maxHP(), e.damage())
		}
	}

	// Respawn an enemy while hero is Lv.2 and verify State() snapshot exposes level & max
	w.spawn(w.Enemies[0])
	st := w.State()
	if len(st.Enemies) == 0 || st.Enemies[0].Level != 2 || st.Enemies[0].Max != 3 || st.Enemies[0].HP != 3 {
		t.Fatalf("snapshot enemy did not carry Lv.2 stats: %+v", st.Enemies)
	}
	if RevenantXPReward(2) <= RevenantXPReward(1) || RevenantXPReward(3) <= RevenantXPReward(2) {
		t.Fatalf("RevenantXPReward did not scale with monster level: lv1=%d lv2=%d lv3=%d", RevenantXPReward(1), RevenantXPReward(2), RevenantXPReward(3))
	}
}
