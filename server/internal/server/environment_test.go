package server

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/environment"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestRetiredEnvironmentEditorPreservesPublishedMap(t *testing.T) {
	dir := t.TempDir()
	// Existing production storage must survive removing the editor, including old revisions/drafts.
	fixture := `{"version":1,"draft":{"schema":1,"revision":3,"name":"retained","objects":[]},"published":{"schema":1,"revision":3,"name":"retained","objects":[]},"revisions":{"3":{"schema":1,"revision":3,"name":"retained","objects":[]}}}`
	if e := os.WriteFile(filepath.Join(dir, "maps-state.json"), []byte(fixture), 0600); e != nil {
		t.Fatal(e)
	}
	store, e := environment.Open(dir)
	if e != nil {
		t.Fatal(e)
	}
	h := (&Server{Environment: store}).Handler()
	for _, method := range []string{"GET", "PUT", "POST", "DELETE"} {
		for _, route := range []string{"draft", "publish"} {
			w := httptest.NewRecorder()
			h.ServeHTTP(w, httptest.NewRequest(method, "/api/environment/"+route, nil))
			if w.Code != 410 {
				t.Fatalf("%s %s: %d", method, route, w.Code)
			}
		}
	}
	for _, suffix := range []string{"", "?revision=3", "?revision=0"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "/api/environment/published"+suffix, nil))
		var m environment.Map
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &m) != nil {
			t.Fatal(w.Code, w.Body.String())
		}
		expected := 3
		if suffix == "?revision=0" {
			expected = 0
		}
		if m.Revision != expected {
			t.Fatal(m)
		}
	}
	after, _ := os.ReadFile(filepath.Join(dir, "maps-state.json"))
	if string(after) != fixture {
		t.Fatal("Map storage changed")
	}
}
