// Command arkodia serves the built Stronghold client and runs its co-op rooms.
//
//	PORT=3000 SITE_DIR=dist ./arkodia
package main

import (
	"context"
	"errors"
	"github.com/rizrmd/arkadia/server/internal/environment"
	"github.com/rizrmd/arkadia/server/internal/vfx"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/rizrmd/arkadia/server/internal/room"
	"github.com/rizrmd/arkadia/server/internal/server"
	"github.com/rizrmd/arkadia/server/internal/sim"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	nav, err := sim.LoadNav()
	if err != nil {
		log.Error("collision data", "err", err)
		os.Exit(1)
	}
	ttl, err := time.ParseDuration(env("ROOM_TTL", "30m"))
	if err != nil {
		log.Error("ROOM_TTL", "err", err)
		os.Exit(1)
	}
	s := &server.Server{
		Rooms:    room.NewRegistry(nav, ttl, 500),
		Site:     env("SITE_DIR", "dist"),
		CacheDir: os.Getenv("WEBP_CACHE_DIR"),
		Log:      log,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if len(os.Args) > 1 && os.Args[1] == "--warm-webp" {
		s.WarmWebPCache(ctx)
		return
	}
	store, err := environment.Open(filepath.Join(env("GAME_SAVE_DIR", "game-saves"), "environment"))
	if err != nil {
		log.Error("environment storage", "err", err)
		os.Exit(1)
	}
	s.Environment = store
	s.VFX, err = vfx.Open(filepath.Join(env("GAME_SAVE_DIR", "game-saves"), "vfx"))
	if err != nil {
		log.Error("visual storage", "err", err)
		os.Exit(1)
	}
	published, err := store.Published(0)
	if err != nil {
		log.Error("published environment", "err", err)
		os.Exit(1)
	}
	environment.SetPublished(published)
	if err := s.Rooms.EnablePersistence(env("GAME_SAVE_DIR", "game-saves")); err != nil {
		log.Error("gameplay checkpoint", "err", err)
		os.Exit(1)
	}
	go s.WarmWebPCache(ctx)
	srv := &http.Server{Addr: ":" + env("PORT", "3000"), Handler: s.Handler(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	log.Info("Arkodia listening", "addr", srv.Addr, "site", s.Site, "columns", len(nav.Columns))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("serve", "err", err)
		os.Exit(1)
	}
}
