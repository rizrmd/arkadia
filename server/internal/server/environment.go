package server

import (
	"crypto/subtle"
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
	auth := func(w http.ResponseWriter, r *http.Request) bool {
		if s.Environment == nil {
			http.Error(w, "Map storage unavailable", 503)
			return false
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+s.Environment.Key)) != 1 {
			http.Error(w, "Editor access key required", 401)
			return false
		}
		w.Header().Set("Cache-Control", "no-store")
		return true
	}
	mux.HandleFunc("GET /api/environment/draft", func(w http.ResponseWriter, r *http.Request) {
		if !auth(w, r) {
			return
		}
		m, e := s.Environment.Draft()
		if e != nil {
			http.Error(w, e.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(m)
	})
	for _, route := range []string{"draft", "publish"} {
		mux.HandleFunc("PUT /api/environment/"+route, func(w http.ResponseWriter, r *http.Request) {
			if !auth(w, r) {
				return
			}
			var m environment.Map
			d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
			d.DisallowUnknownFields()
			if e := d.Decode(&m); e != nil {
				http.Error(w, "Invalid map", 400)
				return
			}
			m, e := s.Environment.Save(m, route == "publish")
			if e != nil {
				http.Error(w, e.Error(), 409)
				return
			}
			if route == "publish" {
				environment.SetPublished(m)
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(m)
		})
	}
}
