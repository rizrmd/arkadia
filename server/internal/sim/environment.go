package sim

import (
	"github.com/rizrmd/arkadia/server/internal/environment"
	"math"
)

func mapColumns(m environment.Map) []Column {
	var c []Column
	for _, o := range m.Objects {
		p := TilePoint(o.U-460.5, o.V-460.5)
		for _, a := range environment.Assets[o.Asset].Columns {
			c = append(c, Column{X: p.X + a.X, W: a.W, Back: p.Y + a.Back, Front: p.Y + a.Front})
		}
		for _, r := range environment.Assets[o.Asset].Blocks {
			c = append(c, rectColumns(o.U-460.5, o.V-460.5, 1, r)...)
		}
	}
	return c
}
func (w *World) initEnvironment() {
	if w.nav == nil {
		return
	}
	cols := mapColumns(w.Environment)
	nav := *w.nav
	nav.extra = buckets(cols)
	w.nav = &nav
	if w.SpawnTimers == nil {
		w.SpawnTimers = map[string]float64{}
	}
}
func (w *World) inSafeZone(p Vec) bool {
	if w.Environment.Revision == 0 {
		return InSafeZone(p)
	}
	return p.X >= -1.5 && p.Y >= -1.5 && p.X <= 16.5 && p.Y <= 16.5
}
func (w *World) mapSpawnPoint(o environment.Object) (Vec, bool) {
	for i := 0; i < 60; i++ {
		a, r := w.random()*math.Pi*2, math.Sqrt(w.random())*o.Radius/3
		p := Vec{o.U - 460.5 + math.Cos(a)*r, o.V - 460.5 + math.Sin(a)*r}
		if !w.inSafeZone(p) && w.clearTile(p) {
			return p, true
		}
	}
	return Vec{}, false
}
func (w *World) mapSpawn(back *Enemy, o environment.Object) {
	at, ok := w.mapSpawnPoint(o)
	if !ok {
		return
	}
	lv := w.spawnLevel()
	hp := RevenantMaxHP(lv)
	e := back
	if e == nil {
		e = &Enemy{ID: w.nextEnemy, F: newFighter(Revenant, at)}
		w.nextEnemy++
		w.Enemies = append(w.Enemies, e)
	}
	e.SpawnID = o.ID
	e.Level = lv
	e.MaxHP = hp
	e.Home = at
	e.Wander = nil
	e.Target = ""
	e.F.Pos = at
	e.F.HP = hp
	e.F.DeadFor = 0
	e.F.Cooldown = 600 + w.random()*900
	e.Age = 0
	e.Side = 1
	e.Gen++
	e.F.Play(Idle)
}
func (w *World) tickMapSpawns(dt float64) {
	for _, o := range w.Environment.Objects {
		if o.Asset != "spawn" {
			continue
		}
		w.SpawnTimers[o.ID] -= dt
		if w.SpawnTimers[o.ID] > 0 {
			continue
		}
		w.SpawnTimers[o.ID] = o.Interval * 1000
		n := 0
		for _, e := range w.Enemies {
			if e.SpawnID == o.ID {
				if !e.F.Alive() && e.F.DeadFor > 4400 {
					w.mapSpawn(e, o)
				}
				n++
			}
		}
		for ; n < o.Count; n++ {
			w.mapSpawn(nil, o)
		}
	}
}
