package vfx

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"os"
	"testing"
)

func TestAssetPersistenceAndIsolation(t *testing.T) {
	s, e := Open(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	im := image.NewNRGBA(image.Rect(0, 0, 32, 16))
	im.Set(4, 4, color.NRGBA{R: 255, A: 255})
	var b bytes.Buffer
	png.Encode(&b, im)
	a := Asset{Name: "Test animation", Columns: 2, Rows: 1, FrameCount: 2, Frames: []Frame{{0, 0, 16, 16}, {16, 0, 16, 16}}, Order: []int{1, 0}, FPS: 12, PivotX: .5, PivotY: .5, Loop: true, Source: "pixels"}
	saved, e := s.SaveAsset(a, b.Bytes(), b.Bytes())
	if e != nil {
		t.Fatal(e)
	}
	if len(saved.ID) != 64 {
		t.Fatal("invalid content ID")
	}
	items, e := s.Assets()
	if e != nil || len(items) != 1 || items[0].Order[0] != 1 {
		t.Fatal("metadata was not persisted", e)
	}
	if _, e = os.Stat(s.AssetFile(saved.ID, "image.png")); e != nil {
		t.Fatal(e)
	}
	state, e := s.Get()
	if e != nil || len(state.Saved.Effects) != 0 || len(state.Applied.Effects) != 0 {
		t.Fatal("asset import altered visual documents")
	}
	if s.AssetFile("../../outside", "image.png") != "" || s.AssetFile(saved.ID, "../visuals.json") != "" {
		t.Fatal("path traversal accepted")
	}
	a.Frames[0].Width = 100
	if _, e = s.SaveAsset(a, b.Bytes(), b.Bytes()); e == nil {
		t.Fatal("out of bounds frame accepted")
	}
	a.Frames[0].Width = 16
	a.Order = []int{5}
	a.FrameCount = 1
	if _, e = s.SaveAsset(a, b.Bytes(), b.Bytes()); e == nil {
		t.Fatal("invalid order accepted")
	}
}
