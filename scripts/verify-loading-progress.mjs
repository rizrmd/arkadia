import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Loads the Stronghold on a throttled phone connection and samples the loading bar: it must climb with the
// downloaded bytes against a total known from the start, never stall on the last large files, and finish.
const url=process.env.VERIFY_URL||'http://127.0.0.1:3081',out=process.env.OUT||'docs/loading-progress',mbps=Number(process.env.MBPS||40);
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3081',SITE_DIR:process.env.SITE_DIR||'dist'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:mbps*125000,uploadThroughput:1e6});
 const t0=Date.now(),samples=[];let shot=false;
 await page.goto(url+'/');
 for(;;){
  const s=await page.evaluate(()=>{const e=document.querySelector('#loading-screen');return e?{state:e.dataset.state||'',percent:Number(e.getAttribute('aria-valuenow')),label:e.querySelector('.loading-label').textContent}:null;}).catch(()=>null);
  if(!s||s.state==='done'||s.state==='error'){samples.push({t:Date.now()-t0,...(s||{state:'done',percent:100,label:''})});break;}
  samples.push({t:Date.now()-t0,...s});
  if(!shot&&s.percent>=45){shot=true;await page.screenshot({path:out+'/loading-midway.png'});}
  if(Date.now()-t0>300000)throw new Error('Loading did not finish in 5 minutes');
  await new Promise(r=>setTimeout(r,200));
 }
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&(document.querySelector('#world-hero')||window.__WORLD_HERO__),null,{timeout:60000});
 await page.waitForTimeout(800);await page.screenshot({path:out+'/loaded.png'});
 const artwork=samples.filter(s=>s.label.startsWith('Loading artwork ·')),totals=new Set(artwork.map(s=>s.label.split(' of ')[1]));
 // Fraction of the artwork phase spent at each 10% band: byte-proportional progress spreads time evenly.
 const first=artwork[0]?.t??0,last=artwork.at(-1)?.t??0,bands=Array.from({length:10},(_,i)=>artwork.filter(s=>s.percent>=i*9.2&&s.percent<(i+1)*9.2).length);
 const longestFlat=artwork.reduce((a,s,i)=>{const start=artwork.findIndex(x=>x.percent===s.percent);return Math.max(a,s.t-artwork[start].t);},0);
 const results={url,mbps,durationMs:samples.at(-1).t,artworkMs:last-first,totals:[...totals],bands,longestFlatMs:longestFlat,errors,
  monotonic:samples.every((s,i)=>!i||s.percent>=samples[i-1].percent),finalState:samples.at(-1).state,samples};
 await fs.writeFile(out+'/results.json',JSON.stringify(results,null,1)+'\n');
 console.log(JSON.stringify({...results,samples:samples.filter((s,i,a)=>!i||s.label!==a[i-1].label).length},null,1));
 assert.equal(errors.length,0,'no JavaScript errors');
 assert.equal(results.finalState,'done','loading finished');
 assert.ok(results.monotonic,'bar never moves backwards');
 assert.equal(totals.size,1,'the artwork total is known from the start and never changes');
 assert.ok(longestFlat<2000,'the bar never stalls for 2 s while artwork downloads');
 console.log('PASS');
}finally{await browser?.close();server?.kill();}
