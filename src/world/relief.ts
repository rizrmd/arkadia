import frontier from './maps/frozen-frontier.json';
import {MAP,STRONGHOLD_ORIGIN} from './map';
import {unproject} from '../isometric';
import {STRONGHOLD} from '../stronghold/prefabs/stronghold';
// Terrain height (maps/*.json terrain): plateaus and ramps raise the ground. Gameplay positions stay on the flat
// ground plane (world px / court tiles); an actor is drawn lifted by its ground height, and a step that changes the
// height by more than maxStepM is a cliff. Mirrored step for step by server/internal/sim/relief.go.
export type Ascend='-u'|'+u'|'-v'|'+v';
export type ReliefFeature={id:string;visual?:'scenery';connectsTo?:string;type:'plateau'|'ramp'|'hill';u0:number;v0:number;u1:number;v1:number;heightM?:number;baseM?:number;topM?:number;ascend?:Ascend;outline?:[number,number][];rampStartV?:number;rampStartU?:number};
type Terrain={pxPerMeter:number;maxStepM:number;features:ReliefFeature[]};
const T=(MAP as unknown as {terrain?:Terrain}).terrain??{pxPerMeter:24,maxStepM:.4,features:[]};
export const PX_PER_METER=T.pxPerMeter,MAX_STEP_M=T.maxStepM;
// Features in court-local tiles, the space the game walks in.
export const RELIEF:ReliefFeature[]=[...T.features,...frontier.terrain as ReliefFeature[]].map(f=>({...f,u0:f.u0-STRONGHOLD_ORIGIN.u,u1:f.u1-STRONGHOLD_ORIGIN.u,v0:f.v0-STRONGHOLD_ORIGIN.v,v1:f.v1-STRONGHOLD_ORIGIN.v,rampStartV:f.rampStartV===undefined?undefined:f.rampStartV-STRONGHOLD_ORIGIN.v,rampStartU:f.rampStartU===undefined?undefined:f.rampStartU-STRONGHOLD_ORIGIN.u,outline:f.outline?.map(([u,v])=>[u-STRONGHOLD_ORIGIN.u,v-STRONGHOLD_ORIGIN.v] as [number,number])}));
for(const f of RELIEF)if(!(f.u1>f.u0&&f.v1>f.v0)||(f.type==='plateau'?!(f.heightM!>0):!(f.ascend&&f.topM!==undefined&&f.baseM!==undefined)))throw Error('terrain feature '+f.id+' is malformed');
export function inside(f:ReliefFeature,u:number,v:number){
 if(!(u>=f.u0&&u<f.u1&&v>=f.v0&&v<f.v1))return false;
 if(!f.outline)return true;
 let hit=false;const p=f.outline;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [x,y]=p[i],[a,b]=p[j];
  if((y>v)!==(b>v)&&u<(a-x)*(v-y)/(b-y)+x)hit=!hit;
 }
 return hit;
}
// Height of a feature at a tile it contains, in meters.
export function featureHeight(f:ReliefFeature,u:number,v:number){
 if(f.type==='plateau')return f.heightM!;
 if(f.type==='hill'){
  return f.topM!*Math.max(0,Math.min(1,f.ascend==='-u'?(f.u1-u)/(f.u1-f.rampStartU!):(f.v1-v)/(f.v1-f.rampStartV!)));
 }
 const t=f.ascend==='-u'?(f.u1-u)/(f.u1-f.u0):f.ascend==='+u'?(u-f.u0)/(f.u1-f.u0):f.ascend==='-v'?(f.v1-v)/(f.v1-f.v0):(v-f.v0)/(f.v1-f.v0);
 return f.baseM!+(f.topM!-f.baseM!)*t;
}
export const topOf=(f:ReliefFeature)=>f.type==='plateau'?f.heightM!:Math.max(f.baseM!,f.topM!);
export function heightAtTile(u:number,v:number){let h=0;for(const f of RELIEF)if(inside(f,u,v)){const fh=featureHeight(f,u,v);if(fh>h)h=fh;}return h;}
const O=STRONGHOLD.court.origin;
export function heightAt(x:number,y:number){if(!RELIEF.length)return 0;const g=unproject(x-O.x,y-O.y);return heightAtTile(g.x,g.y);}
// Screen px an actor standing on the ground point is drawn above it.
export const liftAt=(x:number,y:number)=>heightAt(x,y)*PX_PER_METER;
export const liftAtTile=(u:number,v:number)=>RELIEF.length?heightAtTile(u,v)*PX_PER_METER:0;
// A step between two ground points that changes height by more than maxStepM: up or down a cliff face.
export const cliff=(x0:number,y0:number,x1:number,y1:number)=>{const a=unproject(x0-O.x,y0-O.y),b=unproject(x1-O.x,y1-O.y);return cliffTile(a.x,a.y,b.x,b.y);};
export function cliffTile(u0:number,v0:number,u1:number,v1:number){
 const dx=(u1-u0-v1+v0)*64,dy=(u1-u0+v1-v0)*32,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
 let previous=heightAtTile(u0,v0);
 for(let i=1;i<=n;i++){const u=u0+(u1-u0)*i/n,v=v0+(v1-v0)*i/n,h=heightAtTile(u,v);
  if(Math.abs(h-previous)>MAX_STEP_M||reliefBlockedTile(u,v))return true;previous=h;
 }return false;
}
// A raised feature hides an actor behind it, unless the actor stands on it or at least as high as its top.
export const reliefHides=(f:ReliefFeature,x:number,y:number)=>{const g=unproject(x-O.x,y-O.y);if(RELIEF.some(r=>r.connectsTo===f.id&&inside(r,g.x,g.y)))return false;if(f.type==='hill')return g.y<f.v0+.8&&g.x>f.u0+.5&&g.x<f.u1-.5&&!inside(f,g.x,g.y)&&heightAtTile(g.x,g.y)<topOf(f)-.25;return !inside(f,g.x,g.y)&&heightAtTile(g.x,g.y)<topOf(f)-.25;};

// Snow-top contour in normalized coordinates of the coherent core atlas (1536 x 768).
// Excludes rock faces and the alpha snow skirt. Both hills use this same core, mirrored for -u.
export const HILL_SURFACE=[ [.02,.87],[.13,.70],[.24,.57],[.30,.39],[.36,.21],[.43,.075],[.52,.035],[.65,.045],[.80,.10],[.89,.18],[.90,.27],[.81,.34],[.70,.39],[.59,.48],[.49,.61],[.39,.78],[.30,.94],[.12,.97],[.025,.94] ] as const;
export function hillArtBounds(f:ReliefFeature){
 const pts=f.outline!.map(([u,v])=>{
  const x=(u-v)*64,y=(u+v)*32,isU=f.ascend==='-u';
  const h=f.topM!*Math.max(0,Math.min(1,isU?(f.u1-u)/(f.u1-f.rampStartU!):(f.v1-v)/(f.v1-f.rampStartV!)))*PX_PER_METER;
  const back=isU?Math.max(0,Math.min(1,(f.u0+2.2-u)/1.6))*Math.max(0,Math.min(1,(f.v1-1.2-v))):Math.max(0,Math.min(1,(f.v0+2.2-v)/1.6))*Math.max(0,Math.min(1,(u-f.u0-.2)/.8));
  return {x,y,top:y-h*back};
 });
 return {left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),top:Math.min(...pts.map(p=>p.top)),bottom:Math.max(...pts.map(p=>p.y))};
}
const hillBounds=new Map(RELIEF.filter(f=>f.type==='hill').map(f=>[f,hillArtBounds(f)]));
function onHillSurface(x:number,y:number){
 let hit=false;for(let i=0,j=HILL_SURFACE.length-1;i<HILL_SURFACE.length;j=i++){
  const [a,b]=HILL_SURFACE[i],[c,d]=HILL_SURFACE[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
 }return hit;
}
// Check the rendered foot ellipse, rather than the unlifted ground center. Ground outside a hill stays open.
export function reliefBlockedTile(u:number,v:number){
 for(const [f,b] of hillBounds){if(!inside(f,u,v))continue;
  const x=(u-v)*64,y=(u+v)*32-featureHeight(f,u,v)*PX_PER_METER;
  for(const [dx,dy] of [[0,0],[9,0],[-9,0],[0,4.5],[0,-4.5],[6.36,3.18],[-6.36,3.18],[6.36,-3.18],[-6.36,-3.18]]){
   let nx=(x+dx-b.left)/(b.right-b.left);if(f.ascend==='-u')nx=1-nx;
   if(!onHillSurface(nx,(y+dy-b.top)/(b.bottom-b.top)))return true;
  }
 }return false;
}
export function reliefBlocked(x:number,y:number){const t=unproject(x-O.x,y-O.y);return reliefBlockedTile(t.x,t.y);}
