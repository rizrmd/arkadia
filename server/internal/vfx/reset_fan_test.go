package vfx

import "testing"

func TestResetFanLayers(t *testing.T) {
	s, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	d := Empty()
	d.Effects["runtime/flame-fan"] = map[string]Patch{"burst": {}}
	d.Effects["ember-warden/flame-fan.cast"] = map[string]Patch{"0": {}}
	d.Effects["runtime/rift-dash"] = map[string]Patch{"trail": {}}
	state, err := s.Write(d, false)
 if err != nil { t.Fatal(err) }
 state, err = s.Write(state.Saved, true)
	if err != nil {
		t.Fatal(err)
	}
	for _, doc := range []Document{state.Saved, state.Applied} {
		if len(doc.Effects) != 1 || doc.Effects["runtime/rift-dash"] == nil {
			t.Fatalf("unexpected layers: %v", doc.Effects)
		}
	}
}
