import type {EnemyState,PlayerState,Snapshot} from './protocol';
// The render clock for everything the server moves on its own: other heroes and revenants. They are drawn a
// little in the past, interpolated between the two snapshots around that moment. The delay adapts to how unevenly
// snapshots arrive (one tick plus the recent 95th percentile of lateness), and the clock runs at most 6% fast or
// slow to reach it instead of jumping, so a changing delay never shows as a hitch. A snapshot later still is
// bridged by extrapolating each entity along its last velocity for up to 200 ms; when the real snapshot lands,
// the difference is blended out over ~100 ms instead of snapping back.
// No browser or runtime imports: scripts/coop-interpolation.mjs runs it under Node with a virtual clock.
export type Timed=Snapshot&{at:number};
type Point={x:number;y:number};
// Snapshots kept, lateness window (snapshots), delay margin and cap, extrapolation cap, clock warp and the
// dead band it ignores, resync gap and correction blend (ms).
const KEEP=40,WINDOW=60,MARGIN=20,MAX_DELAY=350,EXTRAP_MS=200,WARP=.06,DEADBAND=15,RESYNC_MS=400,BLEND_MS=100,SNAP_PX=80;
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
export function createTimeline(tickMs:number){
 // Arrival lateness samples (receive time minus server time), the anchor and delay derived from them, the render
 // clock in server ms and the blended-out corrections, keyed 'p<id>' for heroes and 'e<id>.<generation>'.
 let snaps:Timed[]=[],late:number[]=[],base=Infinity,delay=tickMs+MARGIN,view=NaN,viewAt=0,you='';
 const blend=new Map<string,Point>(),stats={delay:0,extrapolated:0,held:0,blended:0};
 const latest=()=>snaps.length?snaps[snaps.length-1]:null;
 // The render clock: real time warped by at most ±6% toward the anchor minus the delay (within 15 ms it runs at
// real speed); a big gap (a stall,
 // a reconnect) resyncs at once. Decays the blended corrections by the same elapsed time.
 function clockAt(now:number){
  if(now===viewAt&&Number.isFinite(view))return view;
  const target=now-base-delay,dt=Math.max(0,now-viewAt);viewAt=now;
  if(!Number.isFinite(view)||Math.abs(target-view)>RESYNC_MS)view=target;
  else{const gap=target-view,off=Math.abs(gap)<DEADBAND?0:gap-Math.sign(gap)*DEADBAND;view+=dt*(1+Math.max(-WARP,Math.min(WARP,off/400)));}
  const k=Math.exp(-dt/BLEND_MS);for(const [id,b] of blend){b.x*=k;b.y*=k;if(Math.abs(b.x)+Math.abs(b.y)<.01)blend.delete(id);}
  return view;
 }
 // The two snapshots around server time t and how far between them (above 1: extrapolating past the newest,
 // capped at EXTRAP_MS beyond it).
 function around(t:number):[Timed,Timed,number]|null{
  if(!snaps.length)return null;
  for(let i=snaps.length-1;i>0;i--){const a=snaps[i-1],b=snaps[i],ta=a.tick*tickMs,tb=b.tick*tickMs;if(ta<=t){const span=tb-ta;return [a,b,span?Math.max(0,Math.min(t,tb+EXTRAP_MS)-ta)/span:1];}}
  return [snaps[0],snaps[0],0];
 }
 // Only a hero walking in both snapshots, or a revenant in the same state and generation, is extrapolated;
 // anything else holds at the newest snapshot.
 const step=(a:Point,b:Point,k:number,go:boolean)=>go||k<=1?{x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k)}:{x:b.x,y:b.y};
 function drawn(t:number){
  const out=new Map<string,Point>(),r=around(t);if(!r)return out;const [a,b,k]=r;
  for(const p of b.players){if(p.id===you)continue;const q=a.players.find(x=>x.id===p.id);out.set('p'+p.id,q?step(q,p,k,q.st==='idle'&&p.st==='idle'):{x:p.x,y:p.y});}
  for(const e of b.enemies){const q=a.enemies.find(x=>x.id===e.id);out.set('e'+e.id+'.'+e.g,q&&q.g===e.g?step({x:q.u,y:q.v},{x:e.u,y:e.v},k,q.st===e.st):{x:e.u,y:e.v});}
  return out;
 }
 function at(now:number){
  const fresh=now!==viewAt,t=clockAt(now),r=around(t),tip=latest()!.tick*tickMs;
  // Clock reads past the newest snapshot (extrapolated) and past the extrapolation cap (held still).
  if(fresh&&t>tip){stats.extrapolated++;if(t>tip+EXTRAP_MS)stats.held++;}
  return {r:r!,pos:drawn(t)};
 }
 const smoothed=(key:string,p:Point)=>{const b=blend.get(key);return b?{x:p.x+b.x,y:p.y+b.y}:p;};
 return {
  stats,latest,
  reset(own:string){snaps=[];late=[];base=Infinity;view=NaN;blend.clear();you=own;},
  // A snapshot received at local time `at` (ms).
  push(m:Snapshot,at:number){
   // The least-delayed snapshot of the last 3 s anchors the server timeline; the spread above it sets the delay.
   late.push(at-m.tick*tickMs);if(late.length>WINDOW)late.shift();
   const sorted=[...late].sort((a,b)=>a-b);base=sorted[0];
   delay=Math.min(MAX_DELAY,tickMs+MARGIN+sorted[Math.floor((sorted.length-1)*.95)]-base);stats.delay=Math.round(delay);
   // Where everything is drawn right now, before and after this snapshot: what changes was extrapolated wrong.
   const before=Number.isFinite(view)?drawn(view):null,s=Object.assign(m,{at});
   snaps.push(s);if(snaps.length>KEEP)snaps.shift();
   if(before)for(const [id,p] of drawn(view)){const q=before.get(id);if(!q)continue;const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<.01||d>SNAP_PX)continue;
    const b=blend.get(id)??{x:0,y:0};blend.set(id,{x:b.x+dx,y:b.y+dy});stats.blended++;}
   return s;
  },
  remotes(now:number):PlayerState[]{
   if(!snaps.length)return [];const {r,pos}=at(now);
   return r[1].players.filter(p=>p.id!==you).map(p=>({...p,...smoothed('p'+p.id,pos.get('p'+p.id)!)}));
  },
  enemies(now:number):EnemyState[]{
   if(!snaps.length)return [];const {r,pos}=at(now);
   return r[1].enemies.map(e=>{const q=smoothed('e'+e.id+'.'+e.g,pos.get('e'+e.id+'.'+e.g)!);return {...e,u:q.x,v:q.y};});
  }
 };
}
