import {Container, type TilingSprite} from 'pixi.js';
import {createCanvasSprite} from '../app/loader';
import {TORCHES,torchesOn,drawTorches,createTorchFlames,torchAssetsReady} from './torches';
import {LIGHT_SPRITES as SPRITES,emissive} from './light-anchors';
import {lightingAt,resolveTime,modeFrom,sunAt,type Lighting,type Mode} from './daylight';
import {measureTracelogPhase} from './tracelog';

export type LitObject={file:string;image:HTMLImageElement;x:number;y:number;width:number;height:number;foot:number;shear:number;vertical:number;selected:boolean};
const KEY='arkadia.stronghold.lighting',RES=.35;
const COLOURS:Record<string,string>={fire:'255,150,70',window:'255,190,110',candle:'255,205,140',holy:'255,236,190',arcane:'110,150,255',selection:'255,226,180'};

function lightingSettings(){let stored:{mode?:unknown;time?:unknown}={};try{stored=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}const mode=modeFrom(location.search,stored.mode),url=new URLSearchParams(location.search).has('lighting');if(url)try{localStorage.setItem(KEY,JSON.stringify({mode}));}catch{}return {mode,manual:!url&&typeof stored.time==='number'&&stored.time>=0&&stored.time<1?stored.time:null};}
export type ClockState=Lighting&{manual:boolean;mode:Mode};

export function createLighting(o:{
 worldStage:Container;
 surface:HTMLCanvasElement;
 snowSprite:TilingSprite;
 left:number;
 top:number;
 width:number;
 height:number;
 onSun:()=>void;
 onSurfaceUpdate:()=>void;
}){
 const {worldStage,surface,left,top,width,height}=o;
 const canvas=()=>{const c=document.createElement('canvas');c.width=Math.ceil(width*RES);c.height=Math.ceil(height*RES);return c;};
 const torchLight=canvas(),torchBloom=canvas(),torchHalo=canvas();
 const lightmap=canvas(),lights=canvas(),halo=canvas(),bloom=canvas(),base=document.createElement('canvas');
 lightmap.dataset.origin=`${left},${top},${RES}`;

 const flickerGroup=new Container();
 flickerGroup.zIndex=11;
 worldStage.addChild(flickerGroup);
 const haloView=createCanvasSprite(halo);
 const torchHaloView=createCanvasSprite(torchHalo);
 haloView.sprite.blendMode='add';
 torchHaloView.sprite.blendMode='add';
 flickerGroup.addChild(haloView.sprite,torchHaloView.sprite);

 const masks=new Map<string,{white:HTMLCanvasElement;colour:HTMLCanvasElement}>();
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

 const flames=createTorchFlames(worldStage,surface,left,top);
 torchAssetsReady.then(()=>{last='';paint(current,true);}).catch(()=>{});
 const world=(c:CanvasRenderingContext2D)=>{c.setTransform(RES,0,0,RES,-left*RES,-top*RES);};
 const sprite=(c:CanvasRenderingContext2D,p:LitObject,source:HTMLCanvasElement)=>{c.save();c.translate(p.x,p.y);c.transform(1,p.shear,0,p.vertical,0,0);c.drawImage(source,-p.width/2,-p.height*p.foot,p.width,p.height);c.restore();};
 const point=(p:LitObject,sx:number,sy:number)=>{const lx=-p.width/2+sx*p.width/p.image.width,ly=-p.height*p.foot+sy*p.height/p.image.height;return {x:p.x+lx,y:p.y+p.shear*lx+p.vertical*ly};};
 const pool=(c:CanvasRenderingContext2D,x:number,y:number,r:number,rgb:string,a:number,flat=.55)=>{c.save();c.translate(x,y);c.scale(1,flat);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.45,`rgba(${rgb},${a*.45})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();};
 for(const t of TORCHES){
  const l=torchLight.getContext('2d')!,b=torchBloom.getContext('2d')!,h=torchHalo.getContext('2d')!;
  for(const c of [l,b,h])world(c);
  pool(l,t.x,t.y,125,COLOURS.fire,.85);pool(l,t.x,t.y-t.lift,48,COLOURS.fire,.9,1);
  pool(b,t.x,t.y,95,COLOURS.fire,.2);pool(b,t.x,t.y-t.lift-6,26,COLOURS.fire,.55,1);
  pool(h,t.x,t.y-t.lift-7,18,COLOURS.fire,.35,1);
 }
 torchHaloView.sync(width,height);

 const staticLights=canvas();
 let staticSceneKey='',staticLightCount=0;
 function setScene(objects:LitObject[]){
  measureTracelogPhase('worldDraw',()=>{
   const nextStaticKey=objects.map(p=>`${p.file}:${p.x}:${p.y}:${p.width}`).join('|');
   const l=lights.getContext('2d')!;
   if(nextStaticKey!==staticSceneKey){
    staticSceneKey=nextStaticKey;
    const sl=staticLights.getContext('2d')!,h=halo.getContext('2d')!,b=bloom.getContext('2d')!;let count=0;
    for(const c of [sl,h,b]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,lights.width,lights.height);world(c);c.globalCompositeOperation='lighter';}
    for(const p of objects){
     const list=SPRITES[p.file];if(!list)continue;const m=mask(p),scale=p.width/p.image.width;
     for(const a of list){const rgb=COLOURS[a.kind]||COLOURS.fire,s=point(p,a.x,a.y),g=point(p,a.x,a.y+(a.drop||0)),k=a.intensity??1,r=Math.max(6,a.size*scale*2.2);count++;
      if(a.radius){pool(sl,g.x,g.y,a.radius,rgb,.75*k);pool(sl,s.x,s.y,r*1.6,rgb,.5*k,1);pool(b,g.x,g.y,a.radius*.6,rgb,.18*k);pool(b,s.x,s.y,r*1.8,rgb,.55*k,1);pool(h,s.x,s.y,r*1.4,rgb,.7*k,1);}}
     sprite(sl,p,m.white);
     for(const [c,blur] of [[b,6],[b,2],[h,3]] as const){c.filter=`blur(${blur}px)`;c.globalAlpha=.8;sprite(c,p,m.colour);c.filter='none';c.globalAlpha=1;}
    }
    for(const c of [sl,h,b])c.globalCompositeOperation='source-over';
    haloView.sync(width,height);
    staticLightCount=count;
   }
   l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation='copy';l.drawImage(staticLights,0,0);
   world(l);l.globalCompositeOperation='lighter';
   for(const p of objects){
    if(p.selected){const f=point(p,p.image.width/2,p.image.height*p.foot);pool(l,f.x,f.y,p.width*.5,COLOURS.selection,.3);}
   }
   l.globalCompositeOperation='source-over';
   surface.dataset.lights=String(staticLightCount);surface.dataset.lightBakes=String(Number(surface.dataset.lightBakes||0)+1);last='';tick();
  });
 }

 let live:(()=>number|null)|null=null;
 let {mode,manual}=lightingSettings(),last='',moving=0,current:Lighting=lightingAt(resolveTime(mode,Date.now(),location.search,manual));
 const sunStep=(t:number)=>{const q=Math.round(t*96)/96,s=sunAt(q);return {key:s.alpha?q.toFixed(4):'none',sun:s};};
 let {key:sunKey,sun}=sunStep(current.t);surface.dataset.sun=sunKey;const listeners=new Set<(s:ClockState)=>void>();let spriteRevision=0;
 let uprights:HTMLCanvasElement|null=null;
 function capture(layer:HTMLCanvasElement){uprights=layer;if(base.width!==surface.width||base.height!==surface.height){base.width=surface.width;base.height=surface.height;}const c=base.getContext('2d')!;c.globalCompositeOperation='copy';c.drawImage(surface,0,0);c.globalCompositeOperation='source-over';last='';paint(current,true);}
 function drawLightmap(rgb:number[],li:number){spriteRevision++;const m=lightmap.getContext('2d')!;m.setTransform(1,0,0,1,0,0);m.globalAlpha=1;m.fillStyle=`rgb(${rgb})`;m.fillRect(0,0,lightmap.width,lightmap.height);m.globalCompositeOperation='lighter';m.globalAlpha=li;m.drawImage(lights,0,0);m.globalAlpha=1;if(torchesOn(current.t))m.drawImage(torchLight,0,0);m.globalCompositeOperation='source-over';}

 function paint(state:Lighting,force=false){
  const q=(v:number,n:number)=>Math.round(v*n)/n,rgb=state.ambient.map(v=>Math.round(q(v,32)*255)),li=q(state.lights,25),gl=q(state.glow,25),key=rgb+'|'+li+'|'+gl+'|'+torchesOn(state.t);
  if(key===last||!base.width||(!force&&Date.now()-moving<300))return;last=key;
  measureTracelogPhase('worldDraw',()=>{
   const off=rgb.every(v=>v===255)&&li===0,c=surface.getContext('2d')!;
   drawLightmap(rgb,li);
   unlit(c);
   if(!off){
    worldSpace(c);
    c.globalCompositeOperation='multiply';c.drawImage(lightmap,left,top,width,height);
    if(torchesOn(state.t)){c.globalCompositeOperation='screen';c.drawImage(torchBloom,left,top,width,height);}
    if(gl){c.globalCompositeOperation='screen';c.globalAlpha=gl;c.drawImage(bloom,left,top,width,height);c.globalAlpha=1;}
    if(torchesOn(state.t)){c.globalCompositeOperation='source-over';drawTorches(c,true);}
   }
   c.globalCompositeOperation='source-over';c.setTransform(1,0,0,1,0,0);
   tintSnow(rgb,off);
   flickerGroup.alpha=q(gl*.45,50);
   flickerGroup.visible=!off&&gl>0;
   torchHaloView.sprite.visible=torchesOn(state.t);
   surface.dataset.torches=torchesOn(state.t)?'lit':'off';surface.dataset.torchCount=String(TORCHES.length);
   surface.dataset.lighting=off?'off':'on';surface.dataset.lightPaints=String(Number(surface.dataset.lightPaints||0)+1);
   o.onSurfaceUpdate();
  });
 }

 const worldSpace=(c:CanvasRenderingContext2D)=>c.setTransform(surface.width/width,0,0,surface.height/height,-left*surface.width/width,-top*surface.height/height);
 function unlit(c:CanvasRenderingContext2D){
  c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='copy';c.drawImage(base,0,0);c.globalCompositeOperation='source-over';
  if(shade.alpha){worldSpace(c);c.globalAlpha=shade.alpha;c.drawImage(shade.mask!,left,top,width,height);c.globalAlpha=1;c.setTransform(1,0,0,1,0,0);}
  if(uprights)c.drawImage(uprights,0,0);
  if(!torchesOn(current.t)||previewing){worldSpace(c);drawTorches(c,torchesOn(current.t));c.setTransform(1,0,0,1,0,0);}
 }

 let shade:{mask:HTMLCanvasElement|null;alpha:number}={mask:null,alpha:0};
 function setShadow(mask:HTMLCanvasElement|null,alpha:number,repaint=true){
  const nextAlpha=mask&&alpha?alpha:0;
  const changed=nextAlpha!==shade.alpha||Boolean(nextAlpha);
  shade=nextAlpha?{mask,alpha:nextAlpha}:{mask:null,alpha:0};
  surface.dataset.shadowPaints=String(Number(surface.dataset.shadowPaints||0)+1);
  if(!repaint||!base.width||!changed)return;
  last='';paint(current,true);
 }

 function tick(){
  current=lightingAt(resolveTime(mode,Date.now(),location.search,manual,live?.()??null));
  flames.setLit(torchesOn(current.t));
  torchHaloView.sprite.visible=torchesOn(current.t);
  const next=sunStep(current.t);
  const wait=previewing?SUN_REST_MS-(Date.now()-timeSet):0;
  if(next.key!==sunKey&&Date.now()-moving>=300&&wait<=0){sunKey=next.key;sun=next.sun;surface.dataset.sun=sunKey;o.onSun();}
  else{paint(current);if(next.key!==sunKey&&wait>0){clearTimeout(sunTimer);sunTimer=window.setTimeout(tick,wait);}}
  const state=clockState();for(const f of listeners)f(state);
 }

 const clockState=():ClockState=>({...current,manual:manual!==null||new URLSearchParams(location.search).has('time'),mode});
 function setTime(t:number|null){
  const url=new URL(location.href);if(url.searchParams.has('time')||url.searchParams.has('daySpeed')){url.searchParams.delete('time');url.searchParams.delete('daySpeed');history.replaceState(history.state,'',url);}
  manual=t===null?null:t-Math.floor(t);timeSet=Date.now();if(manual===null)mode='dynamic';try{localStorage.setItem(KEY,JSON.stringify(manual===null?{mode}:{mode,time:manual}));}catch{}tick();
 }
 const SUN_REST_MS=150;let previewing=false,timeSet=0,sunTimer=0;
 function preview(on:boolean){
  if(on===previewing)return;previewing=on;last='';
  if(on)paint(current,true);else tick();
 }
 function tintSnow(rgb:number[],off:boolean){
  o.snowSprite.tint=off?0xffffff:((rgb[0]&255)<<16)|((rgb[1]&255)<<8)|(rgb[2]&255);
 }

 function shadeSprite(source:HTMLCanvasElement,target:HTMLCanvasElement,area:{left:number;top:number;width:number;height:number}){
  if(!spriteRevision)drawLightmap(current.ambient.map(v=>Math.round(v*255)),current.lights);
  const c=target.getContext('2d')!;c.globalCompositeOperation='copy';c.drawImage(source,0,0);
  c.globalCompositeOperation='destination-over';c.fillStyle='#4a3f33';c.fillRect(0,0,target.width,target.height);c.globalCompositeOperation='source-over';
  const sx=(area.left-left)*RES,sy=(area.top-top)*RES,sw=area.width*RES,sh=area.height*RES;
  c.globalCompositeOperation='multiply';c.drawImage(lightmap,sx,sy,sw,sh,0,0,target.width,target.height);
  if(current.glow){c.globalCompositeOperation='screen';c.globalAlpha=Math.round(current.glow*50)/50;c.drawImage(bloom,sx,sy,sw,sh,0,0,target.width,target.height);c.globalAlpha=1;}
  c.globalCompositeOperation='destination-in';c.drawImage(source,0,0);c.globalCompositeOperation='source-over';
 }
 let still=0;
 setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 return {
  lightmap,
  place(x:number,y:number,scale:number){
   flames.place(x,y,scale);
   flickerGroup.position.set(x+left*scale,y+top*scale);
   flickerGroup.scale.set(scale);
   moving=Date.now();
   clearTimeout(still);still=window.setTimeout(()=>tick(),300);
  },
  setScene,capture,setTime,preview,setShadow,shadeSprite,spriteRevision:()=>spriteRevision,
  torches:()=>torchesOn(current.t),
  setClockSource(f:(()=>number|null)|null){
   live=f;
   current=lightingAt(resolveTime(mode,Date.now(),location.search,manual,live?.()??null));
   if(!base.width){const next=sunStep(current.t);sunKey=next.key;sun=next.sun;surface.dataset.sun=sunKey;}
   tick();
  },
  sun:()=>sun,
  subscribe(f:(s:ClockState)=>void){listeners.add(f);f(clockState());return ()=>listeners.delete(f);}
 };
}
