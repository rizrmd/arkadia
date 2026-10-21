// Co-op wire protocol, version 1 (server/internal/server/server.go, server/internal/room/room.go). JSON text frames.
// Client → server: hello once, then one input per 50 ms tick and a ping about once a second.
// Server → client: welcome (or error), then a snapshot every tick carrying the last input it applied (ack).
export const PROTOCOL=1,TICK_MS=50;
export type Hello={t:'hello';v:number;name:string;room:string;maxHp:number};
export type Input={t:'in';seq:number;x:number;y:number;a?:string[]};
export type Ping={t:'ping';c:number};
// Heroes in world px; clip state, a counter that bumps whenever a clip (re)starts, facing and kills.
export type PlayerState={id:string;name:string;x:number;y:number;hp:number;max:number;st:string;n:number;mv:boolean;fc:number;bk:boolean;vt:boolean;k:number};
// Revenants on ground tiles; g bumps on every respawn at the gate arc.
export type EnemyState={id:number;g:number;u:number;v:number;hp:number;st:string;n:number;fc:number;bk:boolean;vt:boolean};
export type GateState={open:boolean;frame:number;pass:boolean};
export type WorldState={tick:number;clock:number;gate:GateState;players:PlayerState[];enemies:EnemyState[]};
export type Welcome={t:'welcome';v:number;room:string;you:string;rate:number;max:number;layout:string[];state:WorldState};
// ow: steps the server walked ahead of the acknowledged input because later inputs were late; q: inputs queued.
export type Snapshot=WorldState&{t:'s';ack:number;ow?:number;q?:number};
export type ServerError={t:'error';code:string;message:string};
export type ServerMessage=Welcome|Snapshot|ServerError|{t:'pong';c:number;tick:number};
