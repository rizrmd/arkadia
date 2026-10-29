import data from './maps/frozen-frontier.json';
import sprites from './maps/frozen-frontier-sprites.json';
import {STRONGHOLD_ORIGIN} from './map';
import {ISO} from '../isometric';
import {STRONGHOLD} from '../stronghold/prefabs/stronghold';
// Frozen Frontier scenery (maps/frozen-frontier.json): ruins, landmarks and winter plants on the snow around the
// Stronghold. Positions are court-local tiles and world px, like the rest of the game. Collision is footprint columns,
// the court sprites' rule (hero.ts blocked, net/movement.ts navBlocker); server/internal/sim/frontier.go builds the
// same columns from its copy of the file, so the server, co-op prediction and the solo hero agree.
export type FrontierLayer='ground'|'upright'|'cap';
export type FrontierColumn={x:number;w:number;back:number;front:number};
type Rect=[number,number,number,number];
// band orders ground decals: 'under' (trampled snow) below everything, 'over' (drifts, loose stones) above floors.
type Kit={layer:FrontierLayer;block:Rect[];band?:'under'|'over'};
type Placement={a:string;u:number;v:number;s?:number;lift?:number;on?:string;f?:number;r?:number;zone:string};
type Sprite={frame:[number,number,number,number];world:[number,number];pivot:[number,number];shear?:number;ground?:number[]};
export type FrontierProp={key:string;asset:string;zone:string;layer:FrontierLayer;u:number;v:number;x:number;y:number;s:number;lift:number;
 frame:[number,number,number,number];width:number;height:number;pivot:[number,number];
 // flip mirrors the sprite left to right (and its footprint across the u = v diagonal); rot turns a ground decal
 // in the ground plane, in degrees; band is a ground decal's draw band (-1 under, 0, 1 over).
 flip:boolean;rot:number;band:number;shear:number;
 // Where the sprite meets the ground (build-assets.mjs groundLine): heights as fractions of the sprite's height,
 // evenly across its unmirrored width. The sun shadow is projected from it (frontier-view.ts).
 ground:number[];
 // Solid footprint (empty for walk-through plants and decals) and the footprint that decides draw order against
 // actors (a snow cap uses its wall's).
 blocks:FrontierColumn[];depthColumns:FrontierColumn[]};
const KIT=data.kit as unknown as Record<string,Kit>,SPRITES=sprites.assets as unknown as Record<string,Sprite>;
const O=STRONGHOLD.court.origin,COLUMN=4;
const world=(u:number,v:number)=>({x:O.x+(u-v)*ISO.halfWidth,y:O.y+(u+v)*ISO.halfHeight});
// A tile rectangle around (u, v), scaled by s, as columns COLUMN px wide spanning its back and front edges on screen.
export function rectColumns(u:number,v:number,s:number,r:Rect):FrontierColumn[]{
 const pts=[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].map(([a,b])=>world(u+a*s,v+b*s));
 let x0=Infinity,x1=-Infinity;for(const p of pts){if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;}
 const n=Math.max(1,Math.ceil((x1-x0)/COLUMN)),w=(x1-x0)/n,cols:FrontierColumn[]=[];
 for(let i=0;i<n;i++){
  const x=x0+(i+.5)*w;let back=Infinity,front=-Infinity;
  for(let j=0;j<4;j++){const p=pts[j],q=pts[(j+1)%4];if(p.x===q.x||x<Math.min(p.x,q.x)||x>Math.max(p.x,q.x))continue;const y=p.y+(q.y-p.y)*(x-p.x)/(q.x-p.x);if(y<back)back=y;if(y>front)front=y;}
  cols.push({x,w,back,front});
 }
 return cols;
}
// Mirroring a sprite on screen swaps its u and v offsets, so a flipped footprint rectangle swaps its axes.
const footprint=(kit:Kit,u:number,v:number,s:number,flip=false)=>kit.block.flatMap(r=>rectColumns(u,v,s,flip?[r[1],r[0],r[3],r[2]]:r));
export const FRONTIER_PROPS:FrontierProp[]=(data.placements as Placement[]).map((p,i)=>{
 const kit=KIT[p.a],sprite=SPRITES[p.a];if(!kit||!sprite)throw Error('frozen-frontier.json: unknown sprite '+p.a);
 const u=p.u-STRONGHOLD_ORIGIN.u,v=p.v-STRONGHOLD_ORIGIN.v,s=p.s??1,flip=!!p.f,{x,y}=world(u,v),blocks=kit.layer==='cap'?[]:footprint(kit,u,v,s,flip);
 return {key:`ff:${p.a}:${i}`,asset:p.a,zone:p.zone,layer:kit.layer,u,v,x,y,s,lift:p.lift??0,frame:sprite.frame,width:sprite.world[0]*s,height:sprite.world[1]*s,pivot:sprite.pivot,
  flip,rot:kit.layer==='ground'?p.r??0:0,band:kit.band==='under'?-1:kit.band==='over'?1:0,shear:(sprite.shear??0)*(flip?-1:1),ground:sprite.ground??[sprite.pivot[1]],
  blocks,depthColumns:kit.layer==='cap'&&p.on?footprint(KIT[p.on],u,v,s,flip):blocks};
});
// Every solid column, for the co-op prediction's collision (net/client.ts) and the parity export.
export const FRONTIER_COLUMNS:FrontierColumn[]=FRONTIER_PROPS.flatMap(p=>p.blocks);
export const FRONTIER_KIT_SIZE=Object.keys(KIT).length;
// All the art is one atlas (scripts/frozen-frontier-map/build-assets.mjs).
export const FRONTIER_ATLAS=sprites.atlas;
