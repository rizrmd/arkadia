package server

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/environment"
	"net/http"
	"strconv"
)

func (s *Server) environmentRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/environment/published", func(w http.ResponseWriter, r *http.Request) {
		if s.Environment == nil {
			http.Error(w, "Map storage unavailable", 503)
			return
		}
		rev, _ := strconv.Atoi(r.URL.Query().Get("revision"))
		if r.URL.Query().Has("revision") && rev == 0 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(environment.Empty())
			return
		}
		m, e := s.Environment.Published(rev)
		if e != nil {
			http.Error(w, e.Error(), 404)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(m)
	})
	// The authored maps remain readable by gameplay; editor mutation routes are retired.
	for _, route := range []string{"/api/environment/draft", "/api/environment/publish"} {
		mux.HandleFunc(route, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			http.Error(w, "Environment editor has been removed", http.StatusGone)
		})
	}
}
