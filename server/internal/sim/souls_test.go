package sim

import "testing"

func TestSoulAuthorityAndExactlyOnce(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	q := w.AddPlayer("b", "B", 100)
	at := Vec{gateTile + 3, gateTile + 3}
	p.F.Pos = Vec{at.X + 4, at.Y}
	q.F.Pos = at
	w.dropSoul(p, at, 1)
	for i := 0; i < 20; i++ {
		w.collectSouls()
	}
	if p.Run.XP != 0 || q.Run.XP != 0 || len(w.Souls) != 1 {
		t.Fatal("death or other player awarded XP")
	}
	p.F.Pos = at
	w.collectSouls()
	if p.Run.XP != 10 || len(w.Souls) != 0 {
		t.Fatal("pickup failed")
	}
	for i := 0; i < 20; i++ {
		w.collectSouls()
	}
	if p.Run.XP != 10 {
		t.Fatal("duplicate reward")
	}
	for i := 0; i < 9; i++ {
		w.dropSoul(p, at, 1)
	}
	for i := 0; i < 8; i++ {
		w.collectSouls()
	}
	if p.Run.Level != 2 || p.Run.Pending != 1 || len(p.Run.Offers) != 3 || p.Run.Gold != 50 {
		t.Fatalf("progression failed: %+v", p.Run)
	}
	w.dropSoul(p, at, 3)
	w.RemovePlayer(p.ID)
	if len(w.Souls) != 0 {
		t.Fatal("disconnect did not clean up souls")
	}
}

func TestSoulRewardFrozenAndDeadHeroCannotCollect(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	p.F.Pos = Vec{gateTile + 3, gateTile + 3}
	p.F.HP = 50
	p.Run.Skills["leech"] = 1
	w.dropSoul(p, p.F.Pos, 3)
	if p.Run.Gold != 5 || p.F.HP != 52 || p.Run.XP != 0 {
		t.Fatal("kill effects must stay immediate")
	}
	p.F.Damage(1000)
	for i := 0; i < 20; i++ {
		w.collectSouls()
	}
	if len(w.Souls) != 1 || p.Run.XP != 0 {
		t.Fatal("dead hero collected soul")
	}
	p.F.HP = 100
	p.F.Play(Idle)
	p.Run.Level = 4
	w.collectSouls()
	if p.Run.XP != 18 || p.Run.Gold != 5 {
		t.Fatal("soul XP changed with hero level or duplicated gold")
	}
}
