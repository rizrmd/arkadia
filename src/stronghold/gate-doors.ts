/** The complete gateway plays as one sprite: both towers, arch and synchronized door leaves share one pivot. */
export type GateSheet={image:string;columns:number;frames:number;frame:{w:number;h:number};fps:number;region:{x:number;y:number;w:number;h:number}};
export const GATE_SHEET='/modular-stronghold/v2/full-gateway-sheet.json';
export function createGateDoors(layer:HTMLElement,gateway:HTMLImageElement,sheet:HTMLImageElement,meta:GateSheet,onPassable:(open:boolean)=>void){
 const {region,frame}=meta,height=region.h,canvas=document.createElement('canvas');
 canvas.id='world-gate-doors';canvas.width=frame.w;canvas.height=frame.h;
 canvas.style.cssText=`position:absolute;left:0;top:0;width:${region.w}px;height:${region.h}px;transform-origin:0 0;pointer-events:none;will-change:transform`;
 layer.append(canvas);const c=canvas.getContext('2d')!;
 // Tint the small atlas only when ambient light changes, never while the doors move.
 const tinted=document.createElement('canvas');tinted.width=sheet.width;tinted.height=sheet.height;
 let index=0,target=0,raf=0,last=0,elapsed=0,shown=-1,passable=false,tint='',behind:boolean|null=null;
 function paint(){
  if(index!==shown){shown=index;c.globalCompositeOperation='copy';c.drawImage(tinted,(index%meta.columns)*frame.w,Math.floor(index/meta.columns)*frame.h,frame.w,frame.h,0,0,frame.w,frame.h);c.globalCompositeOperation='source-over';}
  const progress=index/(meta.frames-1);canvas.dataset.frame=String(index);canvas.dataset.progress=progress.toFixed(3);canvas.dataset.state=index===target?(target?'open':'closed'):(target?'opening':'closing');
  const next=progress>=.8;if(next!==passable){passable=next;onPassable(next);}
 }
 function tick(now:number){elapsed+=last?Math.min(100,now-last):0;last=now;const step=1000/meta.fps;
  while(elapsed>=step&&index!==target){elapsed-=step;index+=Math.sign(target-index);}paint();
  if(index!==target)raf=requestAnimationFrame(tick);else{raf=0;last=0;elapsed=0;}
 }
 function setTint(rgb:readonly number[]){const key=rgb.join();if(key===tint)return;tint=key;const t=tinted.getContext('2d')!;
  t.globalCompositeOperation='copy';t.drawImage(sheet,0,0);if(rgb.some(v=>v<1)){t.globalCompositeOperation='multiply';t.fillStyle=`rgb(${rgb.map(v=>Math.round(v*255))})`;t.fillRect(0,0,tinted.width,tinted.height);t.globalCompositeOperation='destination-in';t.drawImage(sheet,0,0);}t.globalCompositeOperation='source-over';shown=-1;paint();
 }
 setTint([1,1,1]);
 return {setTint,
  hit(x:number,y:number){const u=(x-442)/region.w,v=(y-(790-height*.97))/region.h;if(u<0||v<0||u>=1||v>=1)return false;return c.getImageData(Math.floor(u*frame.w),Math.floor(v*frame.h),1,1).data[3]>40;},
  order(hero:HTMLElement,inside:boolean){if(inside===behind)return;behind=inside;if(inside)hero.after(canvas);else hero.before(canvas);},
  setOpen(open:boolean){target=open?meta.frames-1:0;if(index!==target&&!raf)raf=requestAnimationFrame(tick);},
  place(x:number,y:number,scale:number){canvas.style.transform=`translate3d(${x+(442+region.x)*scale}px,${y+(790-height*.97+region.y)*scale}px,0) scale(${scale})`;}
 };
}
