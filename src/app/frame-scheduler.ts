import {renderQuality} from './render-quality';
import {createFrameCadence} from './frame-cadence';
// Share the selected 30/60 Hz cadence across game loops so skipped refreshes do no game work.
export const MAX_FPS=60;

const pending=new Map<number,FrameRequestCallback>();
let nextId=0,raf=0;
const cadence=createFrameCadence();
let paused=false,pauseAt=0,pausedMs=0,pauseRevision=0;
let suspended=document.hidden,suspendAt=suspended?performance.now():0,suspendedMs=0;
function syncSuspension(){const value=paused||document.hidden;if(value===suspended)return;if(value)suspendAt=performance.now();else suspendedMs+=performance.now()-suspendAt;suspended=value;cadence.reset();}
document.addEventListener('visibilitychange',syncSuspension);
export function setGamePaused(value:boolean){if(value===paused)return;if(value)pauseAt=performance.now();else pausedMs+=performance.now()-pauseAt;paused=value;pauseRevision++;syncSuspension();}
export const isGamePaused=()=>paused;
export const gamePauseRevision=()=>pauseRevision;
export const gamePausedDuration=()=>pausedMs;
function tick(now:number){
 raf=0;
 if(!suspended&&cadence.take(now,renderQuality.get().targetFps)){
  const batch=[...pending];
  for(const [id,callback] of batch){
   if(!pending.delete(id))continue;
   try{callback(now-suspendedMs);}catch(error){reportError(error);}
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
 if(!pending.size&&raf){window.cancelAnimationFrame(raf);raf=0;cadence.reset();}
}
