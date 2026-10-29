package server

import (
	"net/http"
)

func (s *Server) vfxAssetRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/vfx/assets/{id}/{file}", func(w http.ResponseWriter, r *http.Request) {
		if s.VFX == nil {
			http.NotFound(w, r)
			return
		}
		p := s.VFX.AssetFile(r.PathValue("id"), r.PathValue("file"))
		if p == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, p)
	})
}
