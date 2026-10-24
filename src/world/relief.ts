import {MAP,STRONGHOLD_ORIGIN} from './map';
import {unproject} from '../isometric';
import {STRONGHOLD} from '../stronghold/prefabs/stronghold';
// Terrain height (maps/*.json terrain): plateaus and ramps raise the ground. Gameplay positions stay on the flat
// ground plane (world px / court tiles); an actor is drawn lifted by its ground height, and a step that changes the
// height by more than maxStepM is a cliff. Mirrored step for step by server/internal/sim/relief.go.
export type Ascend='-u'|'+u'|'-v'|'+v';
export type ReliefFeature={id:string;type:'plateau'|'ramp'|'hill';u0:number;v0:number;u1:number;v1:number;heightM?:number;baseM?:number;topM?:number;ascend?:Ascend;outline?:[number,number][];rampStartV?:number;rampStartU?:number};
type Terrain={pxPerMeter:number;maxStepM:number;features:ReliefFeature[]};
const T=(MAP as unknown as {terrain?:Terrain}).terrain??{pxPerMeter:24,maxStepM:.4,features:[]};
export const PX_PER_METER=T.pxPerMeter,MAX_STEP_M=T.maxStepM;
// Features in court-local tiles, the space the game walks in.
export const RELIEF:ReliefFeature[]=T.features.map(f=>({...f,u0:f.u0-STRONGHOLD_ORIGIN.u,u1:f.u1-STRONGHOLD_ORIGIN.u,v0:f.v0-STRONGHOLD_ORIGIN.v,v1:f.v1-STRONGHOLD_ORIGIN.v,rampStartV:f.rampStartV===undefined?undefined:f.rampStartV-STRONGHOLD_ORIGIN.v,rampStartU:f.rampStartU===undefined?undefined:f.rampStartU-STRONGHOLD_ORIGIN.u,outline:f.outline?.map(([u,v])=>[u-STRONGHOLD_ORIGIN.u,v-STRONGHOLD_ORIGIN.v] as [number,number])}));
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
  if(f.ascend==='-u'){
   if(v<f.v0+.6||v>f.v0+2.8||(u>f.rampStartU!&&v<f.v0+1.3))return f.topM!+1;
   return f.topM!*Math.max(0,Math.min(1,(f.u1-u)/(f.u1-f.rampStartU!)));
  }
  if((v>f.v0+1.2&&u<f.u0+.85)||u>f.u0+4.65||(v>f.v0+3.6&&u>f.u0+4)||(v>f.rampStartV!&&(u<f.u0+1.4||u>f.u0+3.5)))return f.topM!+1;
  return f.topM!*Math.max(0,Math.min(1,(f.v1-v)/(f.v1-f.rampStartV!)));
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
export const cliff=(x0:number,y0:number,x1:number,y1:number)=>RELIEF.length>0&&Math.abs(heightAt(x1,y1)-heightAt(x0,y0))>MAX_STEP_M;
export const cliffTile=(u0:number,v0:number,u1:number,v1:number)=>RELIEF.length>0&&Math.abs(heightAtTile(u1,v1)-heightAtTile(u0,v0))>MAX_STEP_M;
// A raised feature hides an actor behind it, unless the actor stands on it or at least as high as its top.
export const reliefHides=(f:ReliefFeature,x:number,y:number)=>{const g=unproject(x-O.x,y-O.y);if(f.type==='hill')return g.y<f.v0+.8&&g.x>f.u0+.5&&g.x<f.u1-.5&&!inside(f,g.x,g.y)&&heightAtTile(g.x,g.y)<topOf(f)-.25;return !inside(f,g.x,g.y)&&heightAtTile(g.x,g.y)<topOf(f)-.25;};
