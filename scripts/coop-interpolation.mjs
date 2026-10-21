import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';
import {createTimeline} from '../src/stronghold/net/timeline.ts';
// Deterministic test of how remote heroes are drawn (src/stronghold/net/timeline.ts), independent of machine
// load. A server ticks at 20 Hz and moves a hero evenly (walk right, turn, walk down, stop, walk again); its
// snapshots reach the client over a seeded network model (one-way delay, jitter, spikes, in order as TCP
// delivers them) and the client draws at a virtual 60 fps. Every frame's drawn speed is compared with the true
// walking speed. The previous fixed 100 ms interpolation (no extrapolation, snapping clock anchor) runs on the
// same streams as the reference.
//   node scripts/coop-interpolation.mjs        writes docs/coop/interpolation.json and interpolation-mobile.webp (a
//                                              chart of the drawn speed), exits non-zero on a regression
const TICK=50,SPEED=66,FRAME=1000/60,SECONDS=30;
const PROFILES={lan:{base:2,jitter:4,spike:0,spikeMs:0,jank:0},mobile:{base:40,jitter:50,spike:.03,spikeMs:120,jank:0},
 bad:{base:80,jitter:120,spike:.06,spikeMs:250,jank:0},janky:{base:40,jitter:50,spike:.03,spikeMs:120,jank:.02},
 // The mobile network with a 300 ms hole right as the hero stops at 14 s: the worst case for extrapolation.
 stopgap:{base:40,jitter:50,spike:.03,spikeMs:120,jank:0,gap:{from:281,to:286,ms:300}}};
function rng(seed){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// The hero's true path: 0-8 s right, 8-14 s down, 14-16 s standing, then up-right again.
function truth(ms){const s=ms/1000,v=SPEED;
 if(s<8)return {x:400+v*s,y:300,st:'idle',walking:true};
 if(s<14)return {x:400+v*8,y:300+v*(s-8),st:'idle',walking:true};
 if(s<16)return {x:400+v*8,y:300+v*6,st:'idle',walking:false};
 return {x:400+v*8+v*.7*(s-16),y:300+v*6-v*.7*(s-16),st:'idle',walking:true};}
const snapshot=tick=>{const p=truth(tick*TICK);return {t:'s',ack:0,tick,clock:0,gate:{open:false,frame:0,pass:false},players:[{id:'p1',name:'A',x:p.x,y:p.y,hp:100,max:100,st:p.st,n:0,mv:p.walking,fc:1,bk:false,vt:false,k:0}],enemies:[]};};
// The previous client: anchored on the least-delayed snapshot (snapping down, drifting up 2% per snapshot), drawn
// a fixed 100 ms behind, clamped at the newest snapshot.
function legacy(){const snaps=[];let offset=Infinity;
 return {push(m,at){const sample=at-m.tick*TICK;offset=sample<offset?sample:offset+(sample-offset)*.02;snaps.push(m);if(snaps.length>40)snaps.shift();},
  remotes(now){const t=now-offset-100;for(let i=snaps.length-1;i>0;i--){const a=snaps[i-1],b=snaps[i];if(a.tick*TICK<=t){const span=(b.tick-a.tick)*TICK,k=Math.min(1,Math.max(0,span?(t-a.tick*TICK)/span:1));const p=a.players[0],q=b.players[0];return [{x:p.x+(q.x-p.x)*k,y:p.y+(q.y-p.y)*k}];}}return snaps.length?[snaps[0].players[0]]:[];}};}
function run(net,make,seed){
 const r=rng(seed),arrivals=[];let free=0;
 for(let tick=1;tick<=SECONDS*20;tick++){const d=net.base+r()*net.jitter+(r()<net.spike?net.spikeMs:0)+(net.gap&&tick>=net.gap.from&&tick<=net.gap.to?net.gap.ms:0);free=Math.max(free,tick*TICK+d);arrivals.push({at:free,tick});}
 const view=make();if(view.reset)view.reset('p2');
 const frames=[];let i=0,now=0;
 while(now<SECONDS*1000-500){
  // A janky frame takes 120 ms (garbage collection, a slow phone); messages are handled between frames.
  const busy=r()<net.jank;now+=busy?120:FRAME;
  for(;i<arrivals.length&&arrivals[i].at<=now;i++)view.push(snapshot(arrivals[i].tick),busy?now:arrivals[i].at);
  const p=view.remotes(now)[0];if(p)frames.push({now,x:p.x,y:p.y});
 }
 return {frames,stats:view.stats};
}
// Drawn speed per frame against the true speed, over frames well inside a straight walk.
function score({frames,stats}){
 const v=[];
 for(let k=1;k<frames.length;k++){const a=frames[k-1],b=frames[k],dt=b.now-a.now,speed=Math.hypot(b.x-a.x,b.y-a.y)/dt*1000,mid=b.now-400;
  const s=mid/1000;if(!((s>1&&s<7.5)||(s>8.6&&s<13.5)||(s>16.6&&s<29)))continue;v.push(speed);}
 const err=v.map(x=>Math.abs(x-SPEED)/SPEED).sort((a,b)=>a-b),mean=v.reduce((a,b)=>a+b,0)/v.length,sd=Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length);
 // Where the drawn hero comes to rest while the true hero stands still (14-16 s), how far extrapolation carried
 // it past the stop, and how far any frame strays off the true path (the corners at 8 s and 16 s included).
 const rest=frames.filter(f=>f.now>15200&&f.now<16000),stop=truth(14500),overshoot=Math.max(...rest.map(f=>Math.hypot(f.x-stop.x,f.y-stop.y)));
 const past=Math.max(0,...frames.filter(f=>f.now>14000&&f.now<16000).map(f=>f.y-stop.y));
 const corners=[truth(0),truth(8000),truth(14500),truth(SECONDS*1000)],seg=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k);};
 const off=Math.max(...frames.filter(f=>f.now>1000).map(f=>Math.min(seg(f,corners[0],corners[1]),seg(f,corners[1],corners[2]),seg(f,corners[2],corners[3]))));
 return {frames:v.length,cv:+(sd/mean).toFixed(3),stalls:v.filter(x=>x<SPEED*.25).length,jumps:v.filter(x=>x>SPEED*1.75).length,
  p95SpeedError:+(err[Math.floor(err.length*.95)]*100).toFixed(1)+'%',maxSpeedError:+(err.at(-1)*100).toFixed(1)+'%',restOvershootPx:+overshoot.toFixed(2),pastStopPx:+past.toFixed(2),offPathPx:+off.toFixed(2),...(stats?{delayMs:stats.delay,extrapolatedFrames:stats.extrapolated,heldFrames:stats.held}:{})};
}
const results={secondsPerRun:SECONDS,fps:60,heroSpeedPxPerS:SPEED,profiles:PROFILES,runs:{}};
// Drawn speed per frame on the mobile profile, 2-7 s into the walk, before and after.
async function chart(net){
 const W=1200,H=520,L=70,R=24,T=70,B=60,t0=2000,t1=7000,top=200,x=t=>L+(t-t0)/(t1-t0)*(W-L-R),y=v=>T+(1-Math.min(v,top)/top)*(H-T-B);
 const line=(frames,color,width)=>{let d='';for(let k=1;k<frames.length;k++){const a=frames[k-1],b=frames[k];if(b.now<t0||b.now>t1)continue;const v=Math.hypot(b.x-a.x,b.y-a.y)/(b.now-a.now)*1000;d+=(d?'L':'M')+x(b.now).toFixed(1)+','+y(v).toFixed(1);}return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`;};
 const grid=[0,50,100,150,200].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e6ea"/><text x="${L-10}" y="${y(v)+5}" text-anchor="end" font-size="16" fill="#5b6470">${v}</text>`).join('');
 const ticks=[2,3,4,5,6,7].map(s=>`<text x="${x(s*1000)}" y="${H-B+26}" text-anchor="middle" font-size="16" fill="#5b6470">${s} s</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="DejaVu Sans, Arial, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/>
 <text x="${L}" y="32" font-size="22" font-weight="bold" fill="#1d232b">Remote hero: drawn speed per frame (mobile network, 60 fps)</text>
 <text x="${L}" y="56" font-size="16" fill="#5b6470">True walking speed ${SPEED} px/s (dashed). Grey: previous fixed 100 ms interpolation. Blue: adaptive clock with extrapolation.</text>
 ${grid}${ticks}<text x="20" y="${T+(H-T-B)/2}" font-size="16" fill="#5b6470" transform="rotate(-90 20 ${T+(H-T-B)/2})" text-anchor="middle">px/s</text>
 ${line(run(net,legacy,7).frames,'#9aa3ad',2)}${line(run(net,()=>createTimeline(TICK),7).frames,'#1f6feb',3)}
 <line x1="${L}" x2="${W-R}" y1="${y(SPEED)}" y2="${y(SPEED)}" stroke="#1d232b" stroke-dasharray="6 6" stroke-width="1.5"/></svg>`;
 await fs.writeFile('docs/coop/interpolation-mobile.webp',await sharp(Buffer.from(svg)).webp({quality:90}).toBuffer());
}
for(const [name,net] of Object.entries(PROFILES)){
 const before=score(run(net,legacy,7)),after=score(run(net,()=>createTimeline(TICK),7));
 results.runs[name]={before,after};
 console.log(name.padEnd(7),'before',JSON.stringify(before),'\n'+' '.repeat(8)+'after ',JSON.stringify(after));
}
// The new clock must draw an even walk on every profile, never worse than before, and come to rest at the stop.
for(const [name,{before,after}] of Object.entries(results.runs)){
 assert(after.stalls<=before.stalls&&after.jumps<=before.jumps,`${name}: more stalls or jumps than before`);
 assert(after.cv<=before.cv,`${name}: less even than before`);
 assert(after.restOvershootPx<.5,`${name}: rests ${after.restOvershootPx} px past the stop`);
}
// Extrapolating into a stop carries the hero at most EXTRAP_MS of walking past it, then it glides back.
assert(results.runs.stopgap.after.pastStopPx<=SPEED*.2+.01,'extrapolated too far past the stop');
for(const name of ['lan','mobile','janky'])assert(results.runs[name].after.stalls+results.runs[name].after.jumps===0,`${name}: stalls or jumps`);
results.ok=true;
await fs.mkdir('docs/coop',{recursive:true});await chart(PROFILES.mobile);await fs.writeFile('docs/coop/interpolation.json',JSON.stringify(results,null,1)+'\n');
