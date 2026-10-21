/** The complete gateway plays as one sprite: both towers, arch and synchronized door leaves share one pivot. */
export type GateSheet={image:string;columns:number;frames:number;frame:{w:number;h:number};fps:number;region:{x:number;y:number;w:number;h:number}};
export const GATE_SHEET='/modular-stronghold/v2/full-gateway-v3-sheet.json';
export function createGateDoors(layer:HTMLElement,gateway:HTMLImageElement,sheet:HTMLImageElement,meta:GateSheet,onPassable:(open:boolean)=>void,light:{revision:()=>number;shade:(source:HTMLCanvasElement,target:HTMLCanvasElement)=>void}){
 const {region,frame}=meta,height=region.h,canvas=document.createElement('canvas');
 canvas.id='world-gate-doors';canvas.dataset.renderer='gateway-lightmap-v3';canvas.width=frame.w;canvas.height=frame.h;
 canvas.style.cssText=`position:absolute;left:0;top:0;width:${region.w}px;height:${region.h}px;transform-origin:0 0;pointer-events:none;will-change:transform`;
 layer.append(canvas);const c=canvas.getContext('2d')!;
 const source=document.createElement('canvas');source.width=frame.w;source.height=frame.h;const raw=source.getContext('2d')!;
 let index=0,target=0,raf=0,last=0,elapsed=0,shown=-1,passable=false,lit=-1,behind:boolean|null=null;
 function paint(){
  if(index!==shown||lit!==light.revision()){shown=index;raw.globalCompositeOperation='copy';raw.drawImage(sheet,(index%meta.columns)*frame.w,Math.floor(index/meta.columns)*frame.h,frame.w,frame.h,0,0,frame.w,frame.h);light.shade(source,canvas);lit=light.revision();}
  const progress=index/(meta.frames-1);canvas.dataset.frame=String(index);canvas.dataset.progress=progress.toFixed(3);canvas.dataset.state=index===target?(target?'open':'closed'):(target?'opening':'closing');
  const next=progress>=.8;if(next!==passable){passable=next;onPassable(next);}
 }
 function tick(now:number){elapsed+=last?Math.min(100,now-last):0;last=now;const step=1000/meta.fps;
  while(elapsed>=step&&index!==target){elapsed-=step;index+=Math.sign(target-index);}paint();
  if(index!==target)raf=requestAnimationFrame(tick);else{raf=0;last=0;elapsed=0;}
 }
 paint();
 return {refreshLighting:paint,
  hit(x:number,y:number){const u=(x-442)/region.w,v=(y-(790-height*.97))/region.h;if(u<0||v<0||u>=1||v>=1)return false;return c.getImageData(Math.floor(u*frame.w),Math.floor(v*frame.h),1,1).data[3]>40;},
  order(hero:HTMLElement,inside:boolean){if(inside===behind)return;behind=inside;if(inside)hero.after(canvas);else hero.before(canvas);},
  setOpen(open:boolean){target=open?meta.frames-1:0;if(index!==target&&!raf)raf=requestAnimationFrame(tick);},
  place(x:number,y:number,scale:number){canvas.style.transform=`translate3d(${x+(442+region.x)*scale}px,${y+(790-height*.97+region.y)*scale}px,0) scale(${scale})`;}
 };
}
