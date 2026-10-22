import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
// Measures how evenly the Stronghold hero walks on a phone viewport: screen speed for every key direction and for
// the touch thumbstick at several angles and thumb distances, frame-to-frame speed jitter, how long a start and a
// stop take, and the walk clip's frame rate. Every frame is sampled after the game's loops. Walks come in
// out-and-back pairs from the spawn in front of the tent, so the hero never runs into a wall.
//   npm run build && node scripts/measure-walk-feel.mjs           solo (?offline=1), static server on dist/
//   MODE=coop node scripts/measure-walk-feel.mjs                  co-op through server/bin/arkadia (go build first)
//   ROOT=/other/checkout …   measure that checkout's dist/ and server binary (A/B runs)
//   VERIFY_URL=https://…     measure a deployed host;  CPU_RATE=4 throttles;  REPORT=file.json saves the report
const mode=process.env.MODE||'solo',root=process.env.ROOT||'.',rate=Number(process.env.CPU_RATE||1),port=3074;
const server=process.env.VERIFY_URL?null:mode==='coop'
 ?spawn(root+'/server/bin/arkadia',[],{env:{...process.env,PORT:String(port),SITE_DIR:root+'/dist'},stdio:'ignore'})
 :spawn('node',['server.mjs'],{env:{...process.env,PORT:String(port),SITE_DIR:root+'/dist'},stdio:'ignore'});
const url=process.env.VERIFY_URL?.replace(/\/$/,'')||'http://127.0.0.1:'+port;let browser;
try{
 await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(rate>1)await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate});
 await page.addInitScript(()=>{try{localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:590,y:420}));}catch{}});
 await page.goto(url+'/?hero=rift-runner&time=0.5'+(mode==='coop'?'':'&offline=1'));
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 if(mode==='coop')await page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000});
 await page.waitForTimeout(1500);
 await page.evaluate(()=>{
  const hero=document.querySelector('#world-hero');window.__WALK__={samples:[],on:true};
  const tick=now=>{if(!window.__WALK__.on)return;const d=hero.dataset,c=window.__COOP__?.stats();
   window.__WALK__.samples.push({t:now,x:+d.x,y:+d.y,state:d.state,clip:d.clip,frame:d.frame,pace:c?.pace});requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 });
 const mark=()=>page.evaluate(()=>window.__WALK__.samples.length);
 const slice=(a,b)=>page.evaluate(([a,b])=>window.__WALK__.samples.slice(a,b),[a,b]);
 // Synthetic touch: a finger down in the bottom third of the screen, then held at an offset.
 const touch=(type,x,y)=>page.evaluate(([type,x,y])=>{const target=type==='pointerdown'?document.querySelector('#world-canvas'):window;
  target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));},[type,x,y]);
 async function walk(label,press,release,ms=1300){
  const a=await mark();await press();await page.waitForTimeout(ms);const b=await mark();await release();await page.waitForTimeout(700);const c=await mark();
  return {label,run:await slice(a,b),stop:await slice(b,c)};
 }
 const speed=(s,i)=>Math.hypot(s[i].x-s[i-1].x,s[i].y-s[i-1].y)/((s[i].t-s[i-1].t)/1000);
 function analyse({label,run,stop}){
  const v=[];for(let i=1;i<run.length;i++)v.push({t:run[i].t-run[0].t,v:speed(run,i)});
  const steady=v.filter(p=>p.t>400).map(p=>p.v),mean=steady.reduce((a,b)=>a+b,0)/(steady.length||1);
  const sd=Math.sqrt(steady.reduce((a,b)=>a+(b-mean)**2,0)/(steady.length||1));
  const moved=v.find(p=>p.v>1)?.t??0,reach=v.find(p=>p.v>=mean*.9)?.t;
  const sv=[];for(let i=1;i<stop.length;i++)sv.push({t:stop[i].t-stop[0].t,v:speed(stop,i)});
  // Rest: the first frame after which the hero never moves again.
  let rest=0;for(const p of sv)if(p.v>=1)rest=p.t;
  const walking=run.filter(s=>s.state==='move');let changes=0;for(let i=1;i<walking.length;i++)if(walking[i].frame!==walking[i-1].frame)changes++;
  const span=walking.length>1?(walking.at(-1).t-walking[0].t)/1000:1,paces=[...new Set(run.map(s=>s.pace).filter(p=>p!==undefined))];
  return {label,speedPxPerS:+mean.toFixed(1),jitterPct:+(sd/(mean||1)*100).toFixed(1),slowestFramePxPerS:+Math.min(...steady).toFixed(1),fastestFramePxPerS:+Math.max(...steady).toFixed(1),
   startToNinetyMs:reach===undefined?null:Math.round(reach-moved),stopToRestMs:Math.round(rest),frameChangesPerS:+(changes/span).toFixed(1),clips:[...new Set(walking.map(s=>s.clip))],...(paces.length?{paces}:{})};
 }
 const results=[];
 const keyPairs=[['s','w'],['d','a'],['s+d','w+a'],['s+a','w+d']];
 for(const pair of keyPairs)for(const combo of pair){const keys=combo.split('+');
  results.push(analyse(await walk('keys '+combo,async()=>{for(const k of keys)await page.keyboard.down(k);},async()=>{for(const k of keys)await page.keyboard.up(k);})));}
 // Stick angles count counter-clockwise from screen right; each walk is followed by the opposite one.
 const ox=195,oy=700;
 for(const reach of [40,26,16])for(const angle of [-90,0,-30,-60])for(const a of [angle,angle+180]){
  const r=a*Math.PI/180,x=ox+Math.cos(r)*reach,y=oy-Math.sin(r)*reach;
  results.push(analyse(await walk(`stick ${a}deg ${reach}px`,async()=>{await touch('pointerdown',ox,oy);await touch('pointermove',x,y);},()=>touch('pointerup',x,y))));
 }
 const full=results.filter(r=>r.label.startsWith('keys')||r.label.endsWith(' 40px')).map(r=>r.speedPxPerS);
 const summary={url,mode,cpuThrottle:rate,fullSpeedRangePxPerS:[Math.min(...full),Math.max(...full)],fullSpeedRatio:+(Math.max(...full)/Math.min(...full)).toFixed(2),
  meanJitterPct:+(results.reduce((a,r)=>a+r.jitterPct,0)/results.length).toFixed(1),results,errors};
 if(process.env.REPORT)await fs.writeFile(process.env.REPORT,JSON.stringify(summary,null,1)+'\n');
 console.log(JSON.stringify(summary,null,1));
}finally{await browser?.close();server?.kill();}
