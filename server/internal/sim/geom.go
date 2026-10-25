// Package sim is the authoritative Stronghold simulation: heroes, revenant packs, combat, the safe zone, the gate
// and the day clock, stepped at a fixed 20 Hz. Rules are ported from the browser client so a predicted hero and
// the server agree: src/isometric.ts, src/stronghold/{terrain,navigation,safe-zone,hero,encounters}.ts and
// src/characters/combat.ts. Hero positions are world px (the client's screen space); combat runs on ground tiles.
package sim

import "math"

// Vec is a 2D point: world px (X, Y) or ground tiles (U in X, V in Y).
type Vec struct{ X, Y float64 }

// 2:1 dimetric projection (isometric.ts).
const (
	halfW = 64.0
	halfH = 32.0
)

// The court origin and size, from the Stronghold prefab (stronghold.json).
var (
	courtX    = stronghold.Court.Origin.X
	courtY    = stronghold.Court.Origin.Y
	courtSize = stronghold.Court.Size
	gateSpec  = &stronghold.Gate
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

// gateTowerFront is the ground line of a gate tower's front face, d px either side of the arch centre
// (archHalfWidth to towerHalfSpan).
func gateTowerFront(d float64) float64 {
	f := &gateSpec.TowerFront
	if d < f.Knee {
		return f.Base + (d-gateSpec.ArchHalfWidth)*f.Rise
	}
	return f.Peak - (d-f.Knee)*f.Fall
}

// walkableGround mirrors navigation.ts: the court, the gate passage and its apron, and the open snow beyond.
func walkableGround(x, y float64) bool {
	g := ToTile(x, y)
	edge, snow := stronghold.Court.WalkInset, stronghold.Court.OpenSnowFrom
	court := g.X >= edge && g.Y >= edge && g.X <= courtSize-edge && g.Y <= courtSize-edge
	d := math.Abs(x - gateSpec.X)
	passage := y >= gateSpec.PassageFromY && (d < gateSpec.ArchHalfWidth || d <= gateSpec.TowerHalfSpan && y >= gateTowerFront(d))
	// Keep the rear and west snow approaches walkable too; otherwise a hero can
	// leave through the gate but can never route around the stronghold.
	outside := g.X <= -1.5 || g.Y <= -1.5 || g.X >= snow || g.Y >= snow
	return court || passage || outside
}

// Safe zone and spawn arc (safe-zone.ts). The court side of the gateway is safe; the gate tile is the threshold's.
var (
	metersPerTile  = stronghold.SafeZone.MetersPerTile
	spawnDistanceM = stronghold.SafeZone.SpawnDistanceM
	gateTile       = ToTile(gateSpec.Threshold.X, gateSpec.Threshold.Y).X
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

// Flame Fan uses a 108 degree ground sector, matching the client and effect recipe.
func flameFanContains(origin, aim, target Vec, area float64) bool {
	dx, dy := target.X-origin.X, target.Y-origin.Y
	if hypot(dx, dy) > 4.4*area+.38 {
		return false
	}
	if hypot(dx, dy) < 1e-4 {
		return true
	}
	diff := math.Remainder(math.Atan2(dy, dx)-math.Atan2(aim.Y-origin.Y, aim.X-origin.X), 2*math.Pi)
	return math.Abs(diff) <= math.Pi*.3
}
