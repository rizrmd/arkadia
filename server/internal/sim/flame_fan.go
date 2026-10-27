package sim

// Capture geometry, rank and damage through the same 420ms windup as solo.
// Only the server owns HP/rewards online; clients cannot claim hits.
type flameFanCast struct {
	Origin, Aim           Vec
	Rank                  int
	Area, Damage, Elapsed float64
}

func (w *World) stepFlameFans(p *Player, dt float64) {
	kept := p.flameFans[:0]
	for _, cast := range p.flameFans {
		cast.Elapsed += dt
		if cast.Elapsed < 420 {
			kept = append(kept, cast)
			continue
		}
		for _, e := range w.Enemies {
			if !e.F.Alive() || (e.Gen > 0 && e.Age < 250) {
				continue
			}
			if flameFanContains(cast.Origin, cast.Aim, e.F.Pos, cast.Area) && w.flameFanVisible(cast.Origin, e.F.Pos) {
				if e.F.Damage(cast.Damage) {
					p.Kills++
					w.dropSoul(p, e.F.Pos, e.enemyLevel())
				}
			}
		}
		if cast.Rank >= 3 {
			z := burnSoilZone{Origin: cast.Origin, Aim: cast.Aim, Area: cast.Area}
			z.advance(cast.Elapsed-420, func(_ float64) { p.burnSoilTicks++ })
			if z.Elapsed < 1000 {
				p.burnSoils = append(p.burnSoils, z)
			}
		}
	}
	p.flameFans = kept
}
