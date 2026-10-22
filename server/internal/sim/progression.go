package sim

import "math"

type Progression struct {
	Level   int            `json:"level"`
	XP      int            `json:"xp"`
	Gold    int            `json:"gold"`
	Pending int            `json:"pending"`
	Offers  []string       `json:"offers"`
	Skills  map[string]int `json:"skills"`
	Stars   int            `json:"stars"`
}

func newProgression() Progression {
	return Progression{Level: 1, Offers: []string{}, Skills: map[string]int{}}
}
func (p *Progression) threshold() int { return 20 + (p.Level-1)*10 }
func (p *Progression) damage() float64 {
	return 1 + float64(p.Skills["might"])*.5 + float64(p.Stars)*.25
}
func (p *Progression) reach() float64 { return 1 + float64(p.Skills["nova"])*.2 }
func (p *Progression) critChance() float64 {
	return math.Min(.75, .15+float64(p.Skills["crit"])*.1+float64(p.Skills["might"])*.04+float64(p.Stars)*.04)
}
func (p *Progression) critMultiplier() float64 {
	return math.Min(2.0, 1.5+float64(p.Skills["crit"])*.12+float64(p.Skills["might"])*.05+float64(p.Stars)*.05)
}
func (w *World) roll(p *Progression) {
	pool := []string{"might", "nova", "leech", "star", "vitality", "heal"}
	p.Offers = []string{}
	for len(p.Offers) < 3 {
		i := int(w.random() * float64(len(pool)))
		p.Offers = append(p.Offers, pool[i])
		pool = append(pool[:i], pool[i+1:]...)
	}
}
func (w *World) reward(p *Player) {
	p.Run.Gold += 5
	p.Run.XP += 10
	for p.Run.XP >= p.Run.threshold() {
		p.Run.XP -= p.Run.threshold()
		p.Run.Level++
		p.Run.Pending++
	}
	if p.Run.Pending > 0 && len(p.Run.Offers) == 0 {
		w.roll(&p.Run)
	}
	if p.Run.Pending > 0 {
		p.F.Immune = 200
	}
	p.F.HP = math.Min(p.MaxHP, p.F.HP+float64(p.Run.Skills["leech"])*2)
}
func (p *Player) choose(id string, level int) {
	if p.Run.Pending == 0 || level != p.Run.Level {
		return
	}
	found := false
	for _, v := range p.Run.Offers {
		if v == id {
			found = true
		}
	}
	if !found {
		return
	}
	switch id {
	case "star":
		p.Run.Stars++
		p.MaxHP += 10
		p.F.HP = math.Min(p.MaxHP, p.F.HP+10)
	case "vitality":
		p.Run.Skills[id]++
		p.MaxHP += 20
		p.F.HP = math.Min(p.MaxHP, p.F.HP+20)
	case "heal":
		p.F.HP = math.Min(p.MaxHP, p.F.HP+p.MaxHP*.35)
	default:
		p.Run.Skills[id]++
	}
	p.Run.Pending--
	p.Run.Offers = []string{}
}
