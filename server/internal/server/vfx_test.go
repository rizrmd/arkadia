package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rizrmd/arkadia/server/internal/vfx"
)

func TestGameplayVisualsRemainReadableWithoutEditor(t *testing.T) {
	store, err := vfx.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	doc := vfx.Empty()
	state, err := store.Write(doc, false)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Write(state.Saved, true); err != nil {
		t.Fatal(err)
	}
	handler := (&Server{VFX: store, Site: t.TempDir()}).Handler()
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/vfx/visuals", nil))
	if w.Code != http.StatusOK {
		t.Fatal(w.Code)
	}
	var got vfx.State
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Applied.Revision != 1 {
		t.Fatal(got, err)
	}
	for _, route := range []struct{ method, path string }{
		{"PUT", "/api/vfx/save"}, {"PUT", "/api/vfx/apply"},
		{"POST", "/api/vfx/assets"}, {"POST", "/api/vfx/analysis"},
	} {
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(route.method, route.path, strings.NewReader(`{}`)))
		if w.Code != http.StatusGone {
			t.Fatalf("retired editor route %s remains accessible: %d", route.path, w.Code)
		}
	}
}
