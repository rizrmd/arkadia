package sim

import (
	"math"
	"math/rand/v2"
)

// TickMS is the fixed simulation step: 20 ticks per second.
const TickMS = 50.0

// DayMS is one in-game day: one real minute per game hour (daylight.ts DAY_MS).
const DayMS = 24 * 60 * 1000.0

// MaxPlayers per room.
const MaxPlayers = 4

// Encounter tuning, from encounters.ts. Distances are ground tiles; the arena's reach is scaled to the
// Stronghold's smaller figures (DISPLAY/1.1).
const (
	figure      = .48 / 1.1
	heroReach   = 1.15 * figure
	enemyReach  = .85 * figure
	side        = .35 * figure
	spacing     = .72 * figure
	aggro       = 13.0
	engage      = 2.0
	pack        = 3
	spawnEvery  = 2000.0
	regen       = 8.0
	heroRespawn = 3500.0
	corpse      = 4400.0
	baseEnemies = 8
	// Each extra player brings this many more revenants into the snow.
	enemiesPerPlayer = 3
)

// Hero walking, from hero.ts: SPEED is screen px/s along a tile edge; up/down and across keep the same ground pace.
const heroSpeed = 105.0

var (
	enemySpeed = 105 / hypot(64, 32) * .55 // tiles/s, a bit over half the hero's
	pace       = groundLen(2, 1) / hypot(2, 1)
	// The hero starts (and respawns) just in front of the tent in the centre of the court.
	heroSpawn = Vec{590, 420}
	// Later players stand beside the first so the party never spawns stacked.
	spawnOffsets = []Vec{{0, 0}, {-26, 12}, {26, 12}, {0, 26}}
)

func groundLen(sx, sy float64) float64 { g := unproject(sx, sy); return hypot(g.X, g.Y) }

// Input is one client step: a screen-space walk vector of length 0..1 for one tick.
type Input struct {
	Seq  uint32
	X, Y float64
}

// Player is a connected hero.
type Player struct {
	ID     string
	Name   string
	Slot   int
	X, Y   float64 // world px of the foot
	F      Fighter
	MaxHP  float64
	Kills  int
	Moving bool
	Ack    uint32 // last input sequence applied
	Owed   int    // steps walked ahead of inputs that arrived late; the next Owed inputs are acked without walking

	queue    []Input
	tokens   float64
	steering bool
	last     Vec // the walk vector of the last input applied
	starved  int // ticks in a row without any input
}

// Enemy is a revenant. Gen bumps on every respawn so clients restart its fade-in.
type Enemy struct {
	ID     int
	Gen    int
	F      Fighter
	Home   Vec
	Wander *Vec
	Target string
}

// Gate is the gateway: open while a hero stands at the threshold; Frame follows the 16-frame, 20 fps door sheet
// one frame per tick, and heroes pass once the leaves are 80% open.
type Gate struct {
	Open  bool
	Frame int
}

const gateFrames = 16

// Passable mirrors gate-doors.ts: passable from progress 0.8.
func (g Gate) Passable() bool { return float64(g.Frame)/(gateFrames-1) >= .8 }

// World is one room's simulation.
type World struct {
	Tick       uint64
	Clock      float64 // time of day, 0 = midnight, .5 = noon
	Players    []*Player
	Enemies    []*Enemy
	Gate       Gate
	nextEnemy  int
	spawnTimer float64
	rng        *rand.Rand
	nav        *Blocker
}

// NewWorld starts a world at a time of day with a deterministic seed.
func NewWorld(nav *Blocker, clock float64, seed uint64) *World {
	return &World{Clock: clock - math.Floor(clock), rng: rand.New(rand.NewPCG(seed, seed^0x9e3779b97f4a7c15)), nav: nav, nextEnemy: 1}
}

func (w *World) random() float64 { return w.rng.Float64() }

// AddPlayer places a hero at the tent in the first free slot. It returns nil when the room is full.
func (w *World) AddPlayer(id, name string, maxHP float64) *Player {
	if len(w.Players) >= MaxPlayers {
		return nil
	}
	used := map[int]bool{}
	for _, p := range w.Players {
		used[p.Slot] = true
	}
	slot := 0
	for used[slot] {
		slot++
	}
	p := &Player{ID: id, Name: name, Slot: slot, MaxHP: clampMaxHP(maxHP), tokens: 2}
	w.place(p)
	w.Players = append(w.Players, p)
	return p
}

// Hit points the Stronghold's Warden, training, skills and weapon can add (economy.ts heroBonus).
func clampMaxHP(v float64) float64 {
	if math.IsNaN(v) || v < 100 {
		return 100
	}
	return math.Min(math.Round(v), 210)
}

func (w *World) place(p *Player) {
	at := heroSpawn
	if o := spawnOffsets[p.Slot%len(spawnOffsets)]; !w.nav.Blocked(at.X+o.X, at.Y+o.Y, w.Gate.Passable()) {
		at = Vec{at.X + o.X, at.Y + o.Y}
	}
	p.X, p.Y = at.X, at.Y
	p.F = newFighter(Hero, ToTile(at.X, at.Y))
	p.F.HP = p.MaxHP
	p.Moving = false
}

// RemovePlayer drops a hero from the world.
func (w *World) RemovePlayer(id string) {
	for i, p := range w.Players {
		if p.ID == id {
			w.Players = append(w.Players[:i], w.Players[i+1:]...)
			for _, e := range w.Enemies {
				if e.Target == id {
					e.Target = ""
				}
			}
			return
		}
	}
}

// Player finds a hero by id.
func (w *World) Player(id string) *Player {
	for _, p := range w.Players {
		if p.ID == id {
			return p
		}
	}
	return nil
}

const maxQueue = 30

// Queued is how many inputs wait to be applied.
func (p *Player) Queued() int { return len(p.queue) }

// Queue buffers a client input. Each input is applied exactly once, for one tick, in sequence order; stale or
// malformed inputs are dropped, and a walk vector longer than 1 is shortened to 1.
func (p *Player) Queue(in Input) {
	last := p.Ack
	if n := len(p.queue); n > 0 {
		last = p.queue[n-1].Seq
	}
	if in.Seq <= last || math.IsNaN(in.X) || math.IsNaN(in.Y) || math.IsInf(in.X, 0) || math.IsInf(in.Y, 0) {
		return
	}
	if l := hypot(in.X, in.Y); l > 1 {
		in.X, in.Y = in.X/l, in.Y/l
	}
	p.queue = append(p.queue, in)
	if len(p.queue) > maxQueue {
		p.queue = p.queue[len(p.queue)-maxQueue:]
	}
}

func (w *World) maxEnemies() int { return baseEnemies + enemiesPerPlayer*max(0, len(w.Players)-1) }

// Step advances the world by one tick.
func (w *World) Step() {
	const dt = TickMS
	w.Tick++
	for _, p := range w.Players {
		w.walkInputs(p, dt)
	}
	for _, p := range w.Players {
		p.F.Tick(dt)
		if p.F.Alive() && p.F.State == Idle {
			p.F.Pos = ToTile(p.X, p.Y)
		}
	}
	for _, e := range w.Enemies {
		e.F.Tick(dt)
	}
	for _, p := range w.Players {
		w.heroStep(p, dt)
	}
	for _, e := range w.Enemies {
		w.foeStep(e, dt)
	}
	w.separate()
	w.spawnTimer -= dt
	if w.spawnTimer <= 0 && len(w.Enemies) < w.maxEnemies() {
		w.spawnTimer = spawnEvery
		w.spawn(nil)
	}
	w.updateGate()
	w.Clock += dt / DayMS
	w.Clock -= math.Floor(w.Clock)
}

// walkInputs applies this tick's inputs. A token bucket refilled once per tick caps a client at 20 steps per
// second on average however fast it sends; a backlog of more than 300 ms (after a network stall) drains two steps
// per tick. A shorter queue is the client's jitter buffer: it paces its sending to keep one or two inputs here.
// An input that is merely late (browsers send in bursts on frame boundaries, phone networks jitter) would stop
// the hero for a tick and double its step the next, which every other client sees as a stutter. So when no input
// has arrived, a hero that was walking keeps its last walk vector for up to maxOwed ticks; the late inputs that
// stand behind those steps are then acknowledged without walking again (Owed, sent to the client so its
// prediction skips them too). The total walked never exceeds the inputs sent plus maxOwed steps.
const (
	maxOwed = 3
	backlog = 6
)

func (w *World) walkInputs(p *Player, dt float64) {
	p.tokens = math.Min(p.tokens+1, 3)
	for p.Owed > 0 && len(p.queue) > 0 {
		p.starved = 0
		p.Ack = p.queue[0].Seq
		p.last = Vec{p.queue[0].X, p.queue[0].Y}
		p.queue = p.queue[1:]
		p.Owed--
	}
	n := 0
	if len(p.queue) > 0 {
		n = 1
		if len(p.queue) > backlog {
			n = 2
		}
	}
	applied := false
	for i := 0; i < n && p.tokens >= 1; i++ {
		in := p.queue[0]
		p.queue = p.queue[1:]
		p.tokens--
		p.Ack = in.Seq
		p.last = Vec{in.X, in.Y}
		w.walk(p, p.last, dt)
		applied = true
	}
	if applied || len(p.queue) > 0 {
		p.starved = 0
		if !applied {
			w.walk(p, Vec{}, dt)
		}
		return
	}
	p.starved++
	if p.starved <= maxOwed && p.Owed < maxOwed && p.tokens >= 1 && (p.last.X != 0 || p.last.Y != 0) && !posed(p) {
		p.tokens--
		p.Owed++
		w.walk(p, p.last, dt)
		return
	}
	// A client that went quiet (a background tab, a dropped connection) stops; its owed steps are forgiven and
	// its prediction rebases on wherever the server left the hero.
	if p.starved > 20 {
		p.Owed = 0
	}
	w.walk(p, Vec{}, dt)
}

// posed: a swing, hit stun or death holds the hero in place.
func posed(p *Player) bool { return p.F.State != Idle }

// walk moves a hero one tick along a screen-space vector, sliding along whatever blocks the full step (hero.ts).
func (w *World) walk(p *Player, input Vec, dt float64) {
	p.steering = input.X != 0 || input.Y != 0
	if posed(p) {
		p.Moving = false
		return
	}
	d := w.steer(p, input)
	m := hypot(d.X, d.Y)
	progress := 0.0
	if m > 0 {
		turn(&p.F, d.X, d.Y)
		x, y, prog := WalkStep(w.nav, p.X, p.Y, d, dt, w.Gate.Passable())
		p.X, p.Y, progress = x, y, prog
	}
	threshold := 5.0
	if p.Moving {
		threshold = 2
	}
	p.Moving = progress/(dt/1000) > threshold
}

// WalkStep is the hero's movement rule, shared with the client's prediction (src/stronghold/net/movement.ts):
// it returns the new foot position and the screen px walked along the direction.
func WalkStep(nav *Blocker, x, y float64, d Vec, dt float64, gatePassable bool) (float64, float64, float64) {
	m := hypot(d.X, d.Y)
	if m == 0 {
		return x, y, 0
	}
	g := groundLen(d.X, d.Y)
	v := heroSpeed * dt / 1000 * m * pace / g
	dx, dy := d.X*v, d.Y*v
	stuck := nav.Blocked(x, y, gatePassable)
	for _, s := range [3]Vec{{dx, dy}, {dx, 0}, {0, dy}} {
		if s.X == 0 && s.Y == 0 {
			continue
		}
		if stuck || !nav.Blocked(x+s.X, y+s.Y, gatePassable) {
			return x + s.X, y + s.Y, (s.X*d.X + s.Y*d.Y) * g / (m * m * pace)
		}
	}
	return x, y, 0
}

func (w *World) nearestEnemy(p *Player, rng float64) *Enemy {
	var best *Enemy
	d := rng
	for _, e := range w.Enemies {
		if v := hypot(e.F.Pos.X-p.F.Pos.X, e.F.Pos.Y-p.F.Pos.Y); e.F.Alive() && v <= d {
			d, best = v, e
		}
	}
	return best
}

// steer: when nobody steers, an idle hero steps in toward a revenant a few paces away.
func (w *World) steer(p *Player, input Vec) Vec {
	if input.X != 0 || input.Y != 0 || !p.F.Alive() || p.F.State != Idle {
		return input
	}
	e := w.nearestEnemy(p, engage)
	if e == nil || hypot(e.F.Pos.X-p.F.Pos.X, e.F.Pos.Y-p.F.Pos.Y) <= heroReach*.8 {
		return input
	}
	s := screen(e.F.Pos.X-p.F.Pos.X, e.F.Pos.Y-p.F.Pos.Y)
	l := hypot(s.X, s.Y)
	return Vec{s.X / l, s.Y / l}
}

func (w *World) enemyFighters() []*Fighter {
	list := make([]*Fighter, 0, len(w.Enemies))
	for _, e := range w.Enemies {
		list = append(list, &e.F)
	}
	return list
}

func (w *World) heroStep(p *Player, dt float64) {
	h := &p.F
	if !h.Alive() {
		h.DeadFor += dt
		if h.DeadFor > heroRespawn {
			w.place(p)
		}
		return
	}
	h.Recover()
	if h.State == Attack {
		if h.Impact() {
			for _, f := range swingTargets(h, w.enemyFighters(), heroReach, side) {
				if f.Damage(kinds[Hero].damage) {
					p.Kills++
				}
			}
		}
		return
	}
	if h.State == Hit {
		return
	}
	if !p.steering {
		if e := w.nearestEnemy(p, heroReach); e != nil {
			s := screen(e.F.Pos.X-h.Pos.X, e.F.Pos.Y-h.Pos.Y)
			turn(h, s.X, s.Y)
			h.Play(Attack)
			p.Moving = false
			return
		}
	}
	if InSafeZone(h.Pos) {
		h.HP = math.Min(p.MaxHP, h.HP+regen*dt/1000)
	}
}

// target: the nearest living hero out in the wilds within aggro range.
func (w *World) target(e *Enemy) *Player {
	var best *Player
	d := aggro
	for _, p := range w.Players {
		if !p.F.Alive() || InSafeZone(p.F.Pos) {
			continue
		}
		if v := hypot(p.F.Pos.X-e.F.Pos.X, p.F.Pos.Y-e.F.Pos.Y); v < d {
			d, best = v, p
		}
	}
	return best
}

func (w *World) foeStep(e *Enemy, dt float64) {
	f := &e.F
	if !f.Alive() {
		f.DeadFor += dt
		if f.DeadFor > corpse {
			w.spawn(e)
		}
		return
	}
	f.Recover()
	if f.State == Hit {
		return
	}
	if f.State == Attack {
		if f.Impact() {
			if t := w.Player(e.Target); t != nil && t.F.Alive() && !InSafeZone(t.F.Pos) && inReach(f, &t.F, enemyReach+.25*figure, side) {
				t.F.Damage(kinds[Revenant].damage)
			}
		}
		return
	}
	if t := w.target(e); t != nil {
		du, dv := t.F.Pos.X-f.Pos.X, t.F.Pos.Y-f.Pos.Y
		if hypot(du, dv) > enemyReach {
			w.move(e, du, dv, dt)
			return
		}
		s := screen(du, dv)
		turn(f, s.X, s.Y)
		if f.Cooldown <= 0 {
			f.Cooldown = 1500 + w.random()*1200
			e.Target = t.ID
			f.Play(Attack)
		} else {
			f.Play(Idle)
		}
		return
	}
	// Wander around the spawn point, outside the zone.
	if e.Wander == nil || w.random() < .002 {
		a, r := w.random()*math.Pi*2, w.random()*5
		p := Vec{e.Home.X + math.Cos(a)*r, e.Home.Y + math.Sin(a)*r}
		if w.random() < .5 && !InSafeZone(p) && walkableTile(p) {
			e.Wander = &p
		} else {
			here := f.Pos
			e.Wander = &here
		}
	}
	wu, wv := e.Wander.X-f.Pos.X, e.Wander.Y-f.Pos.Y
	if hypot(wu, wv) > .15 {
		w.move(e, wu, wv, dt)
	} else {
		f.Play(Idle)
	}
}

// move walks a revenant; a step that would enter the safe zone or leave walkable snow slides along it or stops.
func (w *World) move(e *Enemy, du, dv, dt float64) {
	f := &e.F
	l := hypot(du, dv)
	if l < 1e-6 {
		return
	}
	v := enemySpeed * dt / 1000
	dx, dy := du/l*v, dv/l*v
	s := screen(du, dv)
	turn(f, s.X, s.Y)
	for _, m := range [3]Vec{{dx, dy}, {dx, 0}, {0, dy}} {
		next := Vec{f.Pos.X + m.X, f.Pos.Y + m.Y}
		if InSafeZone(next) || !walkableTile(next) {
			continue
		}
		f.Pos = next
		f.Play(Move)
		return
	}
	f.Play(Idle)
}

// separate keeps revenants a body's width apart and off the heroes; only revenants are pushed, never into the zone.
func (w *World) separate() {
	var list []*Fighter
	for _, e := range w.Enemies {
		if e.F.Alive() {
			list = append(list, &e.F)
		}
	}
	others := append([]*Fighter{}, list...)
	heroes := map[*Fighter]bool{}
	for _, p := range w.Players {
		others = append(others, &p.F)
		heroes[&p.F] = true
	}
	for _, a := range list {
		for _, b := range others {
			if a == b {
				continue
			}
			dx, dy := a.Pos.X-b.Pos.X, a.Pos.Y-b.Pos.Y
			d := hypot(dx, dy)
			if d >= spacing || d < 1e-6 {
				continue
			}
			k := .5
			if heroes[b] {
				k = 1
			}
			push := (spacing - d) * k
			next := Vec{a.Pos.X + dx/d*push, a.Pos.Y + dy/d*push}
			if !InSafeZone(next) && walkableTile(next) {
				a.Pos = next
			}
		}
	}
}

// spawn raises a new pack of one to three at the gate arc, or returns one fallen revenant there.
func (w *World) spawn(back *Enemy) {
	p, ok := spawnPoint(w.random)
	if !ok {
		return
	}
	n := 1
	if back == nil {
		n = min(w.maxEnemies()-len(w.Enemies), 1+int(math.Floor(w.random()*pack)))
	}
	for i := 0; i < n; i++ {
		at := p
		if i > 0 {
			if at, ok = spawnPoint(w.random); !ok {
				continue
			}
		}
		e := back
		if e == nil {
			e = &Enemy{ID: w.nextEnemy, F: newFighter(Revenant, at)}
			w.nextEnemy++
			w.Enemies = append(w.Enemies, e)
		}
		e.F.Pos, e.Home, e.Wander, e.Target = at, at, nil, ""
		e.F.HP, e.F.DeadFor, e.F.Cooldown = kinds[Revenant].hp, 0, 600+w.random()*900
		e.F.Play(Idle)
		e.Gen++
	}
}

// updateGate opens the gateway while any living hero stands at the threshold, with hysteresis (world-view.ts).
func (w *World) updateGate() {
	near := false
	for _, p := range w.Players {
		if !p.F.Alive() {
			continue
		}
		rx, ry := 48.0, 66.0
		if w.Gate.Open {
			rx, ry = 65, 88
		}
		if math.Abs(p.X-577) < rx && math.Abs(p.Y-770) < ry {
			near = true
		}
	}
	w.Gate.Open = near
	switch {
	case near && w.Gate.Frame < gateFrames-1:
		w.Gate.Frame++
	case !near && w.Gate.Frame > 0:
		w.Gate.Frame--
	}
}
