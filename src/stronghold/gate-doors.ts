import {TORCH_FRAMES,torchAssetsReady} from './torches';
/** The complete gateway plays as one sprite: both towers, arch and synchronized door leaves share one pivot. */
export type GateSheet={image:string;columns:number;frames:number;frame:{w:number;h:number};fps:number;region:{x:number;y:number;w:number;h:number};torches?:{left:{x:number;y:number;w:number;h:number};right:{x:number;y:number;w:number;h:number}}};
export const GATE_SHEET='/modular-stronghold/v2/full-gateway-v5-sheet.json';
export function createGateDoors(layer:HTMLElement,gateway:HTMLImageElement,sheet:HTMLImageElement,meta:GateSheet,onPassable:(open:boolean)=>void,light:{foundation?:{face:HTMLCanvasElement;pad:number;fade?:HTMLCanvasElement};revision:()=>number;torches?:()=>boolean;shade:(source:HTMLCanvasElement,target:HTMLCanvasElement)=>void}){
 const {region,frame}=meta,rows=Math.ceil(meta.frames/meta.columns),height=region.h,canvas=document.createElement('canvas');
 canvas.id='world-gate-doors';canvas.dataset.renderer='gateway-lightmap-v3';canvas.width=frame.w;canvas.height=frame.h;
 canvas.style.cssText=`position:absolute;left:0;top:0;width:${region.w}px;height:${region.h}px;transform-origin:0 0;pointer-events:none;will-change:transform`;
 layer.append(canvas);const c=canvas.getContext('2d')!;
 const source=document.createElement('canvas');source.width=frame.w;source.height=frame.h;const raw=source.getContext('2d')!;
 let index=0,target=0,raf=0,last=0,elapsed=0,shown=-1,passable=false,lit=-1,flamePose=0,shownFlame=-1,flameTimer=0,pointerHeld=false,behind:boolean|null=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const torches=meta.torches??{left:{x:Math.round(frame.w*196/768),y:Math.round(frame.h*253/512),w:Math.round(frame.w*70/768),h:Math.round(frame.h*112/512)},right:{x:Math.round(frame.w*502/768),y:Math.round(frame.h*253/512),w:Math.round(frame.w*70/768),h:Math.round(frame.h*112/512)}};
 const pierPatches=[{x:torches.left.x-4,y:torches.left.y-5,w:torches.left.w+8,h:torches.left.h+8},{x:torches.right.x-4,y:torches.right.y-5,w:torches.right.w+8,h:torches.right.h+8}];
 function drawLitTorches(){
  if(!light.torches?.()||!TORCH_FRAMES[0].complete||!TORCH_FRAMES[0].naturalWidth)return;
  c.save();c.imageSmoothingQuality='high';
  c.drawImage(TORCH_FRAMES[flamePose%3],torches.left.x,torches.left.y,torches.left.w,torches.left.h);
  c.translate(torches.right.x+torches.right.w,torches.right.y);c.scale(-1,1);
  c.drawImage(TORCH_FRAMES[(flamePose+1)%3],0,0,torches.right.w,torches.right.h);
  c.restore();
 }
 function paint(){
  const torchesLit=!!light.torches?.(),activeFlame=torchesLit?flamePose:-1;
  if(index!==shown||lit!==light.revision()||activeFlame!==shownFlame){
   shown=index;lit=light.revision();shownFlame=activeFlame;
   const sw=(sheet.naturalWidth||frame.w*meta.columns)/meta.columns,sh=(sheet.naturalHeight||frame.h*rows)/rows;
   raw.globalCompositeOperation='copy';raw.drawImage(sheet,(index%meta.columns)*sw,Math.floor(index/meta.columns)*sh,sw,sh,0,0,frame.w,frame.h);
   raw.globalCompositeOperation='source-over';
   if(gateway.complete&&gateway.naturalWidth){const gx=gateway.naturalWidth/frame.w,gy=gateway.naturalHeight/frame.h;for(const p of pierPatches)raw.drawImage(gateway,p.x*gx,p.y*gy,p.w*gx,p.h*gy,p.x,p.y,p.w,p.h);}
   if(light.foundation){
    const {face,pad,fade}=light.foundation,sx=frame.w/region.w,sy=frame.h/region.h;
    raw.drawImage(face,-pad*sx,-pad*sy,face.width*sx,face.height*sy);
    if(fade){raw.globalCompositeOperation='destination-in';raw.drawImage(fade,0,0,frame.w,frame.h);raw.globalCompositeOperation='source-over';}
   }
   light.shade(source,canvas);
   if(torchesLit)drawLitTorches();
   if(canvas.dataset.torches!==(torchesLit?'lit':'off'))canvas.dataset.torches=torchesLit?'lit':'off';
  }
  const progress=index/(meta.frames-1),fStr=String(index),pStr=progress.toFixed(3),sStr=index===target?(target?'open':'closed'):(target?'opening':'closing');
  if(canvas.dataset.frame!==fStr)canvas.dataset.frame=fStr;
  if(canvas.dataset.progress!==pStr)canvas.dataset.progress=pStr;
  if(canvas.dataset.state!==sStr)canvas.dataset.state=sStr;
  const next=progress>=.8;if(next!==passable){passable=next;onPassable(next);}
  scheduleFlames();
 }
 function scheduleFlames(){
  clearTimeout(flameTimer);flameTimer=0;
  if(!light.torches?.()||index!==target||pointerHeld||document.hidden||reduced.matches||!TORCH_FRAMES[0].complete)return;
  flameTimer=window.setTimeout(()=>{flamePose=(flamePose+1)%3;paint();},160);
 }
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
 return {canvas,refreshLighting:paint,
  hit(x:number,y:number){const u=(x-442)/region.w,v=(y-(790-height*.97))/region.h;if(u<0||v<0||u>=1||v>=1)return false;return c.getImageData(Math.floor(u*frame.w),Math.floor(v*frame.h),1,1).data[3]>40;},
  order(hero:HTMLElement,inside:boolean){if(inside===behind)return;behind=inside;if(inside)hero.before(canvas);else hero.after(canvas);},
  setOpen(open:boolean){target=open?meta.frames-1:0;if(index!==target&&!raf)raf=requestAnimationFrame(tick);},
  place(x:number,y:number,scale:number){canvas.style.transform=`translate3d(${x+(442+region.x)*scale}px,${y+(790-height*.97+region.y)*scale}px,0) scale(${scale})`;}
 };
}
