package server

import (
	"crypto/subtle"
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/vfx"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func (s *Server) vfxRoutes(mux *http.ServeMux) {
	s.vfxAssetRoutes(mux)
	s.vfxAnalysisRoutes(mux)
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
	for _, action := range []string{"save", "apply"} {
		mux.HandleFunc("PUT /api/vfx/"+action, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			if s.Environment == nil || s.VFX == nil {
				http.Error(w, "Visual storage unavailable", 503)
				return
			}
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+s.Environment.Key)) != 1 {
				http.Error(w, "Editor access key required", 401)
				return
			}
			var d vfx.Document
			decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
			decoder.DisallowUnknownFields()
			if decoder.Decode(&d) != nil {
				http.Error(w, "Invalid visual document; combat fields are not permitted", 400)
				return
			}
			if e := d.Validate(); e != nil {
				http.Error(w, e.Error(), 400)
				return
			}
			for _, layers := range d.Effects {
				for _, patch := range layers {
					if patch.Texture != "" {
						rel := patch.Texture
						if rel[0] == '/' {
							rel = rel[1:]
						} else {
							rel = "vfx/" + rel
						}
						assetPath := filepath.Join(s.Site, rel)
						if strings.HasPrefix(patch.Texture, "/api/vfx/assets/") {
							parts := strings.Split(strings.TrimPrefix(patch.Texture, "/api/vfx/assets/"), "/")
							if len(parts) == 2 {
								assetPath = s.VFX.AssetFile(parts[0], parts[1])
							} else {
								assetPath = ""
							}
						}
						if info, err := os.Stat(assetPath); err != nil || info.IsDir() {
							http.Error(w, "Texture asset is not available on the server", 400)
							return
						}
					}
				}
			}
			v, e := s.VFX.Write(d, action == "apply")
			if e != nil {
				http.Error(w, e.Error(), 409)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(v)
		})
	}
}
