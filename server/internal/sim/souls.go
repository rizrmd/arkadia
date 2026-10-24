package sim

// Souls belong to the killer; only authoritative proximity can consume them.
// Level is frozen at death, preserving the original XP reward after later level-ups.
type Soul struct {
	ID    int     `json:"id"`
	Owner string  `json:"owner"`
	U     float64 `json:"u"`
	V     float64 `json:"v"`
	Level int     `json:"level"`
	Age   float64 `json:"age"`
}

func (w *World) dropSoul(p *Player, pos Vec, level int) {
	w.rewardKill(p)
	w.nextSoul++
	w.Souls = append(w.Souls, Soul{ID: w.nextSoul, Owner: p.ID, U: pos.X, V: pos.Y, Level: level})
}
func (w *World) collectSouls() {
	kept := w.Souls[:0]
	for _, s := range w.Souls {
		s.Age += TickMS
		collected := false
		for _, p := range w.Players {
			if p.ID == s.Owner && p.F.Alive() && s.Age >= 350 && hypot(p.F.Pos.X-s.U, p.F.Pos.Y-s.V) <= .85 {
				w.awardSoulXP(p, s.Level)
				collected = true
				break
			}
		}
		if !collected {
			kept = append(kept, s)
		}
	}
	w.Souls = kept
}
