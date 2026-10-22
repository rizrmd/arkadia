import {tilePoint} from './terrain';
import {phaseOf} from './daylight';

// Wall brackets sit on the outer masonry faces; posts flank the tent and open court.
export const TORCHES=[
 ...[3,7.5,12].flatMap(n=>[
  {u:n,v:0,lift:65,wall:true},{u:0,v:n,lift:65,wall:true},
  {u:n,v:15.5,lift:65,wall:true},{u:15.5,v:n,lift:65,wall:true}
 ]),
 // Clear the whole tent silhouette (including the roof and guy ropes), not
 // just its ground footprint. Keep the approach through the court open.
 ...[[4.5,4.5],[4.5,10.5],[10.5,4.5],[12,12]].map(([u,v])=>({u,v,lift:48,wall:false}))
].map(t=>({...t,...tilePoint(t.u,t.v)}));
export const torchesOn=(time:number)=>phaseOf(time)==='Night';

const frames=Array.from({length:4},(_,i)=>{const image=new Image();image.src=`/realistic-torch/frame-${i}.webp`;return image;});
export const TORCH_FRAMES=frames;
export const torchAssetsReady=Promise.all(frames.map(image=>image.decode()));
const W=24,H=39,TOP=15.75;
// Keep source proportions and enough texels for the maximum 2.2× camera zoom.
const FLAME_SOURCE_HEIGHT=132,FLAME_HEIGHT=H*FLAME_SOURCE_HEIGHT/290,RESOLUTION=3;
// Small deterministic ground patches are cached once; flame animation never
// regenerates grass geometry or repaints the courtyard.
const postGround=TORCHES.filter(t=>!t.wall).map((_,index)=>{
 const patch=document.createElement('canvas');patch.width=216;patch.height=108;
 const g=patch.getContext('2d')!;g.scale(3,3);g.translate(36,19);
 let seed=917+index*431;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const shade=g.createRadialGradient(0,0,1,0,0,29);shade.addColorStop(0,'#343b2480');shade.addColorStop(1,'#40472b00');
 g.save();g.scale(1,.38);g.fillStyle=shade;g.fillRect(-32,-32,64,64);g.restore();
 for(let i=0;i<180;i++){
  const angle=random()*Math.PI*2,r=Math.sqrt(random());const x=Math.cos(angle)*r*30,y=Math.sin(angle)*r*10;
  g.globalAlpha=.35+random()*.45;g.fillStyle=['#555d35','#687043','#7b7d4c','#464d2e'][i%4];
  g.beginPath();g.ellipse(x,y,1+random()*3,.4+random()*1.1,-.35,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=.85;
 for(let i=0;i<26;i++){
  const x=(random()-.5)*44,y=(random()-.5)*13,h=2+random()*5;
  g.strokeStyle=i%2?'#777d48':'#454f2e';g.lineWidth=.55;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-1,y-h*.6,x+(random()-.5)*4,y-h);g.stroke();
 }
 g.globalAlpha=1;g.fillStyle='#27271f88';g.beginPath();g.ellipse(0,0,4,1.6,0,0,Math.PI*2);g.fill();
 return patch;
});
// The unlit body is baked in daylight; at night the firelit lower sconce sits over the wall bloom while local canvases animate the upper flame.
export function drawTorches(c:CanvasRenderingContext2D,lit:boolean){
 const frame=lit?frames[1]:frames[3];
 if(!frame.complete||!frame.naturalWidth)return;
 let post=0;
 for(const t of TORCHES){
  const y=t.y-t.lift;
  if(!t.wall)c.drawImage(postGround[post++],t.x-36,t.y-19,72,36);
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
