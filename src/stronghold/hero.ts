import type {Container} from 'pixi.js';
import {walkableGround,gatePassageColumn,gateTowerFront} from './navigation';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {createCanvasSprite,loadImage} from '../app/loader';
import {walkStep,fullSpeed} from './net/movement';
import {STRONGHOLD} from './prefabs/stronghold';
import {characters,atlasUrl,DEFAULT_HERO,HEROES,isHero,type HeroId} from './heroes';
import {measureTracelogPhase} from './tracelog';
import {is3dHeroEnabled,get3dHeroRenderer} from './hero-3d';

export type Column={x:number;w:number;back:number;front:number;height:number};
export type Pose={clip:string;t:number};
export type AtlasSource=HTMLImageElement|HTMLCanvasElement;
function atlasSrcKey(a:AtlasSource):string{
 return a instanceof HTMLImageElement?a.src:(a.dataset.src||'canvas');
}

const cutoutCache=new Map<string,HTMLCanvasElement>();
function getCutoutSource(p:Placed):CanvasImageSource{
 if(p.occluder)return p.occluder;
 const cw=Math.max(1,Math.ceil(p.width)),ch=Math.max(1,Math.ceil(p.height));
 const key=`${p.image.src}:${cw}x${ch}`;
 let can=cutoutCache.get(key);
 if(can)return can;
 if(!p.image.complete||!p.image.naturalWidth)return p.image;
 can=document.createElement('canvas');can.width=cw;can.height=ch;
 can.getContext('2d')!.drawImage(p.image,0,0,cw,ch);
 if(cutoutCache.size>=64)cutoutCache.delete(cutoutCache.keys().next().value!);
 cutoutCache.set(key,can);
 return can;
}
export function cutOut(c:CanvasRenderingContext2D,list:readonly Placed[],px:number,py:number){
 c.globalCompositeOperation='destination-out';
 for(const p of list){c.save();c.globalAlpha=.68;c.translate(p.x-px,p.y-py);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(getCutoutSource(p),-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();}
 c.globalCompositeOperation='source-over';
}
type FrameShadowProfile={base:Float32Array;bot:Int16Array;vc:number;px:Uint8Array;py:Uint8Array;alpha:Uint8Array};
const shadowProfiles=new Map<string,FrameShadowProfile>();
type AlphaMask={w:number;h:number;data:Uint8Array;bot:Float32Array};
const alphaMasks=new Map<string,AlphaMask>();
const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d',{willReadFrequently:true})!;
function getAlphaMask(p:Placed):AlphaMask|null{
 const src=p.occluder??p.image;
 const sw=src instanceof HTMLCanvasElement?src.width:src.naturalWidth||src.width;
 const sh=src instanceof HTMLCanvasElement?src.height:src.naturalHeight||src.height;
 if(!sw||!sh)return null;
 const key=p.occluder?`gate:${Math.round(Number(p.occluder.dataset.frame??0)/8)}`:`img:${p.image.src}`;
 let m=alphaMasks.get(key);if(m)return m;
 const mw=Math.min(160,sw),mh=Math.max(1,Math.round(sh*(mw/sw)));
 if(maskCanvas.width<mw||maskCanvas.height<mh){maskCanvas.width=Math.max(maskCanvas.width,mw);maskCanvas.height=Math.max(maskCanvas.height,mh);}
 maskCtx.clearRect(0,0,mw,mh);maskCtx.drawImage(src,0,0,mw,mh);
 const rgba=maskCtx.getImageData(0,0,mw,mh).data,data=new Uint8Array(mw*mh),bot=new Float32Array(mw).fill(-1);
 for(let i=0,n=mw*mh;i<n;i++)data[i]=rgba[i*4+3];
 for(let ix=0;ix<mw;ix++)for(let iy=mh-1;iy>=0;iy--)if(data[iy*mw+ix]>48){bot[ix]=(iy+1)/mh;break;}
 m={w:mw,h:mh,data,bot};alphaMasks.set(key,m);return m;
}
function samplePlacedAlpha(p:Placed,wx:number,wy:number):number{
 if(!p.vertical||!p.width||!p.height)return 0;
 const lx=wx-p.x,ly=(wy-p.y-p.shear*lx)/p.vertical;
 const u=(lx+p.width*.5)/p.width,v=(ly+p.height*p.foot)/p.height;
 if(u<0||u>=1||v<0||v>=1)return 0;
 const m=getAlphaMask(p);if(!m)return 0;
 return m.data[Math.min(m.h-1,Math.floor(v*m.h))*m.w+Math.min(m.w-1,Math.floor(u*m.w))]/255;
}
type AtlasAlphaSheet={w:number;h:number;sx:number;sy:number;alpha:Uint8Array};
const atlasAlphaSheets=new Map<string,AtlasAlphaSheet>();
const alphaExtractCanvas=document.createElement('canvas'),alphaExtractCtx=alphaExtractCanvas.getContext('2d',{willReadFrequently:true})!;
export function prewarmAtlasAlpha(src:AtlasSource):AtlasAlphaSheet{
 const key=atlasSrcKey(src);
 let sheet=atlasAlphaSheets.get(key);if(sheet)return sheet;
 const sw=src instanceof HTMLCanvasElement?src.width:src.naturalWidth||src.width||1;
 const sh=src instanceof HTMLCanvasElement?src.height:src.naturalHeight||src.height||1;
 const k=Math.min(1,1600/Math.max(sw,sh));
 const w=Math.max(1,Math.round(sw*k)),h=Math.max(1,Math.round(sh*k));
 alphaExtractCanvas.width=w;alphaExtractCanvas.height=h;
 alphaExtractCtx.clearRect(0,0,w,h);
 alphaExtractCtx.drawImage(src,0,0,w,h);
 const rgba=alphaExtractCtx.getImageData(0,0,w,h).data;
 const alpha=new Uint8Array(w*h);
 for(let i=0,n=w*h;i<n;i++)alpha[i]=rgba[i*4+3];
 // Release large temporary backing store immediately after extracting 1-byte alpha.
 alphaExtractCanvas.width=1;alphaExtractCanvas.height=1;
 sheet={w,h,sx:w/sw,sy:h/sh,alpha};
 atlasAlphaSheets.set(key,sheet);
 return sheet;
}
const profileCanvas=document.createElement('canvas'),profileCtx=profileCanvas.getContext('2d',{willReadFrequently:true})!;
const shadeCanvas=document.createElement('canvas'),shadeCtx=shadeCanvas.getContext('2d')!;
let shadeData:ImageData|null=null,shadeOut:Uint32Array|null=null;
function frameShadowProfile(atlas:AtlasSource,f:{x:number;y:number;w:number;h:number},cell:{w:number;h:number;pivot:{x:number;y:number}}):FrameShadowProfile{
 const srcKey=atlasSrcKey(atlas);
 const key=`${srcKey}:${f.x},${f.y},${cell.w},${cell.h}`;let prof=shadowProfiles.get(key);if(prof)return prof;
 const bot=new Int16Array(cell.w).fill(-1),alpha=new Uint8Array(cell.w*cell.h);
 const sheet=atlasAlphaSheets.get(srcKey)??prewarmAtlasAlpha(atlas);
 if(sheet){
  const {w:sw,h:sh,sx,sy,alpha:sAlpha}=sheet;
  const rx=f.w/cell.w,ry=f.h/cell.h;
  for(let y=0;y<cell.h;y++){
   const ay=Math.min(sh-1,Math.max(0,Math.floor((f.y+(y+.5)*ry)*sy)))*sw;
   const row=y*cell.w;
   for(let x=0;x<cell.w;x++){
    const ax=Math.min(sw-1,Math.max(0,Math.floor((f.x+(x+.5)*rx)*sx)));
    alpha[row+x]=sAlpha[ay+ax];
   }
  }
 }else{
  if(profileCanvas.width<cell.w||profileCanvas.height<cell.h){profileCanvas.width=Math.max(profileCanvas.width,cell.w);profileCanvas.height=Math.max(profileCanvas.height,cell.h);}
  profileCtx.clearRect(0,0,cell.w,cell.h);profileCtx.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,cell.w,cell.h);
  const rgba=profileCtx.getImageData(0,0,cell.w,cell.h).data;
  for(let i=0,n=alpha.length;i<n;i++)alpha[i]=rgba[i*4+3];
 }
 const footHalf=Math.ceil(cell.w*.22);let maxFootB=-1,maxAllB=-1;
 for(let x=0;x<cell.w;x++)for(let y=cell.h-1;y>=0;y--)if(alpha[y*cell.w+x]>32){
  bot[x]=y;if(y>maxAllB)maxAllB=y;
  if(Math.abs(x-cell.pivot.x)<=footHalf&&y>maxFootB)maxFootB=y;
  break;
 }
 const maxB=maxFootB>0?maxFootB:maxAllB;
 const base=new Float32Array(cell.w).fill(maxB>0?maxB:cell.pivot.y),pts:[number,number][]=[];
 if(maxB>=0){
  for(let x=0;x<cell.w;x++)if(Math.abs(x-cell.pivot.x)<=footHalf&&bot[x]>=maxB-5)pts.push([x,bot[x]]);
  if(pts.length<2){pts.length=0;for(let x=0;x<cell.w;x++)if(bot[x]>=maxB-5)pts.push([x,bot[x]]);}
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
 for(let y=0;y<cell.h;y++)for(let x=0;x<cell.w;x++)if(alpha[y*cell.w+x]>32){xs.push(x);ys.push(y);}
 prof={base,bot,vc,px:new Uint8Array(xs),py:new Uint8Array(ys),alpha};shadowProfiles.set(key,prof);return prof;
}

type CachedShadow={canvas:HTMLCanvasElement;ox:number;oy:number;sw:number;sh:number};
const shadowCache=new Map<string,CachedShadow>(),MAX_SHADOW_CACHE=192;
export function drawFigureShadow(c:CanvasRenderingContext2D,atlas:AtlasSource,f:{x:number;y:number;w:number;h:number},cell:{w:number;h:number;pivot:{x:number;y:number}},s:Sun,dir:number){
 if(!s.alpha)return;
 const cacheKey=`${atlasSrcKey(atlas)}:${f.x},${f.y},${cell.w},${cell.h}:${dir}:${s.dx.toFixed(2)},${s.dy.toFixed(2)},${s.wx.toFixed(2)},${s.wy.toFixed(2)}`;
 let entry=shadowCache.get(cacheKey);
 if(entry){
  shadowCache.delete(cacheKey);shadowCache.set(cacheKey,entry);
 }else{
  const {base,bot,vc,px,py}=frameShadowProfile(atlas,f,cell),pivot=cell.pivot,pad=12,footHalf=Math.ceil(cell.w*.22);
  const reachH=cell.h+20;
  const ox=Math.ceil(cell.w*.65+(s.dx<0?reachH*-s.dx:0)+pad),oy=Math.ceil(cell.w*.5+(s.dy<0?reachH*-s.dy:0)+pad);
  const sw=Math.ceil(ox+cell.w*.65+(s.dx>0?reachH*s.dx:0)+pad),sh=Math.ceil(oy+cell.w*.5+(s.dy>0?reachH*s.dy:0)+pad);
  if(shadeCanvas.width<sw||shadeCanvas.height<sh||!shadeData){
   shadeCanvas.width=Math.max(shadeCanvas.width,sw);shadeCanvas.height=Math.max(shadeCanvas.height,sh);
   shadeData=shadeCtx.createImageData(shadeCanvas.width,shadeCanvas.height);shadeOut=new Uint32Array(shadeData.data.buffer);
  }
  const stride=shadeCanvas.width,out=shadeOut!,COLOR=0xff2c1c14;
  for(let y=0;y<sh;y++)out.fill(0,y*stride,y*stride+sw);
  const wxEff=Math.max(.6,Math.abs(s.wx)),wyEff=s.wy*.35;
  for(let i=0,n=px.length;i<n;i++){
   const x=px[i],y=py[i],gap=Math.max(0,base[x]-bot[x]),grounded=gap<=4&&Math.abs(x-pivot.x)<=footHalf;
   const rawHt=Math.max(0,base[x]-y),ht=grounded?rawHt:rawHt+Math.min(18,gap*.85);
   const rawU=dir*(x-pivot.x),u=grounded?rawU:rawU*Math.min(1,.35+(rawHt/38)*.65);
   const vf=base[x]-pivot.y,tau=grounded?Math.min(1,Math.max(0,(ht-4)/26)):1;
   const uCross=Math.max(-10,Math.min(10,u))*Math.min(1,ht/48);
   const sx=Math.round((1-tau)*u+tau*u*wxEff+ht*s.dx)+ox,sy=Math.round((1-tau)*vf+tau*vc+uCross*wyEff+ht*s.dy)+oy;
   if(sx>=0&&sx+1<sw&&sy>=0&&sy+1<sh){const idx=sy*stride+sx;out[idx]=COLOR;out[idx+1]=COLOR;out[idx+stride]=COLOR;out[idx+stride+1]=COLOR;}
  }
  shadeCtx.putImageData(shadeData,0,0,0,0,sw,sh);
  let targetCanvas:HTMLCanvasElement;
  if(shadowCache.size>=MAX_SHADOW_CACHE){
   const oldest=shadowCache.keys().next().value!;
   targetCanvas=shadowCache.get(oldest)!.canvas;
   shadowCache.delete(oldest);
  }else targetCanvas=document.createElement('canvas');
  if(targetCanvas.width!==sw||targetCanvas.height!==sh){targetCanvas.width=sw;targetCanvas.height=sh;}
  const tc=targetCanvas.getContext('2d')!;
  tc.clearRect(0,0,sw,sh);tc.drawImage(shadeCanvas,0,0,sw,sh,0,0,sw,sh);
  entry={canvas:targetCanvas,ox,oy,sw,sh};
  shadowCache.set(cacheKey,entry);
 }
 c.save();c.globalAlpha=s.alpha;c.scale(DISPLAY,DISPLAY);c.drawImage(entry.canvas,0,0,entry.sw,entry.sh,-entry.ox,-entry.oy,entry.sw,entry.sh);c.restore();
}

export type Drive={x:number;y:number;pose?:Pose|null;face?:Walk|null;look?:{facing:number;back:boolean;vertical:boolean}|null};
export type Placed={layer:string;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;opacity:number;image:HTMLImageElement;occluder?:HTMLCanvasElement};
type Clip={fps:number;loop:boolean;frames:number[];strideScale?:number};
type Meta={image:string;revision?:string;views?:string[];cell:{w:number;h:number;pivot:{x:number;y:number}};clips:Record<string,Clip>;frames:{x:number;y:number;w:number;h:number}[]};
const KEY='arkodia.stronghold.hero';
export const DISPLAY=.66;const RADIUS=9,SPAWN={...STRONGHOLD.heroSpawn},GATE=STRONGHOLD.gate;

const gpuWarmCanvas=document.createElement('canvas');gpuWarmCanvas.width=16;gpuWarmCanvas.height=16;
const gpuWarmCtx=gpuWarmCanvas.getContext('2d')!;
const loadedHeroes=new Map<HeroId,Promise<{id:HeroId;meta:Meta;atlas:HTMLImageElement}>>();
function loadHeroAtlas(id:HeroId){
 let p=loadedHeroes.get(id);
 if(p)return p;
 p=(async()=>{
  const all=await characters(),m:Meta=all[id]??all[DEFAULT_HERO];
  const img=await loadImage(atlasUrl(m));
  prewarmAtlasAlpha(img);
  gpuWarmCtx.drawImage(img,0,0,16,16);
  if(m.frames[0])frameShadowProfile(img,m.frames[0],m.cell);
  return {id,meta:m,atlas:img};
 })();
 loadedHeroes.set(id,p);
 return p;
}

export async function createHero<P extends Placed>(o:{layer:Container;lightmap:HTMLCanvasElement;surface:HTMLElement;footprint:(p:P)=>Column[];sun:()=>Sun;direction:()=>Walk;follow:(x:number,y:number,dt:number,walking?:boolean)=>void;pose?:()=>Pose|null;drive?:()=>Drive|null;id?:string;hero?:HeroId}){
 const load=loadHeroAtlas;
 const wanted0=isHero(o.hero)?o.hero:DEFAULT_HERO;
 const preloadAll=typeof navigator==='undefined'||!navigator.webdriver;
 let [hero]=await Promise.all([load(wanted0),...(preloadAll?HEROES.map(h=>load(h.id)):[])]);
 let {meta,atlas}=hero,wanted=hero.id;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;canvas.id=o.id??'world-hero';const own=!o.id;if(own)(window as any).__WORLD_HERO__=canvas;
 const heroView=createCanvasSprite(canvas);
 heroView.sprite.zIndex=30;
 o.layer.addChild(heroView.sprite);

 let cell=meta.cell,pivot=cell.pivot;
 const frameCache=new Map<string,HTMLCanvasElement>(),MAX_FRAME_CACHE=48;
 const fit=()=>{cell=meta.cell;pivot=cell.pivot;};fit();
 let objects:P[]=[],blockers:Column[]=[],bounds=new Map<P,number[]>();
 type SceneBound={p:P;x0:number;y0:number;x1:number;y1:number;cols:Column[];maxFront:number;isGate:boolean;isWall:boolean;isRound:boolean};
 let sceneBounds:SceneBound[]=[],minSceneX=0,minSceneY=0,maxSceneX=0,maxSceneY=0,maxSceneFront=0;
 let minBlockerX=0,maxBlockerX=0,minBlockerY=0,maxBlockerY=0;
 let x=SPAWN.x,y=SPAWN.y,state:'idle'|'move'='idle',t=0,gait=0,facing=1,back=false,vertical=false,horizontal=false;
 let pose:Pose|null=null,tint='255,255,255',sampled=-1e9,origin={x:0,y:0,scale:1},k=0,box=[0,0,0,0],drawn='',lastMove=0;
 function blocked(px:number,py:number){
  if(!walkableGround(px,py))return true;
  if(py>maxBlockerY||py<minBlockerY||px<minBlockerX||px>maxBlockerX)return false;
  for(let i=0,n=blockers.length;i<n;i++){const b=blockers[i];if(Math.abs(px-b.x)<b.w/2+RADIUS&&py>b.back-RADIUS*.5&&py<b.front+RADIUS*.5)return true;}
  return false;
 }
 function setScene(list:P[]){
  objects=list.filter(p=>p.layer!=='ground');blockers=objects.filter(p=>p.opacity>=1).flatMap(p=>o.footprint(p).filter(c=>!('id' in p&&p.id==='gate'&&gatePassageColumn(c.x))));
  minBlockerX=Infinity;maxBlockerX=-Infinity;minBlockerY=Infinity;maxBlockerY=-Infinity;
  for(let i=0,n=blockers.length;i<n;i++){
   const b=blockers[i],bx0=b.x-b.w*.5-RADIUS,bx1=b.x+b.w*.5+RADIUS,by0=b.back-RADIUS*.5,by1=b.front+RADIUS*.5;
   if(bx0<minBlockerX)minBlockerX=bx0;if(bx1>maxBlockerX)maxBlockerX=bx1;
   if(by0<minBlockerY)minBlockerY=by0;if(by1>maxBlockerY)maxBlockerY=by1;
  }
  minSceneX=Infinity;minSceneY=Infinity;maxSceneX=-Infinity;maxSceneY=-Infinity;maxSceneFront=-Infinity;
  sceneBounds=objects.map(p=>{
   const xs=[-p.width/2,p.width/2],ys=[-p.height*p.foot,p.height*(1-p.foot)],pts=xs.flatMap(lx=>ys.map(ly=>[p.x+lx,p.y+p.shear*lx+p.vertical*ly]));
   const x0=Math.min(...pts.map(q=>q[0])),y0=Math.min(...pts.map(q=>q[1])),x1=Math.max(...pts.map(q=>q[0])),y1=Math.max(...pts.map(q=>q[1]));
   if(x0<minSceneX)minSceneX=x0;if(y0<minSceneY)minSceneY=y0;if(x1>maxSceneX)maxSceneX=x1;if(y1>maxSceneY)maxSceneY=y1;
   const isGate=Boolean('id' in p&&p.id==='gate');
   const isWall=Boolean('id' in p&&typeof p.id==='string'&&/^(rampart-|bastion|gate-connector|wall-)/.test(p.id));
   const isRound=Boolean('id' in p&&typeof p.id==='string'&&/^(spruce-mature|fir-young|brazier)$/.test(p.id));
   const cols=!isGate&&(p.layer==='world'||isWall||isRound)?o.footprint(p):[];
   let maxFront=isGate?820:Math.max(p.y+12,y1);
   for(let i=0;i<cols.length;i++)if(cols[i].front>maxFront)maxFront=cols[i].front;
   if(maxFront>maxSceneFront)maxSceneFront=maxFront;
   return {p,x0,y0,x1,y1,cols,maxFront,isGate,isWall,isRound};
  });
  bounds=new Map(sceneBounds.map(s=>[s.p,[s.x0,s.y0,s.x1,s.y1]]));
  drawn='';
 }
 function frontY(sb:SceneBound,qx:number):number{
  if(sb.isGate){const d=Math.abs(qx-GATE.x);return d<GATE.archHalfWidth?775:gateTowerFront(Math.min(GATE.towerHalfSpan,d));}
  const p=sb.p,cols=sb.cols;
  let edge=-Infinity;
  for(let i=0,n=cols.length;i<n;i++){
   const col=cols[i];
   if(Math.abs(col.x-qx)<=col.w/2+RADIUS&&col.front>edge)edge=col.front;
  }
  if(sb.isRound)return edge;
  let botY=-Infinity;
  if(qx>=sb.x0&&qx<=sb.x1){
   const m=getAlphaMask(p);
   if(m){
    const lx=Math.max(-p.width*.5,Math.min(p.width*.5,qx-p.x));
    const ix=Math.min(m.w-1,Math.max(0,Math.floor(((lx+p.width*.5)/p.width)*m.w)));
    const bv=m.bot[ix];
    if(bv>=0)botY=p.y+p.shear*lx+p.vertical*(bv-p.foot)*p.height;
   }
  }
  if(sb.isWall)return Math.max(edge,botY);
  if(p.layer==='world'||p.layer==='foreground'||p.layer==='backdrop'){
   return Math.max(edge,botY);
  }
  return -Infinity;
 }
 function frontBound(sb:SceneBound,px:number,py:number,anchorY?:number){
  const fY=frontY(sb,px);
  if(py<fY)return true;
  if(sb.isWall||sb.isGate){
   if(!walkableGround(px,py))return true;
   if(anchorY!==undefined&&anchorY<fY-4)return true;
  }
  return false;
 }
 // Ray-march from (x0,y0) to (x1,y1) in world pixels to inspect wall intersections.
 function traceWallRay(x0:number,y0:number,x1:number,y1:number):{hit:boolean;x:number;y:number;t:number}{
  if(y0>850&&y1>850)return {hit:false,x:x1,y:y1,t:1};
  const dx=x1-x0,dy=y1-y0,dist=Math.hypot(dx,dy);
  if(dist<1e-3)return {hit:false,x:x1,y:y1,t:1};
  const steps=Math.max(4,Math.min(64,Math.ceil(dist/6)));
  let lastX=x0,lastY=y0;
  for(let i=1;i<=steps;i++){
   const t=i/steps,wx=x0+dx*t,wy=y0+dy*t;
   const gd=Math.abs(wx-GATE.x);
   const gateTowerHit=gd>=GATE.doors.halfWidth&&gd<=GATE.towerHalfSpan&&wy>=gateTowerFront(gd)-76&&wy<=gateTowerFront(gd)+4;
   if(blocked(wx,wy)||gateTowerHit)return {hit:true,x:lastX,y:lastY,t:(i-1)/steps};
   lastX=wx;lastY=wy;
  }
  return {hit:false,x:x1,y:y1,t:1};
 }
 const occluders=(px:number,py:number,b:number[])=>py+b[1]>=maxSceneFront?[]:sceneBounds.filter(sb=>{
  if(sb.x1<px+b[0]||sb.x0>px+b[2]||sb.y1<py+b[1]||sb.y0>py+b[3])return false;
  return frontBound(sb,px,py);
 }).map(sb=>sb.p);
 function sampleHeroAlpha(wx:number,wy:number):number{
  const dir=meta.views?(vertical?1:facing):(vertical&&!pose?1:facing);
  const hx=(wx-x)/(dir*DISPLAY)+pivot.x,hy=(wy-y)/DISPLAY+pivot.y;
  if(hx<0||hx>=cell.w||hy<0||hy>=cell.h)return 0;
  const prof=frameShadowProfile(atlas,meta.frames[frameIndex()],cell);
  return prof.alpha[Math.floor(hy)*cell.w+Math.floor(hx)]/255;
 }
 function occlusionAt(px:number,py:number,wx=px,wy=py,rad=0,flat=false,includeHero=false,anchorY?:number):number{
  const pad=Math.max(3,Math.min(28,rad*.62)),padY=flat?pad*.55:pad;
  const x0=wx-pad,x1=wx+pad,y0=wy-padY,y1=wy+padY;
  let maxA=0;
  if(Math.min(py,y0,anchorY??py)<=maxSceneFront&&y0<=maxSceneY&&y1>=minSceneY&&x0<=maxSceneX&&x1>=minSceneX){
   for(let i=0,n=sceneBounds.length;i<n;i++){
    const sb=sceneBounds[i];
    if(sb.x1<x0||sb.x0>x1)continue;
    const p=sb.p,qx=Math.max(sb.x0+2,Math.min(sb.x1-2,wx));
    if(anchorY!==undefined&&(sb.isWall||sb.isGate)){
     const fY=frontY(sb,qx);
     // Prevent fast volumetric sparks or ground dots cast behind a wall/gate from popping out at full opacity in front of the wall base.
     if(anchorY<fY-12&&(py>fY+2||wy>fY+2)&&wy<fY+140)maxA=1;
    }
    if(sb.y1<y0||sb.y0>y1)continue;
    // Flat ground decals lie on z=0 beneath all upright walls, buildings, gates, and trees;
    // Volumetric world particles are behind sb when frontBound(sb, qx, py, anchorY) is true.
    const behind=flat||frontBound(sb,qx,py,anchorY);
    if(!behind)continue;
    const a0=samplePlacedAlpha(p,wx,wy);
    if(a0>maxA)maxA=a0;
    if(rad>2&&maxA<.98){
     const aN=samplePlacedAlpha(p,wx,wy-padY);
     const aS=samplePlacedAlpha(p,wx,wy+padY);
     const aW=samplePlacedAlpha(p,wx-pad,wy);
     const aE=samplePlacedAlpha(p,wx+pad,wy);
     const aEdge=Math.max(aN,aS,aW,aE)*.9;
     if(aEdge>maxA)maxA=aEdge;
    }
   }
  }
  if(includeHero&&py<y-2&&x1>=x-44&&x0<=x+44&&y1>=y-96&&y0<=y+16){
   const ha0=sampleHeroAlpha(wx,wy);if(ha0>maxA)maxA=ha0;
   if(rad>2&&maxA<.98){
    const hEdge=Math.max(
     sampleHeroAlpha(wx-pad,wy),
     sampleHeroAlpha(wx+pad,wy),
     sampleHeroAlpha(wx,wy-padY),
     sampleHeroAlpha(wx,wy+padY)
    )*.9;
    if(hEdge>maxA)maxA=hEdge;
   }
  }
  if(maxA<=0)return 1;
  // Match the hero's cutOut(globalAlpha = 0.68 -> 0.32 residual silhouette opacity) behind walls, buildings, gate, and hero.
  return Math.max(.32,1-.68*maxA);
 }
 if(own)try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){x=saved.x;y=saved.y;}}catch{}
 const view=()=>vertical?(back?'N':'S'):horizontal?(facing>0?'E':'W'):(back?'N':'S')+(facing>0?'E':'W');
 const clipName=()=>meta.views?`${pose?pose.clip:state}-${view()}`:pose?pose.clip:vertical?state+(back?'Up':'Down'):back?state+'Back':state;
 const frameIndex=()=>{const clip=meta.clips[clipName()],n=clip.frames.length,i=pose?Math.floor(pose.t*clip.fps/1000):state==='move'?Math.floor(gait*clip.fps):Math.floor(t*clip.fps/1000);return clip.frames[clip.loop?i%n:Math.min(i,n-1)];};
 let yaw3d=Math.PI*.25,lastDt=.016;
 const r3d=is3dHeroEnabled()?get3dHeroRenderer():null;
 function face(sx:number,sy:number){const l=Math.hypot(sx,sy);if(!l)return;yaw3d=Math.atan2(sx,sy);vertical=Math.abs(sx)/l<Math.sin((vertical?15:10)*Math.PI/180);horizontal=Math.abs(sy)/l<Math.sin((horizontal?15:10)*Math.PI/180);back=Math.abs(sy)/l>.15?sy<0:false;if(Math.abs(sx)/l>.15)facing=sx>0?1:-1;}
 let jumped=false;
 function driven(s:Drive,dt:number){
  const dx=s.x-x,dy=s.y-y,progress=Math.hypot(dx,dy);
  jumped=progress>80;
  x=s.x;y=s.y;pose=s.pose!==undefined?s.pose:o.pose?.()??null;
  if(s.look){if(s.face&&(s.face.x||s.face.y))face(s.face.x,s.face.y);else if(progress>.01)face(dx,dy);facing=s.look.facing;back=s.look.back;vertical=s.look.vertical;if(vertical)horizontal=false;}else if(s.face&&(s.face.x||s.face.y)&&!pose)face(s.face.x,s.face.y);
  if(jumped){state='idle';t=0;drawn='';return true;}
  if(pose){if(state!=='idle'){state='idle';t=0;}return !!(dx||dy);}
  t+=dt;if(!s.look&&!s.face&&(dx||dy))face(dx,dy);
  const moving=progress/(dt/1000)>(state==='move'?2:5);if(moving!==(state==='move')){state=moving?'move':'idle';t=0;}
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
   if(px>=0&&py>=0&&px<o.lightmap.width&&py<o.lightmap.height){probe.clearRect(0,0,1,1);probe.drawImage(o.lightmap,px,py,1,1,0,0,1,1);next=[...probe.getImageData(0,0,1,1).data.slice(0,3)].map(v=>Math.min(255,Math.round(v/8)*8)).join();}}
  tint=next;
 }
 const quantizeRes=(scale:number)=>Math.round(Math.min(3,Math.max(1,scale*Math.min(devicePixelRatio||1,2.5)))*4)/4;
 function render(){
  const s=o.sun(),f=meta.frames[frameIndex()],res=quantizeRes(origin.scale);
  const night=own?Math.max(0,1-s.alpha/.4):0;
  const half=Math.max((pivot.x>cell.w-pivot.x?pivot.x:cell.w-pivot.x)*DISPLAY,night?48:0),top=-pivot.y*DISPLAY-(night?14:0),bottom=(cell.h-pivot.y)*DISPLAY+(night?20:8),H=(cell.h+18)*DISPLAY;
  const ends=[-half,half].flatMap(w=>[0,H].flatMap(h=>[[w+h*s.dx,h*s.dy],[w*s.wx+h*s.dx,w*s.wy+h*s.dy]])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-12),...ends.map(e=>e[1]+12)];
  const b=[Math.floor(Math.min(...sxs))-8,Math.floor(Math.min(...sys))-8,Math.ceil(Math.max(...sxs))+8,Math.ceil(Math.max(...sys))+8];
  const hidden=occluders(x,y,b),at=x.toFixed(1)+','+y.toFixed(1);if(canvas.dataset.x+','+canvas.dataset.y!==at)Object.assign(canvas.dataset,{x:x.toFixed(1),y:y.toFixed(1)});
  const qNight=Math.round(night*20)/20;
  const active3d=Boolean(r3d?.isHeroReady(hero.id));
  const key=[hero.id,state,clipName(),f.x,f.y,facing,vertical,tint,qNight.toFixed(2),s.dx,s.dy,s.wx,s.wy,s.alpha,res,b,hidden.length?hidden.map(p=>p.x+':'+p.y+':'+Math.round(Number(p.occluder?.dataset.frame??0)/8)).join()+'@'+Math.round(x*.25)+','+Math.round(y*.25):'',objects.length].join();if(!active3d&&key===drawn)return;drawn=key;
  if(res!==k||b.some((v,i)=>v!==box[i])){k=res;box=b;canvas.width=Math.ceil((b[2]-b[0])*k);canvas.height=Math.ceil((b[3]-b[1])*k);}
  const lw=cell.w,lh=cell.h,fKey=`${hero.id}:${f.x},${f.y}:${lw}x${lh}:${tint}:${qNight.toFixed(2)}`;
  let fCan=frameCache.get(fKey);
  if(!active3d){
   if(fCan){
    frameCache.delete(fKey);frameCache.set(fKey,fCan);
   }else{
    if(frameCache.size>=MAX_FRAME_CACHE){
     const oldest=frameCache.keys().next().value!;
     fCan=frameCache.get(oldest)!;
     frameCache.delete(oldest);
    }else fCan=document.createElement('canvas');
    if(fCan.width!==lw||fCan.height!==lh){fCan.width=lw;fCan.height=lh;}
    const g=fCan.getContext('2d')!;
    g.globalCompositeOperation='copy';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,lw,lh);
    if(tint!=='255,255,255'){
     g.globalCompositeOperation='multiply';g.fillStyle=`rgb(${tint})`;g.fillRect(0,0,lw,lh);
     g.globalCompositeOperation='destination-in';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,lw,lh);
    }else if(qNight>0){
     g.globalCompositeOperation='screen';g.fillStyle=`rgba(46,38,28,${(.18*qNight).toFixed(3)})`;g.fillRect(0,0,lw,lh);
     g.globalCompositeOperation='destination-in';g.drawImage(atlas,f.x,f.y,f.w,f.h,0,0,lw,lh);
    }
    g.globalCompositeOperation='source-over';
    frameCache.set(fKey,fCan);
   }
  }
  const dir=meta.views?(vertical?1:facing):(vertical&&!pose?1:facing);
  const local=()=>c.setTransform(k,0,0,k,-box[0]*k,-box[1]*k);
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);local();
  if(qNight>0){
   c.save();c.translate(0,-2);c.scale(1,.52);const pg=c.createRadialGradient(0,0,2,0,0,40);pg.addColorStop(0,`rgba(255,206,136,${(.24*qNight).toFixed(3)})`);pg.addColorStop(.55,`rgba(255,178,102,${(.1*qNight).toFixed(3)})`);pg.addColorStop(1,'rgba(255,160,85,0)');c.fillStyle=pg;c.fillRect(-40,-40,80,80);c.restore();
  }
  const can3d=active3d?r3d!.updateAndRender({heroId:hero.id,clip:pose?pose.clip:state,moving:state==='move',yaw:yaw3d,dt:lastDt,tint,night}):null;
  if(can3d){
   if(s.alpha>0){
    c.save();
    c.globalAlpha=Math.min(.55,s.alpha*1.35);
    c.scale(DISPLAY,DISPLAY);
    c.transform(Math.max(.65,Math.abs(s.wx)),s.wy*.35,-s.dx,-s.dy,0,0);
    c.drawImage(r3d!.shadowCanvas,0,0,can3d.width,can3d.height,-pivot.x,-pivot.y,cell.w,cell.h);
    c.restore();
   }
   c.save();c.scale(DISPLAY,DISPLAY);
   c.drawImage(can3d,0,0,can3d.width,can3d.height,-pivot.x,-pivot.y,cell.w,cell.h);
   c.restore();
  }else if(fCan){
   drawFigureShadow(c,atlas,f,cell,s,dir);
   c.save();c.scale(dir*DISPLAY,DISPLAY);
   c.drawImage(fCan,0,0,lw,lh,-pivot.x,-pivot.y,cell.w,cell.h);
   c.restore();
  }
  cutOut(c,hidden,x,y);
  heroView.sync((box[2]-box[0])*origin.scale,(box[3]-box[1])*origin.scale);
  Object.assign(canvas.dataset,{hero:hero.id,state,clip:clipName(),frame:String(frameIndex()),facing:String(facing),behind:String(hidden.length),tint,night:night.toFixed(2),mode:active3d?'3d-60fps':'2d'});
 }
 function place(){
  heroView.sprite.position.set(origin.x+(x+box[0])*origin.scale,origin.y+(y+box[1])*origin.scale);
  heroView.sprite.width=(box[2]-box[0])*origin.scale;
  heroView.sprite.height=(box[3]-box[1])*origin.scale;
 }
 let last=0;
 let stopped=false;
 const loop=(now:number)=>{if(stopped)return;const span=last?Math.min(now-last,120):16;lastDt=span/1000;let walking=false;jumped=false;last=now;
  measureTracelogPhase('encountersStep',()=>{
   const s=o.drive?.();
   if(s)walking=driven(s,span);else for(let dt=span;dt>0;dt-=34)walking=step(Math.min(dt,34))||walking;
   sample(now);
  });
  if(own)o.follow(x,y,jumped?1e4:span,walking);
  measureTracelogPhase('encountersRender',()=>{render();place();});
  requestAnimationFrame(loop);};
 return {
  canvas,
  sprite:heroView.sprite,
  setScene,
  blocked,occluders,occlusionAt,traceWallRay,sun:o.sun,
  place(ox:number,oy:number,scale:number){origin={x:ox,y:oy,scale};if(!drawn||quantizeRes(scale)!==k)render();place();},
  start(){if(blocked(x,y)&&!blocked(SPAWN.x,SPAWN.y)){x=SPAWN.x;y=SPAWN.y;}requestAnimationFrame(loop);},
  position:()=>({x,y}),
  face,
  respawn(){x=SPAWN.x;y=SPAWN.y;back=false;vertical=false;horizontal=false;facing=1;drawn='';o.follow(x,y,1e4);},
  teleport(px:number,py:number){if(blocked(px,py))return false;x=px;y=py;drawn='';o.follow(x,y,1e4);return true;},
  async setHero(id:HeroId){wanted=id;if(id===hero.id)return;const next=await load(id);if(wanted!==id)return;hero=next;({meta,atlas}=next);fit();drawn='';},
  hero:()=>hero.id,
  remove(){stopped=true;heroView.sprite.removeFromParent();heroView.sprite.destroy();}
 };
}
