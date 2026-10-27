package room

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/sim"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDurableRoomReopen(t *testing.T) {
	nav, err := sim.LoadNav()
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	g := NewRegistry(nav, time.Millisecond, 10)
	if err = g.EnablePersistence(dir); err != nil {
		t.Fatal(err)
	}
	r, ok := g.Create()
	if !ok {
		t.Fatal("create")
	}
	c := NewClient()
	if e := r.Join(c, "A", "ember-warden", 100); e != "" {
		t.Fatal(e)
	}
	var first Welcome
	json.Unmarshal(<-c.Send, &first)
	if len(first.You) != 48 {
		t.Fatal("resume token is guessable")
	}
	r.Leave(c)
	deadline := time.Now().Add(time.Second)
	for r.Info().Players != 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	raw, err := os.ReadFile(filepath.Join(dir, r.Code+".json"))
	if err != nil {
		t.Fatal(err)
	}
	h := NewRegistry(nav, time.Millisecond, 10)
	if err = h.EnablePersistence(dir); err != nil {
		t.Fatal(err)
	}
	reopened := h.Get(r.Code)
	if reopened == nil {
		t.Fatal("room lost")
	}
	d := NewClient()
	if e := reopened.Join(d, "A", "ember-warden", 9999, first.You); e != "" {
		t.Fatal(e)
	}
	var second Welcome
	json.Unmarshal(<-d.Send, &second)
	if second.You != first.You || second.State.Tick != first.State.Tick {
		t.Fatal("did not resume paused world")
	}
	if second.State.Players[0].Max != 100 {
		t.Fatal("reopen trusted client HP claim")
	}
	reopened.Leave(d)
	// Unknown checkpoint versions stop startup, retaining original bytes.
	var saved map[string]any
	json.Unmarshal(raw, &saved)
	saved["Version"] = 99
	bad, _ := json.Marshal(saved)
	os.WriteFile(filepath.Join(dir, r.Code+".json"), bad, 0600)
	if err = NewRegistry(nav, time.Minute, 10).EnablePersistence(dir); err == nil {
		t.Fatal("future checkpoint accepted")
	}
}
