package sim

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
)

// ReliefFeature is a raised piece of terrain (src/world/relief.ts): a flat plateau, or a ramp sloping linearly from
// BaseM to TopM, rising toward its Ascend side. Rectangles are half-open [U0, U1) x [V0, V1) in court tiles.
type ReliefFeature struct {
	ID             string       `json:"id"`
	Type           string       `json:"type"`
	U0, V0, U1, V1 float64      `json:"-"`
	HeightM        float64      `json:"heightM"`
	BaseM          float64      `json:"baseM"`
	TopM           float64      `json:"topM"`
	Ascend         string       `json:"ascend"`
	Outline        [][2]float64 `json:"outline"`
	RampStartV     float64      `json:"rampStartV"`
}

// mapFile is the part of the map definition (src/world/maps/arkodia-01.json) the simulation uses. arkodia-01.json
// is a byte-identical copy of the client's file; TestMapMatchesClient fails when they differ.
type mapFile struct {
	Prefabs []struct {
		Prefab string                 `json:"prefab"`
		At     struct{ U, V float64 } `json:"at"`
	} `json:"prefabs"`
	Terrain struct {
		MaxStepM float64 `json:"maxStepM"`
		Features []struct {
			ReliefFeature
			U0 float64 `json:"u0"`
			V0 float64 `json:"v0"`
			U1 float64 `json:"u1"`
			V1 float64 `json:"v1"`
		} `json:"features"`
	} `json:"terrain"`
}

//go:embed arkodia-01.json
var mapJSON []byte

var relief, maxStepM = mustRelief(mapJSON)

// mustRelief reads the map's terrain into court tiles: map tiles minus the Stronghold's placement origin.
func mustRelief(b []byte) ([]ReliefFeature, float64) {
	var m mapFile
	if err := json.Unmarshal(b, &m); err != nil {
		panic(fmt.Errorf("arkodia-01.json: %w", err))
	}
	var ou, ov float64
	found := false
	for _, p := range m.Prefabs {
		if p.Prefab == "stronghold" {
			ou, ov, found = p.At.U-stronghold.Anchor.U, p.At.V-stronghold.Anchor.V, true
		}
	}
	if !found {
		panic("arkodia-01.json: no stronghold placement")
	}
	var out []ReliefFeature
	for _, f := range m.Terrain.Features {
		r := f.ReliefFeature
		r.U0, r.V0, r.U1, r.V1 = f.U0-ou, f.V0-ov, f.U1-ou, f.V1-ov
		r.RampStartV -= ov
		for i := range r.Outline {
			r.Outline[i][0] -= ou
			r.Outline[i][1] -= ov
		}
		if !(r.U1 > r.U0 && r.V1 > r.V0) {
			panic("terrain feature " + r.ID + " is malformed")
		}
		out = append(out, r)
	}
	return out, m.Terrain.MaxStepM
}

func (f *ReliefFeature) inside(u, v float64) bool {
	if !(u >= f.U0 && u < f.U1 && v >= f.V0 && v < f.V1) {
		return false
	}
	if len(f.Outline) == 0 {
		return true
	}
	hit := false
	for i, j := 0, len(f.Outline)-1; i < len(f.Outline); j, i = i, i+1 {
		x, y := f.Outline[i][0], f.Outline[i][1]
		a, b := f.Outline[j][0], f.Outline[j][1]
		if (y > v) != (b > v) && u < (a-x)*(v-y)/(b-y)+x {
			hit = !hit
		}
	}
	return hit
}

// height mirrors relief.ts featureHeight, operation for operation.
func (f *ReliefFeature) height(u, v float64) float64 {
	if f.Type == "plateau" {
		return f.HeightM
	}
	if f.Type == "hill" {
		return f.TopM * math.Max(0, math.Min(1, (f.V1-v)/(f.V1-f.RampStartV)))
	}
	var t float64
	switch f.Ascend {
	case "-u":
		t = (f.U1 - u) / (f.U1 - f.U0)
	case "+u":
		t = (u - f.U0) / (f.U1 - f.U0)
	case "-v":
		t = (f.V1 - v) / (f.V1 - f.V0)
	default:
		t = (v - f.V0) / (f.V1 - f.V0)
	}
	return f.BaseM + (f.TopM-f.BaseM)*t
}

// HeightAtTile is the ground height in meters: the highest feature containing the tile, else 0.
func HeightAtTile(t Vec) float64 {
	h := 0.0
	for i := range relief {
		if f := &relief[i]; f.inside(t.X, t.Y) {
			if fh := f.height(t.X, t.Y); fh > h {
				h = fh
			}
		}
	}
	return h
}

// cliff reports a step between two world px that changes the ground height by more than maxStepM.
func cliff(x0, y0, x1, y1 float64) bool {
	return len(relief) > 0 && math.Abs(HeightAtTile(ToTile(x1, y1))-HeightAtTile(ToTile(x0, y0))) > maxStepM
}

// cliffTile is cliff for ground tiles.
func cliffTile(a, b Vec) bool {
	return len(relief) > 0 && math.Abs(HeightAtTile(b)-HeightAtTile(a)) > maxStepM
}
