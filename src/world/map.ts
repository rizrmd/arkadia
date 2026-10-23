import data from './maps/arkadia-01.json';
import {STRONGHOLD} from '../stronghold/prefabs/stronghold';
// A map is a square of ground tiles with prefabs placed on it (maps/*.json). The runtime still renders and walks
// the Stronghold court in court-local tiles; these helpers convert to map tiles and chunks for steps (b) to (d).
type UV={u:number;v:number};
export type MapPlacement={prefab:'stronghold';at:UV};
export type MapDefinition={id:string;version:1;name:string;sizeTiles:number;metersPerTile:number;chunkTiles:number;seed:string;prefabs:MapPlacement[]};
export const MAP=data as unknown as MapDefinition;
const PREFABS={stronghold:STRONGHOLD};
if(MAP.version!==1||MAP.sizeTiles%MAP.chunkTiles||MAP.metersPerTile!==STRONGHOLD.safeZone.metersPerTile)throw Error(MAP.id+'.json: unsupported map');
// Map tile of a prefab's court-local (0, 0): its placement minus its anchor.
export function prefabOrigin(p:MapPlacement):UV{const a=PREFABS[p.prefab].anchor;return {u:p.at.u-a.u,v:p.at.v-a.v};}
const stronghold=MAP.prefabs.find(p=>p.prefab==='stronghold');
if(!stronghold)throw Error(MAP.id+'.json: no stronghold');
export const STRONGHOLD_ORIGIN=prefabOrigin(stronghold);
export const MAP_CENTER={u:MAP.sizeTiles/2,v:MAP.sizeTiles/2};
export const courtToMap=(t:UV):UV=>({u:t.u+STRONGHOLD_ORIGIN.u,v:t.v+STRONGHOLD_ORIGIN.v});
export const mapToCourt=(t:UV):UV=>({u:t.u-STRONGHOLD_ORIGIN.u,v:t.v-STRONGHOLD_ORIGIN.v});
export const chunkOf=(t:UV)=>({cu:Math.floor(t.u/MAP.chunkTiles),cv:Math.floor(t.v/MAP.chunkTiles)});
export const insideMap=(t:UV)=>t.u>=0&&t.v>=0&&t.u<MAP.sizeTiles&&t.v<MAP.sizeTiles;
