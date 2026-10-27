package environment

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDraftPublishRestartAndConflict(t *testing.T) {
	dir := t.TempDir()
	s, e := Open(dir)
	if e != nil {
		t.Fatal(e)
	}
	key := s.Key
	m := Empty()
	m.Objects = []Object{{ID: "pond", Asset: "pond-large", U: 520, V: 520}, {ID: "north", Asset: "spawn", U: 430, V: 430, Count: 4, Radius: 12, Interval: 3}}
	draft, e := s.Save(m, false)
	if e != nil {
		t.Fatal(e)
	}
	p, _ := s.Published(0)
	if len(p.Objects) != 0 {
		t.Fatal("draft leaked into gameplay")
	}
	if _, e = s.Save(m, false); e == nil {
		t.Fatal("stale writer accepted")
	}
	p, e = s.Save(draft, true)
	if e != nil {
		t.Fatal(e)
	}
	old := p
	m = p
	m.Objects = []Object{}
	if _, e = s.Save(m, true); e != nil {
		t.Fatal(e)
	}
	s, e = Open(dir)
	if e != nil || s.Key != key {
		t.Fatal("access key changed", e)
	}
	saved, e := s.Published(old.Revision)
	if e != nil || len(saved.Objects) != 2 {
		t.Fatal("immutable published revision lost", e)
	}
	if e = os.WriteFile(filepath.Join(dir, "maps-state.json"), []byte("bad"), 0600); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Save(m, false); e == nil {
		t.Fatal("corrupt storage overwritten")
	}
}
func TestPondsWalkableAndRequireVacantGround(t *testing.T) {
	for _, id := range []string{"pond-small", "pond-large"} {
		if len(Assets[id].Blocks) != 0 {
			t.Fatal("pond blocks movement")
		}
		m := Empty()
		m.Objects = []Object{{ID: "pond", Asset: id, U: 468, V: 468}}
		if m.Validate() == nil {
			t.Fatal("pond overlapped original stronghold")
		}
		m.Objects[0].U = 520
		m.Objects[0].V = 520
		if e := m.Validate(); e != nil {
			t.Fatal(e)
		}
		m.Objects = append(m.Objects, Object{ID: "ruin", Asset: "cliff", U: 520, V: 520})
		if m.Validate() == nil {
			t.Fatal("pond/terrain overlap accepted")
		}
	}
}

func TestGroundBlendPublishAndRestart(t *testing.T) {
	s, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := Empty()
	for _, id := range []string{"green-grass", "dry-grass", "bare-soil", "gravel"} {
		id = "ground:" + id
		if len(Assets[id].Blocks) != 0 || Assets[id].ID != id {
			t.Fatal("ground must be known and walkable", id)
		}
		m.Objects = append(m.Objects, Object{ID: id, Asset: id, U: 520, V: 520})
	}
	// Flat ground blends may underlay a pond; solid objects still require pond clearance.
	m.Objects = append(m.Objects, Object{ID: "pond", Asset: "pond-large", U: 520, V: 520})
	draft, err := s.Save(m, false)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.Published(0)
	if err != nil || len(p.Objects) != 0 {
		t.Fatal("draft leaked", err)
	}
	p, err = s.Save(draft, true)
	if err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.dir)
	if err != nil {
		t.Fatal(err)
	}
	restored, err := reopened.Published(p.Revision)
	if err != nil || len(restored.Objects) != 5 {
		t.Fatal("ground lost on restart", err)
	}
	restored.Objects = append(restored.Objects, Object{ID: "cliff", Asset: "cliff", U: 520, V: 520})
	if restored.Validate() == nil {
		t.Fatal("ground disabled pond object clearance")
	}
}
