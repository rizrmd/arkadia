// A fractional vsync gate. Integer millisecond deltas can turn a valid 16.667 ms
// refresh into 16 ms and incorrectly reject it at a 60 FPS target.
export function createFrameCadence(){
 let next=0,last=-Infinity,rate=0;
 return {
  reset(){next=0;last=-Infinity;rate=0;},
  take(now:number,fps:number){
   if(!Number.isFinite(now)||!Number.isFinite(fps)||fps<=0)return false;
   if(fps!==rate||now<last){next=now;rate=fps;}
   last=now;
   const interval=1000/fps;
   // Vsync timestamps can arrive a fraction early. Keep the deadline anchored so
   // this tolerance prevents a missed refresh without raising the long-run rate.
   if(now+Math.min(1,interval*.05)<next)return false;
   // Keep cadence on fast displays and skip missed deadlines without catch-up bursts.
   next+=Math.max(1,Math.floor((now-next+1e-7)/interval)+1)*interval;
   return true;
  },
 };
}

export function installTickerCadence(ticker:{maxFPS:number;update:(now?:number)=>void},getFps:()=>number){
 const cadence=createFrameCadence(),update=ticker.update.bind(ticker);
 // Pixi's internal maxFPS gate truncates elapsed time; apply our fractional gate
 // before its uncapped update instead. start/stop and ticker listeners still work.
 ticker.maxFPS=0;
 ticker.update=(now=performance.now())=>{if(cadence.take(now,getFps()))update(now);};
 return cadence;
}
