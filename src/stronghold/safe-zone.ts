// The Stronghold safe zone. Pure (no DOM), so node scripts can check it directly.
// Scale: one ground tile is 3 m. The hero stands 0.48 x 121 = 58 world px tall, about 0.6 of a tile's
// 90 px ground edge (128 px diagonal / sqrt 2), so a 1.8 m figure makes a tile 3 m; the 15-tile court is 45 m across.
// Distances are measured on the ground grid (tile units are square on the ground, unlike screen pixels)
// from the court centre, where the tent stands.
export const METERS_PER_TILE=3,SAFE_RADIUS_M=100,SAFE_TILES=SAFE_RADIUS_M/METERS_PER_TILE;
export const CENTER={u:7.5,v:7.5};
// Spawns keep a margin past the boundary, so a fresh enemy is never already touching it.
export const SPAWN_MARGIN=1.5;
export type Tile={u:number;v:number};
export const meters=(tiles:number)=>tiles*METERS_PER_TILE;
export const fromCenter=(p:Tile)=>Math.hypot(p.u-CENTER.u,p.v-CENTER.v);
export const inSafeZone=(p:Tile)=>fromCenter(p)<SAFE_TILES;
// A spawn point outside the zone. With the hero out in the wilds it lands 8 to 12 tiles from them, about the
// screen edge on a laptop; otherwise on a ring 1.5 to 10 tiles past the boundary. walkable() rejects ground the
// hero could not reach. Null when nothing fits within the tries.
export function spawnPoint(random:()=>number,hero:Tile,walkable:(p:Tile)=>boolean,tries=60):Tile|null{
 const wild=fromCenter(hero)>SAFE_TILES-12;
 for(let i=0;i<tries;i++){
  const a=random()*Math.PI*2,origin=wild?hero:CENTER,r=wild?8+random()*4:SAFE_TILES+SPAWN_MARGIN+random()*8.5;
  const p={u:origin.u+Math.cos(a)*r,v:origin.v+Math.sin(a)*r};
  if(fromCenter(p)<SAFE_TILES+SPAWN_MARGIN||Math.hypot(p.u-hero.u,p.v-hero.v)<7||!walkable(p))continue;
  return p;
 }
 return null;
}
