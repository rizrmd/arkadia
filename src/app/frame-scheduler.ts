import {renderQuality} from './render-quality';
// Share the selected 30/60 Hz cadence across game loops so skipped refreshes do no game work.
export const MAX_FPS=60;

const pending=new Map<number,FrameRequestCallback>();
let nextId=0,raf=0,nextFrame=0;
function tick(now:number){
 raf=0;
 const interval=1000/renderQuality.get().targetFps;
 if(now+0.01>=nextFrame){
  // Preserve the fractional cadence on 120/144/240 Hz displays, without catch-up bursts after a pause.
  nextFrame=now+interval-Math.max(0,(now-nextFrame)%interval);
  const batch=[...pending];
  for(const [id,callback] of batch){
   if(!pending.delete(id))continue;
   try{callback(now);}catch(error){reportError(error);}
  }
 }
 if(pending.size&&!raf)raf=window.requestAnimationFrame(tick);
}
export function requestGameFrame(callback:FrameRequestCallback):number{
 const id=++nextId;pending.set(id,callback);
 if(!raf)raf=window.requestAnimationFrame(tick);
 return id;
}
export function cancelGameFrame(id:number){
 pending.delete(id);
 if(!pending.size&&raf){window.cancelAnimationFrame(raf);raf=0;nextFrame=0;}
}
