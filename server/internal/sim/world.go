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

// Hero walking, from net/movement.ts: full speed is screen px/s straight across and straight up/down, on an
// ellipse between them (112 px/s along a tile edge).
const (
	heroAcross = 120.0
	heroUpDown = 90.0
)

var (
	enemySpeed = 105 / hypot(64, 32) * .55 // tiles/s, a bit over half the hero's
	// The hero starts (and respawns) just in front of the tent in the centre of the court.
	heroSpawn = Vec{590, 420}
	// Later players stand beside the first so the party never spawns stacked.
	spawnOffsets = []Vec{{0, 0}, {-26, 12}, {26, 12}, {0, 26}}
)

// fullSpeed is the hero's speed in screen px/s along (sx, sy) at a full push (fullSpeed in movement.ts); WalkStep
// scales it by the input's length.
func fullSpeed(sx, sy float64) float64 {
	l := hypot(sx, sy)
	if l == 0 {
		return 0
	}
	return l / hypot(sx/heroAcross, sy/heroUpDown)
}

// Input is one client step: a screen-space walk vector of length 0..1 for one tick.
type Input struct {
	Choice string
	Level  int
	Seq    uint32
	X, Y   float64
}

// Player is a connected hero.
type Player struct {
	ID     string
	Name   string
	Hero   string // which hero the player picked (room.CleanHero); only clients draw it
	Slot   int
	X, Y   float64 // world px of the foot
	F      Fighter
	MaxHP  float64
	Run    Progression
	Kills  int
	Moving bool
	Ack    uint32 // last input sequence applied
	Owed   int    // steps guessed ahead of inputs that are late; they are walked again when those inputs arrive
	// BaseX, BaseY: where the last applied input left the hero, under the Owed guessed steps (only while Owed > 0).
	BaseX, BaseY float64

	queue    []Input
	tokens   float64
	steering bool
	last     Vec // the walk vector of the last input applied
	starved  int // ticks in a row without any input
	slotCD   [MaxSkillSlots]float64
}

// SetHero sets the player's hero and synchronizes their 3-slot skill loadout.
func (p *Player) SetHero(hero string) {
	p.Hero = hero
	p.Run.SyncHero(hero)
}

// Enemy is a revenant. Gen bumps on every respawn so clients restart its fade-in; Level scales HP, damage and XP reward.
type Enemy struct {
	ID     int
	Gen    int
	Level  int
	MaxHP  float64
	Age    float64
	F      Fighter
	Home   Vec
	Wander *Vec
	Target string
	// Side is the way it last veered round a footprint (+1 or -1; 0 counts as +1), tried first next time.
	Side float64
}

func (e *Enemy) enemyLevel() int {
	if e.Level < 1 {
		return 1
	}
	return e.Level
}

func (e *Enemy) maxHP() float64 {
	if e.MaxHP > 0 {
		return e.MaxHP
	}
	return RevenantMaxHP(e.enemyLevel())
}

func (e *Enemy) damage() float64 {
	return RevenantDamage(e.enemyLevel())
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
	retired    map[string]*Player
}

// NewWorld starts a world at a time of day with a deterministic seed.
func NewWorld(nav *Blocker, clock float64, seed uint64) *World {
	return &World{Clock: clock - math.Floor(clock), rng: rand.New(rand.NewPCG(seed, seed^0x9e3779b97f4a7c15)), nav: nav, nextEnemy: 1, retired: map[string]*Player{}}
}

func (w *World) random() float64 { return w.rng.Float64() }

func (w *World) freeSlot() int {
	used := map[int]bool{}
	for _, p := range w.Players {
		used[p.Slot] = true
	}
	slot := 0
	for used[slot] {
		slot++
	}
	return slot
}

// AddPlayer places a hero at the tent in the first free slot. It returns nil when the room is full.
func (w *World) AddPlayer(id, name string, maxHP float64) *Player {
	if len(w.Players) >= MaxPlayers {
		return nil
	}
	p := &Player{ID: id, Name: name, Slot: w.freeSlot(), MaxHP: clampMaxHP(maxHP), tokens: 2, Run: newProgression()}
	w.place(p)
	w.Players = append(w.Players, p)
	return p
}

// ResumePlayer reclaims an existing or recently disconnected hero in the room so a brief reconnect
// keeps the hero's world position and progression instead of resetting them to the tent at Level 1.
func (w *World) ResumePlayer(id, name string, maxHP float64) *Player {
	if id == "" {
		return nil
	}
	p := w.Player(id)
	if p == nil {
		if len(w.Players) >= MaxPlayers || w.retired == nil {
			return nil
		}
		p = w.retired[id]
		if p == nil {
			return nil
		}
		delete(w.retired, id)
		p.Slot = w.freeSlot()
		w.Players = append(w.Players, p)
	}
	p.Name = name
	bonusHP := float64(p.Run.Stars*10 + p.Run.Skills["vitality"]*20)
	p.MaxHP = clampMaxHP(maxHP) + bonusHP
	if p.F.HP > p.MaxHP {
		p.F.HP = p.MaxHP
	}
	p.Ack = 0
	p.Owed = 0
	p.BaseX, p.BaseY = p.X, p.Y
	p.queue = nil
	p.tokens = 2
	p.steering = false
	p.Moving = false
	p.last = Vec{}
	p.starved = 0
	if !p.F.Alive() {
		w.place(p)
	}
	if p.Run.Pending > 0 && len(p.Run.Offers) == 0 {
		w.rollForHero(&p.Run, p.Hero)
	}
	w.syncEnemyLevels()
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
	plays := p.F.Plays
	respawn := p.F.State == Die || plays > 0
	p.X, p.Y = at.X, at.Y
	p.BaseX, p.BaseY = at.X, at.Y
	p.Owed = 0
	p.F = newFighter(Hero, ToTile(at.X, at.Y))
	if respawn {
		p.F.Plays = plays + 1
	}
	p.F.HP = p.MaxHP
	p.Moving = false
	p.steering = false
	p.last = Vec{}
	p.starved = 0
}

// RemovePlayer drops a hero from the world.
func (w *World) RemovePlayer(id string) {
	for i, p := range w.Players {
		if p.ID == id {
			w.Players = append(w.Players[:i], w.Players[i+1:]...)
			if w.retired == nil {
				w.retired = map[string]*Player{}
			}
			if len(w.retired) >= 16 {
				for k := range w.retired {
					delete(w.retired, k)
					break
				}
			}
			w.retired[p.ID] = p
			for _, e := range w.Enemies {
				if e.Target == id {
					e.Target = ""
				}
			}
			w.syncEnemyLevels()
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
	p.choose(in.Choice, in.Level)
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
		if p.Run.Pending > 0 {
			p.F.Immune = 200
			if len(p.Run.Offers) == 0 {
				w.rollForHero(&p.Run, p.Hero)
			}
		}
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
// second on average however fast it sends. A shorter queue is the client's jitter buffer: it paces its sending to
// keep one or two inputs here. An input that is merely late (browsers send in bursts on frame boundaries, phone
// networks jitter) would stop the hero for a tick and double its step the next, which every other client sees as
// a stutter. So when no input has arrived, a hero that was walking keeps its last walk vector for up to maxOwed
// ticks (Owed). Those steps are only a guess: when the late inputs arrive the hero goes back to where the last
// real input left it (Base) and walks them, so a thumbstick that turned or let go during the gap is followed
// exactly, and the client's prediction (which walked the real inputs) needs no correction.
// A longer stall (a phone network holding packets for half a second) leaves a backlog behind it: the ticks spent
// waiting bank tokens (up to maxTokens), and more than `backlog` waiting inputs walk two a tick until caught up,
// so the server never stays hundreds of ms behind the player. The total walked never exceeds one step per tick
// on average plus the banked tokens.
const (
	maxOwed   = 3
	backlog   = 2
	maxTokens = 8
)

func (w *World) walkInputs(p *Player, dt float64) {
	p.tokens = math.Min(p.tokens+1, maxTokens)
	if p.Owed > 0 && len(p.queue) > 0 {
		p.starved = 0
		k := min(p.Owed, len(p.queue))
		// A hero held in a swing or hit since keeps its place; those inputs are only acknowledged.
		replay := !posed(p)
		if replay {
			p.X, p.Y = p.BaseX, p.BaseY
		}
		for i := 0; i < k; i++ {
			in := p.queue[0]
			p.queue = p.queue[1:]
			p.Ack = in.Seq
			p.last = Vec{in.X, in.Y}
			if replay {
				w.walk(p, p.last, dt)
			}
		}
		p.Owed -= k
		p.BaseX, p.BaseY = p.X, p.Y
		// Guesses still standing for inputs not here yet follow the newest real input.
		if replay {
			for i := 0; i < p.Owed; i++ {
				w.walk(p, p.last, dt)
			}
		}
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
		if p.Owed == 0 {
			p.BaseX, p.BaseY = p.X, p.Y
		}
		p.tokens--
		p.Owed++
		w.walk(p, p.last, dt)
		return
	}
	// A client that went quiet (a background tab, a dropped connection) stops; its guessed steps stand and its
	// prediction rebases on wherever the server left the hero.
	if p.starved > 20 {
		p.Owed = 0
	}
	w.walk(p, Vec{}, dt)
}

// posed: a swing, hit stun or death holds the hero in place.
func posed(p *Player) bool { return p.F.State != Idle }

// HoldTicks is how many more ticks a swing or hit stun holds the hero in place (a death: until it respawns). The
// input applied in each of them is used up without walking, so the client skips as many of the inputs it has
// sent since the acknowledged one instead of walking them in its prediction.
func (p *Player) HoldTicks() int {
	s := kinds[p.F.Kind]
	switch p.F.State {
	case Attack:
		return max(0, int(math.Ceil((s.attackMs-p.F.T)/TickMS)))
	case Hit:
		return max(0, int(math.Ceil((s.hitMs-p.F.T)/TickMS)))
	case Die:
		return 1 << 20
	}
	return 0
}

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
// it returns the new foot position and the screen px walked.
func WalkStep(nav *Blocker, x, y float64, d Vec, dt float64, gatePassable bool) (float64, float64, float64) {
	m := hypot(d.X, d.Y)
	if m == 0 {
		return x, y, 0
	}
	v := fullSpeed(d.X, d.Y) * dt / 1000
	dx, dy := d.X*v, d.Y*v
	stuck := nav.Blocked(x, y, gatePassable)
	for _, s := range [3]Vec{{dx, dy}, {dx, 0}, {0, dy}} {
		if s.X == 0 && s.Y == 0 {
			continue
		}
		if stuck || !nav.Blocked(x+s.X, y+s.Y, gatePassable) {
			return x + s.X, y + s.Y, hypot(s.X, s.Y)
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

const simultaneousSyncWindowMs = 340.0

func (w *World) nearestAutoCastTarget(p *Player, rng float64) *Enemy {
	var best *Enemy
	d := rng
	for _, e := range w.Enemies {
		if !e.F.Alive() || (e.Gen > 0 && e.Age < 250) {
			continue
		}
		if v := hypot(e.F.Pos.X-p.F.Pos.X, e.F.Pos.Y-p.F.Pos.Y); v <= d {
			d, best = v, e
		}
	}
	return best
}

func (w *World) autoCastInAoE(p *Player) {
	if !p.F.Alive() || p.Run.Pending > 0 || InSafeZone(p.F.Pos) {
		return
	}
	p.Run.SyncHero(p.Hero)
	target := w.nearestAutoCastTarget(p, p.Run.aoeCastRadius())
	if target == nil {
		return
	}
	slotCount := min(MaxSkillSlots, len(p.Run.Slots))
	if slotCount == 0 {
		return
	}
	anyReady := false
	for i := 0; i < slotCount; i++ {
		if p.slotCD[i] <= 0 {
			anyReady = true
			break
		}
	}
	if !anyReady {
		return
	}
	readyIndices := make([]int, 0, slotCount)
	fired := make([]string, 0, slotCount)
	for i := 0; i < slotCount; i++ {
		if p.slotCD[i] <= simultaneousSyncWindowMs {
			readyIndices = append(readyIndices, i)
			fired = append(fired, p.Run.Slots[i])
		}
	}
	comboMult := 1.0
	if len(readyIndices) >= 3 {
		comboMult = 1.30
	} else if len(readyIndices) == 2 {
		comboMult = 1.15
	}
	for _, idx := range readyIndices {
		skillID := p.Run.Slots[idx]
		p.slotCD[idx] = p.Run.skillCooldownMs(skillID)
		dmg := math.Max(1, math.Round(p.Run.damage()*p.Run.skillDamageMultiplier(skillID)*comboMult))
		splashR := 1.35 * p.Run.reach() * p.Run.skillAreaMultiplier(skillID)
		hits := 0
		for _, e := range w.Enemies {
			if !e.F.Alive() || (e.Gen > 0 && e.Age < 250) {
				continue
			}
			if e == target || hypot(e.F.Pos.X-target.F.Pos.X, e.F.Pos.Y-target.F.Pos.Y) <= splashR {
				if e.F.Damage(dmg) {
					p.Kills++
					w.rewardFoe(p, e.enemyLevel())
				}
				hits++
				if hits >= cleave {
					break
				}
			}
		}
	}
	p.Run.AutoCasts++
	if len(fired) >= 3 {
		p.Run.TrinityCasts++
	}
	p.Run.LastCast = fired
}

func (w *World) enemyLevelOf(f *Fighter) int {
	for _, e := range w.Enemies {
		if &e.F == f {
			return e.enemyLevel()
		}
	}
	return w.spawnLevel()
}

func (w *World) heroStep(p *Player, dt float64) {
	for i := 0; i < MaxSkillSlots; i++ {
		p.slotCD[i] = math.Max(0, p.slotCD[i]-dt)
	}
	h := &p.F
	if !h.Alive() {
		h.DeadFor += dt
		if h.DeadFor > heroRespawn {
			w.place(p)
		}
		return
	}
	h.Recover()
	if p.Run.Pending > 0 {
		return
	}
	w.autoCastInAoE(p)
	if h.State == Attack {
		if h.Impact() {
			for _, f := range swingTargets(h, w.enemyFighters(), heroReach*p.Run.reach(), side) {
				if f.Damage(p.Run.damage()) {
					p.Kills++
					w.rewardFoe(p, w.enemyLevelOf(f))
				}
			}
		}
		return
	}
	if h.State == Hit {
		return
	}
	if !p.steering {
		if e := w.nearestEnemy(p, heroReach*p.Run.reach()); e != nil {
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
	e.Age += dt
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
				t.F.Damage(e.damage())
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
		if w.random() < .5 && !InSafeZone(p) && w.clearTile(p) {
			e.Wander = &p
		} else {
			here := f.Pos
			e.Wander = &here
		}
	}
	// A wander target behind an obstacle is given up for a new one.
	wu, wv := e.Wander.X-f.Pos.X, e.Wander.Y-f.Pos.Y
	if hypot(wu, wv) > .15 {
		if !w.move(e, wu, wv, dt) {
			e.Wander = nil
		}
	} else {
		f.Play(Idle)
	}
}

// veers are the turns (radians) a blocked revenant tries, shallowest first (encounters.ts VEER).
var veers = [...]float64{.4, .8, 1.2, 1.6, 2, 2.4}

// clearTile mirrors encounters.ts walkable(): walkable ground outside every footprint, as for a hero, with the
// gate passage open (revenants never cross it anyway: the safe zone stops them first).
func (w *World) clearTile(t Vec) bool {
	p := TilePoint(t.X, t.Y)
	return !w.nav.Blocked(p.X, p.Y, true)
}

// move walks a revenant (encounters.ts move): a step that would enter the safe zone, leave walkable snow or walk
// into a footprint slides along it, veers around it or stops. Veering takes the shallowest free turn, first to the
// side it last turned to; a slide that barely covers ground does not count. One already overlapping a footprint
// may walk out. False when stopped.
func (w *World) move(e *Enemy, du, dv, dt float64) bool {
	f := &e.F
	l := hypot(du, dv)
	if l < 1e-6 {
		return false
	}
	v := enemySpeed * dt / 1000
	dx, dy := du/l*v, dv/l*v
	stuck := !w.clearTile(f.Pos)
	side := e.Side
	if side == 0 {
		side = 1
	}
	type try struct {
		m    Vec
		side float64
	}
	var tries [3 + 2*len(veers)]try
	tries[0], tries[1], tries[2] = try{Vec{dx, dy}, 0}, try{Vec{dx, 0}, 0}, try{Vec{0, dy}, 0}
	n := 3
	for _, t := range [2]float64{1, -1} {
		for _, a := range veers {
			a *= t * side
			tries[n] = try{Vec{dx*math.Cos(a) - dy*math.Sin(a), dx*math.Sin(a) + dy*math.Cos(a)}, math.Copysign(1, a)}
			n++
		}
	}
	for _, t := range tries {
		next := Vec{f.Pos.X + t.m.X, f.Pos.Y + t.m.Y}
		if hypot(t.m.X, t.m.Y) < v*.4 || InSafeZone(next) || !stuck && !w.clearTile(next) {
			continue
		}
		if t.side != 0 {
			e.Side = t.side
		}
		f.Pos = next
		s := screen(t.m.X, t.m.Y)
		turn(f, s.X, s.Y)
		f.Play(Move)
		return true
	}
	s := screen(du, dv)
	turn(f, s.X, s.Y)
	f.Play(Idle)
	return false
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
			if !InSafeZone(next) && w.clearTile(next) {
				a.Pos = next
			}
		}
	}
}

// spawnLevel returns the highest current Hero progression level in the room (minimum 1).
func (w *World) spawnLevel() int {
	lv := 1
	for _, p := range w.Players {
		if p.Run.Level > lv {
			lv = p.Run.Level
		}
	}
	return lv
}

func (w *World) syncEnemyLevels() {
	if len(w.Players) == 0 {
		return
	}
	targetLv := w.spawnLevel()
	for _, e := range w.Enemies {
		if e.enemyLevel() != targetLv {
			prevMax := e.maxHP()
			ratio := 1.0
			if e.F.Alive() && prevMax > 0 {
				ratio = math.Min(1, e.F.HP/prevMax)
			}
			e.Level = targetLv
			e.MaxHP = RevenantMaxHP(targetLv)
			if e.F.Alive() {
				e.F.HP = math.Round(ratio*e.MaxHP*100) / 100
			}
		}
	}
}

// spawn raises a new pack of one to three at the gate arc, or returns one fallen revenant there.
func (w *World) spawn(back *Enemy) {
	p, ok := spawnPoint(w.random, w.clearTile)
	if !ok {
		return
	}
	n := 1
	if back == nil {
		n = min(w.maxEnemies()-len(w.Enemies), 1+int(math.Floor(w.random()*pack)))
	}
	lv := w.spawnLevel()
	maxHP := RevenantMaxHP(lv)
	for i := 0; i < n; i++ {
		at := p
		if i > 0 {
			if at, ok = spawnPoint(w.random, w.clearTile); !ok {
				continue
			}
		}
		e := back
		if e == nil {
			e = &Enemy{ID: w.nextEnemy, Level: lv, MaxHP: maxHP, F: newFighter(Revenant, at)}
			w.nextEnemy++
			w.Enemies = append(w.Enemies, e)
		}
		e.F.Pos, e.Home, e.Wander, e.Target = at, at, nil, ""
		if e.Side == 0 {
			e.Side = 1
		}
		e.Level = lv
		e.MaxHP = maxHP
		e.F.HP, e.F.DeadFor, e.F.Cooldown, e.Age = maxHP, 0, 600+w.random()*900, 0
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
		if math.Abs(p.X-577) < rx && math.Abs(p.Y-778) < ry {
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
