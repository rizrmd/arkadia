import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
// Co-op motion smoothness under a jittery phone network. Two browser tabs share a room; every WebSocket frame in
// both directions is held back by a one-way delay plus random jitter and occasional spikes (in order, as TCP
// delivers). Tab A walks straight down the screen; each tab records, every animation frame, where it draws A's
// hero: A its own predicted hero, B the remote ally. Over the steady part of the walk the drawn speed should stay
// even: a stall is a frame drawn at under a quarter of the median speed, a jump one at over 1.75 times it.
//   npm run build && node scripts/coop-smoothness.mjs                (starts server/ on dist/)
//   PROFILE=lan|mobile|bad node scripts/coop-smoothness.mjs         (default mobile)
//   ROOT=/path/to/other/checkout node scripts/coop-smoothness.mjs  (its prebuilt server/bin and dist/, for A/B runs)
const PROFILES={lan:{base:0,jitter:0,spike:0,spikeMs:0},mobile:{base:40,jitter:50,spike:.03,spikeMs:120},bad:{base:80,jitter:120,spike:.06,spikeMs:250}};
const name=process.env.PROFILE||'mobile',net=PROFILES[name];
const out='docs/coop';await fs.mkdir(out,{recursive:true});
const root=process.env.ROOT||'.';
if(!process.env.ROOT&&!process.env.NOBUILD)execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
const server=spawn(root+'/server/bin/arkodia',[],{env:{...process.env,PORT:'8795',SITE_DIR:root+'/dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
const url='http://127.0.0.1:8795';
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
// One ordered, delayed pipe per direction. Frames wait in one queue and leave strictly in turn: separate timers
// for each frame could fire out of order (whole-ms rounding), which TCP never does.
function pipe(){const queue=[];let timer=0,free=0;
 const flush=()=>{timer=0;const now=performance.now();while(queue.length&&queue[0].at<=now+1)queue.shift().send();if(queue.length)timer=setTimeout(flush,queue[0].at-now);};
 return send=>{const now=performance.now(),d=net.base+Math.random()*net.jitter+(Math.random()<net.spike?net.spikeMs:0);free=Math.max(free,now+d);queue.push({at:free,send});if(!timer)timer=setTimeout(flush,free-now);};}
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
const online=page=>page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000});
const browsers=[];const results={profile:name,network:net,build:process.env.ROOT?'reference':'working tree'};
// Per frame speeds of the drawn hero over the steady stretch of the walk.
function score(samples){
 const v=[];for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dt=b.t-a.t;if(dt>0)v.push(Math.hypot(b.x-a.x,b.y-a.y)/dt*1000);}
 const s=[...v].sort((p,q)=>p-q),med=s[s.length>>1],mean=v.reduce((p,q)=>p+q,0)/v.length,sd=Math.sqrt(v.reduce((p,q)=>p+(q-mean)**2,0)/v.length);
 return {frames:v.length,medianPxPerS:+med.toFixed(1),cv:+(sd/mean).toFixed(3),stalls:v.filter(x=>x<med*.25).length,jumps:v.filter(x=>x>med*1.75).length,minPxPerS:+s[0].toFixed(1),maxPxPerS:+s.at(-1).toFixed(1)};
}
try{
 const open=async path=>{const b=await launch();browsers.push(b);const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.routeWebSocket('**/ws',ws=>{const srv=ws.connectToServer(),up=pipe(),down=pipe();ws.onMessage(m=>up(()=>srv.send(m)));srv.onMessage(m=>down(()=>ws.send(m)));});
  await p.goto(url+path);await ready(p);return p;};
 const a=await open('/?time=0.42');await online(a);
 const room=await a.evaluate(()=>window.__COOP__.stats().room),you=await a.evaluate(()=>window.__COOP__.stats().you);
 const b=await open(`/?room=${room}&time=0.42`);await b.waitForSelector('#coop-panel:not([hidden])');
 await b.fill('#coop input[name=name]','Bima');await b.click('#coop .coop-primary');await online(b);
 await b.waitForSelector('#world-ally-'+you,{state:'attached',timeout:15000});await b.waitForTimeout(1500);
 // Record the drawn foot position of A's hero in both tabs, one sample per animation frame.
 const record=(page,sel)=>page.evaluate(sel=>{window.__track=[];const f=now=>{const c=document.querySelector(sel);if(c)window.__track.push({t:now,x:+c.dataset.x,y:+c.dataset.y});if(window.__track)requestAnimationFrame(f);};requestAnimationFrame(f);},sel);
 await record(a,'#world-hero');await record(b,'#world-ally-'+you);
 // A's hero in every snapshot B receives: how evenly the server itself moves it, tick by tick.
 await b.evaluate(you=>{window.__ticks=[];window.__COOP__.net.onSnapshot(s=>{const p=s.players.find(p=>p.id===you);if(p&&window.__ticks)window.__ticks.push({tick:s.tick,x:p.x,y:p.y});});},you);
 await a.keyboard.down('KeyS');await a.waitForTimeout(5000);await a.keyboard.up('KeyS');await a.waitForTimeout(800);
 const take=page=>page.evaluate(()=>{const t=window.__track;window.__track=null;return t;});
 const [ta,tb]=await Promise.all([take(a),take(b)]);
 // Steady stretch: from 1.2 s after the first drawn movement to 0.6 s before the last.
 const steady=t=>{const moved=t.filter((s,i)=>i&&(s.x!==t[i-1].x||s.y!==t[i-1].y));const from=moved[0].t+1200,to=moved.at(-1).t-600;return t.filter(s=>s.t>=from&&s.t<=to);};
 results.own=score(steady(ta));results.remote=score(steady(tb));
 // Per-frame drawn speed of the own hero over the whole walk, for scripts/chart-coop-phone.mjs.
 results.ownTrace=ta.slice(1).map((b,i)=>{const p=ta[i],dt=b.t-p.t;return [Math.round(b.t-ta[0].t),dt>0?Math.round(Math.hypot(b.x-p.x,b.y-p.y)/dt*1000):0];});
 // Server steps per tick while walking (one step is fullSpeed*50/1000 px, net/movement.ts): zero means the server had no input that tick.
 const ticks=await b.evaluate(()=>window.__ticks),steps=[];for(let i=1;i<ticks.length;i++)if(ticks[i].tick===ticks[i-1].tick+1)steps.push(+Math.hypot(ticks[i].x-ticks[i-1].x,ticks[i].y-ticks[i-1].y).toFixed(1));
 const walking=steps.slice(steps.findIndex(v=>v>0),steps.length-1-[...steps].reverse().findIndex(v=>v>0)+1),hist={};for(const v of walking)hist[v]=(hist[v]||0)+1;
 results.serverSteps={ticks:walking.length,histogram:hist};
 results.stats={a:await a.evaluate(()=>window.__COOP__.stats()),b:await b.evaluate(()=>window.__COOP__.stats())};
 for(const k of ['a','b'])for(const f of ['bytes','inputs','snapshots'])delete results.stats[k][f];
 console.log(JSON.stringify(results,null,1));
 await fs.writeFile(`${out}/smoothness-${name}${process.env.TAG?'-'+process.env.TAG:''}.json`,JSON.stringify(results,null,1)+'\n');
}finally{for(const b of browsers)await b.close().catch(()=>{});server.kill();}
process.exit(0);
