package server

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/environment"
	"github.com/rizrmd/arkadia/server/internal/vfx"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestVisualEditorIsolationAndPersistence(t *testing.T) {
	env, e := environment.Open(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	dir := t.TempDir()
	store, e := vfx.Open(dir)
	if e != nil {
		t.Fatal(e)
	}
	s := &Server{Environment: env, VFX: store}
	mux := httptest.NewServer(s.Handler())
	defer mux.Close()
	call := func(route, body, key string) int {
		r := httptest.NewRequest("PUT", "/api/vfx/"+route, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+key)
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		return w.Code
	}
	body := `{"version":1,"revision":0,"effects":{"rift-runner/rift-bolt.cast":{"0":{"color":"#22ff88","opacity":0.5,"size":1.4}}}}`
	if got := call("save", body, "wrong"); got != 401 {
		t.Fatal(got)
	}
	bad := `{"version":1,"revision":0,"effects":{"rift-runner/rift-bolt.cast":{"0":{"damage":999}}}}`
	if got := call("save", bad, env.Key); got != 400 {
		t.Fatal("Combat field accepted", got)
	}
	if got := call("save", strings.Replace(body, `"opacity":0.5`, `"opacity":9`, 1), env.Key); got != 400 {
		t.Fatal("Invalid range accepted", got)
	}
	if got := call("save", strings.Replace(body, `"opacity":0.5`, `"texture":"/missing-fx-texture.png"`, 1), env.Key); got != 400 {
		t.Fatal("Missing texture accepted", got)
	}
	if got := call("save", body, env.Key); got != 200 {
		t.Fatal(got)
	}
	state, _ := store.Get()
	if state.Saved.Revision != 1 || state.Applied.Revision != 0 {
		t.Fatal("Save published unexpectedly", state)
	}
	if got := call("save", body, env.Key); got != 409 {
		t.Fatal("Concurrent overwrite accepted", got)
	}
	b, _ := json.Marshal(state.Saved)
	if got := call("apply", string(b), env.Key); got != 200 {
		t.Fatal(got)
	}
	reopened, e := vfx.Open(dir)
	if e != nil {
		t.Fatal(e)
	}
	state, e = reopened.Get()
	if e != nil || state.Applied.Revision != 1 || state.Applied.Effects["rift-runner/rift-bolt.cast"]["0"].Color != "#22ff88" {
		t.Fatal("Applied visuals not durable", state, e)
	}
	b = []byte(strings.Replace(string(b), "#22ff88", "#ff2288", 1))
	if got := call("apply", string(b), env.Key); got != 409 {
		t.Fatal("Unsaved visuals were applied", got)
	}
}
