package sim

// No approved per-tick balance exists. nil deliberately disables HP mutation,
// while the approved timing/sector lifecycle runs independently of balance.
var burnSoilDamagePerTick *float64

type burnSoilZone struct {
	Origin, Aim   Vec
	Area, Elapsed float64
	Ticks         int
}

func (z *burnSoilZone) advance(dt float64, tick func(float64)) {
	if dt < 0 {
		return
	}
	z.Elapsed += dt
	for z.Ticks < 5 && z.Elapsed+1e-7 >= float64(z.Ticks+1)*200 {
		z.Ticks++
		tick(float64(z.Ticks) * 200)
	}
}
func (w *World) stepBurnSoil(p *Player, dt float64) {
	kept := p.burnSoils[:0]
	for i := range p.burnSoils {
		z := &p.burnSoils[i]
		z.advance(dt, func(_ float64) {
			p.burnSoilTicks++
			if burnSoilDamagePerTick == nil {
				return
			}
			for _, e := range w.Enemies {
				if e.F.Alive() && flameFanContains(z.Origin, z.Aim, e.F.Pos, z.Area) && w.flameFanVisible(z.Origin, e.F.Pos) {
					if e.F.Damage(*burnSoilDamagePerTick) {
						p.Kills++
						w.dropSoul(p, e.F.Pos, e.enemyLevel())
					}
				}
			}
		})
		if z.Elapsed < 1000 {
			kept = append(kept, *z)
		}
	}
	p.burnSoils = kept
}
