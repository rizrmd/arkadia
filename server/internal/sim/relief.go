package sim

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
)

// TerrainBoundaryVersion identifies the authoritative cliff rule in public health checks.
const TerrainBoundaryVersion = "hill-foot-contour-v1"

// ReliefFeature is a raised piece of terrain (src/world/relief.ts): a flat plateau, or a ramp sloping linearly from
// BaseM to TopM, rising toward its Ascend side. Rectangles are half-open [U0, U1) x [V0, V1) in court tiles.
type ReliefFeature struct {
	Visual         string       `json:"visual"`
	ID             string       `json:"id"`
	Type           string       `json:"type"`
	U0, V0, U1, V1 float64      `json:"-"`
	HeightM        float64      `json:"heightM"`
	BaseM          float64      `json:"baseM"`
	TopM           float64      `json:"topM"`
	Ascend         string       `json:"ascend"`
	Outline        [][2]float64 `json:"outline"`
	RampStartV     float64      `json:"rampStartV"`
	RampStartU     float64      `json:"rampStartU"`
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
	// Scenery supplies its own artwork but uses the same heights and movement rules.
	var scenery struct {
		Terrain json.RawMessage `json:"terrain"`
	}
	if err := json.Unmarshal(frontierJSON, &scenery); err != nil {
		panic(err)
	}
	if len(scenery.Terrain) > 0 {
		var extra = m.Terrain.Features[:0:0]
		if err := json.Unmarshal(scenery.Terrain, &extra); err != nil {
			panic(err)
		}
		m.Terrain.Features = append(m.Terrain.Features, extra...)
	}
	var out []ReliefFeature
	for _, f := range m.Terrain.Features {
		r := f.ReliefFeature
		r.U0, r.V0, r.U1, r.V1 = f.U0-ou, f.V0-ov, f.U1-ou, f.V1-ov
		r.RampStartV -= ov
		r.RampStartU -= ou
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
		t := (f.V1 - v) / (f.V1 - f.RampStartV)
		if f.Ascend == "-u" {
			t = (f.U1 - u) / (f.U1 - f.RampStartU)
		}
		return f.TopM * math.Max(0, math.Min(1, t))
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
func cliff(x0, y0, x1, y1 float64) bool { return cliffTile(ToTile(x0, y0), ToTile(x1, y1)) }
func cliffTile(a, b Vec) bool {
	dx, dy := (b.X-a.X-b.Y+a.Y)*64, (b.X-a.X+b.Y-a.Y)*32
	n := int(math.Max(1, math.Ceil(math.Hypot(dx, dy)/4)))
	previous := HeightAtTile(a)
	for i := 1; i <= n; i++ {
		t := Vec{a.X + (b.X-a.X)*float64(i)/float64(n), a.Y + (b.Y-a.Y)*float64(i)/float64(n)}
		h := HeightAtTile(t)
		if math.Abs(h-previous) > maxStepM || reliefBlockedTile(t) {
			return true
		}
		previous = h
	}
	return false
}

// Mirrors relief.ts: normalized coherent-core snow surface, excluding rock faces and alpha skirt.
var hillSurface = [][2]float64{{.02, .87}, {.13, .70}, {.24, .57}, {.30, .39}, {.36, .21}, {.43, .075}, {.52, .035}, {.65, .045}, {.80, .10}, {.89, .18}, {.90, .27}, {.81, .34}, {.70, .39}, {.59, .48}, {.49, .61}, {.39, .78}, {.30, .94}, {.12, .97}, {.025, .94}}

type hillBounds struct {
	f                        *ReliefFeature
	left, right, top, bottom float64
}

var hillSurfaces = makeHillSurfaces()

func makeHillSurfaces() []hillBounds {
	var out []hillBounds
	clamp := func(t float64) float64 { return math.Max(0, math.Min(1, t)) }
	for i := range relief {
		f := &relief[i]
		if f.Type != "hill" {
			continue
		}
		b := hillBounds{f, math.Inf(1), math.Inf(-1), math.Inf(1), math.Inf(-1)}
		for _, p := range f.Outline {
			u, v := p[0], p[1]
			x, y := (u-v)*64, (u+v)*32
			t := (f.V1 - v) / (f.V1 - f.RampStartV)
			back := clamp((f.V0+2.2-v)/1.6) * clamp((u-f.U0-.2)/.8)
			if f.Ascend == "-u" {
				t = (f.U1 - u) / (f.U1 - f.RampStartU)
				back = clamp((f.U0+2.2-u)/1.6) * clamp(f.V1-1.2-v)
			}
			b.left = math.Min(b.left, x)
			b.right = math.Max(b.right, x)
			b.top = math.Min(b.top, y-f.TopM*clamp(t)*24*back)
			b.bottom = math.Max(b.bottom, y)
		}
		out = append(out, b)
	}
	return out
}
func onHillSurface(x, y float64) bool {
	hit := false
	for i, j := 0, len(hillSurface)-1; i < len(hillSurface); j, i = i, i+1 {
		a, b := hillSurface[i], hillSurface[j]
		if (a[1] > y) != (b[1] > y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0] {
			hit = !hit
		}
	}
	return hit
}
func reliefBlockedTile(t Vec) bool {
	for _, b := range hillSurfaces {
		f := b.f
		if !f.inside(t.X, t.Y) {
			continue
		}
		x, y := (t.X-t.Y)*64, (t.X+t.Y)*32-f.height(t.X, t.Y)*24
		for _, d := range [][2]float64{{0, 0}, {9, 0}, {-9, 0}, {0, 4.5}, {0, -4.5}, {6.36, 3.18}, {-6.36, 3.18}, {6.36, -3.18}, {-6.36, -3.18}} {
			nx := (x + d[0] - b.left) / (b.right - b.left)
			if f.Ascend == "-u" {
				nx = 1 - nx
			}
			if !onHillSurface(nx, (y+d[1]-b.top)/(b.bottom-b.top)) {
				return true
			}
		}
	}
	return false
}
