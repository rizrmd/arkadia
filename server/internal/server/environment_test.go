package server

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/environment"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEnvironmentAccessAndPublish(t *testing.T) {
	store, e := environment.Open(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	s := &Server{Environment: store}
	h := s.Handler()
	req := httptest.NewRequest("PUT", "/api/environment/publish", strings.NewReader(`{"schema":1,"revision":0,"name":"test","objects":[]}`))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatal("unauthorized publish", w.Code)
	}
	req = httptest.NewRequest("GET", "/api/environment/draft", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatal("private draft exposed")
	}
	req = httptest.NewRequest("PUT", "/api/environment/publish", strings.NewReader(`{"schema":1,"revision":0,"name":"test","objects":[]}`))
	req.Header.Set("Authorization", "Bearer "+store.Key)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	req = httptest.NewRequest("GET", "/api/environment/published?revision=0", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	var m environment.Map
	json.Unmarshal(w.Body.Bytes(), &m)
	if m.Revision != 0 {
		t.Fatal("legacy map not preserved")
	}
	req = httptest.NewRequest("GET", "/api/environment/published", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &m)
	if m.Revision != 1 {
		t.Fatal("publish not live")
	}
}
