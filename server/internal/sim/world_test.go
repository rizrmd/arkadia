package sim

import (
	"encoding/json"
	"math"
	"os"
	"reflect"
	"testing"
)

func newTestWorld(t *testing.T) *World {
	t.Helper()
	n, err := LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	return NewWorld(NewBlocker(n), .5, 7)
}

// Screen directions the keyboard produces (controls.ts): down, and right along a 2:1 tile edge.
var (
	down  = Vec{0, 1}
	right = Vec{2 / math.Sqrt(5), -1 / math.Sqrt(5)}
)

type walker struct {
	p *Player
	d Vec
}

// drive steps the world with each walker sending one input per tick, as a client does.
func drive(w *World, ticks int, ws ...walker) {
	for i := 0; i < ticks; i++ {
		for _, x := range ws {
			x.p.Queue(Input{Seq: x.p.nextSeq(), X: x.d.X, Y: x.d.Y})
		}
		w.Step()
	}
}

func (p *Player) nextSeq() uint32 {
	if n := len(p.queue); n > 0 {
		return p.queue[n-1].Seq + 1
	}
	return p.Ack + 1
}

func run(w *World, ticks int) {
	for i := 0; i < ticks; i++ {
		w.Step()
	}
}

func TestPlayersSpawnBesideTheTentOnWalkableGround(t *testing.T) {
	w := newTestWorld(t)
	for i := 0; i < MaxPlayers; i++ {
		p := w.AddPlayer(string(rune('a'+i)), "Guest", 100)
		if p == nil {
			t.Fatalf("player %d rejected", i)
		}
		if w.nav.Blocked(p.X, p.Y, false) || !InSafeZone(p.F.Pos) {
			t.Fatalf("player %d spawned at blocked or unsafe %v,%v", i, p.X, p.Y)
		}
	}
	if w.AddPlayer("e", "Fifth", 100) != nil {
		t.Fatal("a fifth player joined a full room")
	}
}

func TestHeroWalksAtFullSpeedAndAcksEveryInput(t *testing.T) {
	w := newTestWorld(t)
	w.Enemies = nil
	p := w.AddPlayer("a", "A", 100)
	x0, y0 := p.X, p.Y
	drive(w, 20, walker{p, right})
	// W+D walks 111.63 screen px per second along a tile edge.
	if got := hypot(p.X-x0, p.Y-y0); math.Abs(got-111.63) > .01 {
		t.Fatalf("walked %.3f px in one second, want 111.63", got)
	}
	if p.Ack != 20 || !p.Moving {
		t.Fatalf("ack %d moving %v", p.Ack, p.Moving)
	}
	// A client that goes quiet may still be walking for maxOwed ticks (its inputs could just be late).
	run(w, maxOwed+1)
	if p.Moving {
		t.Fatal("hero still moving without input")
	}
}

// Late inputs: the hero keeps walking through a gap, and the inputs that arrive late are acknowledged without
// walking twice, so it ends exactly where the inputs say and every other client saw an even walk.
func TestLateInputsKeepAnEvenWalk(t *testing.T) {
	w := newTestWorld(t)
	w.Enemies = nil
	p := w.AddPlayer("a", "A", 100)
	x0, y0 := p.X, p.Y
	seq := uint32(0)
	send := func() { seq++; p.Queue(Input{Seq: seq, X: right.X, Y: right.Y}) }
	var steps []float64
	step := func() { x, y := p.X, p.Y; w.Step(); steps = append(steps, hypot(p.X-x, p.Y-y)) }
	// 20 inputs: every fourth tick gets none and the next gets two, as a bursty browser sends them.
	for i := 0; i < 20; i++ {
		if i%4 == 1 {
			step()
			continue
		}
		send()
		if i%4 == 2 {
			send()
		}
		step()
	}
	for len(p.queue) > 0 {
		step()
	}
	edge := fullSpeed(right.X, right.Y)
	want := edge * float64(seq) / 20
	if got := hypot(p.X-x0, p.Y-y0); math.Abs(got-want) > .01 {
		t.Fatalf("walked %.3f px for %d inputs, want %.3f", got, seq, want)
	}
	if p.Ack != seq || p.Owed != 0 {
		t.Fatalf("ack %d owed %d after %d inputs", p.Ack, p.Owed, seq)
	}
	for i, s := range steps[:20] {
		if math.Abs(s-edge/20) > .01 {
			t.Fatalf("tick %d stepped %.3f px, want an even %.3f: %v", i, s, edge/20, steps)
		}
	}
}

// A phone thumbstick turns or lets go while its inputs are held up: the steps guessed along the old direction
// are walked again with the real inputs once they arrive, so the hero ends exactly where a client that sent the
// same inputs on time (and the sender's own prediction) puts it.
func TestLateInputsReplaceTheGuessedSteps(t *testing.T) {
	for _, tc := range []struct {
		name string
		turn Vec
	}{{"turn", down}, {"let go", Vec{}}} {
		inputs := make([]Vec, 0, 16)
		for i := 0; i < 16; i++ {
			d := right
			if i >= 8 {
				d = tc.turn
			}
			inputs = append(inputs, d)
		}
		// On time: one input per tick.
		ref := newTestWorld(t)
		ref.Enemies = nil
		a := ref.AddPlayer("a", "A", 100)
		for i, d := range inputs {
			a.Queue(Input{Seq: uint32(i + 1), X: d.X, Y: d.Y})
			ref.Step()
		}
		run(ref, 4)
		// Late: inputs 8-10 (the turn) are held for three ticks and arrive together with input 11.
		w := newTestWorld(t)
		w.Enemies = nil
		p := w.AddPlayer("a", "A", 100)
		var held []Input
		for i, d := range inputs {
			in := Input{Seq: uint32(i + 1), X: d.X, Y: d.Y}
			if i >= 8 && i < 11 {
				held = append(held, in)
			} else {
				for _, h := range held {
					p.Queue(h)
				}
				held = nil
				p.Queue(in)
			}
			w.Step()
			if i == 10 && p.Owed != maxOwed {
				t.Fatalf("%s: %d steps guessed through the gap, want %d", tc.name, p.Owed, maxOwed)
			}
		}
		run(w, 4)
		if d := hypot(p.X-a.X, p.Y-a.Y); d > 1e-9 || p.Owed != a.Owed || p.Ack != a.Ack {
			t.Fatalf("%s: late hero at %.2f,%.2f (owed %d, ack %d), on-time hero at %.2f,%.2f (ack %d)", tc.name, p.X, p.Y, p.Owed, p.Ack, a.X, a.Y, a.Ack)
		}
	}
}

// Half a second of a phone network holding every packet: the inputs behind the stall are walked two a tick until
// the queue is short again, instead of leaving the server that far behind the player for good.
func TestABacklogAfterAStallDrains(t *testing.T) {
	w := newTestWorld(t)
	w.Enemies = nil
	p := w.AddPlayer("a", "A", 100)
	x0, y0 := p.X, p.Y
	seq := uint32(0)
	send := func() { seq++; p.Queue(Input{Seq: seq, X: right.X, Y: right.Y}) }
	for i := 0; i < 10; i++ {
		send()
		w.Step()
	}
	for i := 0; i < 10; i++ {
		w.Step()
	}
	for i := 0; i < 10; i++ {
		send()
	}
	ticks := 0
	for len(p.queue) > backlog {
		send()
		w.Step()
		if ticks++; ticks > 12 {
			t.Fatalf("%d inputs still queued %d ticks after the stall", len(p.queue), ticks)
		}
	}
	for len(p.queue) > 0 {
		w.Step()
	}
	want := fullSpeed(right.X, right.Y) * float64(seq) / 20
	if got := hypot(p.X-x0, p.Y-y0); math.Abs(got-want) > .01 {
		t.Fatalf("walked %.3f px for %d inputs, want %.3f", got, seq, want)
	}
}

// HoldTicks, sent to the client with every snapshot, is exactly the number of inputs a hit stun uses up without
// walking, counted from the tick it started: the client's prediction skips that many and no more. (A swing uses
// none: TestHeldWalkIsNeverLockedInASwing.)
func TestHoldTicksCountTheInputsAPoseUsesUp(t *testing.T) {
	for _, state := range []string{Hit} {
		w := newTestWorld(t)
		w.Enemies = nil
		p := w.AddPlayer("a", "A", 100)
		drive(w, 2, walker{p, right})
		p.F.Play(state)
		hold := p.HoldTicks()
		x, y := p.X, p.Y
		held := 0
		for i := 0; i < 20; i++ {
			drive(w, 1, walker{p, right})
			if p.X != x || p.Y != y {
				break
			}
			held++
		}
		if hold == 0 || held != hold {
			t.Fatalf("%s: %d inputs used up without walking, HoldTicks said %d", state, held, hold)
		}
	}
}

func TestFloodedInputsCannotOutrunTheTickRate(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	x0, y0 := p.X, p.Y
	// A cheating client sends 200 steps at once, some far longer than a unit vector.
	for i := 0; i < 200; i++ {
		p.Queue(Input{Seq: uint32(i + 1), X: right.X * 50, Y: right.Y * 50})
	}
	run(w, 20)
	if got := hypot(p.X-x0, p.Y-y0); got > fullSpeed(right.X, right.Y)*(22.0/20)+.01 {
		t.Fatalf("flooded hero moved %.1f px in one second", got)
	}
	// Replayed or out-of-order sequence numbers are ignored.
	before := len(p.queue)
	p.Queue(Input{Seq: 1, X: 1})
	if len(p.queue) != before {
		t.Fatal("stale input queued")
	}
}

func TestWallsStopTheHero(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	// Up the screen toward the rear walls for 20 seconds.
	drive(w, 400, walker{p, Vec{0, -1}})
	g := ToTile(p.X, p.Y)
	if g.X < 0 || g.Y < 0 || w.nav.Blocked(p.X, p.Y, false) {
		t.Fatalf("hero left the court through the rear wall: %v,%v tile %v", p.X, p.Y, g)
	}
}

func TestGateOpensForAHeroAndLetsThemThrough(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	if w.Gate.Open || w.Gate.Passable() {
		t.Fatal("gate starts open")
	}
	// Straight down the screen from the tent, through the arch and out into the snow.
	opened := false
	for i := 0; i < 160; i++ {
		drive(w, 1, walker{p, down})
		opened = opened || w.Gate.Passable()
	}
	if !opened {
		t.Fatal("gate never became passable")
	}
	if InSafeZone(p.F.Pos) && p.F.Alive() {
		t.Fatalf("hero did not pass the gate: %v,%v", p.X, p.Y)
	}
	// Once nobody is near, the doors swing shut again.
	w.RemovePlayer("a")
	run(w, 20)
	if w.Gate.Open || w.Gate.Frame != 0 {
		t.Fatalf("gate stayed open: %+v", w.Gate)
	}
}

func TestRevenantsSpawnInPacksAndNeverEnterTheSafeZone(t *testing.T) {
	w := newTestWorld(t)
	w.AddPlayer("a", "A", 100)
	for i := 0; i < 20*60; i++ {
		w.Step()
		for _, e := range w.Enemies {
			if InSafeZone(e.F.Pos) || !w.clearTile(e.F.Pos) {
				t.Fatalf("revenant %d at %v inside the zone, off the snow or in a footprint", e.ID, e.F.Pos)
			}
		}
	}
	if len(w.Enemies) != baseEnemies {
		t.Fatalf("%d revenants after a minute, want %d", len(w.Enemies), baseEnemies)
	}
	w.AddPlayer("b", "B", 100)
	run(w, 20*30)
	if len(w.Enemies) != baseEnemies+enemiesPerPlayer {
		t.Fatalf("%d revenants for two players", len(w.Enemies))
	}
	ids := map[int]bool{}
	for _, e := range w.Enemies {
		if ids[e.ID] {
			t.Fatalf("duplicate enemy id %d", e.ID)
		}
		ids[e.ID] = true
	}
}

// A hero out in the wilds beside a revenant: the server's auto attack kills it, credits the kill, and the
// revenant comes back at the gate arc after its corpse fades.
func TestAutoAttackKillsAndRespawnsRevenants(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	at := Vec{gateTile + 2.5, gateTile + 2.5}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	w.spawnTimer = 1e9
	e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{at.X + heroReach*.6, at.Y + heroReach*.6}), Home: at}
	e.F.Cooldown = 1e9 // it never swings back
	w.Enemies, w.nextEnemy = []*Enemy{e}, 2
	for i := 0; i < 40 && e.F.Alive(); i++ {
		w.Step()
	}
	if e.F.Alive() || p.Kills != 1 {
		t.Fatalf("revenant alive=%v hp=%v kills=%d", e.F.Alive(), e.F.HP, p.Kills)
	}
	gen := e.Gen
	run(w, int(corpse/TickMS)+2)
	if !e.F.Alive() || e.Gen != gen+1 || e.F.HP != kinds[Revenant].hp {
		t.Fatalf("revenant did not respawn: %+v", e.F)
	}
	if m := hypot(e.F.Pos.X-gateTile, e.F.Pos.Y-gateTile) * metersPerTile; math.Abs(m-spawnDistanceM) > 1.5 {
		t.Fatalf("respawned %.1f m from the gate", m)
	}
}

func TestRevenantsWoundHeroesWhoRespawnAndHealInTheZone(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	at := Vec{gateTile + 3, gateTile + 3}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	w.spawnTimer = 1e9
	// Four revenants out of the hero's reach cannot be killed, but swing at a hero standing still.
	p.F.HP = 10
	for i := 0; i < 4; i++ {
		e := &Enemy{ID: i + 1, F: newFighter(Revenant, Vec{at.X + .2, at.Y + .2})}
		e.F.Immune = 1e9
		w.Enemies = append(w.Enemies, e)
	}
	died := false
	for i := 0; i < 20*20 && !died; i++ {
		w.Step()
		died = !p.F.Alive()
	}
	if !died {
		t.Fatalf("hero survived at %.1f hp", p.F.HP)
	}
	run(w, int(heroRespawn/TickMS)+2)
	if !p.F.Alive() || p.F.HP != p.MaxHP || !InSafeZone(p.F.Pos) {
		t.Fatalf("hero did not respawn at the tent: %+v at %v,%v", p.F, p.X, p.Y)
	}
	p.F.HP = 50
	run(w, 20)
	if math.Abs(p.F.HP-58) > .01 {
		t.Fatalf("healed to %.2f in one second, want 58", p.F.HP)
	}
}

func TestClockRunsOneGameHourPerRealMinute(t *testing.T) {
	w := newTestWorld(t)
	w.AddPlayer("a", "A", 100)
	start := w.Clock
	run(w, 20*60)
	if got := (w.Clock - start) * 24; math.Abs(got-1) > 1e-9 {
		t.Fatalf("one minute advanced %.6f hours", got)
	}
}

func TestSameSeedAndInputsGiveTheSameWorld(t *testing.T) {
	play := func() State {
		w := newTestWorld(t)
		a, b := w.AddPlayer("a", "A", 120), w.AddPlayer("b", "B", 100)
		drive(w, 60, walker{a, down}, walker{b, right})
		drive(w, 140, walker{a, down})
		run(w, 200)
		return w.State()
	}
	if s1, s2 := play(), play(); !reflect.DeepEqual(s1, s2) {
		t.Fatal("simulation is not deterministic")
	}
}

func TestMaxHPClaimsAreClamped(t *testing.T) {
	w := newTestWorld(t)
	if p := w.AddPlayer("a", "A", 1e9); p.MaxHP != 210 || p.F.HP != 210 {
		t.Fatalf("max hp %v", p.MaxHP)
	}
	if p := w.AddPlayer("b", "B", math.NaN()); p.MaxHP != 100 {
		t.Fatalf("max hp %v", p.MaxHP)
	}
}

// The clip timings above are hand-ported; keep them equal to the character manifest the client plays.
func TestClipTimingsMatchTheCharacterManifest(t *testing.T) {
	raw, err := os.ReadFile("../../../public/assets/characters/manifest.json")
	if err != nil {
		t.Skip("manifest not available:", err)
	}
	var m struct {
		Characters map[string]struct {
			Clips map[string]struct {
				Frames []int `json:"frames"`
				FPS    float64
				Impact int
			}
		}
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	for name, k := range map[string]Kind{"hero": Hero, "revenant": Revenant} {
		c, s := m.Characters[name].Clips, kinds[k]
		attack, hit := c["attack"], c["hit"]
		if got := float64(len(attack.Frames)) * 1000 / attack.FPS; got != s.attackMs {
			t.Errorf("%s attack %vms, sim %vms", name, got, s.attackMs)
		}
		if got := float64(attack.Impact) * 1000 / attack.FPS; got != s.impactMs {
			t.Errorf("%s impact %vms, sim %vms", name, got, s.impactMs)
		}
		if got := float64(len(hit.Frames)) * 1000 / hit.FPS; got != s.hitMs {
			t.Errorf("%s hit %vms, sim %vms", name, got, s.hitMs)
		}
	}
}

func TestEmbeddedNavMatchesTheClientCopy(t *testing.T) {
	client, err := os.ReadFile("../../../public/coop/nav.json")
	if err != nil {
		t.Skip("client nav not available:", err)
	}
	if string(client) != string(navJSON) {
		t.Fatal("server/internal/sim/nav.json and public/coop/nav.json differ; re-run scripts/export-coop-nav.mjs")
	}
}

// A revenant hunting a hero on the far side of a footprint in the wilds walks round it, as in the solo game
// (encounters.ts move): it never stands inside a footprint and still reaches the hero.
func TestRevenantsWalkRoundFootprints(t *testing.T) {
	w := newTestWorld(t)
	n, err := LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	var from, to Vec
	found := false
	for _, c := range n.Columns {
		if c.Front-c.Back < 12 {
			continue
		}
		f, h := ToTile(c.X, c.Back-18), ToTile(c.X, c.Front+22)
		if InSafeZone(f) || InSafeZone(h) || !w.clearTile(f) || !w.clearTile(h) || w.clearTile(ToTile(c.X, (c.Back+c.Front)/2)) || hypot(f.X-h.X, f.Y-h.Y) > aggro/2 {
			continue
		}
		from, to, found = f, h, true
		break
	}
	if !found {
		t.Fatal("no footprint in the wilds with free ground on both sides")
	}
	p := w.AddPlayer("a", "A", 100)
	px := TilePoint(to.X, to.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, to
	p.F.Immune = 1e9
	w.spawnTimer = 1e9
	e := &Enemy{ID: 1, F: newFighter(Revenant, from), Home: from}
	e.F.Immune, e.F.Cooldown = 1e9, 1e9
	w.Enemies, w.nextEnemy = []*Enemy{e}, 2
	for i := 0; i < 20*20; i++ {
		w.Step()
		if !w.clearTile(e.F.Pos) {
			t.Fatalf("revenant walked into a footprint at %v", e.F.Pos)
		}
		if hypot(e.F.Pos.X-p.F.Pos.X, e.F.Pos.Y-p.F.Pos.Y) <= enemyReach+.05 {
			return
		}
	}
	t.Fatalf("revenant stuck at %v behind the footprint, hero at %v", e.F.Pos, p.F.Pos)
}

// Full speed sits on a 4:3 ellipse in screen px/s: no direction walks twice as fast as another, and a half push
// walks at half speed.
func TestFullSpeedByDirection(t *testing.T) {
	r := 1 / math.Sqrt2
	for _, c := range []struct {
		d    Vec
		want float64
	}{{Vec{1, 0}, 120}, {Vec{-1, 0}, 120}, {Vec{0, 1}, 90}, {Vec{0, -1}, 90}, {right, 111.63}, {Vec{r, r}, 101.82}} {
		if got := fullSpeed(c.d.X, c.d.Y); math.Abs(got-c.want) > .01 {
			t.Fatalf("full speed along %v is %.3f, want %.2f", c.d, got, c.want)
		}
	}
	w := newTestWorld(t)
	if x, y, prog := WalkStep(w.nav, heroSpawn.X, heroSpawn.Y, Vec{.5, 0}, 1000, false); math.Abs(x-heroSpawn.X-60) > .01 || y != heroSpawn.Y || math.Abs(prog-60) > .01 {
		t.Fatalf("a half push right walked to %.2f,%.2f (%.2f px) in one second, want 60 px", x, y, prog)
	}
}

func TestHeroRespawnAndResumeNeverStickOrResetWildsProgress(t *testing.T) {
	w := newTestWorld(t)
	w.Enemies = nil
	p := w.AddPlayer("p1", "Hero", 100)
	p.SetHero("ember-warden")

	// Walk out through the gate into the Wilds.
	for i := 0; i < 160; i++ {
		drive(w, 1, walker{p, down})
	}
	if InSafeZone(p.F.Pos) {
		t.Fatalf("expected hero in the Wilds, got %v", p.F.Pos)
	}
	wildX, wildY := p.X, p.Y
	p.Run.Level = 7
	p.Run.XP = 42
	p.Run.Pending = 2
	w.rollForHero(&p.Run, p.Hero)
	firstOffer := p.Run.Offers[0]

	// Choosing a blessing while Pending=2 and Level=7 works even if the client sent an earlier level.
	p.Queue(Input{Seq: p.nextSeq(), Choice: firstOffer, Level: 6})
	w.Step()
	if p.Run.Pending != 1 || len(p.Run.Offers) == 0 {
		t.Fatalf("expected Pending=1 with fresh offers after choosing %q, got pending=%d offers=%v", firstOffer, p.Run.Pending, p.Run.Offers)
	}

	// Choose the second pending blessing so Pending=0.
	secondOffer := p.Run.Offers[0]
	p.Queue(Input{Seq: p.nextSeq(), Choice: secondOffer, Level: 7})
	w.Step()
	if p.Run.Pending != 0 {
		t.Fatalf("expected Pending=0 after second choice, got %d", p.Run.Pending)
	}

	// Simulate brief disconnect and resume: hero stays in the Wilds at Level 7 and can immediately walk.
	w.RemovePlayer("p1")
	resumed := w.ResumePlayer("p1", "Hero", 100)
	if resumed == nil || resumed.X != wildX || resumed.Y != wildY || resumed.Run.Level != 7 {
		t.Fatalf("expected resumed hero at (%.1f, %.1f) Lv.7, got %+v", wildX, wildY, resumed)
	}
	drive(w, 10, walker{resumed, right})
	if hypot(resumed.X-wildX, resumed.Y-wildY) < 20 {
		t.Fatalf("resumed hero failed to walk from (%.1f, %.1f) -> (%.1f, %.1f)", wildX, wildY, resumed.X, resumed.Y)
	}

	// Now simulate death and respawn at the tent: Plays increments and hero can immediately walk again.
	resumed.F.Damage(1e6)
	playsAtDeath := resumed.F.Plays
	run(w, int(heroRespawn/TickMS)+2)
	if !resumed.F.Alive() || resumed.F.Plays <= playsAtDeath || !InSafeZone(resumed.F.Pos) {
		t.Fatalf("expected alive respawn at tent with Plays > %d, got state=%s plays=%d pos=%v", playsAtDeath, resumed.F.State, resumed.F.Plays, resumed.F.Pos)
	}
	tentX, tentY := resumed.X, resumed.Y
	drive(w, 10, walker{resumed, right})
	if hypot(resumed.X-tentX, resumed.Y-tentY) < 20 {
		t.Fatalf("respawned hero stuck at tent: (%.1f, %.1f) -> (%.1f, %.1f)", tentX, tentY, resumed.X, resumed.Y)
	}
}

// A hero walking past a revenant keeps walking: one input arriving a tick late (network jitter) must not let the
// auto attack start a swing under a held key, and a key pressed during a swing cancels it at once, as solo play
// does (encounters.ts step).
func TestHeldWalkIsNeverLockedInASwing(t *testing.T) {
	w := newTestWorld(t)
	p := w.AddPlayer("a", "A", 100)
	at := Vec{gateTile + 2.5, gateTile + 2.5}
	px := TilePoint(at.X, at.Y)
	p.X, p.Y, p.F.Pos = px.X, px.Y, at
	w.spawnTimer = 1e9
	e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{at.X + heroReach*.6, at.Y + heroReach*.6}), Home: at}
	e.F.Cooldown, e.F.Immune = 1e9, 1e9
	w.Enemies, w.nextEnemy = []*Enemy{e}, 2
	// Standing still beside it, the hero swings.
	run(w, 2)
	if p.F.State != Attack {
		t.Fatalf("idle hero beside a revenant is %q, want a swing", p.F.State)
	}
	// Pressing a key mid-swing walks on this very input.
	x, y := p.X, p.Y
	drive(w, 1, walker{p, right})
	if p.X == x && p.Y == y {
		t.Fatalf("a held key did not cancel the swing (state %q)", p.F.State)
	}
	if p.HoldTicks() != 0 {
		t.Fatalf("a swing holds %d inputs, but a walk cancels it", p.HoldTicks())
	}
	// Jittery inputs: every third tick nothing arrives, the next brings two. The hero never swings again.
	for i := 0; i < 60; i++ {
		if i%3 != 2 {
			p.Queue(Input{Seq: p.nextSeq(), X: right.X, Y: right.Y})
		}
		w.Step()
		if p.F.State == Attack {
			t.Fatalf("tick %d: hero holding a key started a swing", i)
		}
	}
}

// A phone network that holds packets for 300-400 ms and then delivers them together, while a revenant keeps pace
// beside the hero: the key held all along keeps the hero out of swings once its first input has arrived (the
// server held every swing and restarted one in each gap before, 90 of 200 ticks).
func TestHeldWalkThroughPacketBurstsBesideAChaser(t *testing.T) {
	for _, gap := range []int{6, 8} {
		w := newTestWorld(t)
		p := w.AddPlayer("a", "A", 100)
		at := Vec{gateTile + 2.5, gateTile + 2.5}
		px := TilePoint(at.X, at.Y)
		p.X, p.Y, p.F.Pos = px.X, px.Y, at
		w.spawnTimer = 1e9
		e := &Enemy{ID: 1, F: newFighter(Revenant, Vec{at.X + heroReach*.6, at.Y + heroReach*.6}), Home: at}
		e.F.Cooldown, e.F.Immune = 1e9, 1e9
		w.Enemies, w.nextEnemy = []*Enemy{e}, 2
		swings := 0
		for i := 0; i < 200; i++ {
			if (i+1)%gap == 0 {
				for k := 0; k < gap; k++ {
					p.Queue(Input{Seq: p.nextSeq(), X: right.X, Y: right.Y})
				}
			}
			w.Step()
			e.F.Pos = Vec{p.F.Pos.X + heroReach*.5, p.F.Pos.Y + heroReach*.5}
			if p.F.State == Attack {
				swings++
			}
		}
		if swings >= gap {
			t.Fatalf("bursts every %d ticks: %d of 200 ticks in a swing under a held key", gap, swings)
		}
	}
}
