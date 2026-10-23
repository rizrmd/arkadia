import data from './stronghold.json';
// The Stronghold court as data: size, origin, gateway, safe zone, building slots, props and torches. The co-op
// server embeds a byte-identical copy (server/internal/sim/stronghold.json). Tiles (u, v) are court-local.
type XY={x:number;y:number};type UV={u:number;v:number};
type Edge=readonly [readonly [number,number],readonly [number,number]];
export type PrefabBuilding={x:number;y:number;legacy?:XY;width:number;pivot:number;asset:string;groundEdges:{rising:Edge;falling:Edge}};
// foot/shear/vertical/depth/opacity default to .97/0/1/round(world y)/1; assetSet v1 is the old /modular-stronghold/ root.
export type PrefabProp={group:string;id:string;u:number;v:number;width:number;foot?:number;shear?:number;vertical?:number;depth?:number;opacity?:number;assetSet?:'v1';layout?:'legacy'};
export type PrefabLight=UV&{lift:number;wall:boolean};
export type StrongholdPrefab={
 id:'stronghold';version:1;anchor:UV;world:{width:number;height:number};
 court:{size:number;origin:XY;walkInset:number;openSnowFrom:number};
 gate:{x:number;threshold:XY;passageFromY:number;archHalfWidth:number;towerHalfSpan:number;towerFront:{knee:number;base:number;rise:number;peak:number;fall:number};towerDepth:number;columnStep:number;doors:{halfWidth:number;back:number;front:number};trigger:{y:number;closed:XY;open:XY};frontY:number;footprintHeight:{tower:number;doors:number};apron:{x:number;y:number;width:number;height:number;edge:number;slope:number};frames:number;passableAt:number};
 safeZone:{metersPerTile:number;center:UV;spawnDistanceM:number};
 heroSpawn:XY;
 buildings:Record<'forge'|'barracks'|'altar'|'mage'|'expedition'|'mine'|'gate',PrefabBuilding>;
 props:PrefabProp[];lights:PrefabLight[];
};
export const STRONGHOLD=data as unknown as StrongholdPrefab;
if(STRONGHOLD.id!=='stronghold'||STRONGHOLD.version!==1||!STRONGHOLD.props.length)throw Error('stronghold.json: unsupported prefab');
