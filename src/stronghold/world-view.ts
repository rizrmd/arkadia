import {CanvasSource,Texture,TilingSprite} from 'pixi.js';
import {FOUNDATION_SOIL,FOUNDATION_MOSS,FOUNDATION_DRIFT,drawFoundation,foundationLayers} from './foundations';
import {environmentSprites,COURT,tilePoint,LEGACY_LAYOUT} from './terrain';
import {slots,calibration,WORLD} from './scene';
import {buildings,isBuilt,heroBonus,START_BUILT,type Building,type State} from './economy';
import {createLighting} from './lighting';
import {sunAt} from './daylight';
import {createHero} from './hero';
import {createEncounters} from './encounters';
import {setGateOpen,gateTowerFront} from './navigation';
import {createGateDoors,GATE_SHEET,type GateSheet} from './gate-doors';
import type {Walk} from './controls';
import {createCanvasSprite,loadImage,expectSizes,downloadedBytes,onDownload,type Progress,type SharedPixiRuntime} from '../app/loader';
import type {HudCallbacks} from '../typography/hud';
import type {Net} from './net/client';
import {createParty} from './party';
import {characters,atlasUrl,DEFAULT_HERO,type HeroId} from './heroes';

export async function createWorldView(
 rt:SharedPixiRuntime,
 onSelect:(id:Building)=>void,
 direction:()=>Walk,
 progress:Progress=()=>{},
 net?:Net,
 pick:HeroId=DEFAULT_HERO,
 hudCallbacks?:HudCallbacks,
 canPanCanvas?:(clientX:number,clientY:number)=>boolean,
){
 const canvas=rt.app.canvas;
 const {worldStage,uiStage,frames}=rt;
 worldStage.sortableChildren=true;
 uiStage.sortableChildren=true;

 const probeCtx=document.createElement('canvas').getContext('2d')!;
 const environment=environmentSprites(),images=new Map<string,HTMLImageElement>();
 let gateOpen=false,gatePassable=false;
 const spriteFile=(id:Building,level:number)=>id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/full-gateway-v7-closed.webp':`/assets/${slots[id].asset}.png`;
 const paving='/modular-stronghold/v2/paving-warm-texture.png',snow='/modular-stronghold/v2/snow-soft-texture.png';
 const files=[...new Set([FOUNDATION_SOIL,FOUNDATION_MOSS,FOUNDATION_DRIFT,paving,snow,'/modular-stronghold/v2/full-gateway-v7-closed.webp',...environment.map(p=>p.file),...buildings.flatMap(b=>[1,2,3].map(l=>spriteFile(b,l)))])];
 const DOWNLOAD=920,steps=1000,mb=(n:number)=>(n/1e6).toFixed(1);let loaded=DOWNLOAD;
 let queued=0;const report=()=>{queued=0;const {received,expected}=downloadedBytes();progress(Math.floor(DOWNLOAD*received/Math.max(1,expected)),steps,`Loading artwork · ${mb(received)} of ${mb(expected)} MB`);};
 const stopReport=onDownload(()=>{queued||=requestAnimationFrame(report);});progress(0,steps,'Loading artwork');
 const [atlas]=await Promise.all([characters() as Promise<Record<string,{image:string;revision?:string}>>,expectSizes()]),artwork=files.map(async file=>{images.set(file,await loadImage(file));});
 try{
  await Promise.all([...artwork,...[atlas[pick]??atlas[DEFAULT_HERO],atlas.revenant].map(m=>loadImage(atlasUrl(m)))]);
 }finally{stopReport();cancelAnimationFrame(queued);}
 report();
 const gateSheetImg=new Image();gateSheetImg.src='/modular-stronghold/v2/full-gateway-v7-sheet.webp';
 let w=0,h=0,dpr=1,scale=1,cx=WORLD.width/2,cy=385,selected:Building|null=null,levels:State['levels']|undefined;
 let built=new Set<Building>(LEGACY_LAYOUT?buildings:START_BUILT);
 const material=(file:string,size:number)=>{const img=images.get(file)!,s=size*1024/img.width,p=probeCtx.createPattern(img,'repeat')!;p.setTransform(new DOMMatrix([s,s/2,-s,s/2,COURT.x,COURT.y]));return p;};
 const snowPattern=material(snow,.7),pavingPattern=material(paving,.22);
 const polygon=(corners:number[][])=>{const path=new Path2D();corners.forEach(([u,v],i)=>{const p=tilePoint(u,v);i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y);});path.closePath();return path;};
 const court=polygon([[0,0],[15,0],[15,15],[0,15]]),paved=polygon([[-.5,-.5],[15,-.5],[15,15],[-.5,15]]);

 const apron=document.createElement('canvas'),apronX=417,apronY=700;
 apron.width=320;apron.height=140;const ac=apron.getContext('2d')!;
 ac.translate(-apronX,-apronY);ac.fillStyle=snowPattern;ac.fillRect(apronX,apronY,apron.width,apron.height);
 const snowPixels=ac.getImageData(0,0,apron.width,apron.height);
 for(let y=0;y<apron.height;y++)for(let x=0;x<apron.width;x++){
  const wx=x+apronX,wy=y+apronY,edge=785-Math.abs(wx-577)*.35;
  const noise=Math.sin(wx*.37+wy*.23)*5+Math.sin(wx*.91-wy*.71)*2.5;
  const t=Math.max(0,Math.min(1,(wy-edge+20+noise)/40));
  snowPixels.data[(y*apron.width+x)*4+3]=Math.round(255*t*t*(3-2*t));
 }
 ac.putImageData(snowPixels,0,0);

 const shadow=document.createElement('canvas'),shadowLeft=COURT.x-15*64-64,shadowTop=COURT.y-64;
 shadow.width=2048;shadow.height=1088;const shadowCtx=shadow.getContext('2d')!;shadowCtx.translate(-shadowLeft,-shadowTop);shadowCtx.strokeStyle='#29392d26';shadowCtx.lineWidth=30;shadowCtx.filter='blur(10px)';shadowCtx.stroke(court);
 let gateOccluder:HTMLCanvasElement|undefined;
 function makeObjects(all=false){return [...environment.map(p=>({...p,selected:false,occluder:undefined as HTMLCanvasElement|undefined})),...buildings.filter(id=>all||built.has(id)).map(id=>{const s=slots[id],c=calibration(id);return {layer:id==='gate'?'foreground' as const:'world' as const,id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected,occluder:id==='gate'?gateOccluder:undefined};})].sort((a,b)=>({ground:0,backdrop:1,world:2,foreground:3})[a.layer]-({ground:0,backdrop:1,world:2,foreground:3})[b.layer]||a.depth-b.depth).map(p=>({...p,image:images.get(p.file)!,height:images.get(p.file)!.height*p.width/images.get(p.file)!.width}));}
 let objects=makeObjects(),signature='';canvas.dataset.buildings=[...built].join(',');

 // Infinite snow repeat TilingSprite + offscreen world surface Sprite in Pixi worldStage
 const periodX=1024*1.4,periodY=1024*.7;
 const repeat=document.createElement('canvas');repeat.width=Math.ceil(periodX);repeat.height=Math.ceil(periodY);const rc=repeat.getContext('2d')!;
 rc.scale(repeat.width/periodX,repeat.height/periodY);rc.fillStyle=snowPattern;rc.fillRect(0,0,periodX,periodY);
 const repeatSource=new CanvasSource({resource:repeat,resolution:1});
 repeatSource.update();
 const snowSprite=new TilingSprite({texture:new Texture({source:repeatSource}),width:innerWidth||1440,height:innerHeight||900});
 snowSprite.zIndex=0;
 worldStage.addChild(snowSprite);

 const surface=document.createElement('canvas');surface.id='world-surface';
 const boundsObjects=makeObjects(true).map(p=>({...p,height:p.id==='forge'?Math.max(...[1,2,3].map(l=>{const image=images.get(spriteFile('forge',l))!;return image.height*p.width/image.width;})):p.height}));
 const points=boundsObjects.flatMap(p=>[-p.width/2,p.width/2].flatMap(x=>[-p.height*p.foot,p.height*(1-p.foot)].map(y=>({x:p.x+x,y:p.y+p.shear*x+p.vertical*y}))));
 const corners=[[0,0],[15,0],[15,15],[0,15]].map(([u,v])=>tilePoint(u,v));points.push(...corners);
 const profiles=new Map<string,{top:Float32Array;bottom:Float32Array}>(),suns=[...Array(96).keys()].map(k=>sunAt(k/96)).filter(s=>s.alpha);
 const reach={left:Math.min(...suns.map(s=>s.dx)),right:Math.max(...suns.map(s=>s.dx)),up:Math.min(...suns.map(s=>s.dy)),down:Math.max(...suns.map(s=>s.dy))};
 for(const p of boundsObjects){if(p.layer==='ground')continue;const {top}=profile(p.image),n=top.length;
  for(let i=0;i<n;i++){if(top[i]<0)continue;const lx=-p.width/2+(i+.5)/n*p.width,x=p.x+lx,ground=p.y+p.shear*lx,height=-p.vertical*(top[i]-p.foot)*p.height;if(height<=0)continue;
   points.push({x:x+height*reach.left,y:ground},{x:x+height*reach.right,y:ground},{x,y:ground+height*reach.up},{x,y:ground+height*reach.down});}}
 const left=Math.floor(Math.min(...points.map(p=>p.x))-32),top=Math.floor(Math.min(...points.map(p=>p.y))-32);
 const worldWidth=Math.ceil(Math.max(...points.map(p=>p.x))-left+32),worldHeight=Math.ceil(Math.max(...points.map(p=>p.y))-top+32);
 const raster=Math.min(1.75,Math.sqrt(32*1024*1024/(4*worldWidth*worldHeight)),4096/Math.max(worldWidth,worldHeight));
 surface.width=Math.floor(worldWidth*raster);surface.height=Math.floor(worldHeight*raster);
 const surfaceView=createCanvasSprite(surface);
 surfaceView.sprite.zIndex=10;
 worldStage.addChild(surfaceView.sprite);

 const sc=surface.getContext('2d')!;let dirty=true,frame=0;
 const lighting=createLighting({
  worldStage,
  surface,
  snowSprite,
  left,
  top,
  width:worldWidth,
  height:worldHeight,
  onSun:()=>castShadows(),
  onSurfaceUpdate:()=>surfaceView.sync(worldWidth*scale,worldHeight*scale),
 });
 lighting.setScene(objects);

 type Column={x:number;w:number;back:number;front:number;height:number};
 const footprints=new Map<string,Column[]>();
 function profile(image:HTMLImageElement){
  let r=profiles.get(image.src);if(r)return r;const n=Math.min(256,image.width),m=Math.ceil(image.height*n/image.width),c=document.createElement('canvas');c.width=n;c.height=m;
  const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(image,0,0,n,m);const d=x.getImageData(0,0,n,m).data,top=new Float32Array(n).fill(-1),bottom=new Float32Array(n).fill(-1);
  for(let i=0;i<n;i++)for(let y=0;y<m;y++)if(d[(y*n+i)*4+3]>128){if(top[i]<0)top[i]=y/m;bottom[i]=(y+1)/m;}
  r={top,bottom};profiles.set(image.src,r);return r;
 }
 const round=/^(spruce-mature|fir-young|brazier)$/;
 const hollow=/^expedition$/;
 function hollowFront(p:{id:string},bottom:Float32Array,first:number,last:number){
  if(!hollow.test(p.id))return bottom;const h:number[]=[],edge=Float32Array.from(bottom);
  for(let i=first;i<=last;i++){if(bottom[i]<0)continue;while(h.length>1){const o=h[h.length-2],a=h[h.length-1];if((a-o)*(bottom[i]-bottom[o])-(bottom[a]-bottom[o])*(i-o)<0)break;h.pop();}h.push(i);}
  for(let k=1;k<h.length;k++)for(let j=h[k-1];j<=h[k];j++)edge[j]=bottom[h[k-1]]+(bottom[h[k]]-bottom[h[k-1]])*(j-h[k-1])/(h[k]-h[k-1]);
  return edge;
 }
 function gateFootprint(){
  const cols:Column[]=[];
  for(const side of [-1,1])for(let d=36;d<=135;d+=3){
   const front=gateTowerFront(d);
   cols.push({x:577+side*d,w:3,back:front-34,front,height:110});
  }
  if(!gatePassable)for(let d=-35;d<=35;d+=3)cols.push({x:577+d,w:3,back:771,front:783,height:105});
  return cols;
 }
 function footprint(p:(typeof objects)[number]){
  const key=p.file+'|'+p.x+'|'+p.y+'|'+p.width;let cols=footprints.get(key);if(cols)return cols;cols=[];
  const {top,bottom}=profile(p.image),n=top.length,filled=[...top.keys()].filter(i=>top[i]>=0);
  const at=(u:number,t:number)=>{const lx=-p.width/2+(u+.5)/n*p.width;return {x:p.x+lx,y:p.y+p.shear*lx+p.vertical*(t-p.foot)*p.height};};
  const base=filled.map(i=>at(i,bottom[i])),low=base.reduce((a,q)=>q.y>a.y?q:a);
  const grounded=filled.filter((_,k)=>base[k].y>=low.y-.5*Math.abs(base[k].x-low.x)-12),first=grounded[0],last=grounded[grounded.length-1];
  const edge=hollowFront(p,bottom,first,last);
  const front=(j:number)=>{if(j<first||j>last)return -1;const a=edge[Math.floor(j)],b=edge[Math.ceil(j)];return a<0?b:b<0?a:a+(b-a)*(j-Math.floor(j));};
  const ci=(first+last)/2,cy=(edge[first]+edge[last])/2;
  const stride=Math.max(1,Math.round(3.5*n/p.width)),w=p.width/n*stride*1.2;
  for(let i=filled[0];i<=filled[filled.length-1];i+=stride){if(top[i]<0)continue;const t=at(i,top[i]);let back:number,front0:number;
   if(round.test(p.id)){const rx=p.width*.3,d=(t.x-p.x)/rx,s=Math.abs(d)<1?rx*.5*Math.sqrt(1-d*d):0;back=p.y-s;front0=p.y+s;}
   else{const f=at(i,edge[i]).y,r=front(2*ci-i);front0=f;back=r<0?f:Math.min(f,at(i,2*cy-r).y);}
   cols.push({x:t.x,w,back,front:front0,height:Math.max(0,back-t.y)});}
  footprints.set(key,cols);return cols;
 }
 const hull=(points:[number,number][])=>{points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),chain=(list:[number,number][])=>{const h:[number,number][]=[];for(const q of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],q)<=0)h.pop();h.push(q);}h.pop();return h;};return [...chain(points),...chain([...points].reverse())];};
 const SHADE=.35,mask=document.createElement('canvas'),soft=document.createElement('canvas');mask.width=soft.width=Math.ceil(worldWidth*SHADE);mask.height=soft.height=Math.ceil(worldHeight*SHADE);
 function drawSprite(c:CanvasRenderingContext2D,p:(typeof objects)[number]){c.save();c.globalAlpha=p.opacity;c.translate(p.x,p.y);c.transform(1,p.shear,0,p.vertical,0,0);drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));if(p.selected){c.shadowColor='#ffca64';c.shadowBlur=9;}c.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.shadowBlur=0;drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'face',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));c.restore();}
 function castShadows(paint=true){
  const s=lighting.sun();if(!s.alpha){lighting.setShadow(null,0,paint);return;}const m=mask.getContext('2d')!,g=soft.getContext('2d')!;
  m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,mask.width,mask.height);m.setTransform(SHADE,0,0,SHADE,-left*SHADE,-top*SHADE);m.fillStyle='rgb(20,28,44)';
  for(const p of objects){if(p.layer==='ground'||p.opacity<1)continue;
   for(const c of footprint(p)){const vx=c.height*s.dx,vy=c.height*s.dy,a=c.x-c.w/2,b=c.x+c.w/2;
    const h=hull([[a,c.back],[b,c.back],[a,c.front],[b,c.front],[a+vx,c.back+vy],[b+vx,c.back+vy],[a+vx,c.front+vy],[b+vx,c.front+vy]]);
    m.beginPath();h.forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.fill();}}
  g.clearRect(0,0,soft.width,soft.height);g.filter=`blur(${(.7+Math.hypot(s.dx,s.dy*2)).toFixed(2)}px)`;g.drawImage(mask,0,0);g.filter='none';
  lighting.setShadow(soft,s.alpha,paint);
 }

 progress(loaded,steps,'Waking the hero');
 const sheet:GateSheet=await (await fetch(GATE_SHEET)).json();
 const doors=createGateDoors(worldStage,images.get('/modular-stronghold/v2/full-gateway-v7-closed.webp')!,gateSheetImg,sheet,open=>{gatePassable=open;setGateOpen(open);hero.setScene(objects);party?.setScene(objects);},{raster,foundation:foundationLayers(objects.find(p=>p.id==='gate')!,images.get(FOUNDATION_SOIL)!,images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS))!,revision:lighting.spriteRevision,torches:lighting.torches,shade:(source,target)=>lighting.shadeSprite(source,target,{left:442,top:798-sheet.region.h*.97,width:270,height:sheet.region.h})});
 gateOccluder=doors.canvas;for(const p of objects)if(p.id==='gate')p.occluder=gateOccluder;
 lighting.subscribe(()=>doors.refreshLighting());

 let encounters:Awaited<ReturnType<typeof createEncounters>>|undefined;
 const hero=await createHero<(typeof objects)[number]>({hero:pick,layer:worldStage,lightmap:lighting.lightmap,surface,footprint:p=>p.id==='gate'?gateFootprint():footprint(p),sun:lighting.sun,direction:()=>encounters?encounters.steer(direction()):direction(),follow,pose:()=>encounters?.pose()??null,
  drive:()=>{if(!net?.active())return null;const p=net.position(),me=net.me();return {...p,face:direction(),look:me&&me.st!=='idle'?{facing:me.fc,back:me.bk,vertical:me.vt}:null};}});hero.setScene(objects);
 encounters=await createEncounters({worldStage,uiStage,frames,hudCallbacks,showCoop:Boolean(net),hero,direction,net});
 const party=net?createParty<(typeof objects)[number]>({layer:worldStage,frames,lightmap:lighting.lightmap,surface,footprint:p=>p.id==='gate'?gateFootprint():footprint(p),sun:lighting.sun,net,own:()=>hero.position()}):null;party?.setScene(objects);
 lighting.setClockSource(()=>net?.active()?net.clock():null);net?.onSnapshot(()=>{const p=hero.position();updateGate(p.x,p.y);});lighting.subscribe(s=>encounters!.setAmbient(s.ambient));
 progress(loaded+=40,steps,'Raising the Stronghold');

 const uprights=document.createElement('canvas');uprights.id='world-uprights';uprights.width=surface.width;uprights.height=surface.height;
 function paintWorld(){
  const u=uprights.getContext('2d')!;u.setTransform(1,0,0,1,0,0);u.clearRect(0,0,uprights.width,uprights.height);
  for(const c of [sc,u])c.setTransform(surface.width/worldWidth,0,0,surface.height/worldHeight,-left*surface.width/worldWidth,-top*surface.height/worldHeight);
  sc.fillStyle=snowPattern;sc.fillRect(left,top,worldWidth,worldHeight);sc.fillStyle=pavingPattern;sc.fill(paved);sc.drawImage(apron,apronX,apronY);sc.drawImage(shadow,shadowLeft,shadowTop);
  for(const p of objects){if(p.id==='gate'){sc.save();sc.translate(p.x,p.y);drawFoundation(sc,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));sc.restore();}else drawSprite(p.layer==='ground'?sc:u,p);}
  castShadows(false);
  surface.dataset.foundations='soil-moss-v1';dirty=false;surface.dataset.paints=String(Number(surface.dataset.paints||0)+1);lighting.capture(uprights);doors.refreshLighting();
  surfaceView.sync(worldWidth*scale,worldHeight*scale);
 }
 function draw(){
  if(!w||!h)return;if(dirty)paintWorld();const x=w/2-cx*scale,y=h/2-cy*scale;
  surfaceView.sprite.position.set(x+left*scale,y+top*scale);
  surfaceView.sprite.width=worldWidth*scale;
  surfaceView.sprite.height=worldHeight*scale;
  lighting.place(x,y,scale);doors.place(x,y,scale);hero.place(x,y,scale);party?.place(x,y,scale);encounters?.place(x,y,scale);

  snowSprite.width=w;
  snowSprite.height=h;
  snowSprite.tileScale.set(scale);
  snowSprite.tilePosition.set(x,y);

  canvas.dataset.ready='true';canvas.dataset.mode='full-screen';canvas.dataset.renderer='pixi-msdf-world';
  canvas.dataset.zoom='locked';canvas.dataset.scale=scale.toFixed(4);canvas.dataset.targetScale=targetScale().toFixed(4);canvas.dataset.reach=reachFactor().toFixed(2);
 }
 function requestDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 const baseScale=()=>Math.max(1,Math.min(1.35,h/630));
 const reachFactor=()=>encounters?.reach()??1;
 const targetScale=()=>{
  const r=Math.max(1,reachFactor()),base=baseScale(),raw=base/(1+(r-1)*.85);
  const fit=w&&h?Math.min((w-24)/(180*r),Math.max(180,h-240)/(110*r)):raw;
  return Math.max(.45,Math.min(1.35,raw,fit));
 };
 function resize(){const nw=canvas.clientWidth||innerWidth,nh=canvas.clientHeight||innerHeight,nd=Math.min(devicePixelRatio||1,1.75);if(nw===w&&nh===h&&nd===dpr)return;w=nw;h=nh;dpr=nd;
  scale=targetScale();vs=0;lastReach=reachFactor();requestDraw();}
 let glide=0;
 function stopGlide(){if(glide){cancelAnimationFrame(glide);glide=0;canvas.dataset.camera='idle';}}
 function glideTo(tx:number,ty:number){stopGlide();chasing=false;vx=vy=0;const fx=cx,fy=cy,distance=Math.hypot(tx-fx,ty-fy)*scale;
  if(distance<1||matchMedia('(prefers-reduced-motion: reduce)').matches){cx=tx;cy=ty;requestDraw();return;}
  const duration=Math.min(900,Math.max(380,240+distance*.6));let elapsed=0,last=0;canvas.dataset.camera='gliding';
  const step=(now:number)=>{elapsed+=last?Math.min(now-last,34):0;last=now;const t=Math.min(1,elapsed/duration),k=t<.5?4*t*t*t:1-(2-2*t)**3/2;cx=fx+(tx-fx)*k;cy=fy+(ty-fy)*k;draw();if(t<1)glide=requestAnimationFrame(step);else{glide=0;canvas.dataset.camera='idle';}};
  glide=requestAnimationFrame(step);}
 let chasing=false,vx=0,vy=0,vs=0,lastReach=1;const LAG=.22;
 new ResizeObserver(resize).observe(canvas);resize();
 function damp(from:number,to:number,v:number,t:number){if(t>=1)return [to,0];const f=2/LAG,x=f*t,e=1/(1+x+.48*x*x+.235*x*x*x),d=from-to,q=(v+f*d)*t;let out=to+(d+q)*e,nv=(v-f*q)*e;
  if(to-from>0===out>to){out=to;nv=0;}return [out,nv];}
 function follow(hx:number,hy:number,dt:number,walking=true){
  if(walking){updateGate(hx,hy);chasing=true;}
  if(!w)return;
  const r=reachFactor(),ts=targetScale();
  if(Math.abs(r-lastReach)>1e-4){lastReach=r;if(!held.size)chasing=true;}
  const zooming=Math.abs(ts-scale)>5e-4||Math.abs(vs)>1e-3;
  let changed=false;
  if(zooming){
   const [ns,nvs]=damp(scale,ts,vs,dt/1000);
   if(Math.abs(ns-scale)>1e-5){scale=ns;changed=true;}
   vs=Math.abs(ts-scale)<=5e-4&&Math.abs(nvs)<1e-3?0:nvs;
  }
  if(chasing&&!held.size){
   const snap=dt>=1000,zx=snap?0:w/scale*.16,zy=snap?0:h/scale*.14,fy=hy-40,tx=hx-Math.max(-zx,Math.min(zx,hx-cx)),ty=fy-Math.max(-zy,Math.min(zy,fy-cy));
   const [nx,nvx]=damp(cx,tx,vx,dt/1000),[ny,nvy]=damp(cy,ty,vy,dt/1000);vx=nvx;vy=nvy;
   if(!walking&&!zooming&&Math.abs(tx-nx)+Math.abs(ty-ny)<.05&&Math.abs(vx)+Math.abs(vy)<1){chasing=false;vx=vy=0;}
   if(Math.abs(nx-cx)+Math.abs(ny-cy)>=.001){stopGlide();cx=nx;cy=ny;changed=true;}
  }
  if(changed)draw();
 }
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.addEventListener('pointerdown',e=>{
  if(canPanCanvas&&!canPanCanvas(e.clientX,e.clientY))return;
  stopGlide();chasing=false;vx=vy=0;
  try{canvas.setPointerCapture(e.pointerId);}catch{}
  held.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};moved=false;
 });
 canvas.addEventListener('pointermove',e=>{
  const prev=held.get(e.pointerId);if(!prev)return;
  if(held.size===1){cx-=(e.clientX-prev.x)/scale;cy-=(e.clientY-prev.y)/scale;}else moved=true;
  held.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)moved=true;
  requestDraw();
 });
 const masks=new Map<string,{data:Uint8ClampedArray;width:number;height:number}>();
 function hitBuilding(id:Building,x:number,y:number){if(id==='gate')return doors.hit(x,y);const s=slots[id],c=calibration(id),file=spriteFile(id,levels?.[id]||1),image=images.get(file)!,height=image.height*s.width/image.width,dx=x-s.x,dy=(y-s.y-c.shear*dx)/c.vertical,px=(dx+s.width/2)/s.width,py=(dy+height*s.pivot)/height;if(px<0||py<0||px>=1||py>=1)return false;let mask=masks.get(file);if(!mask){const sample=document.createElement('canvas');sample.width=192;sample.height=Math.ceil(192*image.height/image.width);const sc=sample.getContext('2d')!;sc.drawImage(image,0,0,sample.width,sample.height);mask={data:sc.getImageData(0,0,sample.width,sample.height).data,width:sample.width,height:sample.height};masks.set(file,mask);}return mask.data[(Math.floor(py*mask.height)*mask.width+Math.floor(px*mask.width))*4+3]>40;}
 canvas.addEventListener('pointerup',e=>{
  if(!held.has(e.pointerId))return;
  held.delete(e.pointerId);
  if(moved||(canPanCanvas&&!canPanCanvas(e.clientX,e.clientY)))return;
  const x=cx+(e.clientX-w/2)/scale,y=cy+(e.clientY-h/2)/scale;
  const hit=[...built].sort((a,b)=>slots[b].y-slots[a].y).find(id=>hitBuilding(id,x,y));
  if(hit)onSelect(hit);
 });
 canvas.addEventListener('pointercancel',()=>{held.clear();moved=true;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();},{passive:false});
 function updateGate(hx:number,hy:number){
  const d=Math.abs(hx-577),edge=d<36||d>135?778:gateTowerFront(d);
  doors.order(hy<edge);
  const g=net?.active()?net.gate():null,near=g?g.open:Math.abs(hx-577)<(gateOpen?65:48)&&Math.abs(hy-778)<(gateOpen?88:66);
  if(near===gateOpen)return;
  gateOpen=near;doors.setOpen(near);
  canvas.dataset.gate=near?'open':'closed';
 }
 (window as any).__STRONGHOLD_NAV__=()=>({version:1,layout:[...built],columns:objects.filter(p=>p.layer!=='ground'&&p.opacity>=1&&p.id!=='gate').flatMap(p=>footprint(p).map(c=>({x:+c.x.toFixed(2),w:+c.w.toFixed(2),back:+c.back.toFixed(2),front:+c.front.toFixed(2)})))});
 canvas.dataset.gate='closed';setGateOpen(false);updateGate(hero.position().x,hero.position().y);
 hero.start();encounters.start();
 return {
  hud:encounters.hud,
  encounters,
  update(state:State,id:Building|null){encounters?.setMaxHp(100+heroBonus(state));const room=net?.active()?net.layout().filter((b):b is Building=>(buildings as readonly string[]).includes(b)):null;
   const next=buildings.map(b=>state.levels[b]+(isBuilt(state,b)?'':'x')).join(',')+':'+id+':'+(room?.join('+')??'');if(next===signature)return;signature=next;levels=state.levels;selected=id;
   if(!LEGACY_LAYOUT||room)built=new Set(room??buildings.filter(b=>isBuilt(state,b)));canvas.dataset.buildings=[...built].join(',');objects=makeObjects();lighting.setScene(objects);hero.setScene(objects);party?.setScene(objects);dirty=true;requestDraw();},
  focus(id:Building){glideTo(slots[id].x,slots[id].y-60);},
  fit(){stopGlide();chasing=false;vx=vy=0;scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;requestDraw();},
  setHero:hero.setHero,
  setTime:lighting.setTime,
  previewClock:lighting.preview,
  subscribeClock:lighting.subscribe,
 };
}
