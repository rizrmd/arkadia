import {unproject} from '../isometric';
import {walkableGround,gatePassageColumn} from './navigation';
import type {Sun} from './daylight';
import type {Walk} from './controls';
// The player's hero walking the court, drawn from the arena's character atlas (front/back diagonals mirrored,
// straight up/down views). The world is one pre-rastered surface, so the hero is its own small canvas over it:
// sprites standing in front of the hero cut their silhouettes out of that canvas (leaving a faint ghost, so the
// hero is never lost behind a wall), and their ground footprints (the cast-shadow solids from world-view.ts)
// block the way.
export type Column={x:number;w:number;back:number;front:number;height:number};
export type Placed={layer:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;opacity:number;image:HTMLImageElement};
type Clip={fps:number;loop:boolean;frames:number[]};
type Meta={image:string;revision?:string;cell:{w:number;h:number;pivot:{x:number;y:number}};clips:Record<string,Clip>;frames:{x:number;y:number;w:number;h:number}[]};
const BASE='/assets/characters/',KEY='arkadia.stronghold.hero';
// Atlas px -> world px. Matches the court props (a barrel is 27 px wide), not the arena's 1.1.
const DISPLAY=.48,SPEED=105,STRIDE=88*DISPLAY/1.1,RADIUS=9,SPAWN={x:577,y:640};
export async function createHero<P extends Placed>(o:{layer:HTMLElement;lightmap:HTMLCanvasElement;surface:HTMLElement;footprint:(p:P)=>Column[];sun:()=>Sun;direction:()=>Walk;follow:(x:number,y:number,dt:number)=>void}){
 const meta:Meta=(await (await fetch(BASE+'manifest.json')).json()).characters.hero,atlas=new Image();
 atlas.src=BASE+meta.image+(meta.revision?`?v=${encodeURIComponent(meta.revision)}`:'');await atlas.decode();
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;canvas.id='world-hero';
 canvas.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;pointer-events:none';o.layer.append(canvas);
 const {cell}=meta,pivot=cell.pivot;
 // One frame at atlas resolution: lit by the lightmap colour under the hero, or as a flat shadow silhouette.
 const lit=document.createElement('canvas'),flat=document.createElement('canvas');for(const b of [lit,flat]){b.width=cell.w;b.height=cell.h;}
 let objects:P[]=[],blockers:Column[]=[],bounds=new Map<P,number[]>();
 let x=SPAWN.x,y=SPAWN.y,state:'idle'|'move'='idle',t=0,stride=0,facing=1,back=false,vertical=false;
 let tint='255,255,255',sampled=-1e9,origin={x:0,y:0,scale:1},k=0,box=[0,0,0,0],drawn='',lastMove=0;
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
 // In front of the hero: the front walls and gate always; a court sprite when the hero stands behind the
 // front edge of its footprint at the hero's column (or behind its pivot where no column reaches).
 function front(p:P){
  if(p.layer==='foreground')return y<p.y+12;if(p.layer!=='world')return false;
  let edge=-Infinity;for(const col of o.footprint(p))if(Math.abs(col.x-x)<=col.w/2+RADIUS)edge=Math.max(edge,col.front);
  return y<(edge>-Infinity?edge:p.y);
 }
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){x=saved.x;y=saved.y;}}catch{}
 const clipName=()=>vertical?state+(back?'Up':'Down'):back?state+'Back':state;
 const frameIndex=()=>{const clip=meta.clips[clipName()],n=clip.frames.length,i=state==='move'?Math.floor(stride*n):Math.floor(t*clip.fps/1000);return clip.frames[clip.loop?i%n:Math.min(i,n-1)];};
 // Arena facing rules: front/rear views only within 10 degrees of straight up/down (15 to leave), and dead
 // bands near each axis keep the previous quadrant so tiny slides along a wall never flip the art.
 function face(sx:number,sy:number){const l=Math.hypot(sx,sy);if(!l)return;vertical=Math.abs(sx)/l<Math.sin((vertical?15:10)*Math.PI/180);if(Math.abs(sy)/l>.15)back=sy<0;if(Math.abs(sx)/l>.15)facing=sx>0?1:-1;}
 function step(dt:number){
  const d=o.direction(),m=Math.hypot(d.x,d.y);t+=dt;let progress=0;
  if(m>0){
   face(d.x,d.y);const v=SPEED*dt/1000,dx=d.x*v,dy=d.y*v,stuck=blocked(x,y);
   // Slide along whatever blocks the full step; a hero already overlapping a footprint may walk out.
   for(const [mx,my] of [[dx,dy],[dx,0],[0,dy]])if(mx||my){if(stuck||!blocked(x+mx,y+my)){x+=mx;y+=my;progress=(mx*d.x+my*d.y)/m;break;}}
  }
  const moving=progress/(dt/1000)>(state==='move'?2:5);if(moving!==(state==='move')){state=moving?'move':'idle';t=0;}
  if(moving){stride+=progress/STRIDE;lastMove=performance.now();}
  else if(lastMove&&performance.now()-lastMove>400){lastMove=0;try{localStorage.setItem(KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}));}catch{}}
  if(m>0||moving)o.follow(x,y,dt);
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
  const key=[state,clipName(),f.x,f.y,facing,vertical,tint,s.dx,s.dy,s.alpha,res,Math.round(x*4),Math.round(y*4),objects.length].join();if(key===drawn)return;drawn=key;
  // Local bounds around the foot: the mirrored sprite cell plus the sun-cast silhouette.
  const half=Math.max(pivot.x,cell.w-pivot.x)*DISPLAY,top=-pivot.y*DISPLAY,bottom=(cell.h-pivot.y)*DISPLAY+8,H=-top;
  const sxs=[-half,half,-half+H*s.dx,half+H*s.dx],sys=[top,bottom,H*s.dy-8,H*s.dy+8];
  const b=[Math.floor(Math.min(...sxs))-4,Math.floor(Math.min(...sys))-4,Math.ceil(Math.max(...sxs))+4,Math.ceil(Math.max(...sys))+4];
  if(res!==k||b.some((v,i)=>v!==box[i])){k=res;box=b;canvas.width=Math.ceil((b[2]-b[0])*k);canvas.height=Math.ceil((b[3]-b[1])*k);canvas.style.width=b[2]-b[0]+'px';canvas.style.height=b[3]-b[1]+'px';}
  const frame=(target:HTMLCanvasElement)=>{const g=target.getContext('2d',{willReadFrequently:target===lit})!;g.globalCompositeOperation='copy';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,cell.w,cell.h);g.globalCompositeOperation='source-over';return g;};
  // Multiply per pixel: a multiply fill plus alpha mask would bleed the tint into the soft edges.
  const g=frame(lit);if(tint!=='255,255,255'){const [r,gr,bl]=tint.split(',').map(v=>Number(v)/255),img=g.getImageData(0,0,cell.w,cell.h),d=img.data;for(let i=0;i<d.length;i+=4){d[i]*=r;d[i+1]*=gr;d[i+2]*=bl;}g.putImageData(img,0,0);}
  const local=()=>c.setTransform(k,0,0,k,-box[0]*k,-box[1]*k),sprite=(src:HTMLCanvasElement)=>{c.scale((vertical?1:facing)*DISPLAY,DISPLAY);c.drawImage(src,-pivot.x,-pivot.y);};
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);local();
  // Sun shadow: each sprite point at height h above the foot lands h*(dx,dy) along the ground, like the
  // building solids, faded with the same alpha and colour.
  if(s.alpha){const q=frame(flat);q.globalCompositeOperation='source-in';q.fillStyle='rgb(20,28,44)';q.fillRect(0,0,cell.w,cell.h);q.globalCompositeOperation='source-over';c.save();c.globalAlpha=s.alpha;c.filter='blur(1px)';c.transform(1,0,-s.dx,-s.dy,0,0);sprite(flat);c.restore();local();}
  c.save();sprite(lit);c.restore();
  c.globalCompositeOperation='destination-out';let hidden=0;
  for(const p of objects){const r=bounds.get(p)!;if(r[2]<x+box[0]||r[0]>x+box[2]||r[3]<y+box[1]||r[1]>y+box[3]||!front(p))continue;hidden++;
   c.save();c.globalAlpha=.72;c.translate(p.x-x,p.y-y);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();}
  c.globalCompositeOperation='source-over';
  Object.assign(canvas.dataset,{x:x.toFixed(1),y:y.toFixed(1),state,clip:clipName(),frame:String(frameIndex()),facing:String(facing),behind:String(hidden),tint});
 }
 function place(){canvas.style.transform=`translate3d(${origin.x+(x+box[0])*origin.scale}px,${origin.y+(y+box[1])*origin.scale}px,0) scale(${origin.scale})`;}
 let last=0;
 // Real time up to 120 ms per frame, sub-stepped so a slow phone walks at full speed without skipping through walls.
 const loop=(now:number)=>{let dt=last?Math.min(now-last,120):16;last=now;for(;dt>0;dt-=34)step(Math.min(dt,34));sample(now);render();place();requestAnimationFrame(loop);};
 return {
  setScene,
  // Called by every camera frame with the screen position of the world origin.
  place(ox:number,oy:number,scale:number){origin={x:ox,y:oy,scale};render();place();},
  start(){if(blocked(x,y)&&!blocked(SPAWN.x,SPAWN.y)){x=SPAWN.x;y=SPAWN.y;}requestAnimationFrame(loop);},
  position:()=>({x,y})
 };
}
