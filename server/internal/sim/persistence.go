package sim

import (
	"encoding/json"
	"fmt"
	"math/rand/v2"
)

// Checkpoints are server-owned. They include private timing state that public
// render snapshots deliberately omit. No client can submit a checkpoint.
type savedPlayer struct {
	Player        *Player
	SlotCD        [MaxSkillSlots]float64
	BurnSoils     []burnSoilZone
	BurnSoilTicks int
}
type checkpoint struct {
	Version             int
	Tick                uint64
	Clock               float64
	Players, Retired    []savedPlayer
	Enemies             []*Enemy
	Gate                Gate
	Souls               []Soul
	NextSoul, NextEnemy int
	SpawnTimer          float64
	RNG                 []byte
}

func savePlayer(p *Player) savedPlayer { return savedPlayer{p, p.slotCD, p.burnSoils, p.burnSoilTicks} }
func (w *World) Checkpoint() ([]byte, error) {
	rng, err := w.source.MarshalBinary()
	if err != nil {
		return nil, err
	}
	s := checkpoint{Version: 1, Tick: w.Tick, Clock: w.Clock, Enemies: w.Enemies, Gate: w.Gate, Souls: w.Souls, NextSoul: w.nextSoul, NextEnemy: w.nextEnemy, SpawnTimer: w.spawnTimer, RNG: rng}
	for _, p := range w.Players {
		s.Players = append(s.Players, savePlayer(p))
	}
	for _, p := range w.retired {
		s.Retired = append(s.Retired, savePlayer(p))
	}
	return json.Marshal(s)
}
func RestoreCheckpoint(nav *Blocker, raw []byte) (*World, error) {
	var s checkpoint
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, err
	}
	if s.Version != 1 {
		return nil, fmt.Errorf("unsupported world checkpoint %d", s.Version)
	}
	source := rand.NewPCG(0, 0)
	if err := source.UnmarshalBinary(s.RNG); err != nil {
		return nil, err
	}
	w := &World{Tick: s.Tick, Clock: s.Clock, Enemies: s.Enemies, Gate: s.Gate, Souls: s.Souls, nextSoul: s.NextSoul, nextEnemy: s.NextEnemy, spawnTimer: s.SpawnTimer, source: source, rng: rand.New(source), nav: nav, retired: map[string]*Player{}}
	// All sockets are gone after restart: heroes wait, without advancing their
	// cooldowns, immunity or death timers, until the holder of their resume ID joins.
	for _, a := range append(s.Players, s.Retired...) {
		p := a.Player
		if p == nil {
			return nil, fmt.Errorf("nil saved player")
		}
		p.slotCD = a.SlotCD
		p.burnSoils = a.BurnSoils
		p.burnSoilTicks = a.BurnSoilTicks
		w.retired[p.ID] = p
	}
	return w, nil
}
