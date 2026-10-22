package sim

import "math"

// PlayerState is a hero as clients see it. Positions are world px; states are clip names.
type PlayerState struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Hero     string      `json:"h,omitempty"`
	X        float64     `json:"x"`
	Y        float64     `json:"y"`
	HP       float64     `json:"hp"`
	Max      float64     `json:"max"`
	State    string      `json:"st"`
	Plays    int         `json:"n"`
	Moving   bool        `json:"mv"`
	Facing   int         `json:"fc"`
	Back     bool        `json:"bk"`
	Vertical bool        `json:"vt"`
	Run      Progression `json:"run"`
	Kills    int         `json:"k"`
}

// EnemyState is a revenant as clients see it. Positions are ground tiles.
type EnemyState struct {
	ID       int     `json:"id"`
	Gen      int     `json:"g"`
	Level    int     `json:"level"`
	U        float64 `json:"u"`
	V        float64 `json:"v"`
	HP       float64 `json:"hp"`
	Max      float64 `json:"max"`
	State    string  `json:"st"`
	Plays    int     `json:"n"`
	Facing   int     `json:"fc"`
	Back     bool    `json:"bk"`
	Vertical bool    `json:"vt"`
}

// GateState is the gateway: whether it is opening, its door frame and whether heroes may pass.
type GateState struct {
	Open  bool `json:"open"`
	Frame int  `json:"frame"`
	Pass  bool `json:"pass"`
}

// State is everything a snapshot carries except the per-client acknowledgement.
type State struct {
	Tick    uint64        `json:"tick"`
	Clock   float64       `json:"clock"`
	Gate    GateState     `json:"gate"`
	Players []PlayerState `json:"players"`
	Enemies []EnemyState  `json:"enemies"`
}

func round(v, unit float64) float64 { return math.Round(v/unit) * unit }

// State captures the world for a snapshot.
func (w *World) State() State {
	s := State{Tick: w.Tick, Clock: round(w.Clock, 1e-6), Gate: GateState{w.Gate.Open, w.Gate.Frame, w.Gate.Passable()},
		Players: make([]PlayerState, 0, len(w.Players)), Enemies: make([]EnemyState, 0, len(w.Enemies))}
	for _, p := range w.Players {
		s.Players = append(s.Players, PlayerState{ID: p.ID, Name: p.Name, Hero: p.Hero, X: round(p.X, .01), Y: round(p.Y, .01), HP: round(p.F.HP, .1), Max: p.MaxHP,
			State: p.F.State, Plays: p.F.Plays, Moving: p.Moving, Facing: p.F.Facing, Back: p.F.Back, Vertical: p.F.Vertical, Kills: p.Kills, Run: p.Run})
	}
	for _, e := range w.Enemies {
		s.Enemies = append(s.Enemies, EnemyState{ID: e.ID, Gen: e.Gen, Level: e.enemyLevel(), U: round(e.F.Pos.X, .001), V: round(e.F.Pos.Y, .001), HP: e.F.HP, Max: e.maxHP(),
			State: e.F.State, Plays: e.F.Plays, Facing: e.F.Facing, Back: e.F.Back, Vertical: e.F.Vertical})
	}
	return s
}
