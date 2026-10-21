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
export const torchAssetsReady=Promise.all(frames.map(image=>image.decode()));
const W=32,H=52;
// The same unlit body is baked once; only small local canvases animate above it.
export function drawTorches(c:CanvasRenderingContext2D,_lit:boolean){
 if(!frames[3].complete||!frames[3].naturalWidth)return;
 for(const t of TORCHES){
  const y=t.y-t.lift;
  if(!t.wall){c.strokeStyle='#3b2a20';c.lineWidth=5;c.beginPath();c.moveTo(t.x,y+18);c.lineTo(t.x,t.y);c.stroke();}
  c.drawImage(frames[3],t.x-W/2,y-21,W,H);
 }
}
export function createTorchFlames(surface:HTMLCanvasElement,left:number,top:number){
 const layer=document.createElement('div');layer.id='torch-flames';
 layer.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none';
 surface.after(layer);
 // Isolate each tiny animated surface. Otherwise canvas writes invalidate a layer
 // spanning the entire fortress, forcing costly texture uploads on every flame tick.
 const FH=24,canvases=TORCHES.map(t=>{const c=document.createElement('canvas');c.width=W;c.height=FH;
  c.style.cssText=`position:absolute;left:${t.x-W/2-left}px;top:${t.y-t.lift-21-top}px;width:${W}px;height:${H*330/724}px;contain:strict;will-change:transform;transform:translateZ(0)`;
  layer.append(c);return c;
 });
 const visible=new Set<HTMLCanvasElement>();
 const observer=new IntersectionObserver(entries=>{for(const e of entries){const c=e.target as HTMLCanvasElement;if(e.isIntersecting)visible.add(c);else visible.delete(c);}},{rootMargin:'32px'});
 canvases.forEach(c=>observer.observe(c));
 const cache:HTMLCanvasElement[]=[];
 let ready=false,lit=false,timer=0,movingUntil=0,lastStep=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 torchAssetsReady.then(()=>{
  // Blur only once when preparing the three small cached frames, never in a pan
  // or animation frame. Low-resolution filtering also softens the flame tips.
  for(let i=0;i<3;i++){
   const c=document.createElement('canvas');c.width=W;c.height=FH;const ctx=c.getContext('2d')!;
   ctx.filter='blur(0.65px)';ctx.drawImage(frames[i],0,0,180,132,0,0,W,FH);cache.push(c);
  }
  ready=true;surface.dataset.torchAssets='ready';render(true);schedule();
 }).catch(()=>{surface.dataset.torchAssets='failed';});
 function render(force=false){
  if(!ready||!lit||document.hidden||(!force&&performance.now()<movingUntil))return;
  const step=reduced.matches?0:Math.floor(performance.now()/160)%3;
  if(!force&&step===lastStep)return;lastStep=step;layer.dataset.frame=String(step);
  canvases.forEach((c,i)=>{if(!force&&!visible.has(c))return;const ctx=c.getContext('2d')!;
   ctx.clearRect(0,0,W,FH);ctx.drawImage(cache[(step+i)%3],0,0);
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
