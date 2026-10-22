// Package sim is the authoritative Stronghold simulation: heroes, revenant packs, combat, the safe zone, the gate
// and the day clock, stepped at a fixed 20 Hz. Rules are ported from the browser client so a predicted hero and
// the server agree: src/isometric.ts, src/stronghold/{terrain,navigation,safe-zone,hero,encounters}.ts and
// src/characters/combat.ts. Hero positions are world px (the client's screen space); combat runs on ground tiles.
package sim

import "math"

// Vec is a 2D point: world px (X, Y) or ground tiles (U in X, V in Y).
type Vec struct{ X, Y float64 }

// 2:1 dimetric projection (isometric.ts) and the court origin (terrain.ts).
const (
	halfW     = 64.0
	halfH     = 32.0
	courtX    = 577.0
	courtY    = -160.0
	courtSize = 15.0
)

func project(u, v float64) Vec   { return Vec{(u - v) * halfW, (u + v) * halfH} }
func unproject(x, y float64) Vec { return Vec{(x/halfW + y/halfH) / 2, (y/halfH - x/halfW) / 2} }

// TilePoint is the world px of a ground tile coordinate.
func TilePoint(u, v float64) Vec { p := project(u, v); return Vec{p.X + courtX, p.Y + courtY} }

// ToTile is the ground tile under a world px.
func ToTile(x, y float64) Vec { return unproject(x-courtX, y-courtY) }

// screen turns a ground offset into its screen direction.
func screen(du, dv float64) Vec { return Vec{(du - dv) * 64, (du + dv) * 32} }

func hypot(x, y float64) float64 { return math.Sqrt(x*x + y*y) }

// gateTowerFront is the ground line of a gate tower's front face, d px either side of the arch centre (36 to 135).
func gateTowerFront(d float64) float64 {
	if d < 86 {
		return 774 + (d-36)*.42
	}
	return 795 - (d-86)*.62
}

// walkableGround mirrors navigation.ts: the court, the gate passage and its apron, and the open snow beyond.
func walkableGround(x, y float64) bool {
	g := ToTile(x, y)
	const edge = .5
	court := g.X >= edge && g.Y >= edge && g.X <= courtSize-edge && g.Y <= courtSize-edge
	d := math.Abs(x - 577)
	passage := y >= 710 && (d < 36 || d <= 135 && y >= gateTowerFront(d))
	outside := g.X >= 16.5 || g.Y >= 16.5
	return court || passage || outside
}

// Safe zone and spawn arc (safe-zone.ts). The court side of the gateway is safe.
const (
	metersPerTile  = 3.0
	spawnDistanceM = 10.0
	gateTile       = 950.0 / 64
	safeLine       = gateTile * 2
)

// InSafeZone reports whether a ground tile is on the court side of the gate threshold.
func InSafeZone(t Vec) bool { return t.X+t.Y <= safeLine }

func walkableTile(t Vec) bool { p := TilePoint(t.X, t.Y); return walkableGround(p.X, p.Y) }

// spawnPoint samples the outward-facing arc exactly 10 ground meters from the gate, on a tile clear says is free.
func spawnPoint(random func() float64, clear func(Vec) bool) (Vec, bool) {
	for i := 0; i < 60; i++ {
		a := math.Pi/4 + (random()-.5)*math.Pi*2/3
		r := spawnDistanceM / metersPerTile
		p := Vec{gateTile + math.Cos(a)*r, gateTile + math.Sin(a)*r}
		if !InSafeZone(p) && clear(p) {
			return p, true
		}
	}
	return Vec{}, false
}
