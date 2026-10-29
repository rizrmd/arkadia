package server

import (
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/vfx"
	"net/http"
)

func (s *Server) vfxRoutes(mux *http.ServeMux) {
	// Retired editor APIs must not fall through to the SPA index.
	mux.HandleFunc("/api/vfx/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, "FX editor has been removed", http.StatusGone)
	})
	s.vfxAssetRoutes(mux)
	mux.HandleFunc("GET /api/vfx/visuals", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		if s.VFX == nil {
			json.NewEncoder(w).Encode(vfx.State{Saved: vfx.Empty(), Applied: vfx.Empty()})
			return
		}
		v, e := s.VFX.Get()
		if e != nil {
			http.Error(w, "Visual storage unavailable", 500)
			return
		}
		json.NewEncoder(w).Encode(v)
	})
}
