// Co-op wire protocol, version 1 (server/internal/server/server.go, server/internal/room/room.go). JSON text frames.
// Client → server: hello once, then one input per 50 ms tick and a ping about once a second; a hero message
// whenever the player picks another hero (heroes.ts). Servers before heroes ignore it and clients default `h`.
// Server → client: welcome (or error), then a snapshot every tick carrying the last input it applied (ack).
export const PROTOCOL=1,TICK_MS=50;
export type Hello={t:'hello';v:number;name:string;room:string;you?:string;maxHp:number;hero:string};
export type HeroPick={t:'hero';h:string};
export type Input={t:'in';seq:number;x:number;y:number;a?:string[];choice?:string;level?:number};
export type Ping={t:'ping';c:number};
// Heroes in world px; which hero (h), clip state, a counter that bumps whenever a clip (re)starts, facing and kills.
export type PlayerState={id:string;name:string;h?:string;x:number;y:number;hp:number;max:number;st:string;n:number;mv:boolean;fc:number;bk:boolean;vt:boolean;k:number;run?:import('../progression').Progression};
// Revenants on ground tiles; g bumps on every respawn at the gate arc; level/max track monster scaling.
export type EnemyState={id:number;g:number;level?:number;u:number;v:number;hp:number;max?:number;st:string;n:number;fc:number;bk:boolean;vt:boolean};
export type GateState={open:boolean;frame:number;pass:boolean};
export type WorldState={souls?:{id:number;owner:string;u:number;v:number;level:number;age:number}[];tick:number;clock:number;gate:GateState;players:PlayerState[];enemies:EnemyState[]};
export type Welcome={t:'welcome';v:number;room:string;you:string;rate:number;max:number;layout:string[];state:WorldState};
// ow: steps the server guessed ahead of the acknowledged input because later inputs were late, and bx, by where
// that input left the hero under them (the guesses are walked again with the real inputs); hd: ticks a hit stun
// or death still holds the hero (the next hd inputs do not walk; a swing holds none); q: inputs queued.
export type Snapshot=WorldState&{t:'s';ack:number;ow?:number;bx?:number;by?:number;hd?:number;q?:number};
export type ServerError={t:'error';code:string;message:string};
export type ServerMessage=Welcome|Snapshot|ServerError|{t:'pong';c:number;tick:number;run?:import('../progression').Progression};
