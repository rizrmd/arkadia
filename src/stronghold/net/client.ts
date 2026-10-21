import {PROTOCOL,TICK_MS,type EnemyState,type Hello,type Input,type PlayerState,type ServerMessage,type Snapshot,type Welcome} from './protocol';
import {walkStep,navBlocker,type Column} from './movement';
import {createTimeline,type Timed} from './timeline';
import {DAY_MS} from '../daylight';
import type {Walk} from '../controls';
// The co-op connection. The server owns the world; this client sends one walk input per 50 ms tick and renders
// snapshots. The own hero is predicted: every input is applied locally with the server's walking rule at once,
// and each snapshot rebases it on the server's position after the last acknowledged input, replaying the rest.
// A mismatch (a server-side swing, hit or auto-step) is blended out over ~90 ms instead of snapping. Other heroes
// and every revenant are drawn slightly in the past on an adaptive render clock with bounded extrapolation
// (timeline.ts).
export type NetStatus='idle'|'connecting'|'online'|'reconnecting'|'offline';
export type JoinError=Error&{code:string};
const SMOOTH_MS=90,SNAP_PX=80;
// Input pacing: the fewest inputs waiting at the server over the last second (queued minus walked ahead) is kept
// between 1 and 2 by sending up to 5% faster or slower, so jitter is absorbed by the queue and stops stay exact.
const PACE_WINDOW=20,PACE=.05;
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const fail=(code:string,message:string)=>Object.assign(new Error(message),{code}) as JoinError;
export function socketUrl(){
 const q=new URLSearchParams(location.search).get('server');if(q)return q;
 return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
}
export function createNet(o:{direction:()=>Walk;maxHp:()=>number;url?:string}){
 let ws:WebSocket|null=null,status:NetStatus='idle',room='',you='',name='',layout:string[]=[],lastError='',retries=0,retryTimer=0;
 let blocked:((x:number,y:number,pass:boolean)=>boolean)|null=null;
 let latest:Timed|null=null,rtt=0;const timeline=createTimeline(TICK_MS);
 let seq=0,pending:Input[]=[],owed=0,margins:number[]=[],pace=1,pred={x:0,y:0},prev={x:0,y:0},err={x:0,y:0},acc=0,last=0;
 const stats={snapshots:0,inputs:0,corrections:0,maxCorrection:0,lastCorrection:0,bytes:0,pace:1,margin:0};
 const snapshotListeners=new Set<(s:Snapshot)=>void>(),statusListeners=new Set<(s:NetStatus)=>void>();
 const setStatus=(s:NetStatus)=>{if(s===status)return;status=s;for(const f of statusListeners)f(s);};
 const navReady=fetch('/coop/nav.json').then(r=>{if(!r.ok)throw Error('Co-op collision data missing');return r.json();}).then((n:{columns:Column[]})=>{blocked=navBlocker(n.columns);});
 navReady.catch(()=>{});
 const mine=(s:Snapshot|null)=>s?.players.find(p=>p.id===you)??null;
 const block=(pass:boolean)=>(x:number,y:number)=>blocked!(x,y,pass);
 function reset(state:Welcome['state']){
  timeline.reset(you);latest=null;pending=[];owed=0;margins=[];pace=1;seq=0;acc=0;err={x:0,y:0};
  const me=state.players.find(p=>p.id===you);if(me){pred={x:me.x,y:me.y};prev={...pred};}
 }
 // Rebase the own hero on the server and replay inputs it has not applied yet.
 function reconcile(s:Snapshot){
  const me=mine(s);if(!me||!blocked)return;
  pending=pending.filter(i=>i.seq>s.ack);
  // The server may already have walked the next few inputs ahead of their arrival (late inputs, sim.Player.Owed),
  // even inputs this client has not sent yet (a frame stall): those are not walked again here or in tick().
  owed=s.ow??0;let x=me.x,y=me.y;
  margins.push((s.q??0)-owed);if(margins.length>PACE_WINDOW)margins.shift();
  const margin=Math.min(...margins);pace=margin<1?1-PACE:margin>2?1+PACE:1;stats.pace=pace;stats.margin=margin;
  if(me.st==='idle')for(const i of pending.slice(owed)){const r=walkStep(block(s.gate.pass),x,y,i,TICK_MS);x=r.x;y=r.y;}
  const dx=pred.x-x,dy=pred.y-y,d=Math.hypot(dx,dy);
  if(d>.5){stats.corrections++;stats.lastCorrection=d;stats.maxCorrection=Math.max(stats.maxCorrection,d);}
  // A respawn or teleport jumps; anything smaller glides.
  if(d>SNAP_PX){err={x:0,y:0};prev={x,y};}else{err.x+=dx;err.y+=dy;prev.x-=dx;prev.y-=dy;}
  pred={x,y};
 }
 function receive(raw:string){
  let m:ServerMessage;try{m=JSON.parse(raw);}catch{return;}
  stats.bytes+=raw.length;
  if(m.t==='s'){
   const s=timeline.push(m,performance.now());latest=s;stats.snapshots++;
   reconcile(s);for(const f of snapshotListeners)f(s);
  }else if(m.t==='pong')rtt=performance.now()-m.c;
 }
 function connect(code:string,who:string){
  return new Promise<Welcome>((resolve,reject)=>{
   clearTimeout(retryTimer);ws?.close();let settled=false;
   const socket=new WebSocket(o.url??socketUrl());ws=socket;
   const timer=setTimeout(()=>{if(!settled){settled=true;socket.close();reject(fail('timeout','The co-op server did not answer.'));}},8000);
   socket.onopen=()=>{const hello:Hello={t:'hello',v:PROTOCOL,name:who,room:code,maxHp:o.maxHp()};socket.send(JSON.stringify(hello));};
   socket.onmessage=e=>{
    if(settled){if(ws===socket)receive(String(e.data));return;}
    let m:ServerMessage;try{m=JSON.parse(String(e.data));}catch{return;}
    settled=true;clearTimeout(timer);
    if(m.t==='welcome')resolve(m);else{socket.close();reject(fail(m.t==='error'?m.code:'bad_reply',m.t==='error'?m.message:'Unexpected reply from the server.'));}
   };
   socket.onerror=()=>{};
   socket.onclose=()=>{clearTimeout(timer);if(!settled){settled=true;reject(fail('network','Could not reach the co-op server.'));return;}if(ws===socket)lost();};
  });
 }
 // An unexpected disconnect keeps the last world on screen and rejoins the same room with backoff; if the
 // room has gone (a server restart), a solo player gets a fresh one.
 function lost(){
  ws=null;if(status!=='online'&&status!=='reconnecting')return;setStatus('reconnecting');
  const delay=Math.min(8000,1000*2**retries++);
  retryTimer=window.setTimeout(()=>{
   const solo=(latest?.players.length??1)<=1;
   join(room,name).catch((e:JoinError)=>{
    if(e.code==='room_not_found'&&solo)join('',name).catch(()=>lost());
    else if((e.code==='network'||e.code==='timeout')&&retries<7)lost();
    else{lastError=e.message;setStatus('offline');}
   });
  },delay);
 }
 // Join a room by code, or create one with an empty code.
 async function join(code:string,who:string){
  setStatus(status==='reconnecting'?'reconnecting':'connecting');lastError='';
  try{await navReady;}catch(e){lastError=(e as Error).message;setStatus('offline');throw fail('nav',lastError);}
  try{
   const w=await connect(code,who);
   room=w.room;you=w.you;name=who;layout=w.layout;retries=0;reset(w.state);
   receive(JSON.stringify({...w.state,t:'s',ack:0}));setStatus('online');return w;
  }catch(e){if(status!=='reconnecting'){lastError=(e as Error).message;setStatus('offline');}throw e;}
 }
 function leave(){clearTimeout(retryTimer);const s=ws;ws=null;s?.close();you='';room='';setStatus('offline');}
 // One input per tick from the render loop; after a stall (background tab) it resumes instead of bursting.
 function frame(now:number){
  const dt=last?Math.min(now-last,250):16;last=now;
  if(you&&(status==='online'||status==='reconnecting')){
   // Each input still walks one 50 ms step; pacing only changes how often one is sent.
   const every=TICK_MS*pace;acc+=dt;if(acc>4*every)acc=every;
   while(acc>=every){acc-=every;tick();}
   const k=Math.exp(-dt/SMOOTH_MS);err.x*=k;err.y*=k;
  }
  requestAnimationFrame(frame);
 }
 function tick(){
  const d=o.direction(),input:Input={t:'in',seq:++seq,x:+d.x.toFixed(4),y:+d.y.toFixed(4)};
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify(input));stats.inputs++;}
  pending.push(input);if(pending.length>60)pending.shift();
  prev={...pred};const me=mine(latest);
  if(blocked&&latest&&(!me||me.st==='idle')&&pending.length>owed){const r=walkStep(block(latest.gate.pass),pred.x,pred.y,input,TICK_MS);pred={x:r.x,y:r.y};}
 }
 requestAnimationFrame(frame);
 setInterval(()=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({t:'ping',c:performance.now()}));},1000);
 const api={
  join,leave,
  status:()=>status,room:()=>room,you:()=>you,name:()=>name,error:()=>lastError,layout:()=>layout,rtt:()=>rtt,stats,timeline:timeline.stats,
  // In co-op the server's world replaces the local simulation, also while briefly reconnecting.
  active:()=>!!you&&(status==='online'||status==='reconnecting'),
  latest:()=>latest,me:()=>mine(latest),
  // Own hero: predicted position between the last two ticks, plus the fading correction.
  position(){const k=Math.min(1,acc/(TICK_MS*pace));return {x:lerp(prev.x,pred.x,k)+err.x,y:lerp(prev.y,pred.y,k)+err.y};},
  remotes:(now:number):PlayerState[]=>timeline.remotes(now),
  enemies:(now:number):EnemyState[]=>timeline.enemies(now),
  gate:()=>latest?.gate??null,
  // Server time of day, advanced between snapshots while connected.
  clock(){if(!latest)return null;const t=latest.clock+(status==='online'?(performance.now()-latest.at)/DAY_MS:0);return t-Math.floor(t);},
  onSnapshot(f:(s:Snapshot)=>void){snapshotListeners.add(f);return ()=>snapshotListeners.delete(f);},
  onStatus(f:(s:NetStatus)=>void){statusListeners.add(f);return ()=>statusListeners.delete(f);}
 };
 return api;
}
export type Net=ReturnType<typeof createNet>;
