package room

import (
	"encoding/json"
	"fmt"
	"github.com/rizrmd/arkadia/server/internal/sim"
	"os"
	"path/filepath"
	"strings"
)

type savedRoom struct {
	Version int
	Code    string
	NextID  int
	World   json.RawMessage
}

// EnablePersistence loads durable rooms before accepting connections. Unknown or
// corrupt versions stop startup rather than replacing progress with a new room.
func (g *Registry) EnablePersistence(dir string) error {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	g.saveDir = dir
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, f.Name()))
		if err != nil {
			return err
		}
		var s savedRoom
		if err = json.Unmarshal(raw, &s); err != nil {
			return err
		}
		if s.Version != 1 || NormalizeCode(s.Code) != s.Code || len(s.Code) != codeLength {
			return fmt.Errorf("invalid room checkpoint %s", f.Name())
		}
		world, err := sim.RestoreCheckpoint(g.nav, s.World)
		if err != nil {
			return err
		}
		r := g.makeRoom(s.Code, world)
		r.nextID = s.NextID
		g.rooms[s.Code] = r
		go r.run()
	}
	return nil
}
func (g *Registry) makeRoom(code string, world *sim.World) *Room {
	return &Room{Code: code, reg: g, world: world, layout: g.layout, join: make(chan joinReq), leave: make(chan *Client), input: make(chan inputMsg, 256), pick: make(chan heroMsg, 16), clients: map[*Client]bool{}, emptySince: g.now()}
}
func (r *Room) save() error {
	if r.reg.saveDir == "" {
		return nil
	}
	world, err := r.world.Checkpoint()
	if err != nil {
		return err
	}
	raw, err := json.Marshal(savedRoom{1, r.Code, r.nextID, world})
	if err != nil {
		return err
	}
	target := filepath.Join(r.reg.saveDir, r.Code+".json")
	f, err := os.CreateTemp(r.reg.saveDir, ".checkpoint-")
	if err != nil {
		return err
	}
	name := f.Name()
	defer os.Remove(name)
	if _, err = f.Write(raw); err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	if err = os.Rename(name, target); err != nil {
		return err
	}
	d, err := os.Open(r.reg.saveDir)
	if err != nil {
		return err
	}
	defer d.Close()
	return d.Sync()
}
