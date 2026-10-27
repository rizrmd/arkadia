package vfx

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/png"
	"os"
	"path/filepath"
)

type Frame struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}
type Group struct {
	Name  string `json:"name"`
	Order []int  `json:"order"`
}
type Asset struct {
	FrameCount int     `json:"frameCount"`
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Texture    string  `json:"texture"`
	Original   string  `json:"original"`
	Width      int     `json:"width"`
	Height     int     `json:"height"`
	Columns    int     `json:"columns"`
	Rows       int     `json:"rows"`
	Frames     []Frame `json:"frames"`
	Order      []int   `json:"order"`
	FPS        float64 `json:"fps"`
	PivotX     float64 `json:"pivotX"`
	PivotY     float64 `json:"pivotY"`
	Loop       bool    `json:"loop"`
	Groups     []Group `json:"groups"`
	Source     string  `json:"source"`
}

func (s *Store) AssetFile(id, file string) string {
	if len(id) != 64 || file != "image.png" && file != "original.png" {
		return ""
	}
	if _, e := hex.DecodeString(id); e != nil {
		return ""
	}
	return filepath.Join(s.dir, "assets", id, file)
}
func (s *Store) Assets() ([]Asset, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []Asset{}
	entries, e := os.ReadDir(filepath.Join(s.dir, "assets"))
	if os.IsNotExist(e) {
		return out, nil
	}
	if e != nil {
		return nil, e
	}
	for _, v := range entries {
		b, e := os.ReadFile(filepath.Join(s.dir, "assets", v.Name(), "metadata.json"))
		if e != nil {
			continue
		}
		var a Asset
		if json.Unmarshal(b, &a) == nil {
			out = append(out, a)
		}
	}
	return out, nil
}
func (s *Store) SaveAsset(a Asset, original, packed []byte) (Asset, error) {
	if a.FrameCount != len(a.Order) {
		return Asset{}, fmt.Errorf("invalid frame count")
	}
	if len(a.Name) < 1 || len(a.Name) > 100 || len(a.Frames) < 1 || len(a.Frames) > 256 || len(a.Order) < 1 || len(a.Order) > 256 || a.Columns < 1 || a.Columns > 16 || a.Rows < 1 || a.Rows > 16 || a.FPS < 1 || a.FPS > 120 || a.PivotX < 0 || a.PivotX > 1 || a.PivotY < 0 || a.PivotY > 1 || a.Source != "pixels" && a.Source != "codex+pixels" {
		return Asset{}, fmt.Errorf("invalid spritesheet metadata")
	}
	oc, format, e := image.DecodeConfig(bytes.NewReader(original))
	if e != nil || format != "png" || oc.Width*oc.Height > 16777216 {
		return Asset{}, fmt.Errorf("invalid original PNG")
	}
	pc, format, e := image.DecodeConfig(bytes.NewReader(packed))
	if e != nil || format != "png" || pc.Width*pc.Height > 16777216 || pc.Width%a.Columns != 0 || pc.Height%a.Rows != 0 || a.Columns*a.Rows < len(a.Order) {
		return Asset{}, fmt.Errorf("invalid packed PNG")
	}
	for _, f := range a.Frames {
		if f.X < 0 || f.Y < 0 || f.Width < 1 || f.Height < 1 || f.X+f.Width > oc.Width || f.Y+f.Height > oc.Height {
			return Asset{}, fmt.Errorf("frame outside original image")
		}
	}
	for _, i := range a.Order {
		if i < 0 || i >= len(a.Frames) {
			return Asset{}, fmt.Errorf("invalid frame order")
		}
	}
	if len(a.Groups) > 32 {
		return Asset{}, fmt.Errorf("too many groups")
	}
	for _, g := range a.Groups {
		if len(g.Name) > 100 || len(g.Order) > 256 {
			return Asset{}, fmt.Errorf("invalid group")
		}
		for _, i := range g.Order {
			if i < 0 || i >= len(a.Frames) {
				return Asset{}, fmt.Errorf("invalid group order")
			}
		}
	}
	a.Width = oc.Width
	a.Height = oc.Height
	a.ID = ""
	a.Texture = ""
	a.Original = ""
	meta, _ := json.Marshal(a)
	hash := sha256.New()
	hash.Write(original)
	hash.Write(packed)
	hash.Write(meta)
	a.ID = hex.EncodeToString(hash.Sum(nil))
	a.Texture = "/api/vfx/assets/" + a.ID + "/image.png"
	a.Original = "/api/vfx/assets/" + a.ID + "/original.png"
	meta, _ = json.MarshalIndent(a, "", "  ")
	s.mu.Lock()
	defer s.mu.Unlock()
	root := filepath.Join(s.dir, "assets")
	if e = os.MkdirAll(root, 0700); e != nil {
		return Asset{}, e
	}
	target := filepath.Join(root, a.ID)
	if _, e = os.Stat(filepath.Join(target, "metadata.json")); e == nil {
		return a, nil
	}
	tmp, e := os.MkdirTemp(root, ".upload-")
	if e != nil {
		return Asset{}, e
	}
	defer os.RemoveAll(tmp)
	for name, data := range map[string][]byte{"image.png": packed, "original.png": original, "metadata.json": meta} {
		if e = os.WriteFile(filepath.Join(tmp, name), data, 0600); e != nil {
			return Asset{}, e
		}
	}
	if e = os.Rename(tmp, target); e != nil {
		return Asset{}, e
	}
	return a, nil
}
