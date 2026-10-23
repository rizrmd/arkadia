package sim

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

// Prefab is the part of the Stronghold court prefab (src/stronghold/prefabs/stronghold.json) the simulation uses:
// the court's size and origin, the gateway and the safe zone. stronghold.json is a byte-identical copy of the
// client's file, embedded here; TestPrefabMatchesClient fails when they differ.
type Prefab struct {
	ID      string `json:"id"`
	Version int    `json:"version"`
	Court   struct {
		Size         float64 `json:"size"`
		Origin       Vec     `json:"origin"`
		WalkInset    float64 `json:"walkInset"`
		OpenSnowFrom float64 `json:"openSnowFrom"`
	} `json:"court"`
	Gate struct {
		X             float64 `json:"x"`
		Threshold     Vec     `json:"threshold"`
		PassageFromY  float64 `json:"passageFromY"`
		ArchHalfWidth float64 `json:"archHalfWidth"`
		TowerHalfSpan float64 `json:"towerHalfSpan"`
		TowerFront    struct {
			Knee, Base, Rise, Peak, Fall float64
		} `json:"towerFront"`
		TowerDepth float64 `json:"towerDepth"`
		ColumnStep float64 `json:"columnStep"`
		Doors      struct {
			HalfWidth, Back, Front float64
		} `json:"doors"`
		Trigger struct {
			Y      float64 `json:"y"`
			Closed Vec     `json:"closed"`
			Open   Vec     `json:"open"`
		} `json:"trigger"`
		Frames     int     `json:"frames"`
		PassableAt float64 `json:"passableAt"`
	} `json:"gate"`
	SafeZone struct {
		MetersPerTile  float64 `json:"metersPerTile"`
		SpawnDistanceM float64 `json:"spawnDistanceM"`
	} `json:"safeZone"`
	HeroSpawn Vec `json:"heroSpawn"`
}

// Vec decodes from {"x", "y"} like the client's world px.
func (v *Vec) UnmarshalJSON(b []byte) error {
	var p struct{ X, Y float64 }
	if err := json.Unmarshal(b, &p); err != nil {
		return err
	}
	*v = Vec{p.X, p.Y}
	return nil
}

//go:embed stronghold.json
var strongholdJSON []byte

// stronghold is parsed once at start-up; a broken embedded prefab is a build error, so it panics.
var stronghold = mustPrefab(strongholdJSON)

func mustPrefab(b []byte) *Prefab {
	var p Prefab
	if err := json.Unmarshal(b, &p); err != nil {
		panic(fmt.Errorf("stronghold.json: %w", err))
	}
	if p.ID != "stronghold" || p.Version != 1 || p.Court.Size <= 0 || p.Gate.Frames < 2 {
		panic(fmt.Errorf("stronghold.json: unsupported prefab %q version %d", p.ID, p.Version))
	}
	return &p
}
