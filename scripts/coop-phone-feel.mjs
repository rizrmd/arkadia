import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
// Phone walk feel, co-op against offline. One phone tab (390x844, touch, CPU slowed 4x) walks its hero with the real
// touch thumbstick, held by a thumb that wobbles a few px every touch event like a real one, along a curve. The
// same walk runs offline (?offline) and in a co-op room whose WebSocket frames cross a jittery phone network.
// Every animation frame records where the hero is drawn on screen (world foot plus camera) and the frame time;
// over the steady stretch the per-frame on-screen speed should stay even: a stall is a frame under a quarter of
// the median speed, a jump one over 1.75 times it. Server corrections of the predicted hero are counted too.
//   npm run build && node scripts/coop-phone-feel.mjs        (starts server/ on dist/)
//   CPU=4 TAG=after node scripts/coop-phone-feel.mjs         (CPU slowed 4x, report suffix)
//   ROOT=/path/to/other/checkout node scripts/coop-phone-feel.mjs  (its prebuilt server/bin and dist/, for A/B runs)
// Also reported: how many inputs waited at the server (each is 50 ms the server trails the phone) and how far the
// server's hero trailed the predicted one, which is how far a revenant's hit (the server holds the hero) pulls it back.
// NET=cell (default): a cellular link, 50-90 ms one way, where now and then a lost packet holds everything behind
// it for 250-500 ms (TCP head-of-line blocking). NET=jitter: a one-way delay plus random jitter and spikes.
// NET=burst: a phone radio in power save, releasing held packets together at its wake-ups every 100 ms.
const CPU=Number(process.env.CPU||1),NET=process.env.NET||'cell',net={base:40,jitter:50,spike:.03,spikeMs:120,wake:100,stall:.025,stallMs:[250,500]};
const out='docs/coop',root=process.env.ROOT||'.';await fs.mkdir(out,{recursive:true});
if(!process.env.ROOT&&!process.env.NOBUILD)execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
const server=spawn(root+'/server/bin/arkodia',[],{env:{...process.env,PORT:'8796',SITE_DIR:root+'/dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
const url='http://127.0.0.1:8796';
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
// One ordered pipe per direction (TCP never reorders): frames wait in a queue and leave strictly in turn.
function pipe(){const queue=[];let timer=0,free=0;const phase=Math.random()*net.wake;
 const flush=()=>{timer=0;const now=performance.now();while(queue.length&&queue[0].at<=now+1)queue.shift().send();if(queue.length)timer=setTimeout(flush,queue[0].at-now);};
 return send=>{const now=performance.now();let at;
  if(NET==='cell')at=now+50+Math.random()*40+(Math.random()<net.stall?net.stallMs[0]+Math.random()*(net.stallMs[1]-net.stallMs[0]):0);
  else if(NET==='burst'){const ready=now+30+Math.random()*30;at=Math.ceil((ready-phase)/net.wake)*net.wake+phase;}else at=now+net.base+Math.random()*net.jitter+(Math.random()<net.spike?net.spikeMs:0);
  free=Math.max(free,at);queue.push({at:free,send});if(!timer)timer=setTimeout(flush,free-now);};}
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
function score(samples,key){
 const v=[];for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dt=b.t-a.t;if(dt>0)v.push(Math.hypot(b[key+'x']-a[key+'x'],b[key+'y']-a[key+'y'])/dt*1000);}
 const s=[...v].sort((p,q)=>p-q),med=s[s.length>>1],mean=v.reduce((p,q)=>p+q,0)/v.length,sd=Math.sqrt(v.reduce((p,q)=>p+(q-mean)**2,0)/v.length);
 return {frames:v.length,medianPxPerS:+med.toFixed(1),cv:+(sd/mean).toFixed(3),stalls:v.filter(x=>x<med*.25).length,jumps:v.filter(x=>x>med*1.75).length};
}
function frames(samples){const d=[];for(let i=1;i<samples.length;i++)d.push(samples[i].t-samples[i-1].t);const s=[...d].sort((a,b)=>a-b);
 return {medianMs:+s[s.length>>1].toFixed(1),p95Ms:+s[Math.floor(s.length*.95)].toFixed(1),maxMs:+s.at(-1).toFixed(1),over50:d.filter(x=>x>50).length};}
async function run(mode){
 const browser=await launch(),ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
 if(mode==='coop')await page.routeWebSocket('**/ws',ws=>{const srv=ws.connectToServer(),up=pipe(),down=pipe();ws.onMessage(m=>up(()=>srv.send(m)));srv.onMessage(m=>down(()=>ws.send(m)));});
 await page.addInitScript(()=>{try{localStorage.setItem('arkodia.coop.name','Phone');localStorage.removeItem('arkodia.stronghold.hero');}catch{}});
 await page.goto(url+(mode==='coop'?'/?time=0.42':'/?offline&time=0.42'));await ready(page);
 if(mode==='coop')await page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000}).catch(async e=>{console.error(await page.evaluate(()=>JSON.stringify(window.__COOP__?.stats())),await page.evaluate(()=>document.querySelector('.coop-error')?.textContent));throw e;});
 const cdp=await ctx.newCDPSession(page);await (CPU>1&&cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU}));await page.waitForTimeout(2000);
 // Screen position of the hero's foot: world foot through the surface's camera transform.
 await page.evaluate(()=>{window.__track=[];const surface=document.querySelector('#world-surface');
  const f=now=>{const h=document.querySelector('#world-hero');if(h&&window.__track){const m=new DOMMatrix(surface.style.transform),wx=+h.dataset.x,wy=+h.dataset.y;window.__track.push({t:now,wx,wy,sx:m.m41+wx*m.m11,sy:m.m42+wy*m.m11});}if(window.__track)requestAnimationFrame(f);};requestAnimationFrame(f);});
 if(mode==='coop')await page.evaluate(()=>{window.__lag=[];window.__COOP__.net.onSnapshot(s=>{const me=window.__COOP__.net.me(),p=window.__COOP__.net.position();if(me&&window.__lag)window.__lag.push({q:s.q??0,d:Math.hypot(p.x-me.x,p.y-me.y)});});});
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id:id+1}))});
 // The thumb walks the hero down from the tent through the gateway into the wilds (where revenants close in), then
 // zigzags, turning every 0.8 s and once lifting for 0.8 s, with a 2-3 px tremor on every touch event: the doors,
 // the turns and the stop are where a prediction that disagrees with the server shows.
 const at=[120,720],legs=[95,95,95,95,95,95,0,150,-30,null,180,30,200];let leg=-1,down=false,dir=0;const t0=Date.now();
 while(Date.now()-t0<legs.length*800){const i=Math.floor((Date.now()-t0)/800);
  if(i!==leg){leg=i;if(legs[i]===null){if(down)await touch('touchEnd',[]);down=false;}else{if(!down)await touch('touchStart',[at]);down=true;}}
  if(down){const target=legs[leg]*Math.PI/180;dir+=Math.atan2(Math.sin(target-dir),Math.cos(target-dir))*.35;const r=34;
   await touch('touchMove',[[at[0]+Math.cos(dir)*r+(Math.random()-.5)*5,at[1]+Math.sin(dir)*r+(Math.random()-.5)*5]]);}
  await page.waitForTimeout(16);}
 if(down)await touch('touchEnd',[]);await page.waitForTimeout(800);
 const track=await page.evaluate(()=>{const t=window.__track;window.__track=null;return t;});
 const moved=track.filter((s,i)=>i&&(s.wx!==track[i-1].wx||s.wy!==track[i-1].wy)),from=moved[0].t+300,to=moved.at(-1).t,steady=track.filter(s=>s.t>=from&&s.t<=to);
 if(process.env.RAW)await fs.writeFile(`${process.env.RAW}-${mode}.json`,JSON.stringify(steady));
 const r={world:score(steady,'w'),screen:score(steady,'s'),frames:frames(steady)};
 if(mode==='coop'){const s=await page.evaluate(()=>window.__COOP__.stats()),lag=await page.evaluate(()=>window.__lag);
  const pct=(list,k)=>{const v=[...list].sort((a,b)=>a-b);return +v[Math.min(v.length-1,Math.floor(v.length*k))].toFixed(1);},q=lag.map(l=>l.q),d=lag.map(l=>l.d);
  r.server={queuedMedian:pct(q,.5),queuedP95:pct(q,.95),trailPxMedian:pct(d,.5),trailPxP95:pct(d,.95)};r.net={corrections:s.corrections,maxCorrection:+s.maxCorrection.toFixed(2),totalCorrection:+(s.totalCorrection??0).toFixed(1),pace:s.pace,margin:s.margin,rtt:Math.round(s.rtt)};}
 if(mode==='coop'&&process.env.RAW)await fs.writeFile(`${process.env.RAW}-netlog.json`,JSON.stringify(await page.evaluate(()=>window.__NETLOG)));
 await browser.close();return r;
}
const results={build:process.env.ROOT?'reference':'working tree',cpuThrottle:CPU,network:{model:NET,...net}};
try{results.offline=await run('offline');results.coop=await run('coop');}
finally{server.kill();}
console.log(JSON.stringify(results,null,1));
await fs.writeFile(`${out}/phone-feel-${NET}${process.env.TAG?'-'+process.env.TAG:''}.json`,JSON.stringify(results,null,1)+'\n');
process.exit(0);
