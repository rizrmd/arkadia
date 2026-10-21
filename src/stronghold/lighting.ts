import {LIGHT_SPRITES as SPRITES,emissive} from './light-anchors';
import {lightingAt,resolveTime,modeFrom,sunAt,type Lighting,type Mode} from './daylight';
// Day/night is baked into #world-surface: the unlit world is kept in `base`, and
// a lighting change recomposes surface = base x lightmap + glow (three blits).
// Pan frames therefore composite exactly the same single layer as in daylight;
// blended overlay layers measured +45-75 ms p95 per pan frame on throttled mobile.
// Only the small flame-flicker layer blends live, and it hides while the camera moves.
// The infinite snow uses a pre-tinted copy of its repeat tile: a multiply
// background-blend-mode made Chrome re-raster that layer on every pan frame.
export type LitObject={file:string;image:HTMLImageElement;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;selected:boolean};
const KEY='arkadia.stronghold.lighting',RES=.35;
const COLOURS:Record<string,string>={fire:'255,150,70',window:'255,190,110',candle:'255,205,140',holy:'255,236,190',arcane:'110,150,255',selection:'255,226,180'};
// Stored as {mode, time?}: time is the hour picked on the in-game clock (0..1), absent when live.
function lightingSettings(){let stored:{mode?:unknown;time?:unknown}={};try{stored=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}const mode=modeFrom(location.search,stored.mode),url=new URLSearchParams(location.search).has('lighting');if(url)try{localStorage.setItem(KEY,JSON.stringify({mode}));}catch{}return {mode,manual:!url&&typeof stored.time==='number'&&stored.time>=0&&stored.time<1?stored.time:null};}
export type ClockState=Lighting&{manual:boolean;mode:Mode};
export function createLighting(o:{surface:HTMLCanvasElement;snowLayer:HTMLElement;left:number;top:number;width:number;height:number;onSun:()=>void}){
 const {surface,left,top,width,height}=o,canvas=()=>{const c=document.createElement('canvas');c.width=Math.ceil(width*RES);c.height=Math.ceil(height*RES);c.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;transform-origin:0 0;pointer-events:none`;return c;};
 // The lightmap stays in the DOM, hidden, so verification tooling can read it.
 const lightmap=canvas(),lights=canvas(),halo=canvas(),bloom=canvas(),flicker=document.createElement('div'),base=document.createElement('canvas');
 lightmap.id='world-lightmap';lightmap.hidden=true;lightmap.dataset.origin=`${left},${top},${RES}`;halo.className='glow-a';flicker.id='world-glow';
 flicker.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;transform-origin:0 0;will-change:transform;mix-blend-mode:screen;pointer-events:none`;
 flicker.append(halo);surface.after(flicker,lightmap,bloom);
 // Clock-drag preview: the surface shows the unlit world while the small lightmap and bloom
 // blend live over it and a flat ambient layer tints the snow. Each slider step then updates
 // an 807 x 485 canvas instead of recomposing the full world raster; releasing bakes once.
 const ambient=document.createElement('div');ambient.id='world-ambient';ambient.style.cssText='position:absolute;inset:0;mix-blend-mode:multiply;pointer-events:none';
 lightmap.style.mixBlendMode='multiply';bloom.style.mixBlendMode='screen';bloom.id='world-bloom';
 for(const e of [ambient,bloom])e.hidden=true;o.snowLayer.after(ambient);
 const snowImage=o.snowLayer.style.backgroundImage,tile=new Image(),tint=document.createElement('canvas'),masks=new Map<string,{white:HTMLCanvasElement;colour:HTMLCanvasElement}>();
 // Emissive pixels of one sprite: colour copy for glow, white copy for the lightmap.
 function mask(p:LitObject){
  let m=masks.get(p.file);if(m)return m;const list=SPRITES[p.file]||[],image=p.image,k=Math.min(1,512/image.width);
  const colour=document.createElement('canvas');colour.width=Math.ceil(image.width*k);colour.height=Math.ceil(image.height*k);
  const c=colour.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,0,0,colour.width,colour.height);
  const data=c.getImageData(0,0,colour.width,colour.height),d=data.data,keep=new Uint8Array(colour.width*colour.height);
  for(const a of list){const r=a.size*k,x0=Math.max(0,Math.floor(a.x*k-r)),x1=Math.min(colour.width,Math.ceil(a.x*k+r)),y0=Math.max(0,Math.floor(a.y*k-r)),y1=Math.min(colour.height,Math.ceil(a.y*k+r));
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const dist=Math.hypot(x-a.x*k,y-a.y*k)/r,i=(y*colour.width+x)*4;if(dist<1&&d[i+3]>40&&emissive(d[i],d[i+1],d[i+2],!!a.bright))keep[y*colour.width+x]=Math.max(keep[y*colour.width+x],Math.round(255*Math.min(1,(1-dist)*3)));}}
  for(let n=0;n<keep.length;n++)d[n*4+3]=Math.min(d[n*4+3],keep[n]);c.putImageData(data,0,0);
  const white=document.createElement('canvas');white.width=colour.width;white.height=colour.height;const w=white.getContext('2d')!;w.drawImage(colour,0,0);w.globalCompositeOperation='source-in';w.fillStyle='#fff';w.fillRect(0,0,white.width,white.height);
  m={white,colour};masks.set(p.file,m);return m;
 }
 const world=(c:CanvasRenderingContext2D)=>{c.setTransform(RES,0,0,RES,-left*RES,-top*RES);};
 const sprite=(c:CanvasRenderingContext2D,p:LitObject,source:HTMLCanvasElement)=>{c.save();c.translate(p.x,p.y);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(source,-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();};
 // Source pixel -> world point, with the sprite's own shear/vertical calibration.
 const point=(p:LitObject,sx:number,sy:number)=>{const lx=-p.width/2+sx*p.width/p.image.width,ly=-p.height*p.foot+sy*p.height/p.image.height;return {x:p.x+lx,y:p.y+p.shear*lx+p.vertical*ly};};
 const pool=(c:CanvasRenderingContext2D,x:number,y:number,r:number,rgb:string,a:number,flat=.55)=>{c.save();c.translate(x,y);c.scale(1,flat);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.45,`rgba(${rgb},${a*.45})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();};
 // Rebuilt when buildings or the selection change: light pools, emissive masks and glow.
 function setScene(objects:LitObject[]){
  const l=lights.getContext('2d')!,h=halo.getContext('2d')!,b=bloom.getContext('2d')!;let count=0;
  for(const c of [l,h,b]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,lights.width,lights.height);world(c);c.globalCompositeOperation='lighter';}
  for(const p of objects){
   if(p.selected){const f=point(p,p.image.width/2,p.image.height*p.foot);pool(l,f.x,f.y,p.width*.5,COLOURS.selection,.3);}
   const list=SPRITES[p.file];if(!list)continue;const m=mask(p),scale=p.width/p.image.width;
   for(const a of list){const rgb=COLOURS[a.kind]||COLOURS.fire,s=point(p,a.x,a.y),g=point(p,a.x,a.y+(a.drop||0)),k=a.intensity??1,r=Math.max(6,a.size*scale*2.2);count++;
    // Mask-only lights (radius 0) sit behind walls: no pools or halos that could spill onto them.
    if(a.radius){pool(l,g.x,g.y,a.radius,rgb,.75*k);pool(l,s.x,s.y,r*1.6,rgb,.5*k,1);pool(b,g.x,g.y,a.radius*.6,rgb,.18*k);pool(b,s.x,s.y,r*1.8,rgb,.55*k,1);pool(h,s.x,s.y,r*1.4,rgb,.7*k,1);}}
   sprite(l,p,m.white);
   for(const [c,blur] of [[b,6],[b,2],[h,3]] as const){c.filter=`blur(${blur}px)`;c.globalAlpha=.8;sprite(c,p,m.colour);c.filter='none';c.globalAlpha=1;}
  }
  for(const c of [l,h,b])c.globalCompositeOperation='source-over';
  surface.dataset.lights=String(count);surface.dataset.lightBakes=String(Number(surface.dataset.lightBakes||0)+1);last='';tick();
 }
 let {mode,manual}=lightingSettings(),last='',moving=0,current:Lighting=lightingAt(resolveTime(mode,Date.now(),location.search,manual));
 // Cast shadows are rasterized with the world, so the sun moves in 15-minute steps (15 s of a live day).
 const sunStep=(t:number)=>{const q=Math.round(t*96)/96,s=sunAt(q);return {key:s.alpha?q.toFixed(4):'none',sun:s};};
 let {key:sunKey,sun}=sunStep(current.t);surface.dataset.sun=sunKey;const listeners=new Set<(s:ClockState)=>void>();
 // Called after every world raster: keep the unlit copy, then relight.
 function capture(){if(base.width!==surface.width||base.height!==surface.height){base.width=surface.width;base.height=surface.height;}const c=base.getContext('2d')!;c.globalCompositeOperation='copy';c.drawImage(surface,0,0);c.globalCompositeOperation='source-over';last='';paint(current,true);}
 // Ambient fill plus the baked light pools, at lightmap resolution.
 function drawLightmap(rgb:number[],li:number){const m=lightmap.getContext('2d')!;m.setTransform(1,0,0,1,0,0);m.globalAlpha=1;m.fillStyle=`rgb(${rgb})`;m.fillRect(0,0,lightmap.width,lightmap.height);m.globalCompositeOperation='lighter';m.globalAlpha=li;m.drawImage(lights,0,0);m.globalAlpha=1;m.globalCompositeOperation='source-over';}
 function paint(state:Lighting,force=false){
  // Quantized so a dawn or dusk transition recomposes every few seconds, not every tick.
  const q=(v:number,n:number)=>Math.round(v*n)/n,rgb=state.ambient.map(v=>Math.round(q(v,64)*255)),li=q(state.lights,50),gl=q(state.glow,50),key=rgb+'|'+li+'|'+gl;
  if(key===last||!base.width||(!force&&Date.now()-moving<300))return;last=key;
  const off=rgb.every(v=>v===255)&&li===0,c=surface.getContext('2d')!;
  if(previewing){
   drawLightmap(rgb,li);ambient.style.background=`rgb(${rgb})`;bloom.style.opacity=String(gl);
   surface.dataset.lighting='preview';surface.dataset.lightPaints=String(Number(surface.dataset.lightPaints||0)+1);return;
  }
  c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='copy';c.drawImage(base,0,0);
  if(!off){
   drawLightmap(rgb,li);
   c.setTransform(surface.width/width,0,0,surface.height/height,-left*surface.width/width,-top*surface.height/height);
   c.globalCompositeOperation='multiply';c.drawImage(lightmap,left,top,width,height);
   if(gl){c.globalCompositeOperation='screen';c.globalAlpha=gl;c.drawImage(bloom,left,top,width,height);c.globalAlpha=1;}
  }
  c.globalCompositeOperation='source-over';c.setTransform(1,0,0,1,0,0);
  tintSnow(rgb,off);
  flicker.style.opacity=String(q(gl*.45,50));flicker.dataset.lit=String(!off&&gl>0);
  surface.dataset.lighting=off?'off':'on';surface.dataset.lightPaints=String(Number(surface.dataset.lightPaints||0)+1);
 }
 function tick(){
  current=lightingAt(resolveTime(mode,Date.now(),location.search,manual));const next=sunStep(current.t);
  // A new sun position re-rasters the world (which relights it via capture); wait while the camera
  // moves. While the clock is dragged, shadows catch up once the slider rests for SUN_REST_MS.
  const wait=previewing?SUN_REST_MS-(Date.now()-timeSet):0;
  if(next.key!==sunKey&&Date.now()-moving>=300&&wait<=0){sunKey=next.key;sun=next.sun;surface.dataset.sun=sunKey;o.onSun();}
  else{paint(current);if(next.key!==sunKey&&wait>0){clearTimeout(sunTimer);sunTimer=window.setTimeout(tick,wait);}}
  const v=surface.parentElement!;v.dataset.phase=current.phase;v.dataset.time=current.t.toFixed(3);v.dataset.lightingMode=mode;
  const state=clockState();v.dataset.clock=state.manual?'manual':'live';for(const f of listeners)f(state);
 }
 // In-game clock: a number fixes the hour (remembered in this browser); null returns to the live cycle.
 const clockState=():ClockState=>({...current,manual:manual!==null||new URLSearchParams(location.search).has('time'),mode});
 function setTime(t:number|null){
  // The clock takes over from QA URL overrides, which would otherwise keep winning.
  const url=new URL(location.href);if(url.searchParams.has('time')||url.searchParams.has('daySpeed')){url.searchParams.delete('time');url.searchParams.delete('daySpeed');history.replaceState(history.state,'',url);}
  manual=t===null?null:t-Math.floor(t);timeSet=Date.now();if(manual===null)mode='dynamic';try{localStorage.setItem(KEY,JSON.stringify(manual===null?{mode}:{mode,time:manual}));}catch{}tick();}
 const SUN_REST_MS=150;let previewing=false,timeSet=0,sunTimer=0;
 function preview(on:boolean){
  if(on===previewing)return;previewing=on;last='';lightmap.hidden=bloom.hidden=!on;
  if(on){
   // Show the unlit world under the live overlays; the snow goes back to its untinted tile.
   const c=surface.getContext('2d')!;c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='copy';c.drawImage(base,0,0);c.globalCompositeOperation='source-over';
   ambient.hidden=false;tintKey='';o.snowLayer.style.backgroundImage=snowImage;o.snowLayer.dataset.tint='preview';flicker.dataset.lit='false';
  }
  // Releasing bakes once (via the sun-step re-raster when shadows moved); the ambient
  // layer stays until the tinted snow tile is in place.
  else delete o.snowLayer.dataset.tint;
  if(on)paint(current,true);else tick();
 }
 let tintKey='';tile.src=snowImage.slice(5,-2);
 function tintSnow(rgb:number[],off:boolean){
  const key=off?'off':rgb.join();if(key===tintKey)return;tintKey=key;
  if(off){o.snowLayer.style.backgroundImage=snowImage;o.snowLayer.dataset.tint='off';ambient.hidden=true;return;}
  tile.decode().then(()=>{if(key!==tintKey)return;tint.width=tile.naturalWidth;tint.height=tile.naturalHeight;const c=tint.getContext('2d')!;c.globalCompositeOperation='source-over';c.drawImage(tile,0,0);c.globalCompositeOperation='multiply';c.fillStyle=`rgb(${rgb})`;c.fillRect(0,0,tint.width,tint.height);
   // Applied as a data: URL like the original tile (blob: tiles panned slower). The first
   // tint is synchronous so the snow never loads untinted; later ones encode off-thread.
   if(!o.snowLayer.dataset.tint){o.snowLayer.style.backgroundImage=`url(${tint.toDataURL()})`;o.snowLayer.dataset.tint=key;ambient.hidden=true;return;}
   tint.toBlob(b=>{if(!b||key!==tintKey)return;const r=new FileReader();r.onload=()=>{if(key!==tintKey)return;o.snowLayer.style.backgroundImage=`url(${r.result})`;o.snowLayer.dataset.tint=key;};r.readAsDataURL(b);});}).catch(()=>{});
 }
 let still=0;
 setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 return {
  // Every camera frame: follow the surface; the flicker layer rests until the camera stops.
  place(transform:string){flicker.style.transform=lightmap.style.transform=bloom.style.transform=transform;moving=Date.now();if(!flicker.classList.contains('moving'))flicker.classList.add('moving');clearTimeout(still);still=window.setTimeout(()=>{flicker.classList.remove('moving');tick();},300);},
  setScene,capture,setTime,preview,
  sun:()=>sun,
  subscribe(f:(s:ClockState)=>void){listeners.add(f);f(clockState());return ()=>listeners.delete(f);}
 };
}
