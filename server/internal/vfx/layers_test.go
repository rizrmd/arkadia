package vfx

import (
	"encoding/json"
	"testing"
)

func TestLayerMetadataSurvivesSaveApplyAndReopen(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	var d Document
	if err = json.Unmarshal([]byte(`{"version":1,"revision":0,"effects":{"test/fx":{"0":{"name":"Renamed original","order":1,"deleted":true},"custom-copy":{"source":"0","name":"New layer","order":0,"opacity":0.5}}}}`), &d); err != nil {
		t.Fatal(err)
	}
	state, err := s.Write(d, false)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Write(state.Saved, true); err != nil {
		t.Fatal(err)
	}
	reopened, _ := Open(dir)
	state, err = reopened.Get()
	if err != nil {
		t.Fatal(err)
	}
	p := state.Applied.Effects["test/fx"]["custom-copy"]
	if p.Name != "New layer" || p.Source != "0" || p.Order == nil || *p.Order != 0 || !state.Applied.Effects["test/fx"]["0"].Deleted {
		t.Fatal("layer metadata lost", state)
	}
	for _, raw := range []string{`{"source":"custom-copy"}`, `{"order":-1}`, `{"order":513}`} {
		var patch Patch
		json.Unmarshal([]byte(raw), &patch)
		d.Effects["test/fx"]["custom-copy"] = patch
		if d.Validate() == nil {
			t.Fatalf("invalid metadata accepted: %s", raw)
		}
	}
}
