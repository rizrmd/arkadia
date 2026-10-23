package sim

import "math"

const (
	MaxSkillSlots      = 3
	AoECastRadiusTiles = 2.2
)

var activeSkillIDs = []string{
	"rift-bolt", "rift-dash", "rift-trap",
	"flame-fan", "cinder-step", "ember-snare",
	"cleave", "shockwave",
}

var heroActivePools = map[string][]string{
	"rift-runner":  {"rift-bolt", "rift-dash", "rift-trap", "cleave", "shockwave"},
	"ember-warden": {"flame-fan", "cinder-step", "ember-snare", "cleave", "shockwave"},
}

var passiveBlessingIDs = []string{"might", "nova", "haste", "leech", "star", "vitality", "heal"}

var baseSkillCooldownMs = map[string]float64{
	"rift-bolt":   1400,
	"flame-fan":   1400,
	"rift-dash":   1400,
	"cinder-step": 1400,
	"rift-trap":   2800,
	"ember-snare": 2800,
	"cleave":      2100,
	"shockwave":   2800,
}

var heroSkillSwap = map[string]map[string]string{
	"rift-bolt":   {"rift-runner": "rift-bolt", "ember-warden": "flame-fan"},
	"flame-fan":   {"rift-runner": "rift-bolt", "ember-warden": "flame-fan"},
	"rift-dash":   {"rift-runner": "rift-dash", "ember-warden": "cinder-step"},
	"cinder-step": {"rift-runner": "rift-dash", "ember-warden": "cinder-step"},
	"rift-trap":   {"rift-runner": "rift-trap", "ember-warden": "ember-snare"},
	"ember-snare": {"rift-runner": "rift-trap", "ember-warden": "ember-snare"},
}

type Progression struct {
	Level        int            `json:"level"`
	XP           int            `json:"xp"`
	Gold         int            `json:"gold"`
	Pending      int            `json:"pending"`
	Offers       []string       `json:"offers"`
	Skills       map[string]int `json:"skills"`
	Stars        int            `json:"stars"`
	Slots        []string       `json:"slots"`
	AutoCasts    int            `json:"autoCasts,omitempty"`
	TrinityCasts int            `json:"trinityCasts,omitempty"`
	LastCast     []string       `json:"lastCast,omitempty"`
}

func isActiveSkill(id string) bool {
	for _, s := range activeSkillIDs {
		if s == id {
			return true
		}
	}
	return false
}

func containsStr(list []string, target string) bool {
	for _, s := range list {
		if s == target {
			return true
		}
	}
	return false
}

func defaultHeroSkill(hero string) string {
	if hero == "ember-warden" {
		return "flame-fan"
	}
	return "rift-bolt"
}

func newProgression() Progression {
	return newProgressionForHero("rift-runner")
}

func newProgressionForHero(hero string) Progression {
	def := defaultHeroSkill(hero)
	return Progression{
		Level:  1,
		Offers: []string{},
		Skills: map[string]int{def: 1},
		Slots:  []string{def},
	}
}

func (p *Progression) inferHero(fallback string) string {
	for _, s := range p.Slots {
		switch s {
		case "flame-fan", "cinder-step", "ember-snare":
			return "ember-warden"
		case "rift-bolt", "rift-dash", "rift-trap":
			return "rift-runner"
		}
	}
	if fallback == "ember-warden" {
		return "ember-warden"
	}
	return "rift-runner"
}

func (p *Progression) SyncHero(hero string) {
	h := p.inferHero(hero)
	if hero == "rift-runner" || hero == "ember-warden" {
		h = hero
	}
	if p.Skills == nil {
		p.Skills = map[string]int{}
	}
	if len(p.Slots) == 0 {
		def := defaultHeroSkill(h)
		p.Slots = []string{def}
		if p.Skills[def] == 0 {
			p.Skills[def] = 1
		}
	}
	if len(p.Slots) > MaxSkillSlots {
		p.Slots = p.Slots[:MaxSkillSlots]
	}
	for i, id := range p.Slots {
		if swap, ok := heroSkillSwap[id]; ok {
			if mapped := swap[h]; mapped != "" && mapped != id {
				prev := p.Skills[id]
				if prev < 1 {
					prev = 1
				}
				if p.Skills[mapped] < prev {
					p.Skills[mapped] = prev
				}
				delete(p.Skills, id)
				p.Slots[i] = mapped
			}
		}
		if p.Skills[p.Slots[i]] < 1 {
			p.Skills[p.Slots[i]] = 1
		}
	}
	for i, id := range p.Offers {
		if swap, ok := heroSkillSwap[id]; ok {
			if mapped := swap[h]; mapped != "" {
				p.Offers[i] = mapped
			}
		}
	}
}

func (p *Progression) eligibleActiveSkills(hero string) []string {
	h := p.inferHero(hero)
	if hero == "rift-runner" || hero == "ember-warden" {
		h = hero
	}
	p.SyncHero(h)
	if len(p.Slots) >= MaxSkillSlots {
		out := make([]string, 0, MaxSkillSlots)
		for _, s := range p.Slots[:MaxSkillSlots] {
			if isActiveSkill(s) {
				out = append(out, s)
			}
		}
		return out
	}
	pool := heroActivePools[h]
	if len(pool) == 0 {
		pool = heroActivePools["rift-runner"]
	}
	out := make([]string, len(pool))
	copy(out, pool)
	return out
}

// KillsForLevel is how many same-level revenants a hero must defeat to clear a level: 10 at Lv.1, growing by 10
// per level (progression.ts), so ThresholdForLevel stays proportional to the scaled XP reward.
func KillsForLevel(level int) int { return 10 * max(1, level) }

func ThresholdForLevel(level int) int {
	lv := max(1, level)
	return KillsForLevel(lv) * RevenantXPReward(lv)
}

func RevenantMaxHP(level int) float64 {
	return 2 + float64(max(0, level-1))
}

func RevenantDamage(level int) float64 {
	return 4 + float64(max(0, level-1))
}

func RevenantXPReward(level int) int {
	return 10 + max(0, level-1)*4
}

func (p *Progression) threshold() int { return ThresholdForLevel(p.Level) }
func (p *Progression) damage() float64 {
	return 1 + float64(p.Skills["might"])*.5 + float64(p.Stars)*.25
}
func (p *Progression) reach() float64         { return 1 + float64(p.Skills["nova"])*.2 }
func (p *Progression) aoeCastRadius() float64 { return AoECastRadiusTiles * p.reach() }
func (p *Progression) critChance() float64 {
	return math.Min(.75, .15+float64(p.Skills["crit"])*.1+float64(p.Skills["might"])*.04+float64(p.Stars)*.04)
}
func (p *Progression) critMultiplier() float64 {
	return math.Min(2.0, 1.5+float64(p.Skills["crit"])*.12+float64(p.Skills["might"])*.05+float64(p.Stars)*.05)
}
func (p *Progression) skillRank(id string) int {
	if r := p.Skills[id]; r > 0 {
		return r
	}
	if containsStr(p.Slots, id) {
		return 1
	}
	return 0
}
func (p *Progression) skillDamageMultiplier(id string) float64 {
	r := p.skillRank(id)
	if r <= 1 {
		return 1
	}
	return 1 + float64(r-1)*.25
}
func (p *Progression) skillAreaMultiplier(id string) float64 {
	r := p.skillRank(id)
	if r <= 1 {
		return 1
	}
	return 1 + float64(r-1)*.18
}
func (p *Progression) skillCooldownMs(id string) float64 {
	base := baseSkillCooldownMs[id]
	if base <= 0 {
		base = 2000
	}
	r := max(1, p.skillRank(id))
	haste := p.Skills["haste"]
	factor := math.Max(.45, math.Pow(.92, float64(r-1))*math.Pow(.88, float64(haste)))
	return math.Round(base * factor)
}

func (w *World) roll(p *Progression) {
	w.rollForHero(p, p.inferHero("rift-runner"))
}

func (w *World) rollForHero(p *Progression, hero string) {
	activePool := p.eligibleActiveSkills(hero)
	passivePool := make([]string, len(passiveBlessingIDs))
	copy(passivePool, passiveBlessingIDs)

	chosen := make([]string, 0, 3)
	take := func(pool []string) {
		avail := make([]string, 0, len(pool))
		for _, id := range pool {
			if !containsStr(chosen, id) {
				avail = append(avail, id)
			}
		}
		if len(avail) == 0 {
			return
		}
		idx := int(w.random() * float64(len(avail)))
		if idx >= len(avail) {
			idx = len(avail) - 1
		}
		chosen = append(chosen, avail[idx])
	}

	if len(p.Slots) < MaxSkillSlots {
		unequipped := make([]string, 0, len(activePool))
		for _, id := range activePool {
			if !containsStr(p.Slots, id) {
				unequipped = append(unequipped, id)
			}
		}
		if len(unequipped) > 0 {
			take(unequipped)
		} else {
			take(activePool)
		}
	} else {
		take(activePool)
	}
	take(passivePool)
	combined := append(append([]string{}, activePool...), passivePool...)
	for len(chosen) < 3 {
		take(combined)
	}
	for i := len(chosen) - 1; i > 0; i-- {
		j := int(w.random() * float64(i+1))
		if j > i {
			j = i
		}
		chosen[i], chosen[j] = chosen[j], chosen[i]
	}
	p.Offers = chosen
}

func (w *World) reward(p *Player) {
	w.rewardFoe(p, p.Run.Level)
}

func (w *World) rewardFoe(p *Player, foeLevel int) {
	prevLevel := p.Run.Level
	p.Run.Gold += 5
	p.Run.XP += RevenantXPReward(max(1, foeLevel))
	for p.Run.XP >= p.Run.threshold() {
		p.Run.XP -= p.Run.threshold()
		p.Run.Level++
		p.Run.Pending++
	}
	if p.Run.Level > prevLevel {
		w.syncEnemyLevels()
	}
	if p.Run.Pending > 0 && len(p.Run.Offers) == 0 {
		w.rollForHero(&p.Run, p.Hero)
	}
	if p.Run.Pending > 0 {
		p.F.Immune = 200
	}
	p.F.HP = math.Min(p.MaxHP, p.F.HP+float64(p.Run.Skills["leech"])*2)
}

func (p *Player) choose(id string, level int) {
	if p.Run.Pending <= 0 || level < p.Run.Level-p.Run.Pending+1 || level > p.Run.Level {
		return
	}
	if !containsStr(p.Run.Offers, id) {
		return
	}
	p.Run.SyncHero(p.Hero)
	if isActiveSkill(id) {
		if containsStr(p.Run.Slots, id) {
			p.Run.Skills[id] = max(1, p.Run.Skills[id]) + 1
		} else if len(p.Run.Slots) < MaxSkillSlots {
			p.Run.Slots = append(p.Run.Slots, id)
			p.Run.Skills[id] = max(1, p.Run.Skills[id]+1)
		} else {
			return
		}
		p.slotCD = [MaxSkillSlots]float64{}
	} else {
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
	}
	p.Run.Pending--
	p.Run.Offers = []string{}
}
