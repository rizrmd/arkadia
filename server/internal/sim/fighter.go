package sim

import (
	"math"
	"sort"
)

// Kind of fighter, with the arena's stats (combat.ts STATS).
type Kind int

const (
	Hero Kind = iota
	Revenant
)

// Clip states. Heroes never play Move: their locomotion is tracked by Player.Moving.
const (
	Idle   = "idle"
	Move   = "move"
	Attack = "attack"
	Hit    = "hit"
	Die    = "die"
)

type stats struct {
	hp, damage float64
	// Clip timing in ms from public/assets/characters/manifest.json: a swing lasts frames*1000/fps and lands on
	// frame `impact`; hit stun is the two-frame hit clip.
	attackMs, impactMs, hitMs float64
}

var kinds = map[Kind]stats{
	Hero:     {hp: 100, damage: 1, attackMs: 6 * 1000.0 / 12, impactMs: 3 * 1000.0 / 12, hitMs: 2 * 1000.0 / 10},
	Revenant: {hp: 2, damage: 4, attackMs: 6 * 1000.0 / 10, impactMs: 3 * 1000.0 / 10, hitMs: 2 * 1000.0 / 10},
}

// cleave is the most enemies one swing can hit.
const cleave = 3

// Fighter is combat.ts Fighter without the renderer: clip state, hit points and facing, on ground tiles.
type Fighter struct {
	Kind       Kind
	State      string
	T          float64 // ms into the current clip
	Plays      int     // bumped every time a clip (re)starts, so clients restart one-shot clips
	Facing     int     // sign of screen x
	Back       bool
	Vertical   bool
	HP         float64
	Cooldown   float64
	ImpactDone bool
	DeadFor    float64
	Immune     float64
	Pos        Vec // ground tile
}

func newFighter(k Kind, pos Vec) Fighter {
	return Fighter{Kind: k, State: Idle, Facing: 1, HP: kinds[k].hp, Pos: pos}
}

func (f *Fighter) Alive() bool { return f.State != Die }

func (f *Fighter) finished() bool {
	s := kinds[f.Kind]
	switch f.State {
	case Attack:
		return f.T >= s.attackMs
	case Hit:
		return f.T >= s.hitMs
	}
	return false
}

// Play starts a clip; a looping clip (idle, move) already playing keeps running.
func (f *Fighter) Play(state string) {
	if f.State == state && (state == Idle || state == Move) {
		return
	}
	f.State, f.T, f.ImpactDone = state, 0, false
	f.Plays++
}

func (f *Fighter) Tick(dt float64) { f.T += dt; f.Cooldown -= dt; f.Immune -= dt }

// Recover returns a finished swing or hit stun to idle.
func (f *Fighter) Recover() {
	if (f.State == Hit || f.State == Attack) && f.finished() {
		f.Play(Idle)
	}
}

// Damage applies a blow and reports whether it was the killing one.
func (f *Fighter) Damage(n float64) bool {
	if !f.Alive() || f.Immune > 0 {
		return false
	}
	f.HP -= n
	if f.HP <= 0 {
		f.HP = 0
		f.Play(Die)
		f.DeadFor = 0
		return true
	}
	if f.Kind == Revenant || f.State != Attack {
		f.Play(Hit)
		if f.Kind == Hero {
			f.Immune = 600
		} else {
			f.Immune = 0
		}
	}
	return false
}

// Impact is true once per swing, on its impact frame.
func (f *Fighter) Impact() bool {
	if f.State != Attack || f.ImpactDone || f.T < kinds[f.Kind].impactMs {
		return false
	}
	f.ImpactDone = true
	return true
}

// turn faces a screen direction: front/rear art only within 10 degrees of straight up/down (15 to leave), and
// dead bands near each axis keep the previous quadrant.
func turn(f *Fighter, sx, sy float64) {
	l := hypot(sx, sy)
	if l < 1e-6 {
		return
	}
	band := 10.0
	if f.Vertical {
		band = 15
	}
	f.Vertical = math.Abs(sx)/l < math.Sin(band*math.Pi/180)
	if math.Abs(sy)/l > .15 {
		f.Back = sy < 0
	}
	if math.Abs(sx)/l > .15 {
		if sx > 0 {
			f.Facing = 1
		} else {
			f.Facing = -1
		}
	}
}

func sign(x float64) int {
	switch {
	case x > 0:
		return 1
	case x < 0:
		return -1
	}
	return 0
}

// inReach: close enough, and in front of the attacker or within side tiles of straight above or below it.
func inReach(a, b *Fighter, reach, side float64) bool {
	dx, dy := b.Pos.X-a.Pos.X, b.Pos.Y-a.Pos.Y
	sx := dx - dy
	return hypot(dx, dy) <= reach && (math.Abs(sx) < side || sign(sx) == a.Facing)
}

// swingTargets are the nearest cleave living targets in reach.
func swingTargets(a *Fighter, targets []*Fighter, reach, side float64) []*Fighter {
	var in []*Fighter
	for _, e := range targets {
		if e.Alive() && inReach(a, e, reach, side) {
			in = append(in, e)
		}
	}
	d := func(e *Fighter) float64 { return hypot(e.Pos.X-a.Pos.X, e.Pos.Y-a.Pos.Y) }
	sort.SliceStable(in, func(i, j int) bool { return d(in[i]) < d(in[j]) })
	if len(in) > cleave {
		in = in[:cleave]
	}
	return in
}
