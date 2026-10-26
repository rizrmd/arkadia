import {loadJsonAsset} from '../app/json-asset';
import {BRAZIER_PHYSICAL_SOURCE,withBrazierShadowMaterial} from './brazier-shadow-material';
import {torchShadowSurfaces} from './torch-shadow';
import {torchAssetsReady} from './torches';
import {withTentGeometry} from './tent-shadow';
import {createSceneShadows} from './scene-shadows';
import {sampleSurface,type ShadowSurface} from './shadow-surfaces';
import {requestGameFrame as requestAnimationFrame,cancelGameFrame as cancelAnimationFrame} from '../app/frame-scheduler';
import {Container,CanvasSource,RendererType,Texture,TilingSprite} from 'pixi.js';
import {FOUNDATION_SOIL,FOUNDATION_MOSS,FOUNDATION_DRIFT,drawFoundation,foundationLayers} from './foundations';
import {environmentSprites,COURT,tilePoint,LEGACY_LAYOUT} from './terrain';
import {slots,calibration,WORLD} from './scene';
import {buildings,isBuilt,heroBonus,START_BUILT,type Building,type State} from './economy';
import {createLighting} from './lighting';
import {sunAt} from './daylight';
import {createHero,prewarmOcclusionAlpha} from './hero';
import {createEncounters} from './encounters';
import {setGateOpen,gateTowerFront} from './navigation';
import {atGate} from './net/movement';
import {STRONGHOLD} from './prefabs/stronghold';
import {paintRelief,paintReliefShadow,reliefShadowHeight,CLIFF_ART,NATURAL_CLIFF_ART} from './relief-art';
import {createGateDoors,GATE_SHEET,type GateSheet} from './gate-doors';
import type {Walk} from './controls';
import {createCanvasSprite,loadImage,expectSizes,downloadedBytes,onDownload,type Progress,type SharedPixiRuntime} from '../app/loader';
import type {HudCallbacks} from '../typography/hud';
import type {Net} from './net/client';
import {createParty} from './party';
import {characters,atlasUrl,DEFAULT_HERO,type HeroId} from './heroes';
import {measureTracelogPhase} from './tracelog';
import {measureRenderDetail} from '../app/render-diagnostics';
import {createGpuPreparation} from '../app/gpu-preparation';
import {createParallax,initialParallaxFiles} from './parallax';
import {createAutoWalk,type AutoWalk} from './auto-walk';
import {WorldMap} from './world-map';
import {createFrontier} from './frontier-view';
import {FRONTIER_ATLAS} from '../world/frontier';

export async function createWorldView(
 rt:SharedPixiRuntime,
 onSelect:(id:Building)=>void,
 direction:()=>Walk,
 progress:Progress=()=>{},
 net?:Net,
 pick:HeroId=DEFAULT_HERO,
 hudCallbacks?:HudCallbacks,
 canPanCanvas?:(clientX:number,clientY:number)=>boolean,
 hold:Promise<void>=Promise.resolve(),
){
 const canvas=rt.app.canvas;
 const {worldStage,uiStage,frames}=rt;
 worldStage.sortableChildren=true;
 const staticStage=new Container();staticStage.sortableChildren=true;staticStage.zIndex=10;worldStage.addChild(staticStage);
 const useDepthShadows=rt.app.renderer.type===RendererType.WEBGL&&new URLSearchParams(location.search).get('shadowField')!=='0';
 const sceneShadows=useDepthShadows?createSceneShadows(staticStage,()=>requestDraw(),rt.app.renderer,rt.app.stage):null;
 (window as any).__SCENE_SHADOWS__=useDepthShadows?sceneShadows:null;
 uiStage.sortableChildren=true;

 const probeCtx=document.createElement('canvas').getContext('2d')!;
 const environment=environmentSprites(),images=new Map<string,HTMLImageElement>();
 let gateOpen=false,gatePassable=false;
 const spriteFile=(id:Building,level:number)=>id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/full-gateway-v7-closed.webp':`/assets/${slots[id].asset}.png`;
 const paving='/modular-stronghold/v2/paving-warm-texture.png',snow='/modular-stronghold/v2/snow-soft-texture.png';
 const files=[...new Set([...(environment.some(p=>p.id==='brazier')?[BRAZIER_PHYSICAL_SOURCE]:[]),FRONTIER_ATLAS,FOUNDATION_SOIL,FOUNDATION_MOSS,FOUNDATION_DRIFT,paving,snow,CLIFF_ART,NATURAL_CLIFF_ART,'/modular-stronghold/v2/full-gateway-v7-closed.webp',...environment.map(p=>p.file),...buildings.flatMap(b=>[1,2,3].map(l=>spriteFile(b,l)))])];
 const DOWNLOAD=920,steps=1000,mb=(n:number)=>(n/1e6).toFixed(1);let loaded=DOWNLOAD;
 let queued=0;const report=()=>{queued=0;const {received,expected}=downloadedBytes();progress(320+Math.floor((DOWNLOAD-320)*received/Math.max(1,expected)),steps,`Loading artwork · ${mb(received)} of ${mb(expected)} MB`);};
 const stopReport=onDownload(()=>{queued||=requestAnimationFrame(report);});progress(320,steps,'Loading artwork');
 const [atlas]=await Promise.all([characters() as Promise<Record<string,{image:string;revision?:string}>>,expectSizes()]),artwork=files.map(async file=>{images.set(file,await loadImage(file));}),parallaxPreload=initialParallaxFiles().map(file=>loadImage(file));
 try{
  await Promise.all([torchAssetsReady,...artwork,...parallaxPreload,...[atlas[pick]??atlas[DEFAULT_HERO],atlas.revenant].map(m=>loadImage(atlasUrl(m)))]);
 }finally{stopReport();cancelAnimationFrame(queued);}
 report();
 const gateSheetImg=new Image(),ensureGateSheet=()=>{if(!gateSheetImg.src)gateSheetImg.src='/modular-stronghold/v2/full-gateway-v7-sheet.webp';};
 let w=0,h=0,dpr=1,scale=1,cx=WORLD.width/2,cy=385,selected:Building|null=null,levels:State['levels']|undefined;
 let built=new Set<Building>(LEGACY_LAYOUT?buildings:START_BUILT);
 const material=(file:string,size:number)=>{const img=images.get(file)!,s=size*1024/img.width,p=probeCtx.createPattern(img,'repeat')!;p.setTransform(new DOMMatrix([s,s/2,-s,s/2,COURT.x,COURT.y]));return p;};
 const snowPattern=material(snow,.7),pavingPattern=material(paving,.22);
 // Raised terrain (world/relief.ts): plateaus and ramps get their own sprites just above the baked surface, tinted
 // like the open snow, and join the hero's scene so they hide actors standing below and behind them.
 const relief=paintRelief(images.get(snow)!,images.get(CLIFF_ART)!,images.get(NATURAL_CLIFF_ART)!).map(r=>{const view=createCanvasSprite(r.canvas);view.sync(r.width,r.height);view.sprite.zIndex=10.5;staticStage.addChild(view.sprite);return {...r,view};});
 // Their sun shadows, under them on the ground, repainted with the world's shadows (castShadows).
 const reliefShadows=relief.map(r=>{const canvas=document.createElement('canvas'),view=createCanvasSprite(canvas);view.sprite.zIndex=10.4;view.sprite.visible=false;staticStage.addChild(view.sprite);return {feature:r.feature,canvas,view,left:0,top:0,width:0,height:0};});
 function shadeRelief(s:{alpha:number;dx:number;dy:number}){for(const r of reliefShadows){r.view.sprite.visible=s.alpha>0;if(!s.alpha)continue;Object.assign(r,paintReliefShadow(r.feature,s.dx,s.dy,r.canvas));r.view.sync(r.width,r.height);r.view.sprite.alpha=s.alpha;}requestDraw();}
 const reliefScene=relief.map(r=>({layer:'world' as const,id:'relief:'+r.feature.id,x:r.left+r.width/2,y:r.bottom,width:r.width,height:r.height,foot:1,shear:0,vertical:1,depth:r.bottom,opacity:1,file:'relief:'+r.feature.id,selected:false,occluder:undefined as HTMLCanvasElement|undefined,image:r.canvas as unknown as HTMLImageElement,relief:r.feature}));
 // The Frozen Frontier's ruins, landmarks and plants on the snow beyond (world/frontier.ts, frontier-view.ts).
 const frontier=createFrontier(staticStage,images.get(FRONTIER_ATLAS)!);frontier.setLegacyShadows(!useDepthShadows);
 await frontier.ready;
 const frontierScene=frontier.scene as unknown as typeof reliefScene;
 const alphaPrepared=new WeakSet<HTMLImageElement>(),alphaJobs=new Set<Promise<void>>();
 const prepareAlpha=(placed:(typeof frontierScene)[number])=>{
  const image=placed.image;if(alphaPrepared.has(image)||!image.complete||!image.naturalWidth)return;
  alphaPrepared.add(image);
  const job=new Promise<void>(resolve=>setTimeout(resolve,0)).then(()=>{prewarmOcclusionAlpha(placed);});
  alphaJobs.add(job);void job.then(()=>alphaJobs.delete(job),error=>{alphaJobs.delete(job);console.error('Occlusion alpha preparation failed',error);});
 };
 const alphaImages=new Set<HTMLImageElement>();
 for(const placed of frontierScene)if(!alphaImages.has(placed.image)){alphaImages.add(placed.image);placed.image.addEventListener('load',()=>prepareAlpha(placed),{once:true});prepareAlpha(placed);}
 const scene=()=>[...objects,...reliefScene,...frontierScene];
 const polygon=(corners:number[][])=>{const path=new Path2D();corners.forEach(([u,v],i)=>{const p=tilePoint(u,v);i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y);});path.closePath();return path;};
 // Court size, gateway and its apron come from prefabs/stronghold.json.
 const N=COURT.size,G=STRONGHOLD.gate,A=G.apron,GS=STRONGHOLD.buildings.gate;
 const court=polygon([[0,0],[N,0],[N,N],[0,N]]),paved=polygon([[-.5,-.5],[N,-.5],[N,N],[-.5,N]]);

 const apron=document.createElement('canvas'),apronX=A.x,apronY=A.y;
 apron.width=A.width;apron.height=A.height;const ac=apron.getContext('2d')!;
 ac.translate(-apronX,-apronY);ac.fillStyle=snowPattern;ac.fillRect(apronX,apronY,apron.width,apron.height);
 const snowPixels=ac.getImageData(0,0,apron.width,apron.height);
 for(let y=0;y<apron.height;y++)for(let x=0;x<apron.width;x++){
  const wx=x+apronX,wy=y+apronY,edge=A.edge-Math.abs(wx-G.x)*A.slope;
  const noise=Math.sin(wx*.37+wy*.23)*5+Math.sin(wx*.91-wy*.71)*2.5;
  const t=Math.max(0,Math.min(1,(wy-edge+20+noise)/40));
  snowPixels.data[(y*apron.width+x)*4+3]=Math.round(255*t*t*(3-2*t));
 }
 ac.putImageData(snowPixels,0,0);

 const shadow=document.createElement('canvas'),shadowLeft=COURT.x-N*64-64,shadowTop=COURT.y-64;
 shadow.width=N*128+128;shadow.height=N*64+128;const shadowCtx=shadow.getContext('2d')!;shadowCtx.translate(-shadowLeft,-shadowTop);shadowCtx.strokeStyle='#29392d26';shadowCtx.lineWidth=30;shadowCtx.filter='blur(10px)';shadowCtx.stroke(court);
 let gateOccluder:HTMLCanvasElement|undefined;
 function makeObjects(all=false){return [...environment.map(p=>({...p,selected:false,occluder:undefined as HTMLCanvasElement|undefined})),...buildings.filter(id=>all||built.has(id)).map(id=>{const s=slots[id],c=calibration(id);return {layer:id==='gate'?'foreground' as const:'world' as const,id,...s,foot:s.pivot,shear:c.shear,vertical:c.vertical,depth:s.y,opacity:1,file:spriteFile(id,levels?.[id]||1),selected:id===selected,occluder:id==='gate'?gateOccluder:undefined};})].sort((a,b)=>({ground:0,backdrop:1,world:2,foreground:3})[a.layer]-({ground:0,backdrop:1,world:2,foreground:3})[b.layer]||a.depth-b.depth).map(p=>({...p,image:images.get(p.file)!,height:images.get(p.file)!.height*p.width/images.get(p.file)!.width}));}
 let objects=makeObjects(),signature='',lastLayoutSig='';canvas.dataset.buildings=[...built].join(',');

 // Infinite snow repeat TilingSprite + offscreen world surface Sprite in Pixi worldStage
 const periodX=1024*1.4,periodY=1024*.7;
 const repeat=document.createElement('canvas');repeat.width=Math.ceil(periodX);repeat.height=Math.ceil(periodY);const rc=repeat.getContext('2d')!;
 rc.scale(repeat.width/periodX,repeat.height/periodY);rc.fillStyle=snowPattern;rc.fillRect(0,0,periodX,periodY);
 const repeatSource=new CanvasSource({resource:repeat,resolution:1});
 repeatSource.update();
 const snowSprite=new TilingSprite({texture:new Texture({source:repeatSource}),width:innerWidth||1440,height:innerHeight||900});
 snowSprite.zIndex=0;
 staticStage.addChild(snowSprite);

 const surface=document.createElement('canvas');surface.id='world-surface';(window as any).__WORLD_SURFACE__=surface;
 const boundsObjects=makeObjects(true).map(p=>({...p,height:p.id==='forge'?Math.max(...[1,2,3].map(l=>{const image=images.get(spriteFile('forge',l))!;return image.height*p.width/image.width;})):p.height}));
 const points=boundsObjects.flatMap(p=>[-p.width/2,p.width/2].flatMap(x=>[-p.height*p.foot,p.height*(1-p.foot)].map(y=>({x:p.x+x,y:p.y+p.shear*x+p.vertical*y}))));
 const corners=[[0,0],[N,0],[N,N],[0,N]].map(([u,v])=>tilePoint(u,v));points.push(...corners);
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
 staticStage.addChild(surfaceView.sprite);

 const sc=surface.getContext('2d')!;let dirty=true,frame=0;
 const lighting=createLighting({
  worldStage:staticStage,
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
  const step=G.columnStep,D=G.doors,H=G.footprintHeight;
  for(const side of [-1,1])for(let d=G.archHalfWidth;d<=G.towerHalfSpan;d+=step){
   const front=gateTowerFront(d);
   cols.push({x:G.x+side*d,w:step,back:front-G.towerDepth,front,height:H.tower});
  }
  if(!gatePassable)for(let d=-D.halfWidth;d<=D.halfWidth;d+=step)cols.push({x:G.x+d,w:step,back:D.back,front:D.front,height:H.doors});
  return cols;
 }
 function footprint(p:(typeof objects)[number]){
  if((p as {relief?:unknown}).relief)return [];
  const ff=frontier.columns(p);if(ff)return ff;
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
   else{const f=at(i,edge[i]).y,r=front(2*ci-i);front0=f;back=r<0?f:Math.min(f,at(i,2*cy-r).y);if(/^rampart-/.test(p.id))back=Math.min(back,f-28);}
   cols.push({x:t.x,w,back,front:front0,height:Math.max(0,back-t.y)});}
  footprints.set(key,cols);return cols;
 }
 const hull=(points:[number,number][])=>{points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),chain=(list:[number,number][])=>{const h:[number,number][]=[];for(const q of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],q)<=0)h.pop();h.push(q);}h.pop();return h;};return [...chain(points),...chain([...points].reverse())];};
 const SHADE=.35,mask=document.createElement('canvas'),soft=document.createElement('canvas');mask.width=soft.width=Math.ceil(worldWidth*SHADE);mask.height=soft.height=Math.ceil(worldHeight*SHADE);
 function drawSprite(c:CanvasRenderingContext2D,p:(typeof objects)[number]){c.save();c.globalAlpha=p.opacity;c.translate(p.x,p.y);c.transform(1,p.shear,0,p.vertical,0,0);drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));if(p.selected){c.shadowColor='#ffca64';c.shadowBlur=9;}c.drawImage(p.image,-p.width/2,-p.height*p.foot,p.width,p.height);c.shadowBlur=0;drawFoundation(c,p,images.get(FOUNDATION_SOIL)!,'face',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));c.restore();}
 let shadowSceneKey='';
 let tentShadowSamples:ReturnType<typeof sampleSurface>['samples']|undefined;
 function shadowSurfaces():ShadowSurface[]{
  const court:ShadowSurface[]=objects.filter(p=>p.id!=='gate').map(p=>({key:p.id+':'+p.file,source:p.image,sourceWidth:p.image.naturalWidth,sourceHeight:p.image.naturalHeight,x:p.x,y:p.y,width:p.width,height:p.height,pivot:[.5,p.foot],shear:p.shear,vertical:p.vertical,depth:p.depth,cast:p.layer!=='ground'&&p.opacity>=1,...(p.layer==='ground'?{constantHeight:0}:{})}));
  const ff=frontier.shadowSurfaces();
  const terrain:ShadowSurface[]=relief.map(r=>({key:'relief:'+r.feature.id,source:r.canvas,sourceWidth:r.canvas.width,sourceHeight:r.canvas.height,x:r.left+r.width/2,y:r.bottom,width:r.width,height:r.height,pivot:[.5,1],heightAtScreen:(x,y)=>reliefShadowHeight(r.feature,x,y)}));
  return [...court.map(p=>p.key.startsWith('expedition:')?withTentGeometry(p):withBrazierShadowMaterial(p,images.get(BRAZIER_PHYSICAL_SOURCE))),...ff.filter(p=>p.groundLayer||p.constantHeight!==undefined),...terrain,...ff.filter(p=>!p.groundLayer&&p.constantHeight===undefined),...torchShadowSurfaces()];
 }
 function castShadows(paint=true){
  const s=lighting.sun();frontier.setSun(s);
  if(useDepthShadows){const sig=objects.map(p=>p.id+':'+p.file+':'+p.width).join('|');if(sig!==shadowSceneKey){shadowSceneKey=sig;sceneShadows?.setScene(shadowSurfaces());}sceneShadows?.setSun(s);lighting.setShadow(null,0,paint);return;}
  shadeRelief(s);
  if(!s.alpha){lighting.setShadow(null,0,paint);return;}
  measureTracelogPhase('shadowCast',()=>{
   const m=mask.getContext('2d')!,g=soft.getContext('2d')!;
   m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,mask.width,mask.height);m.setTransform(SHADE,0,0,SHADE,-left*SHADE,-top*SHADE);m.fillStyle='rgb(20,28,44)';
   for(const p of objects){if(p.layer==='ground'||p.opacity<1)continue;
    if(p.id==='expedition'){
     tentShadowSamples??=sampleSurface(withTentGeometry({key:p.id,source:p.image,sourceWidth:p.image.naturalWidth,sourceHeight:p.image.naturalHeight,x:p.x,y:p.y,width:p.width,height:p.height,pivot:[.5,p.foot],shear:p.shear,vertical:p.vertical}),2).samples;
     for(const q of tentShadowSamples){if(q.alpha<.5)continue;const v=q.quad!;m.beginPath();for(let i=0;i<12;i+=3){const x=v[i]+s.dx*v[i+2],y=v[i+1]+s.dy*v[i+2];if(i)m.lineTo(x,y);else m.moveTo(x,y);}m.closePath();m.fill();}continue;
    }
    for(const c of footprint(p)){const vx=c.height*s.dx,vy=c.height*s.dy,a=c.x-c.w/2,b=c.x+c.w/2;
     const h=hull([[a,c.back],[b,c.back],[a,c.front],[b,c.front],[a+vx,c.back+vy],[b+vx,c.back+vy],[a+vx,c.front+vy],[b+vx,c.front+vy]]);
     m.beginPath();h.forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.fill();}}
   g.clearRect(0,0,soft.width,soft.height);g.filter=`blur(${(.7+Math.hypot(s.dx,s.dy*2)).toFixed(2)}px)`;g.drawImage(mask,0,0);g.filter='none';
  });
  lighting.setShadow(soft,s.alpha,paint);
 }

 // Yield after each milestone so the loading percentage paints before CPU preparation.
 const milestone=async(done:number,label:string)=>{progress(done,steps,label);await new Promise<void>(resolve=>setTimeout(resolve,0));};
 await milestone(loaded,'Waking the hero');
 const sheet=await loadJsonAsset<GateSheet>(GATE_SHEET);
 const gateP=objects.find(p=>p.id==='gate')!;const gateProxy=useDepthShadows?sampleSurface({key:'gate',source:gateP.image,sourceWidth:gateP.image.naturalWidth,sourceHeight:gateP.image.naturalHeight,x:gateP.x,y:gateP.y,width:gateP.width,height:gateP.height,pivot:[.5,gateP.foot],shear:gateP.shear,vertical:gateP.vertical},1.5).surface:null;
 const doors=createGateDoors(staticStage,images.get('/modular-stronghold/v2/full-gateway-v7-closed.webp')!,gateSheetImg,sheet,open=>{gatePassable=open;setGateOpen(open);hero.setScene(scene());party?.setScene(scene());},{raster,onShadowFrame:(source,index)=>{if(gateProxy)sceneShadows?.setDynamic([{...gateProxy,key:'gateway-frame:'+index,source,sourceWidth:source.width,sourceHeight:source.height}]);},foundation:foundationLayers(objects.find(p=>p.id==='gate')!,images.get(FOUNDATION_SOIL)!,images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS))!,revision:lighting.spriteRevision,torches:lighting.torches,shade:(source,target)=>lighting.shadeSprite(source,target,{left:GS.x-GS.width/2,top:GS.y-sheet.region.h*GS.pivot,width:GS.width,height:sheet.region.h})});
 gateOccluder=doors.canvas;for(const p of objects)if(p.id==='gate'){p.occluder=gateOccluder;prewarmOcclusionAlpha(p);}
 lighting.subscribe(()=>doors.refreshLighting());
 // Combat (encounters.ts) swings the idle hero in place at a revenant at its maximum reach (it never chases) and plays its swing, hit and death clips.
 let encounters:Awaited<ReturnType<typeof createEncounters>>|undefined;
 // Keys and the stick, or else a tap-to-walk route from the full map (auto-walk.ts).
 let walker:AutoWalk|undefined;const input=()=>walker?walker.input(direction()):direction();
 await milestone(925,'Waking the hero · preparing the hero');
 const hero=await createHero<(typeof objects)[number]>({hero:pick,layer:worldStage,lightmap:lighting.lightmap,surface,footprint:p=>p.id==='gate'?gateFootprint():footprint(p),sun:lighting.sun,direction:()=>encounters?encounters.steer(input()):input(),follow,pose:()=>encounters?.pose()??null,
  drive:()=>{if(!net?.active())return null;const p=net.position(),me=net.me();return {...p,face:direction(),look:me&&me.st!=='idle'?{facing:me.fc,back:me.bk,vertical:me.vt}:null};}});hero.setScene(scene());
 await milestone(930,'Waking the hero · preparing combat');
 encounters=await createEncounters({renderer:rt.app.renderer,worldStage,uiStage,frames,hudCallbacks,showCoop:Boolean(net),cancelRoute:()=>walker?.cancel(),hero,direction:input,net});
 const worldMap=new WorldMap(frames,{hero:hero.position,built:()=>[...built],route:()=>walker?.route()??null,walk:(x,y)=>walker?.goTo(x,y)??false});
 walker=createAutoWalk({blocked:hero.blocked,position:hero.position,onChange:r=>encounters!.minimap.setRoute(r)});
 uiStage.addChild(worldMap);encounters.minimap.onOpen=()=>worldMap.toggle();
 const party=net?createParty<(typeof objects)[number]>({layer:worldStage,frames,lightmap:lighting.lightmap,surface,footprint:p=>p.id==='gate'?gateFootprint():footprint(p),sun:lighting.sun,net,own:()=>hero.position()}):null;party?.setScene(scene());
 await milestone(940,'Waking the hero · loading backgrounds');
 const parallax=await createParallax({worldStage,anchorX:WORLD.width/2,anchorY:385,getHeroWorld:()=>hero.position(),getCombatantsWorld:()=>encounters?encounters.combatants():[hero.position()]});
 lighting.setClockSource(()=>net?.active()?net.clock():null);net?.onSnapshot(()=>{const p=hero.position();updateGate(p.x,p.y);});lighting.subscribe(s=>encounters!.setAmbient(s.ambient));
 lighting.subscribe(s=>{const [r,g,b]=s.ambient.map(v=>Math.round(Math.round(v*32)/32*255));for(const f of relief)f.view.sprite.tint=(r<<16)|(g<<8)|b;frontier.setAmbient((r<<16)|(g<<8)|b);});
 await milestone(loaded=950,'Raising the Stronghold');

 const uprights=document.createElement('canvas');uprights.id='world-uprights';uprights.width=surface.width;uprights.height=surface.height;
 const baseSurface=document.createElement('canvas');baseSurface.width=surface.width;baseSurface.height=surface.height;
 const baseUprights=document.createElement('canvas');baseUprights.width=surface.width;baseUprights.height=surface.height;
 let shadowsDirty=true,baseDirty=true;
 function paintWorld(){
  measureTracelogPhase('worldPaint',()=>{
   const u=uprights.getContext('2d')!;
   if(baseDirty){
    const bs=baseSurface.getContext('2d')!,bu=baseUprights.getContext('2d')!;
    bu.setTransform(1,0,0,1,0,0);bu.clearRect(0,0,baseUprights.width,baseUprights.height);
    for(const c of [bs,bu])c.setTransform(surface.width/worldWidth,0,0,surface.height/worldHeight,-left*surface.width/worldWidth,-top*surface.height/worldHeight);
    bs.fillStyle=snowPattern;bs.fillRect(left,top,worldWidth,worldHeight);bs.fillStyle=pavingPattern;bs.fill(paved);bs.drawImage(apron,apronX,apronY);bs.drawImage(shadow,shadowLeft,shadowTop);
    for(const p of objects){if(p.id==='gate'){bs.save();bs.translate(p.x,p.y);drawFoundation(bs,p,images.get(FOUNDATION_SOIL)!,'under',images.get(FOUNDATION_DRIFT),images.get(FOUNDATION_MOSS));bs.restore();}else drawSprite(p.layer==='ground'?bs:bu,{...p,selected:false});}
    baseDirty=false;
   }
   sc.setTransform(1,0,0,1,0,0);sc.globalCompositeOperation='copy';sc.drawImage(baseSurface,0,0);sc.globalCompositeOperation='source-over';
   u.setTransform(1,0,0,1,0,0);u.globalCompositeOperation='copy';u.drawImage(baseUprights,0,0);u.globalCompositeOperation='source-over';
   for(const c of [sc,u])c.setTransform(surface.width/worldWidth,0,0,surface.height/worldHeight,-left*surface.width/worldWidth,-top*surface.height/worldHeight);
   for(const p of objects)if(p.selected&&p.id!=='gate')drawSprite(p.layer==='ground'?sc:u,p);
   if(shadowsDirty){castShadows(false);shadowsDirty=false;}
   surface.dataset.foundations='soil-moss-v1';dirty=false;surface.dataset.paints=String(Number(surface.dataset.paints||0)+1);lighting.capture(uprights);doors.refreshLighting();
   surfaceView.sync(worldWidth*scale,worldHeight*scale);
  });
 }
 function draw(){
  if(!w||!h)return;
  measureTracelogPhase('worldDraw',()=>{
   if(dirty)paintWorld();const x=w/2-cx*scale,y=h/2-cy*scale;
   surfaceView.sprite.position.set(x+left*scale,y+top*scale);
   surfaceView.sprite.width=worldWidth*scale;
   surfaceView.sprite.height=worldHeight*scale;
   surface.style.width=worldWidth*scale+'px';surface.style.height=worldHeight*scale+'px';
   for(const r of reliefShadows){r.view.sprite.position.set(x+r.left*scale,y+r.top*scale);r.view.sprite.width=r.width*scale;r.view.sprite.height=r.height*scale;}
   for(const r of relief){r.view.sprite.position.set(x+r.left*scale,y+r.top*scale);r.view.sprite.width=r.width*scale;r.view.sprite.height=r.height*scale;}
   measureRenderDetail('shadowFieldPlace',()=>sceneShadows?.place(x,y,scale,w,h));
   measureRenderDetail('frontierPlace',()=>frontier.place(x,y,scale,w,h));
   measureRenderDetail('lightingPlace',()=>lighting.place(x,y,scale));
   measureRenderDetail('gatePlace',()=>doors.place(x,y,scale));
   measureRenderDetail('heroPlace',()=>hero.place(x,y,scale));
   measureRenderDetail('partyPlace',()=>party?.place(x,y,scale));
   measureRenderDetail('encountersPlace',()=>encounters?.place(x,y,scale));
   measureRenderDetail('parallaxPlace',()=>parallax.place(cx,cy,scale,w,h));

   snowSprite.width=w;
   snowSprite.height=h;
   snowSprite.tileScale.set(scale);
   snowSprite.tilePosition.set(x,y);

   const pSnap=parallax.state();
   canvas.dataset.ready='true';canvas.dataset.mode='full-screen';canvas.dataset.renderer='pixi-msdf-world';
   canvas.dataset.zoom='locked';canvas.dataset.scale=scale.toFixed(4);canvas.dataset.targetScale=targetScale().toFixed(4);canvas.dataset.reach=reachFactor().toFixed(2);
   canvas.dataset.biome=pSnap.biome;canvas.dataset.cornerArea=pSnap.area;
  });
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
  const snap=dt>=1000;
  if(snap){held.clear();chasing=true;}
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
   const zx=snap?0:w/scale*.16,zy=snap?0:h/scale*.14,fy=hy-40,tx=hx-Math.max(-zx,Math.min(zx,hx-cx)),ty=fy-Math.max(-zy,Math.min(zy,fy-cy));
   const [nx,nvx]=damp(cx,tx,vx,dt/1000),[ny,nvy]=damp(cy,ty,vy,dt/1000);vx=nvx;vy=nvy;
   if(!walking&&!zooming&&Math.abs(tx-nx)+Math.abs(ty-ny)<.05&&Math.abs(vx)+Math.abs(vy)<1){chasing=false;vx=vy=0;}
   if(Math.abs(nx-cx)+Math.abs(ny-cy)>=.001){stopGlide();cx=nx;cy=ny;changed=true;}
  }
  if(changed)draw();
 }
 const held=new Map<number,{x:number;y:number}>();let moved=false,down={x:0,y:0};
 canvas.addEventListener('pointerdown',e=>{
  if(!e.isTrusted||(canPanCanvas&&!canPanCanvas(e.clientX,e.clientY)))return;
  if(e.isPrimary&&held.size>0)held.clear();
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
 canvas.addEventListener('lostpointercapture',e=>{held.delete(e.pointerId);});
 window.addEventListener('pointerup',e=>{held.delete(e.pointerId);});
 window.addEventListener('pointercancel',()=>{held.clear();moved=true;});
 window.addEventListener('blur',()=>{held.clear();moved=true;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();moved=true;}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();},{passive:false});
 function updateGate(hx:number,hy:number){
  const d=Math.abs(hx-G.x),edge=d<G.archHalfWidth||d>G.towerHalfSpan?G.frontY:gateTowerFront(d);
  doors.order(hy<edge);
  const g=net?.active()?net.gate():null,near=g?g.open:atGate(hx,hy,gateOpen);
  if(near)ensureGateSheet();
  if(near===gateOpen)return;
  gateOpen=near;doors.setOpen(near);
  canvas.dataset.gate=near?'open':'closed';
 }
 (window as any).__STRONGHOLD_NAV__=()=>({version:1,layout:[...built],columns:objects.filter(p=>p.layer!=='ground'&&p.opacity>=1&&p.id!=='gate').flatMap(p=>footprint(p).map(c=>({x:+c.x.toFixed(2),w:+c.w.toFixed(2),back:+c.back.toFixed(2),front:+c.front.toFixed(2)})))});
 canvas.dataset.gate='closed';setGateOpen(false);updateGate(hero.position().x,hero.position().y);
 // Open on the hero (as follow() frames it) without drawing: the first paint waits for the saved layout (main.ts).
 {const a=hero.anchor();cx=a.x;cy=a.y-40;}
 // Gameplay (the hero and the revenants) starts once `hold` resolves: after the loading screen, and on a first visit
 // after Choose Your Hero. Until then the camera already frames the hero.
 const loadGateAfterDone=()=>{const s=document.querySelector<HTMLElement>('#loading-screen');if(s&&s.dataset.state!=='done'){setTimeout(loadGateAfterDone,120);return;}ensureGateSheet();};
 parallax.start();void hold.then(()=>{hero.start();encounters.start();setTimeout(loadGateAfterDone,120);});
 (window as any).__WORLD_MAP__={map:worldMap,walker,open:(v=true)=>worldMap.open(v),walkTo:(x:number,y:number)=>walker!.goTo(x,y),route:()=>walker!.route(),snapshot:()=>worldMap.snapshot(),screenOf:(x:number,y:number)=>worldMap.screenOf({x,y})};
 return {
  prepareGpu:()=>createGpuPreparation(rt.app.renderer).prepare(worldStage,useDepthShadows?['shadow-actors']:[]),
  hud:encounters.hud,
  encounters,
  parallax,
  worldMap,
  // The hero's walk input (keys, stick or a map route), for co-op (main.ts) to send.
  direction:input,
  update(state:State,id:Building|null){
   encounters?.setMaxHp(100+heroBonus(state));
   const room=net?.active()?net.layout().filter((b):b is Building=>(buildings as readonly string[]).includes(b)):null;
   const nextBuilt=(!LEGACY_LAYOUT||room)?new Set(room??buildings.filter(b=>isBuilt(state,b))):new Set(built);
   const layoutSig=buildings.map(b=>state.levels[b]+(nextBuilt.has(b)?'':'x')).join(',');
   const next=layoutSig+':'+id;
   if(next===signature)return;
   const layoutChanged=layoutSig!==lastLayoutSig;
   const prevSelected=selected;
   signature=next;lastLayoutSig=layoutSig;levels=state.levels;selected=id;built=nextBuilt;
   canvas.dataset.buildings=[...built].join(',');
   objects=makeObjects();
   if(layoutChanged){
    hero.setScene(scene());party?.setScene(scene());shadowsDirty=true;baseDirty=true;
   }
   lighting.setScene(objects);
   if(layoutChanged||(prevSelected&&prevSelected!=='gate')||(id&&id!=='gate'))dirty=true;
   requestDraw();
  },
  focus(id:Building){glideTo(slots[id].x,slots[id].y-60);},
  fit(){stopGlide();chasing=false;vx=vy=0;scale=Math.max(.2,Math.min((w-40)/WORLD.width,(h-120)/WORLD.height));cx=WORLD.width/2;cy=385;requestDraw();},
  async visibleMasksReady(){await frontier.visibleMasksReady();for(const placed of frontierScene)prepareAlpha(placed);await Promise.all([...alphaJobs]);},
  async setHero(id:HeroId){await hero.setHero(id);await encounters.fxStage.prepare();},
  setTime:lighting.setTime,
  previewClock:lighting.preview,
  subscribeClock:lighting.subscribe,
 };
}
