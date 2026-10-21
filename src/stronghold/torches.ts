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
 const canvases=TORCHES.map(t=>{const c=document.createElement('canvas');c.width=96;c.height=96;
  c.style.cssText=`position:absolute;left:${t.x-W/2-left}px;top:${t.y-t.lift-21-top}px;width:${W}px;height:${H*330/724}px`;
  layer.append(c);return c;
 });
 let ready=false,lit=false;
 torchAssetsReady.then(()=>{ready=true;surface.dataset.torchAssets='ready';render();}).catch(()=>{surface.dataset.torchAssets='failed';});
 function render(){
  layer.hidden=!lit;
  if(!ready||!lit||document.hidden)return;
  const step=Math.floor(performance.now()/120)%3;layer.dataset.frame=String(step);
  canvases.forEach((c,i)=>{const ctx=c.getContext('2d')!;ctx.clearRect(0,0,96,96);
   // Upper source region contains the changing flame and glowing fuel. Lower handle stays baked.
   ctx.drawImage(frames[(step+i)%3],0,0,180,132,0,0,96,96);
  });
 }
 setInterval(render,120);
 return {place(transform:string){layer.style.transform=transform;},setLit(value:boolean){lit=value;render();}};
}
