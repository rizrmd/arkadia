import {tilePoint} from './terrain';
import {phaseOf} from './daylight';

// Wall brackets sit on the outer masonry faces; posts flank the tent and open court.
export const TORCHES=[
 ...[3,7.5,12].flatMap(n=>[
  {u:n,v:0,lift:65,wall:true},{u:0,v:n,lift:65,wall:true},
  {u:n,v:15.5,lift:65,wall:true},{u:15.5,v:n,lift:65,wall:true}
 ]),
 ...[[5.5,6],[6,10],[10,6],[10.5,10]].map(([u,v])=>({u,v,lift:48,wall:false}))
].map(t=>({...t,...tilePoint(t.u,t.v)}));
export const torchesOn=(time:number)=>phaseOf(time)==='Night';

const frames=Array.from({length:4},(_,i)=>{const image=new Image();image.src=`/realistic-torch/frame-${i}.webp`;return image;});
export const TORCH_FRAMES=frames;
export const torchAssetsReady=Promise.all(frames.map(image=>image.decode()));
const W=24,H=39,TOP=15.75;
// Keep source proportions and enough texels for the maximum 2.2× camera zoom.
const FLAME_SOURCE_HEIGHT=132,FLAME_HEIGHT=H*FLAME_SOURCE_HEIGHT/290,RESOLUTION=3;
// The unlit body is baked in daylight; at night the firelit lower sconce sits over the wall bloom while local canvases animate the upper flame.
export function drawTorches(c:CanvasRenderingContext2D,lit:boolean){
 const frame=lit?frames[1]:frames[3];
 if(!frame.complete||!frame.naturalWidth)return;
 for(const t of TORCHES){
  const y=t.y-t.lift;
  if(!t.wall){c.strokeStyle='#3b2a20';c.lineWidth=3.75;c.beginPath();c.moveTo(t.x,y+13.5);c.lineTo(t.x,t.y);c.stroke();}
  if(lit)c.drawImage(frame,0,FLAME_SOURCE_HEIGHT,180,290-FLAME_SOURCE_HEIGHT,t.x-W/2,y-TOP+FLAME_HEIGHT,W,H-FLAME_HEIGHT);
  else c.drawImage(frame,t.x-W/2,y-TOP,W,H);
 }
}
export function createTorchFlames(surface:HTMLCanvasElement,left:number,top:number){
 const layer=document.createElement('div');layer.id='torch-flames';
 layer.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none';
 surface.after(layer);
 // Isolate each tiny animated surface. Otherwise canvas writes invalidate a layer
 // spanning the entire fortress, forcing costly texture uploads on every flame tick.
 const FW=W*RESOLUTION,FH=Math.ceil(FLAME_HEIGHT*RESOLUTION),canvases=TORCHES.map(t=>{const c=document.createElement('canvas');c.width=FW;c.height=FH;
  c.style.cssText=`position:absolute;left:${t.x-W/2-left}px;top:${t.y-t.lift-TOP-top}px;width:${W}px;height:${FLAME_HEIGHT}px;contain:strict;will-change:transform;transform:translateZ(0)`;
  layer.append(c);return c;
 });
 const visible=new Set<HTMLCanvasElement>();
 const observer=new IntersectionObserver(entries=>{for(const e of entries){const c=e.target as HTMLCanvasElement;if(e.isIntersecting)visible.add(c);else visible.delete(c);}},{rootMargin:'32px'});
 canvases.forEach(c=>observer.observe(c));
 const cache:HTMLCanvasElement[]=[];
 let ready=false,lit=false,timer=0,movingUntil=0,lastStep=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 torchAssetsReady.then(()=>{
  // Cache sharp, supersampled crops once; animation only copies these small surfaces.
  for(let i=0;i<3;i++){
   const c=document.createElement('canvas');c.width=FW;c.height=FH;const ctx=c.getContext('2d')!;
   ctx.imageSmoothingQuality='high';ctx.drawImage(frames[i],0,0,180,FLAME_SOURCE_HEIGHT,0,0,FW,FH);cache.push(c);
  }
  ready=true;surface.dataset.torchAssets='ready';render(true);schedule();
 }).catch(()=>{surface.dataset.torchAssets='failed';});
 function render(force=false){
  if(!ready||!lit||document.hidden||(!force&&performance.now()<movingUntil))return;
  const step=reduced.matches?0:Math.floor(performance.now()/160)%3;
  if(!force&&step===lastStep)return;lastStep=step;layer.dataset.frame=String(step);
  canvases.forEach((c,i)=>{if(!force&&!visible.has(c))return;const ctx=c.getContext('2d')!;
   ctx.clearRect(0,0,FW,FH);ctx.drawImage(cache[(step+i)%3],0,0);
  });
 }
 function schedule(){
  clearTimeout(timer);timer=0;
  if(!ready||!lit||document.hidden||reduced.matches)return;
  timer=window.setTimeout(()=>{render();schedule();},160);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render(true);schedule();});
 reduced.addEventListener('change',()=>{render(true);schedule();});
 layer.hidden=true;
 return {
  place(transform:string){layer.style.transform=transform;movingUntil=performance.now()+180;},
  setLit(value:boolean){if(value===lit)return;lit=value;layer.hidden=!lit;lastStep=-1;render(true);schedule();}
 };
}
