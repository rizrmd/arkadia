// Command arkadia serves the built Stronghold client and runs its co-op rooms.
//
//	PORT=3000 SITE_DIR=dist ./arkadia
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
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
	s := &server.Server{Rooms: room.NewRegistry(nav, ttl, 500), Site: env("SITE_DIR", "dist"), Log: log}
	srv := &http.Server{Addr: ":" + env("PORT", "3000"), Handler: s.Handler(), ReadHeaderTimeout: 10 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	log.Info("Arkadia listening", "addr", srv.Addr, "site", s.Site, "columns", len(nav.Columns))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("serve", "err", err)
		os.Exit(1)
	}
}
