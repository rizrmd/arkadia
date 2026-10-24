// What blocks the main thread in the first seconds after the loading screen lifts: records long tasks and a CPU
// profile from page load until SECONDS after #loading-screen disappears, then attributes long-task time to the
// functions sampled inside them.   node scripts/fps-profile/profile-startup.mjs [seconds=10] [url]
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';
const SECONDS=Number(process.argv[2]||10);let URL=process.argv[3]||'';let vite=null;
if(!URL){vite=await createServer({server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();URL=vite.resolvedUrls.local[0].replace(/\/$/,'')+'/?offline=1&hero=ember-warden';}
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734},deviceScaleFactor:3});
 await page.routeWebSocket('**/*',()=>{});
 await page.addInitScript(()=>{window.__LT__=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__LT__.push({s:e.startTime,d:e.duration});}).observe({entryTypes:['longtask']});}catch{}});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:500});await cdp.send('Profiler.start');
 await page.goto(URL);
 await page.waitForFunction(()=>!document.querySelector('#loading-screen')&&window.__STRONGHOLD_COMBAT__,null,{timeout:300000});
 const lifted=await page.evaluate(()=>performance.now());
 await page.waitForTimeout(SECONDS*1000);
 const {profile}=await cdp.send('Profiler.stop');
 const lt=(await page.evaluate(()=>window.__LT__)).filter(l=>l.s+l.d>=lifted);
 console.log('loading screen lifted at',Math.round(lifted),'ms; long tasks after it:',lt.length,'total',Math.round(lt.reduce((a,l)=>a+l.d,0)),'ms');
 console.log(lt.map(l=>`${Math.round(l.s-lifted)}+${Math.round(l.d)}`).join(' '));
 // map samples to wall time (profile startTime is in us, same clock as performance.timeOrigin-relative? use relative)
 const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const t0=profile.startTime;let t=t0;const incl=new Map(),self=new Map();
 const nav=await page.evaluate(()=>performance.timeOrigin);
 // CDP profile times are monotonic us; align by assuming the last sample ~ now
 const nowPerf=await page.evaluate(()=>performance.now());const endUs=profile.endTime;
 const toPerf=us=>nowPerf-(endUs-us)/1000;
 const inLT=p=>lt.some(l=>p>=l.s&&p<=l.s+l.d);
 profile.samples.forEach((id,i)=>{t+=profile.timeDeltas[i];const p=toPerf(t);if(!inLT(p))return;const d=(profile.timeDeltas[i+1]??0)/1000;
  const f=byId.get(id).callFrame,k=`${f.functionName||'(anon)'} ${(f.url||'').split('/').pop().split('?')[0]}:${f.lineNumber+1}`;self.set(k,(self.get(k)||0)+d);
  const seen=new Set();let cur=id;while(cur){const c=byId.get(cur).callFrame,kk=`${c.functionName||'(anon)'} ${(c.url||'').split('/').pop().split('?')[0]}:${c.lineNumber+1}`;if(!seen.has(kk)){seen.add(kk);incl.set(kk,(incl.get(kk)||0)+d);}cur=parent.get(cur);}});
 const top=(m,n)=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${v.toFixed(0).padStart(6)} ms  ${k}`).join('\n');
 console.log('\nself time inside long tasks:\n'+top(self,25));
 console.log('\ninclusive inside long tasks:\n'+top(incl,45));
}finally{await browser.close();await vite?.close();}
