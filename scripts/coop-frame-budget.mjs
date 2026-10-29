import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
// Frame budget of a full co-op room. One browser tab plays; three more heroes are protocol clients (no browser, so
// only the measured tab burns CPU) that walk out into the wilds with it, which brings the room to its 17 revenants.
// Tab A walks down through the gateway and fights for a while. Recorded: every animation-frame interval and, from a
// CPU profile of the same span, how much of the main thread was idle and which functions used the rest.
//   npm run build && node scripts/coop-frame-budget.mjs              (starts server/ on dist/)
//   PHONE=1 node scripts/coop-frame-budget.mjs                       (390 x 844 at 2x, CPU throttled 4x)
//   ROOT=/path/to/other/checkout TAG=upstream node scripts/coop-frame-budget.mjs   (its prebuilt server/bin and dist/)
//   OFFLINE=1 node scripts/coop-frame-budget.mjs                     (the solo game on the same walk, for reference)
// Headless Chromium on a shared CPU without a GPU: compare runs with each other, not with a real phone.
const phone=!!process.env.PHONE,offline=!!process.env.OFFLINE,tag=process.env.TAG||'fixed',root=process.env.ROOT||'.',bots=offline?0:+(process.env.BOTS||3);
const out='docs/coop';await fs.mkdir(out,{recursive:true});
if(!process.env.ROOT&&!process.env.NOBUILD)execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
const server=spawn(root+'/server/bin/arkodia',[],{env:{...process.env,PORT:'8797',SITE_DIR:root+'/dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
const url='http://127.0.0.1:8797',sockets=[],timers=[];
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
try{
 const page=await (await browser.newContext(phone?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}})).newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+(offline?'/?offline=1&time=0.42':'/?time=0.42'),{timeout:180000,waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:240000});
 const room=offline?'':(await page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000}),await page.evaluate(()=>window.__COOP__.stats().room));
 // The other heroes: one input per tick, down the screen for 6 s (out through the gateway), then small circles.
 for(let i=0;i<bots;i++){const ws=new WebSocket(url.replace('http','ws')+'/ws');sockets.push(ws);let seq=0,t=0;
  ws.onopen=()=>ws.send(JSON.stringify({t:'hello',v:1,name:'Bot '+(i+1),room,maxHp:100,hero:i%2?'ember-warden':'rift-runner'}));
  ws.onmessage=()=>{if(seq)return;seq=1;timers.push(setInterval(()=>{t+=.05;const [x,y]=t<6?[0,1]:[Math.cos(t+i),Math.sin(t+i)];ws.send(JSON.stringify({t:'in',seq:++seq,x:+x.toFixed(3),y:+y.toFixed(3)}));},50));};}
 if(!offline)await page.waitForFunction(n=>window.__COOP__.net.latest()?.players.length===n,bots+1,{timeout:15000});
 const cdp=await page.context().newCDPSession(page);if(phone)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});
 await page.evaluate(()=>{window.__frames=[];let last=0;const f=t=>{if(last)window.__frames.push(t-last);last=t;window.__raf=requestAnimationFrame(f);};requestAnimationFrame(f);});
 await cdp.send('Profiler.start');
 await page.keyboard.down('KeyS');await page.waitForTimeout(6000);await page.keyboard.up('KeyS');await page.waitForTimeout(6000);
 const {profile}=await cdp.send('Profiler.stop');
 const frames=await page.evaluate(()=>{cancelAnimationFrame(window.__raf);return window.__frames;});
 const scene=await page.evaluate(()=>({revenants:window.__COOP__?window.__COOP__.net.latest().enemies.length:window.__STRONGHOLD_COMBAT__.snapshot().foes.length,onScreen:document.querySelectorAll('#world-foes-back canvas:not([hidden]),#world-foes-front canvas:not([hidden])').length,zone:document.querySelector('#hero-hud')?.dataset.zone,heroes:window.__COOP__?window.__COOP__.net.latest().players.length:1}));
 // Self and inclusive share of the profiled span per function.
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const name=n=>{const f=n.callFrame;return (f.functionName||'(anonymous)')+(f.url?' '+f.url.split('/').pop().replace(/-[\w-]{8}\.js$/,'.js')+':'+(f.lineNumber+1):'');};
 const self=new Map(),incl=new Map(),N=profile.samples.length;
 for(const id of profile.samples){const n=nodes.get(id);self.set(name(n),(self.get(name(n))||0)+1);const seen=new Set();for(let x=id;x!=null;x=parent.get(x)){const k=name(nodes.get(x));if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+1);}}}
 const top=m=>[...m].filter(([k])=>k!=='(root)').sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>[k,+(100*v/N).toFixed(1)]);
 const sorted=[...frames].sort((a,b)=>a-b),q=p=>+sorted[Math.floor((sorted.length-1)*p)].toFixed(1),total=frames.reduce((a,b)=>a+b,0);
 const results={tag,phone,offline,bots,scene,frames:frames.length,fps:+(1000*frames.length/total).toFixed(1),frameMs:{p50:q(.5),p90:q(.9),p99:q(.99),max:q(1)},slowFrames:frames.filter(f=>f>20).length,
  idlePct:+(100*(self.get('(idle)')||0)/N).toFixed(1),drawImagePct:+(100*(self.get('drawImage')||0)/N).toFixed(1),self:top(self),inclusive:top(incl),errors};
 console.log(JSON.stringify(results,null,1));
 await fs.writeFile(`${out}/frame-budget-${phone?'phone':'desktop'}-${offline?'solo-':''}${tag}.json`,JSON.stringify(results,null,1)+'\n');
}finally{for(const t of timers)clearInterval(t);for(const w of sockets)w.close();await browser.close().catch(()=>{});server.kill();}
