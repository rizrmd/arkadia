import {walkableGround,gatePassageColumn} from './navigation';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {loadImage} from '../app/loader';
import {walkStep,fullSpeed} from './net/movement';
import {characters,atlasUrl,DEFAULT_HERO,isHero,type HeroId} from './heroes';
// The player's hero walking the court, drawn from the picked hero's character atlas (heroes.ts): six unmirrored
// views, the four diagonals and straight up/down (the knight's atlas mirrored its diagonals). The world is one pre-rastered surface, so the hero is its own small canvas over it:
// sprites standing in front of the hero cut their silhouettes out of that canvas (leaving a faint ghost, so the
// hero is never lost behind a wall), and their ground footprints (the cast-shadow solids from world-view.ts)
// block the way.
export type Column={x:number;w:number;back:number;front:number;height:number};
// A combat clip (attack, hit or die) that encounters.ts plays in place of walking; t is ms into the clip.
export type Pose={clip:string;t:number};
// Erase uprights standing in front of a figure drawn in local coordinates around its foot at (px, py),
// leaving a faint ghost so it is never lost behind a wall.
export function cutOut(c:CanvasRenderingContext2D,list:readonly Placed[],px:number,py:number){
 c.globalCompositeOperation='destination-out';
 for(const p of list){c.save();c.globalAlpha=.72;c.translate(p.x-px,p.y-py);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();}
 c.globalCompositeOperation='source-over';
}
// A co-op hero is driven from outside: the own hero by prediction (net/client.ts), the others by server snapshots.
// `face` turns toward a walk direction as the keys do; `look` sets the server's facing outright.
export type Drive={x:number;y:number;pose?:Pose|null;face?:Walk|null;look?:{facing:number;back:boolean;vertical:boolean}|null};
export type Placed={layer:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;opacity:number;image:HTMLImageElement};
type Clip={fps:number;loop:boolean;frames:number[];strideScale?:number};
// A six-view atlas (`views`) names its clips <state>-<view>; the knight's mirrored atlas has no views.
type Meta={image:string;revision?:string;views?:string[];cell:{w:number;h:number;pivot:{x:number;y:number}};clips:Record<string,Clip>;frames:{x:number;y:number;w:number;h:number}[]};
const KEY='arkadia.stronghold.hero';
// Atlas px -> world px. Matches the court props (a barrel is 27 px wide), not the arena's 1.1.
// The hero starts (and respawns) just in front of the tent in the centre of the court.
export const DISPLAY=.48;const RADIUS=9,SPAWN={x:590,y:420};
// The walking rule itself (speed per direction, sliding along blockers) is net/movement.ts walkStep(). The legs
// keep time with it: `gait` counts seconds walked at full speed, so a walk clip plays at its own fps at full speed
// in every direction and slows with a light push, a start or a stop.
export async function createHero<P extends Placed>(o:{layer:HTMLElement;lightmap:HTMLCanvasElement;surface:HTMLElement;footprint:(p:P)=>Column[];sun:()=>Sun;direction:()=>Walk;follow:(x:number,y:number,dt:number,walking?:boolean)=>void;pose?:()=>Pose|null;drive?:()=>Drive|null;id?:string;hero?:HeroId}){
 const load=async(id:HeroId)=>{const all=await characters(),m:Meta=all[id]??all[DEFAULT_HERO];return {id,meta:m,atlas:await loadImage(atlasUrl(m))};};
 let hero=await load(isHero(o.hero)?o.hero:DEFAULT_HERO),{meta,atlas}=hero,wanted=hero.id;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;canvas.id=o.id??'world-hero';const own=!o.id;
 canvas.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';o.layer.append(canvas);
 let cell=meta.cell,pivot=cell.pivot;
 // One frame at atlas resolution: lit by the lightmap colour under the hero, or as a flat shadow silhouette.
 const lit=document.createElement('canvas'),flat=document.createElement('canvas');
 const fit=()=>{cell=meta.cell;pivot=cell.pivot;for(const b of [lit,flat]){b.width=cell.w;b.height=cell.h;}};fit();
 let objects:P[]=[],blockers:Column[]=[],bounds=new Map<P,number[]>();
 let x=SPAWN.x,y=SPAWN.y,state:'idle'|'move'='idle',t=0,gait=0,facing=1,back=false,vertical=false;
 let pose:Pose|null=null,tint='255,255,255',sampled=-1e9,origin={x:0,y:0,scale:1},k=0,box=[0,0,0,0],drawn='',lastMove=0;
 function blocked(px:number,py:number){
  if(!walkableGround(px,py))return true;
  for(const b of blockers)if(Math.abs(px-b.x)<b.w/2+RADIUS&&py>b.back-RADIUS*.5&&py<b.front+RADIUS*.5)return true;return false;
 }
 function setScene(list:P[]){
  objects=list.filter(p=>p.layer!=='ground');blockers=objects.filter(p=>p.opacity>=1).flatMap(p=>o.footprint(p).filter(c=>!('id' in p&&p.id==='gate'&&gatePassageColumn(c.x))));
  // Screen bounds of each upright, for picking the few that can overlap the hero.
  bounds=new Map(objects.map(p=>{const xs=[-p.width/2,p.width/2],ys=[-p.height*p.foot,p.height*(1-p.foot)],pts=xs.flatMap(lx=>ys.map(ly=>[p.x+lx,p.y+p.shear*lx+p.vertical*ly]));
   return [p,[Math.min(...pts.map(q=>q[0])),Math.min(...pts.map(q=>q[1])),Math.max(...pts.map(q=>q[0])),Math.max(...pts.map(q=>q[1]))]];}));
  drawn='';
 }
 // In front of a figure standing at (px, py): the front walls and gate always; a court sprite when the figure
 // stands behind the front edge of its footprint at the figure's column (or behind its pivot where no column reaches).
 function front(p:P,px:number,py:number){
  // The full animated gateway uses its own depth layer, so its current frame handles occlusion.
  if('id' in p&&p.id==='gate')return false;
  if(p.layer==='foreground')return py<p.y+12;if(p.layer!=='world')return false;
  let edge=-Infinity;for(const col of o.footprint(p))if(Math.abs(col.x-px)<=col.w/2+RADIUS)edge=Math.max(edge,col.front);
  return py<(edge>-Infinity?edge:p.y);
 }
 // Uprights in front of a figure at (px, py) whose screen bounds overlap its local box [left, top, right, bottom].
 const occluders=(px:number,py:number,b:number[])=>objects.filter(p=>{const r=bounds.get(p)!;return !(r[2]<px+b[0]||r[0]>px+b[2]||r[3]<py+b[1]||r[1]>py+b[3])&&front(p,px,py);});
 if(own)try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){x=saved.x;y=saved.y;}}catch{}
 // Six-view heroes turn to the view; the knight mirrors its diagonals and swings only on them.
 const view=()=>vertical?(back?'N':'S'):(back?'N':'S')+(facing>0?'E':'W');
 const clipName=()=>meta.views?`${pose?pose.clip:state}-${view()}`:pose?pose.clip:vertical?state+(back?'Up':'Down'):back?state+'Back':state;
 const frameIndex=()=>{const clip=meta.clips[clipName()],n=clip.frames.length,i=pose?Math.floor(pose.t*clip.fps/1000):state==='move'?Math.floor(gait*clip.fps):Math.floor(t*clip.fps/1000);return clip.frames[clip.loop?i%n:Math.min(i,n-1)];};
 // Arena facing rules: front/rear views only within 10 degrees of straight up/down (15 to leave), and dead
 // bands near each axis keep the previous quadrant so tiny slides along a wall never flip the art.
 function face(sx:number,sy:number){const l=Math.hypot(sx,sy);if(!l)return;vertical=Math.abs(sx)/l<Math.sin((vertical?15:10)*Math.PI/180);if(Math.abs(sy)/l>.15)back=sy<0;if(Math.abs(sx)/l>.15)facing=sx>0?1:-1;}
 // A driven hero moves once per frame to where it is told; its legs follow the distance covered.
 // Returns whether it moved, for the camera.
 function driven(s:Drive,dt:number){
  const dx=s.x-x,dy=s.y-y;x=s.x;y=s.y;pose=s.pose!==undefined?s.pose:o.pose?.()??null;
  if(s.look){facing=s.look.facing;back=s.look.back;vertical=s.look.vertical;}else if(s.face&&(s.face.x||s.face.y)&&!pose)face(s.face.x,s.face.y);
  if(pose){if(state!=='idle'){state='idle';t=0;}return !!(dx||dy);}
  t+=dt;if(!s.look&&!s.face&&(dx||dy))face(dx,dy);
  const progress=Math.hypot(dx,dy),moving=progress/(dt/1000)>(state==='move'?2:5);if(moving!==(state==='move')){state=moving?'move':'idle';t=0;}
  if(moving)gait+=progress/fullSpeed(dx,dy);
  return !!(dx||dy);
 }
 // Returns whether the hero is walking (or pushing against something), for the camera.
 function step(dt:number){
  // A swing, hit stun or death holds the hero in place.
  pose=o.pose?.()??null;if(pose){if(state!=='idle'){state='idle';t=0;}return false;}
  const d=o.direction(),m=Math.hypot(d.x,d.y);t+=dt;let progress=0;
  if(m>0){
   face(d.x,d.y);const r=walkStep(blocked,x,y,d,dt);if(r.progress)gait+=r.progress/fullSpeed(r.x-x,r.y-y);x=r.x;y=r.y;progress=r.progress;
  }
  const moving=progress/(dt/1000)>(state==='move'?2:5);if(moving!==(state==='move')){state=moving?'move':'idle';t=0;}
  if(moving)lastMove=performance.now();
  else if(own&&lastMove&&performance.now()-lastMove>400){lastMove=0;try{localStorage.setItem(KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}));}catch{}}
  return m>0||moving;
 }
 // The lightmap (ambient plus light pools) under the hero's feet; untinted while the world is unlit. Read
 // through a 1 px copy so the lightmap itself never gets flagged for CPU readback.
 const probe=Object.assign(document.createElement('canvas'),{width:1,height:1}).getContext('2d',{willReadFrequently:true})!;
 function sample(now:number){
  if(now-sampled<250)return;sampled=now;let next='255,255,255';
  if(o.surface.dataset.lighting!=='off'&&o.lightmap.dataset.origin){const [l,tp,r]=o.lightmap.dataset.origin.split(',').map(Number),px=Math.floor((x-l)*r),py=Math.floor((y-12-tp)*r);
   if(px>=0&&py>=0&&px<o.lightmap.width&&py<o.lightmap.height){probe.clearRect(0,0,1,1);probe.drawImage(o.lightmap,px,py,1,1,0,0,1,1);next=[...probe.getImageData(0,0,1,1).data.slice(0,3)].join();}}
  tint=next;
 }
 function render(){
  const s=o.sun(),f=meta.frames[frameIndex()],res=Math.min(3,Math.max(1,origin.scale*(devicePixelRatio||1)));
  const key=[hero.id,state,clipName(),f.x,f.y,facing,vertical,tint,s.dx,s.dy,s.wx,s.wy,s.alpha,res,Math.round(x*4),Math.round(y*4),objects.length].join();if(key===drawn)return;drawn=key;
  // Local bounds around the foot: the mirrored sprite cell plus the sun-cast silhouette.
  const half=Math.max(pivot.x,cell.w-pivot.x)*DISPLAY,top=-pivot.y*DISPLAY,bottom=(cell.h-pivot.y)*DISPLAY+8,H=-top;
  const ends=[-half,half].flatMap(w=>[0,H].map(h=>[w*s.wx+h*s.dx,w*s.wy+h*s.dy])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-8),...ends.map(e=>e[1]+8)];
  const b=[Math.floor(Math.min(...sxs))-4,Math.floor(Math.min(...sys))-4,Math.ceil(Math.max(...sxs))+4,Math.ceil(Math.max(...sys))+4];
  if(res!==k||b.some((v,i)=>v!==box[i])){k=res;box=b;canvas.width=Math.ceil((b[2]-b[0])*k);canvas.height=Math.ceil((b[3]-b[1])*k);canvas.style.width=b[2]-b[0]+'px';canvas.style.height=b[3]-b[1]+'px';}
  const frame=(target:HTMLCanvasElement)=>{const g=target.getContext('2d',{willReadFrequently:target===lit})!;g.globalCompositeOperation='copy';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,cell.w,cell.h);g.globalCompositeOperation='source-over';return g;};
  // Multiply per pixel: a multiply fill plus alpha mask would bleed the tint into the soft edges.
  const g=frame(lit);if(tint!=='255,255,255'){const [r,gr,bl]=tint.split(',').map(v=>Number(v)/255),img=g.getImageData(0,0,cell.w,cell.h),d=img.data;for(let i=0;i<d.length;i+=4){d[i]*=r;d[i+1]*=gr;d[i+2]*=bl;}g.putImageData(img,0,0);}
  const local=()=>c.setTransform(k,0,0,k,-box[0]*k,-box[1]*k),sprite=(src:HTMLCanvasElement)=>{c.scale((meta.views||vertical&&!pose?1:facing)*DISPLAY,DISPLAY);c.drawImage(src,-pivot.x,-pivot.y);};
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);local();
  // Sun shadow: each sprite point at height h above the foot lands h*(dx,dy) along the ground, like the
  // building solids, faded with the same alpha and colour; its width w lands w*(wx,wy) across the sun.
  if(s.alpha){const q=frame(flat);q.globalCompositeOperation='source-in';q.fillStyle='rgb(20,28,44)';q.fillRect(0,0,cell.w,cell.h);q.globalCompositeOperation='source-over';c.save();c.globalAlpha=s.alpha;c.filter='blur(1px)';c.transform(s.wx,s.wy,-s.dx,-s.dy,0,0);sprite(flat);c.restore();local();}
  c.save();sprite(lit);c.restore();
  const hidden=occluders(x,y,box);cutOut(c,hidden,x,y);
  Object.assign(canvas.dataset,{hero:hero.id,x:x.toFixed(1),y:y.toFixed(1),state,clip:clipName(),frame:String(frameIndex()),facing:String(facing),behind:String(hidden.length),tint});
 }
 function place(){canvas.style.transform=`translate3d(${origin.x+(x+box[0])*origin.scale}px,${origin.y+(y+box[1])*origin.scale}px,0) scale(${origin.scale})`;}
 let last=0;
 // Real time up to 120 ms per frame, sub-stepped so a slow phone walks at full speed without skipping through walls;
 // the camera then follows the own hero once per frame, and every frame so it can settle after the hero stops.
 let stopped=false;
 const loop=(now:number)=>{if(stopped)return;const span=last?Math.min(now-last,120):16;let walking=false;last=now;const s=o.drive?.();
  if(s)walking=driven(s,span);else for(let dt=span;dt>0;dt-=34)walking=step(Math.min(dt,34))||walking;
  if(own)o.follow(x,y,span,walking);sample(now);render();place();requestAnimationFrame(loop);};
 return {
  setScene,
  // Shared with the revenants (encounters.ts): the same footprints block them, the same uprights hide them
  // and the same sun casts their shadows.
  blocked,occluders,sun:o.sun,
  // Called by every camera frame with the screen position of the world origin.
  place(ox:number,oy:number,scale:number){origin={x:ox,y:oy,scale};render();place();},
  start(){if(blocked(x,y)&&!blocked(SPAWN.x,SPAWN.y)){x=SPAWN.x;y=SPAWN.y;}requestAnimationFrame(loop);},
  position:()=>({x,y}),
  // Combat turns the hero toward a target (screen direction) and returns them to the tent after a defeat.
  face,
  respawn(){x=SPAWN.x;y=SPAWN.y;back=false;vertical=false;facing=1;drawn='';o.follow(x,y,1e4);},
  // Testing hook: stand the hero anywhere they could walk to.
  teleport(px:number,py:number){if(blocked(px,py))return false;x=px;y=py;drawn='';o.follow(x,y,1e4);return true;},
  // Swap to another hero's atlas where the hero stands (the picker, or an ally who picked again).
  async setHero(id:HeroId){wanted=id;if(id===hero.id)return;const next=await load(id);if(wanted!==id)return;hero=next;({meta,atlas}=next);fit();drawn='';},
  hero:()=>hero.id,
  // A co-op ally who left the room.
  remove(){stopped=true;canvas.remove();}
 };
}
