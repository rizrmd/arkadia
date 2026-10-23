import type {Container} from 'pixi.js';
import {walkableGround,gatePassageColumn,gateTowerFront} from './navigation';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {createCanvasSprite,loadImage} from '../app/loader';
import {walkStep,fullSpeed} from './net/movement';
import {characters,atlasUrl,DEFAULT_HERO,isHero,type HeroId} from './heroes';

export type Column={x:number;w:number;back:number;front:number;height:number};
export type Pose={clip:string;t:number};

export function cutOut(c:CanvasRenderingContext2D,list:readonly Placed[],px:number,py:number){
 c.globalCompositeOperation='destination-out';
 for(const p of list){c.save();c.globalAlpha=.68;c.translate(p.x-px,p.y-py);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(p.occluder??p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();}
 c.globalCompositeOperation='source-over';
}
type FrameShadowProfile={base:Float32Array;vc:number;px:Uint8Array;py:Uint8Array};
const shadowProfiles=new Map<string,FrameShadowProfile>();
const profileCanvas=document.createElement('canvas'),profileCtx=profileCanvas.getContext('2d',{willReadFrequently:true})!;
const shadeCanvas=document.createElement('canvas'),shadeCtx=shadeCanvas.getContext('2d')!;
let shadeData:ImageData|null=null,shadeOut:Uint32Array|null=null;
function frameShadowProfile(atlas:HTMLImageElement,f:{x:number;y:number;w:number;h:number},cell:{w:number;h:number;pivot:{x:number;y:number}}):FrameShadowProfile{
 const key=`${atlas.src}:${f.x},${f.y},${cell.w},${cell.h}`;let prof=shadowProfiles.get(key);if(prof)return prof;
 if(profileCanvas.width<cell.w||profileCanvas.height<cell.h){profileCanvas.width=Math.max(profileCanvas.width,cell.w);profileCanvas.height=Math.max(profileCanvas.height,cell.h);}
 profileCtx.clearRect(0,0,cell.w,cell.h);profileCtx.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,cell.w,cell.h);
 const rgba=profileCtx.getImageData(0,0,cell.w,cell.h).data,bot=new Int16Array(cell.w).fill(-1);let maxB=-1;
 for(let x=0;x<cell.w;x++)for(let y=cell.h-1;y>=0;y--)if(rgba[(y*cell.w+x)*4+3]>32){bot[x]=y;if(y>maxB)maxB=y;break;}
 const base=new Float32Array(cell.w).fill(maxB>0?maxB:cell.pivot.y),pts:[number,number][]=[];
 if(maxB>=0){
  for(let x=0;x<cell.w;x++)if(bot[x]>=maxB-14)pts.push([x,bot[x]]);
  if(pts.length>=2){
   const hull:[number,number][]=[];
   for(const p of pts){
    while(hull.length>=2){const a=hull[hull.length-2],b=hull[hull.length-1];if((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])<=0)hull.pop();else break;}
    hull.push(p);
   }
   for(let x=0;x<=hull[0][0];x++)base[x]=hull[0][1];
   for(let k=0;k<hull.length-1;k++){const [x0,y0]=hull[k],[x1,y1]=hull[k+1];for(let x=x0;x<=x1;x++)base[x]=y0+(y1-y0)*(x-x0)/(x1-x0||1);}
   for(let x=hull[hull.length-1][0];x<cell.w;x++)base[x]=hull[hull.length-1][1];
  }
 }
 const vc=pts.length?(pts[0][1]+pts[pts.length-1][1])*.5-cell.pivot.y:0,xs:number[]=[],ys:number[]=[];
 for(let y=0;y<cell.h;y++)for(let x=0;x<cell.w;x++)if(rgba[(y*cell.w+x)*4+3]>32){xs.push(x);ys.push(y);}
 prof={base,vc,px:new Uint8Array(xs),py:new Uint8Array(ys)};shadowProfiles.set(key,prof);return prof;
}

export function drawFigureShadow(c:CanvasRenderingContext2D,atlas:HTMLImageElement,f:{x:number;y:number;w:number;h:number},cell:{w:number;h:number;pivot:{x:number;y:number}},s:Sun,dir:number){
 if(!s.alpha)return;
 const {base,vc,px,py}=frameShadowProfile(atlas,f,cell),pivot=cell.pivot,pad=8;
 const sw=Math.ceil(cell.w+cell.h*Math.abs(s.dx)+pad*2),sh=Math.ceil(cell.h+cell.h*Math.abs(s.dy)+pad*2);
 const ox=Math.ceil(Math.max(pivot.x,cell.w-pivot.x)+(s.dx<0?cell.h*-s.dx:0)+pad),oy=Math.ceil(pivot.y+(s.dy<0?cell.h*-s.dy:0)+pad);
 if(shadeCanvas.width<sw||shadeCanvas.height<sh||!shadeData){
  shadeCanvas.width=Math.max(shadeCanvas.width,sw);shadeCanvas.height=Math.max(shadeCanvas.height,sh);
  shadeData=shadeCtx.createImageData(shadeCanvas.width,shadeCanvas.height);shadeOut=new Uint32Array(shadeData.data.buffer);
 }
 const stride=shadeCanvas.width,out=shadeOut!,COLOR=0xff2c1c14;
 for(let y=0;y<sh;y++)out.fill(0,y*stride,y*stride+sw);
 for(let i=0,n=px.length;i<n;i++){
  const x=px[i],y=py[i],u=dir*(x-pivot.x),vf=base[x]-pivot.y,ht=Math.max(0,base[x]-y),tau=Math.min(1,Math.max(0,(ht-3)/26));
  const sx=Math.round((1-tau)*u+tau*u*s.wx+ht*s.dx)+ox,sy=Math.round((1-tau)*vf+tau*(vc+u*s.wy)+ht*s.dy)+oy;
  if(sx>=0&&sx+1<sw&&sy>=0&&sy+1<sh){const idx=sy*stride+sx;out[idx]=COLOR;out[idx+1]=COLOR;out[idx+stride]=COLOR;out[idx+stride+1]=COLOR;}
 }
 shadeCtx.putImageData(shadeData,0,0,0,0,sw,sh);
 c.save();c.globalAlpha=s.alpha;c.filter='blur(1px)';c.scale(DISPLAY,DISPLAY);c.drawImage(shadeCanvas,0,0,sw,sh,-ox,-oy,sw,sh);c.restore();
}

export type Drive={x:number;y:number;pose?:Pose|null;face?:Walk|null;look?:{facing:number;back:boolean;vertical:boolean}|null};
export type Placed={layer:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;opacity:number;image:HTMLImageElement;occluder?:HTMLCanvasElement};
type Clip={fps:number;loop:boolean;frames:number[];strideScale?:number};
type Meta={image:string;revision?:string;views?:string[];cell:{w:number;h:number;pivot:{x:number;y:number}};clips:Record<string,Clip>;frames:{x:number;y:number;w:number;h:number}[]};
const KEY='arkadia.stronghold.hero';
export const DISPLAY=.48;const RADIUS=9,SPAWN={x:590,y:420};

export async function createHero<P extends Placed>(o:{layer:Container;lightmap:HTMLCanvasElement;surface:HTMLElement;footprint:(p:P)=>Column[];sun:()=>Sun;direction:()=>Walk;follow:(x:number,y:number,dt:number,walking?:boolean)=>void;pose?:()=>Pose|null;drive?:()=>Drive|null;id?:string;hero?:HeroId}){
 const load=async(id:HeroId)=>{const all=await characters(),m:Meta=all[id]??all[DEFAULT_HERO];return {id,meta:m,atlas:await loadImage(atlasUrl(m))};};
 let hero=await load(isHero(o.hero)?o.hero:DEFAULT_HERO),{meta,atlas}=hero,wanted=hero.id;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;canvas.id=o.id??'world-hero';const own=!o.id;if(own)(window as any).__WORLD_HERO__=canvas;
 const heroView=createCanvasSprite(canvas);
 heroView.sprite.zIndex=30;
 o.layer.addChild(heroView.sprite);

 let cell=meta.cell,pivot=cell.pivot;
 const lit=document.createElement('canvas');
 const fit=()=>{cell=meta.cell;pivot=cell.pivot;lit.width=cell.w;lit.height=cell.h;};fit();
 let objects:P[]=[],blockers:Column[]=[],bounds=new Map<P,number[]>();
 let x=SPAWN.x,y=SPAWN.y,state:'idle'|'move'='idle',t=0,gait=0,facing=1,back=false,vertical=false;
 let pose:Pose|null=null,tint='255,255,255',sampled=-1e9,origin={x:0,y:0,scale:1},k=0,box=[0,0,0,0],drawn='',lastMove=0;
 function blocked(px:number,py:number){
  if(!walkableGround(px,py))return true;
  for(const b of blockers)if(Math.abs(px-b.x)<b.w/2+RADIUS&&py>b.back-RADIUS*.5&&py<b.front+RADIUS*.5)return true;return false;
 }
 function setScene(list:P[]){
  objects=list.filter(p=>p.layer!=='ground');blockers=objects.filter(p=>p.opacity>=1).flatMap(p=>o.footprint(p).filter(c=>!('id' in p&&p.id==='gate'&&gatePassageColumn(c.x))));
  bounds=new Map(objects.map(p=>{const xs=[-p.width/2,p.width/2],ys=[-p.height*p.foot,p.height*(1-p.foot)],pts=xs.flatMap(lx=>ys.map(ly=>[p.x+lx,p.y+p.shear*lx+p.vertical*ly]));
   return [p,[Math.min(...pts.map(q=>q[0])),Math.min(...pts.map(q=>q[1])),Math.max(...pts.map(q=>q[0])),Math.max(...pts.map(q=>q[1]))]];}));
  drawn='';
 }
 function front(p:P,px:number,py:number){
  if('id' in p&&p.id==='gate'){const d=Math.abs(px-577);return py<(d<36?775:gateTowerFront(Math.min(135,d)));}
  if(p.layer==='foreground')return py<p.y+12;if(p.layer!=='world')return false;
  let edge=-Infinity;for(const col of o.footprint(p))if(Math.abs(col.x-px)<=col.w/2+RADIUS)edge=Math.max(edge,col.front);
  return py<(edge>-Infinity?edge:p.y);
 }
 const occluders=(px:number,py:number,b:number[])=>objects.filter(p=>{const r=bounds.get(p)!;return !(r[2]<px+b[0]||r[0]>px+b[2]||r[3]<py+b[1]||r[1]>py+b[3])&&front(p,px,py);});
 if(own)try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){x=saved.x;y=saved.y;}}catch{}
 const view=()=>vertical?(back?'N':'S'):(back?'N':'S')+(facing>0?'E':'W');
 const clipName=()=>meta.views?`${pose?pose.clip:state}-${view()}`:pose?pose.clip:vertical?state+(back?'Up':'Down'):back?state+'Back':state;
 const frameIndex=()=>{const clip=meta.clips[clipName()],n=clip.frames.length,i=pose?Math.floor(pose.t*clip.fps/1000):state==='move'?Math.floor(gait*clip.fps):Math.floor(t*clip.fps/1000);return clip.frames[clip.loop?i%n:Math.min(i,n-1)];};
 function face(sx:number,sy:number){const l=Math.hypot(sx,sy);if(!l)return;vertical=Math.abs(sx)/l<Math.sin((vertical?15:10)*Math.PI/180);back=Math.abs(sy)/l>.15?sy<0:false;if(Math.abs(sx)/l>.15)facing=sx>0?1:-1;}
 function driven(s:Drive,dt:number){
  const dx=s.x-x,dy=s.y-y;x=s.x;y=s.y;pose=s.pose!==undefined?s.pose:o.pose?.()??null;
  if(s.look){facing=s.look.facing;back=s.look.back;vertical=s.look.vertical;}else if(s.face&&(s.face.x||s.face.y)&&!pose)face(s.face.x,s.face.y);
  if(pose){if(state!=='idle'){state='idle';t=0;}return !!(dx||dy);}
  t+=dt;if(!s.look&&!s.face&&(dx||dy))face(dx,dy);
  const progress=Math.hypot(dx,dy),moving=progress/(dt/1000)>(state==='move'?2:5);if(moving!==(state==='move')){state=moving?'move':'idle';t=0;}
  if(moving)gait+=progress/fullSpeed(dx,dy);
  return !!(dx||dy);
 }
 function step(dt:number){
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
 const probe=Object.assign(document.createElement('canvas'),{width:1,height:1}).getContext('2d',{willReadFrequently:true})!;
 function sample(now:number){
  if(own||now-sampled<250)return;sampled=now;let next='255,255,255';
  if(o.surface.dataset.lighting!=='off'&&o.lightmap.dataset.origin){const [l,tp,r]=o.lightmap.dataset.origin.split(',').map(Number),px=Math.floor((x-l)*r),py=Math.floor((y-12-tp)*r);
   if(px>=0&&py>=0&&px<o.lightmap.width&&py<o.lightmap.height){probe.clearRect(0,0,1,1);probe.drawImage(o.lightmap,px,py,1,1,0,0,1,1);next=[...probe.getImageData(0,0,1,1).data.slice(0,3)].join();}}
  tint=next;
 }
 function render(){
  const s=o.sun(),f=meta.frames[frameIndex()],res=Math.min(3,Math.max(1,origin.scale*(devicePixelRatio||1)));
  const night=own?Math.max(0,1-s.alpha/.4):0;
  const half=Math.max((pivot.x>cell.w-pivot.x?pivot.x:cell.w-pivot.x)*DISPLAY,night?48:0),top=-pivot.y*DISPLAY-(night?14:0),bottom=(cell.h-pivot.y)*DISPLAY+(night?20:8),H=- pivot.y*DISPLAY;
  const ends=[-half,half].flatMap(w=>[0,H].flatMap(h=>[[w+h*s.dx,h*s.dy],[w*s.wx+h*s.dx,w*s.wy+h*s.dy]])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-8),...ends.map(e=>e[1]+8)];
  const b=[Math.floor(Math.min(...sxs))-4,Math.floor(Math.min(...sys))-4,Math.ceil(Math.max(...sxs))+4,Math.ceil(Math.max(...sys))+4];
  const hidden=occluders(x,y,b),at=x.toFixed(1)+','+y.toFixed(1);if(canvas.dataset.x+','+canvas.dataset.y!==at)Object.assign(canvas.dataset,{x:x.toFixed(1),y:y.toFixed(1)});
  const key=[hero.id,state,clipName(),f.x,f.y,facing,vertical,tint,night.toFixed(2),s.dx,s.dy,s.wx,s.wy,s.alpha,res,b,hidden.length?hidden.map(p=>p.x+':'+p.y+':'+(p.occluder?.dataset.frame??'')).join()+'@'+Math.round(x*4)+','+Math.round(y*4):'',objects.length].join();if(key===drawn)return;drawn=key;
  if(res!==k||b.some((v,i)=>v!==box[i])){k=res;box=b;canvas.width=Math.ceil((b[2]-b[0])*k);canvas.height=Math.ceil((b[3]-b[1])*k);}
  const frame=(target:HTMLCanvasElement)=>{const g=target.getContext('2d',{willReadFrequently:target===lit})!;g.globalCompositeOperation='copy';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,cell.w,cell.h);g.globalCompositeOperation='source-over';return g;};
  const g=frame(lit);if(tint!=='255,255,255'){const [r,gr,bl]=tint.split(',').map(v=>Number(v)/255),img=g.getImageData(0,0,cell.w,cell.h),d=img.data;for(let i=0;i<d.length;i+=4){d[i]*=r;d[i+1]*=gr;d[i+2]*=bl;}g.putImageData(img,0,0);}
  else if(night>0){const img=g.getImageData(0,0,cell.w,cell.h),d=img.data;for(let i=0;i<d.length;i+=4)if(d[i+3]){const lum=.299*d[i]+.587*d[i+1]+.114*d[i+2],k=1+.18*night*Math.min(1,Math.max(0,(lum-28)/70));d[i]=Math.min(255,d[i]*k);d[i+1]=Math.min(255,d[i+1]*(1+(k-1)*.92));d[i+2]=Math.min(255,d[i+2]*(1+(k-1)*.78));}g.putImageData(img,0,0);}
  const dir=meta.views?(vertical?1:facing):(vertical&&!pose?1:facing);
  const local=()=>c.setTransform(k,0,0,k,-box[0]*k,-box[1]*k),sprite=(src:HTMLCanvasElement)=>{c.scale(dir*DISPLAY,DISPLAY);c.drawImage(src,-pivot.x,-pivot.y);};
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);local();
  if(night>0){
   c.save();c.translate(0,-2);c.scale(1,.52);const pg=c.createRadialGradient(0,0,2,0,0,40);pg.addColorStop(0,`rgba(255,206,136,${(.24*night).toFixed(3)})`);pg.addColorStop(.55,`rgba(255,178,102,${(.1*night).toFixed(3)})`);pg.addColorStop(1,'rgba(255,160,85,0)');c.fillStyle=pg;c.fillRect(-40,-40,80,80);c.restore();
  }
  drawFigureShadow(c,atlas,f,cell,s,dir);
  c.save();sprite(lit);c.restore();
  cutOut(c,hidden,x,y);
  heroView.sync((box[2]-box[0])*origin.scale,(box[3]-box[1])*origin.scale);
  Object.assign(canvas.dataset,{hero:hero.id,state,clip:clipName(),frame:String(frameIndex()),facing:String(facing),behind:String(hidden.length),tint,night:night.toFixed(2)});
 }
 function place(){
  heroView.sprite.position.set(origin.x+(x+box[0])*origin.scale,origin.y+(y+box[1])*origin.scale);
  heroView.sprite.width=(box[2]-box[0])*origin.scale;
  heroView.sprite.height=(box[3]-box[1])*origin.scale;
 }
 let last=0;
 let stopped=false;
 const loop=(now:number)=>{if(stopped)return;const span=last?Math.min(now-last,120):16;let walking=false;last=now;const s=o.drive?.();
  if(s)walking=driven(s,span);else for(let dt=span;dt>0;dt-=34)walking=step(Math.min(dt,34))||walking;
  if(own)o.follow(x,y,span,walking);sample(now);render();place();requestAnimationFrame(loop);};
 return {
  canvas,
  sprite:heroView.sprite,
  setScene,
  blocked,occluders,sun:o.sun,
  place(ox:number,oy:number,scale:number){origin={x:ox,y:oy,scale};render();place();},
  start(){if(blocked(x,y)&&!blocked(SPAWN.x,SPAWN.y)){x=SPAWN.x;y=SPAWN.y;}requestAnimationFrame(loop);},
  position:()=>({x,y}),
  face,
  respawn(){x=SPAWN.x;y=SPAWN.y;back=false;vertical=false;facing=1;drawn='';o.follow(x,y,1e4);},
  teleport(px:number,py:number){if(blocked(px,py))return false;x=px;y=py;drawn='';o.follow(x,y,1e4);return true;},
  async setHero(id:HeroId){wanted=id;if(id===hero.id)return;const next=await load(id);if(wanted!==id)return;hero=next;({meta,atlas}=next);fit();drawn='';},
  hero:()=>hero.id,
  remove(){stopped=true;heroView.sprite.removeFromParent();heroView.sprite.destroy();}
 };
}
