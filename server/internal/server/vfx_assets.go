package server

import (
	"crypto/subtle"
	"encoding/json"
	"github.com/rizrmd/arkadia/server/internal/vfx"
	"net/http"
)

func (s *Server) vfxAssetRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/vfx/assets", func(w http.ResponseWriter, r *http.Request) {
		if s.VFX == nil {
			http.Error(w, "Asset storage unavailable", 503)
			return
		}
		a, e := s.VFX.Assets()
		if e != nil {
			http.Error(w, "Asset catalog unavailable", 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(a)
	})
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
	mux.HandleFunc("POST /api/vfx/assets", func(w http.ResponseWriter, r *http.Request) {
		if s.VFX == nil || s.Environment == nil {
			http.Error(w, "Asset storage unavailable", 503)
			return
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+s.Environment.Key)) != 1 {
			http.Error(w, "Editor access key required", 401)
			return
		}
		var body struct {
			Metadata vfx.Asset `json:"metadata"`
			Original []byte    `json:"original"`
			Packed   []byte    `json:"packed"`
		}
		d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 24<<20))
		d.DisallowUnknownFields()
		if d.Decode(&body) != nil {
			http.Error(w, "Invalid asset upload", 400)
			return
		}
		a, e := s.VFX.SaveAsset(body.Metadata, body.Original, body.Packed)
		if e != nil {
			http.Error(w, e.Error(), 400)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(a)
	})
}
