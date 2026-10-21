// Distances use the square ground grid, not the isometric screen projection.
// The gate threshold is at world (577, 790), with COURT origin (577, -160).
export const METERS_PER_TILE=3;
export const CENTER={u:7.5,v:7.5};
export const GATE={u:950/64,v:950/64};
export const SPAWN_DISTANCE_M=10;
export type Tile={u:number;v:number};
export const meters=(tiles:number)=>tiles*METERS_PER_TILE;
export const fromCenter=(p:Tile)=>Math.hypot(p.u-CENTER.u,p.v-CENTER.v);
export const fromGate=(p:Tile)=>Math.hypot(p.u-GATE.u,p.v-GATE.v);
// The court side of the gateway is safe; there is no radius around the tent.
export const inSafeZone=(p:Tile)=>p.u+p.v<=GATE.u+GATE.v;
// Sample the outward-facing arc exactly 10 ground meters from the gate.
// Re-spawns use the same gate origin, independent of the hero's position.
export function spawnPoint(random:()=>number,_hero:Tile,walkable:(p:Tile)=>boolean,tries=60):Tile|null{
 for(let i=0;i<tries;i++){
  const a=Math.PI/4+(random()-.5)*Math.PI*2/3,r=SPAWN_DISTANCE_M/METERS_PER_TILE;
  const p={u:GATE.u+Math.cos(a)*r,v:GATE.v+Math.sin(a)*r};
  if(!inSafeZone(p)&&walkable(p))return p;
 }
 return null;
}
