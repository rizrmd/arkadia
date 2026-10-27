import {requestGameFrame as requestAnimationFrame} from '../app/frame-scheduler';
import type {Container} from 'pixi.js';
import {createCanvasSprite} from '../app/loader';
import {TORCH_FRAMES,torchAssetsReady} from './torches';
import {measureTracelogPhase} from './tracelog';
import {STRONGHOLD} from './prefabs/stronghold';
// The gateway sprite's slot (prefabs/stronghold.json): left edge, foot line and pivot of the door sheet.
const SLOT=STRONGHOLD.buildings.gate,LEFT=SLOT.x-SLOT.width/2,FOOT=SLOT.y,PIVOT=SLOT.pivot;

/** The complete gateway plays as one sprite: both towers, arch and synchronized door leaves share one pivot. */
export type GateSheet={image:string;columns:number;frames:number;frame:{w:number;h:number};fps:number;region:{x:number;y:number;w:number;h:number};torches?:{left:{x:number;y:number;w:number;h:number};right:{x:number;y:number;w:number;h:number}}};
export const GATE_SHEET='/modular-stronghold/v2/full-gateway-v7-sheet.json';

export function createGateDoors(worldStage:Container,gateway:HTMLImageElement,sheet:HTMLImageElement,meta:GateSheet,onPassable:(open:boolean)=>void,light:{raster:number;foundation?:{face:HTMLCanvasElement;pad:number;fade?:HTMLCanvasElement};revision:()=>number;torches?:()=>boolean;shade:(source:HTMLCanvasElement,target:HTMLCanvasElement)=>void;onShadowFrame?:(source:HTMLCanvasElement,index:number)=>void}){
 const {region,frame}=meta,rows=Math.ceil(meta.frames/meta.columns),height=region.h,canvas=document.createElement('canvas');
 canvas.id='world-gate-doors';canvas.dataset.renderer='gateway-lightmap-v3';(window as any).__WORLD_GATE_DOORS__=canvas;
 canvas.width=Math.round(region.w*light.raster);canvas.height=Math.round(region.h*light.raster);
 canvas.dataset.raster=String(light.raster);
 const c=canvas.getContext('2d')!;
 const gateView=createCanvasSprite(canvas);
 gateView.sprite.zIndex=14;
 worldStage.addChild(gateView.sprite);

 const source=document.createElement('canvas');source.width=canvas.width;source.height=canvas.height;const raw=source.getContext('2d')!;
 raw.scale(source.width/frame.w,source.height/frame.h);
 const shaded=document.createElement('canvas');shaded.width=canvas.width;shaded.height=canvas.height;
 let shadowFrame=-1;
 let sheetCanvas:HTMLCanvasElement|ImageBitmap|null=null,sheetPreparing=false;
 function ensureSheetCanvas():HTMLCanvasElement|ImageBitmap|null{
  if(sheetCanvas)return sheetCanvas;
  if(sheetPreparing||!sheet.complete||!sheet.naturalWidth)return null;
  sheetPreparing=true;
  canvas.dataset.sheetState='preparing';
  const width=canvas.width*meta.columns,height=canvas.height*rows;
  // Resizing the entire 16-frame sheet in a paint callback stalls older phones.
  // Let the browser prepare it asynchronously; no new work runs in paint().
  void (async()=>{
   if(typeof createImageBitmap==='function'){
    try{sheetCanvas=await createImageBitmap(sheet,{resizeWidth:width,resizeHeight:height,resizeQuality:'low'});}catch{}
   }
   if(!sheetCanvas){
    const sc=document.createElement('canvas');sc.width=width;sc.height=height;
    const ctx=sc.getContext('2d',{willReadFrequently:true})!;
    // Bounded fallback for browsers without bitmap resize support: one frame per task.
    for(let i=0;i<meta.frames;i++){
     await new Promise<void>(r=>setTimeout(r,0));
     ctx.drawImage(sheet,(i%meta.columns)*frame.w,Math.floor(i/meta.columns)*frame.h,frame.w,frame.h,(i%meta.columns)*canvas.width,Math.floor(i/meta.columns)*canvas.height,canvas.width,canvas.height);
    }
    sheetCanvas=sc;
   }
   canvas.dataset.sheetState='ready';shown=-1;shadowFrame=-1;paint();
  })().catch(error=>{sheetPreparing=false;console.error('Gateway sheet preparation failed',error);});
  return null;
 }
 let active=false,index=0,target=0,raf=0,last=0,elapsed=0,shown=-1,passable=false,lit=-1,flamePose=0,shownFlame=-1,flameTimer=0,pointerHeld=false,behind:boolean|null=null,onScreen=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const torches=meta.torches??{left:{x:Math.round(frame.w*196/768),y:Math.round(frame.h*253/512),w:Math.round(frame.w*70/768),h:Math.round(frame.h*112/512)},right:{x:Math.round(frame.w*502/768),y:Math.round(frame.h*253/512),w:Math.round(frame.w*70/768),h:Math.round(frame.h*112/512)}};
 const pierPatches=[{x:torches.left.x-4,y:torches.left.y-5,w:torches.left.w+8,h:torches.left.h+8},{x:torches.right.x-4,y:torches.right.y-5,w:torches.right.w+8,h:torches.left.h+8}];
 let lastScale=1;

 function drawLitTorches(){
  if(!light.torches?.()||!TORCH_FRAMES[0].complete||!TORCH_FRAMES[0].naturalWidth)return;
  c.save();c.scale(canvas.width/frame.w,canvas.height/frame.h);c.imageSmoothingQuality='high';
  c.drawImage(TORCH_FRAMES[flamePose%3],torches.left.x,torches.left.y,torches.left.w,torches.left.h);
  c.translate(torches.right.x+torches.right.w,torches.right.y);c.scale(-1,1);
  c.drawImage(TORCH_FRAMES[(flamePose+1)%3],0,0,torches.right.w,torches.right.h);
  c.restore();
 }
 function paint(){
  measureTracelogPhase('worldDraw',()=>{
   const torchesLit=!!light.torches?.(),activeFlame=torchesLit?flamePose:-1;
   const baseChanged=index!==shown||lit!==light.revision();
   if(baseChanged||activeFlame!==shownFlame){
    shown=index;lit=light.revision();shownFlame=activeFlame;
    if(baseChanged){
     raw.globalCompositeOperation='copy';
     const sc=ensureSheetCanvas();
     if(sc){
      raw.drawImage(sc,(index%meta.columns)*canvas.width,Math.floor(index/meta.columns)*canvas.height,canvas.width,canvas.height,0,0,frame.w,frame.h);
     }else if(gateway.complete&&gateway.naturalWidth){
      raw.drawImage(gateway,0,0,gateway.naturalWidth,gateway.naturalHeight,0,0,frame.w,frame.h);
     }
     raw.globalCompositeOperation='source-over';
     if(gateway.complete&&gateway.naturalWidth){const gx=gateway.naturalWidth/frame.w,gy=gateway.naturalHeight/frame.h;for(const p of pierPatches)raw.drawImage(gateway,p.x*gx,p.y*gy,p.w*gx,p.h*gy,p.x,p.y,p.w,p.h);}
     if(light.foundation){
      const {face,pad,fade}=light.foundation,sx=frame.w/region.w,sy=frame.h/region.h;
      raw.drawImage(face,-pad*sx,-pad*sy,face.width*sx,face.height*sy);
      if(fade){raw.globalCompositeOperation='destination-in';raw.drawImage(fade,0,0,frame.w,frame.h);raw.globalCompositeOperation='source-over';}
     }
     if(shadowFrame!==index){shadowFrame=index;light.onShadowFrame?.(source,index);}
     light.shade(source,shaded);
    }
    c.globalCompositeOperation='copy';c.drawImage(shaded,0,0);c.globalCompositeOperation='source-over';
    if(torchesLit)drawLitTorches();
    if(canvas.dataset.torches!==(torchesLit?'lit':'off'))canvas.dataset.torches=torchesLit?'lit':'off';
    gateView.sync(region.w*lastScale,region.h*lastScale);
   }
   const progress=index/(meta.frames-1),fStr=String(index),pStr=progress.toFixed(3),sStr=index===target?(target?'open':'closed'):(target?'opening':'closing');
   if(canvas.dataset.frame!==fStr)canvas.dataset.frame=fStr;
   if(canvas.dataset.progress!==pStr)canvas.dataset.progress=pStr;
   if(canvas.dataset.state!==sStr)canvas.dataset.state=sStr;
   const next=progress>=.8;if(next!==passable){passable=next;onPassable(next);}
   scheduleFlames();
  });
 }
 function scheduleFlames(){
  clearTimeout(flameTimer);flameTimer=0;
  if(!onScreen||!light.torches?.()||index!==target||pointerHeld||document.hidden||reduced.matches||!TORCH_FRAMES[0].complete)return;
  flameTimer=window.setTimeout(()=>{flamePose=(flamePose+1)%3;paint();},160);
 }
 if(!sheet.complete)sheet.addEventListener('load',()=>{Promise.resolve(typeof sheet.decode==='function'?sheet.decode():undefined).catch(()=>{}).then(()=>{ensureSheetCanvas();shown=-1;paint();});},{once:true});
 torchAssetsReady.then(()=>{shownFlame=-2;paint();}).catch(()=>{});
 window.addEventListener('pointerdown',()=>{pointerHeld=true;clearTimeout(flameTimer);flameTimer=0;},{passive:true});
 window.addEventListener('pointerup',()=>{pointerHeld=false;scheduleFlames();},{passive:true});
 window.addEventListener('pointercancel',()=>{pointerHeld=false;scheduleFlames();},{passive:true});
 document.addEventListener('visibilitychange',()=>scheduleFlames());
 reduced.addEventListener('change',()=>scheduleFlames());
 function tick(now:number){elapsed+=last?Math.min(100,now-last):0;last=now;const step=1000/meta.fps;
  while(elapsed>=step&&index!==target){elapsed-=step;index+=Math.sign(target-index);}paint();
  if(index!==target)raf=requestAnimationFrame(tick);else{raf=0;last=0;elapsed=0;scheduleFlames();}
 }
 paint();
 return {canvas,sprite:gateView.sprite,refreshLighting:paint,
  start(){active=true;if(index!==target&&!raf)raf=requestAnimationFrame(tick);},
  saveState:()=>({index,target,elapsed}),
  restoreState(s:{index:number;target:number;elapsed:number}){index=s.index;target=s.target;elapsed=s.elapsed;shown=-1;paint();if(active&&index!==target&&!raf)raf=requestAnimationFrame(tick);},
  hit(x:number,y:number){const u=(x-LEFT)/region.w,v=(y-(FOOT-height*PIVOT))/region.h;if(u<0||v<0||u>=1||v>=1)return false;return c.getImageData(Math.floor(u*canvas.width),Math.floor(v*canvas.height),1,1).data[3]>40;},
  order(inside:boolean){if(inside===behind)return;behind=inside;gateView.sprite.zIndex=inside?14:15;},
  setOpen(open:boolean){target=open?meta.frames-1:0;if(active&&index!==target&&!raf)raf=requestAnimationFrame(tick);},
  place(x:number,y:number,scale:number){
   lastScale=scale;
   const sx=x+(LEFT+region.x)*scale,sy=y+(FOOT-height*PIVOT+region.y)*scale,sw=region.w*scale,sh=region.h*scale;
   gateView.sprite.position.set(sx,sy);
   gateView.sprite.width=sw;
   gateView.sprite.height=sh;
   canvas.style.width=sw+'px';canvas.style.height=sh+'px';
   canvas.dataset.rect=JSON.stringify({x:sx,y:sy,width:sw,height:sh});
   const vis=sx+sw>-64&&sx<(innerWidth||1440)+64&&sy+sh>-64&&sy<(innerHeight||900)+64;
   if(vis!==onScreen){onScreen=vis;if(vis)scheduleFlames();else{clearTimeout(flameTimer);flameTimer=0;}}
  }
 };
}
