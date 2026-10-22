// Package room runs co-op rooms: an invite code, up to four guests and one authoritative world each. A room's
// world ticks at 20 Hz only while at least one player is connected; empty, it pauses (clock, enemies and all) and
// is forgotten after its idle TTL.
package room

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode"

	"github.com/rizrmd/arkadia/server/internal/sim"
)

// Version is the wire protocol version; a client with another version is refused.
const Version = 1

// Codes avoid look-alike characters (0/O, 1/I/L) so they survive being read aloud or typed on a phone.
const (
	codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	codeLength   = 5
)

// Error codes sent to clients.
const (
	ErrRoomFull     = "room_full"
	ErrRoomNotFound = "room_not_found"
	ErrBadName      = "bad_name"
	ErrBadVersion   = "bad_version"
	ErrBadHello     = "bad_hello"
	ErrServerFull   = "server_full"
)

// Registry holds the live rooms.
type Registry struct {
	mu       sync.Mutex
	rooms    map[string]*Room
	nav      *sim.Blocker
	layout   []string
	ttl      time.Duration
	maxRooms int
	now      func() time.Time
}

// NewRegistry prepares rooms over the shared collision data.
func NewRegistry(nav *sim.Nav, ttl time.Duration, maxRooms int) *Registry {
	return &Registry{rooms: map[string]*Room{}, nav: sim.NewBlocker(nav), layout: nav.Layout, ttl: ttl, maxRooms: maxRooms, now: time.Now}
}

func newCode() string {
	b := make([]byte, codeLength)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		b[i] = codeAlphabet[n.Int64()]
	}
	return string(b)
}

// NormalizeCode upper-cases a typed code and drops spaces and dashes.
func NormalizeCode(code string) string {
	return strings.Map(func(r rune) rune {
		if r == ' ' || r == '-' {
			return -1
		}
		return unicode.ToUpper(r)
	}, strings.TrimSpace(code))
}

// Create opens a new room with a fresh code; its clock starts at the live time of day, as a solo game shows.
func (g *Registry) Create() (*Room, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if len(g.rooms) >= g.maxRooms {
		return nil, false
	}
	code := newCode()
	for g.rooms[code] != nil {
		code = newCode()
	}
	now := g.now()
	seed, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	clock := float64(now.UnixMilli()) / sim.DayMS
	r := &Room{Code: code, reg: g, world: sim.NewWorld(g.nav, clock, seed.Uint64()), layout: g.layout,
		join: make(chan joinReq), leave: make(chan *Client), input: make(chan inputMsg, 256), pick: make(chan heroMsg, 16), clients: map[*Client]bool{}, emptySince: now}
	g.rooms[code] = r
	go r.run()
	return r, true
}

// Get finds a room by its code.
func (g *Registry) Get(code string) *Room {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.rooms[NormalizeCode(code)]
}

// Count is the number of live rooms.
func (g *Registry) Count() int { g.mu.Lock(); defer g.mu.Unlock(); return len(g.rooms) }

func (g *Registry) remove(r *Room) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.rooms[r.Code] == r {
		delete(g.rooms, r.Code)
	}
}

// Client is one connection. The room writes to Send; the connection's writer drains it.
type Client struct {
	Send   chan []byte
	player *sim.Player
}

// NewClient makes a client with a small outgoing buffer: a client too slow to keep up loses snapshots, not the room.
func NewClient() *Client { return &Client{Send: make(chan []byte, 32)} }

type joinReq struct {
	client *Client
	name   string
	hero   string
	maxHP  float64
	reply  chan string
}

type inputMsg struct {
	client *Client
	in     sim.Input
}

type heroMsg struct {
	client *Client
	hero   string
}

// Room is one co-op world and its connected players. Only run() touches the world.
type Room struct {
	Code       string
	reg        *Registry
	world      *sim.World
	layout     []string
	join       chan joinReq
	leave      chan *Client
	input      chan inputMsg
	pick       chan heroMsg
	clients    map[*Client]bool
	emptySince time.Time
	nextID     int
	players    atomic.Int32
	tick       atomic.Uint64
	closed     atomic.Bool
}

// Info is what the lobby shows about a room before joining.
type Info struct {
	Code    string `json:"code"`
	Players int    `json:"players"`
	Max     int    `json:"max"`
	Tick    uint64 `json:"tick"`
}

// Info reports the room's occupancy.
func (r *Room) Info() Info {
	return Info{Code: r.Code, Players: int(r.players.Load()), Max: sim.MaxPlayers, Tick: r.tick.Load()}
}

// Join adds a client's hero, returning an error code when refused. On success the welcome is already queued.
func (r *Room) Join(c *Client, name, hero string, maxHP float64) string {
	if r.closed.Load() {
		return ErrRoomNotFound
	}
	reply := make(chan string, 1)
	select {
	case r.join <- joinReq{c, name, hero, maxHP, reply}:
		return <-reply
	case <-time.After(5 * time.Second):
		return ErrRoomNotFound
	}
}

// Leave removes a client's hero and closes its Send channel.
func (r *Room) Leave(c *Client) {
	select {
	case r.leave <- c:
	case <-time.After(5 * time.Second):
	}
}

// Input hands one input to the world; a full queue drops it (the client will be corrected).
func (r *Room) Input(c *Client, in sim.Input) {
	select {
	case r.input <- inputMsg{c, in}:
	default:
	}
}

// SetHero switches a client's hero; a full queue drops it.
func (r *Room) SetHero(c *Client, hero string) {
	select {
	case r.pick <- heroMsg{c, hero}:
	default:
	}
}

// Welcome is the first message after a successful hello.
type Welcome struct {
	T      string    `json:"t"`
	V      int       `json:"v"`
	Room   string    `json:"room"`
	You    string    `json:"you"`
	Rate   int       `json:"rate"`
	Max    int       `json:"max"`
	Layout []string  `json:"layout"`
	State  sim.State `json:"state"`
}

// Snapshot is the per-tick world state plus, for this client, the last input sequence the server applied, how
// many steps it has guessed ahead of that on its own (sim.Player.Owed) and, while it has, where the last applied
// input left the hero (Bx, By: the client predicts from there, as the guesses are walked again with the real
// inputs), how many more ticks a swing, hit stun or death holds the hero (Hd: the inputs applied in them do not
// walk, so the client's prediction skips as many) and how many of its inputs wait queued (the client paces its
// sending to keep about one there, so a late input rarely leaves the server without one).
type Snapshot struct {
	T   string   `json:"t"`
	Ack uint32   `json:"ack"`
	Ow  int      `json:"ow,omitempty"`
	Bx  *float64 `json:"bx,omitempty"`
	By  *float64 `json:"by,omitempty"`
	Hd  int      `json:"hd,omitempty"`
	Q   int      `json:"q,omitempty"`
	sim.State
}

func (r *Room) run() {
	var tick <-chan time.Time
	var ticker *time.Ticker
	var due time.Time // when the next tick is owed
	sweep := time.NewTicker(time.Minute)
	defer sweep.Stop()
	start := func() {
		if ticker == nil {
			ticker = time.NewTicker(time.Duration(sim.TickMS) * time.Millisecond)
			tick = ticker.C
			due = time.Now()
		}
	}
	stop := func() {
		if ticker != nil {
			ticker.Stop()
			ticker, tick = nil, nil
		}
	}
	for {
		select {
		case j := <-r.join:
			if len(r.clients) >= sim.MaxPlayers {
				j.reply <- ErrRoomFull
				continue
			}
			r.nextID++
			p := r.world.AddPlayer("p"+strconv.Itoa(r.nextID), j.name, j.maxHP)
			if p == nil {
				j.reply <- ErrRoomFull
				continue
			}
			p.SetHero(j.hero)
			j.client.player = p
			r.clients[j.client] = true
			r.players.Store(int32(len(r.clients)))
			msg, _ := json.Marshal(Welcome{T: "welcome", V: Version, Room: r.Code, You: p.ID, Rate: int(1000 / sim.TickMS), Max: sim.MaxPlayers, Layout: r.layout, State: r.world.State()})
			j.client.Send <- msg
			j.reply <- ""
			start()
		case c := <-r.leave:
			if !r.clients[c] {
				continue
			}
			delete(r.clients, c)
			r.world.RemovePlayer(c.player.ID)
			close(c.Send)
			r.players.Store(int32(len(r.clients)))
			if len(r.clients) == 0 {
				stop()
				r.emptySince = r.reg.now()
			}
		case m := <-r.pick:
			if r.clients[m.client] {
				m.client.player.SetHero(m.hero)
			}
		case m := <-r.input:
			if r.clients[m.client] {
				m.client.player.Queue(m.in)
			}
		case now := <-tick:
			// A ticker drops ticks when the process is starved of CPU; catch up (at most 5 per wake-up) so the
			// world keeps 20 Hz on average, and send only the newest state.
			for n := 0; n < 5 && !now.Before(due); n++ {
				r.world.Step()
				due = due.Add(time.Duration(sim.TickMS) * time.Millisecond)
			}
			if now.Sub(due) > time.Second {
				due = now
			}
			r.tick.Store(r.world.Tick)
			r.broadcast()
		case <-sweep.C:
			if len(r.clients) == 0 && r.reg.now().Sub(r.emptySince) > r.reg.ttl {
				r.closed.Store(true)
				r.reg.remove(r)
				return
			}
		}
	}
}

func (r *Room) broadcast() {
	state := r.world.State()
	for c := range r.clients {
		p := c.player
		s := Snapshot{T: "s", Ack: p.Ack, Ow: p.Owed, Hd: p.HoldTicks(), Q: p.Queued(), State: state}
		if p.Owed > 0 {
			s.Bx, s.By = &p.BaseX, &p.BaseY
		}
		msg, err := json.Marshal(s)
		if err != nil {
			continue
		}
		select {
		case c.Send <- msg:
		default:
		}
	}
}

// Heroes a player can pick (src/stronghold/heroes.ts); the first is the default.
var Heroes = []string{"rift-runner", "ember-warden"}

// CleanHero returns a known hero id, or the default and false.
func CleanHero(hero string) (string, bool) {
	for _, h := range Heroes {
		if h == hero {
			return h, true
		}
	}
	return Heroes[0], false
}

// CleanName makes a guest name safe to show: printable, single-spaced, at most 16 characters.
func CleanName(name string) (string, bool) {
	var b strings.Builder
	space := false
	n := 0
	for _, r := range strings.TrimSpace(name) {
		if unicode.IsSpace(r) {
			space = true
			continue
		}
		if !unicode.IsPrint(r) {
			continue
		}
		if n >= 16 {
			break
		}
		if space && b.Len() > 0 {
			b.WriteRune(' ')
			n++
		}
		space = false
		b.WriteRune(r)
		n++
	}
	s := strings.TrimSpace(b.String())
	return s, s != ""
}
