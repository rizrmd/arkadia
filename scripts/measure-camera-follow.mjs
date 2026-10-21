import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
// Measures how smoothly the camera follows the walking hero: the hero walks with the keyboard, stops, turns back
// and stops again while every frame records (after all animation callbacks) the world, hero and HP-bar transforms.
// VERIFY_URL measures a deployed build; CPU_RATE, VIEW_WIDTH and VIEW_HEIGHT pick the environment; REPORT writes JSON.
const url=process.env.VERIFY_URL||'http://127.0.0.1:3071',server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3071'}});let browser;
const width=Number(process.env.VIEW_WIDTH||1280),height=Number(process.env.VIEW_HEIGHT||800),rate=Number(process.env.CPU_RATE||1);
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(rate>1)await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate});
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:590,y:420})));
 await page.goto(url+'/?time=0.5');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(1500);
 await page.evaluate(()=>{
  const xy=el=>{const m=/translate3d\(([-\d.e]+)px, ?([-\d.e]+)px/.exec(el?.style.transform||'');return m?[+m[1],+m[2]]:[NaN,NaN];};
  const surface=document.querySelector('#world-surface'),hero=document.querySelector('#world-hero'),bar=document.querySelector('#hero-health');
  // Count camera writes: more than one per frame means the camera was moved in sub-steps.
  let writes=0;const style=surface.style,set=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,'transform')?.set;
  if(set)Object.defineProperty(style,'transform',{configurable:true,get(){return style.getPropertyValue('transform');},set(v){writes++;style.setProperty('transform',v);}});
  window.__CAM__={samples:[],on:true};
  // Registered after the game's loops, so each frame this callback runs after them and sees that frame's result.
  const tick=now=>{if(!window.__CAM__.on)return;window.__CAM__.samples.push({t:now,cam:xy(surface),hero:xy(hero),bar:xy(bar),world:[+hero.dataset.x,+hero.dataset.y],writes});writes=0;requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 });
 for(const [key,ms] of [['d',2200],[null,1100],['a',2200],[null,1100]]){if(key)await page.keyboard.down(key);await page.waitForTimeout(ms);if(key)await page.keyboard.up(key);}
 const samples=await page.evaluate(()=>{window.__CAM__.on=false;return window.__CAM__.samples;});
 // Per-frame camera velocity (screen px/ms) and its frame-to-frame change; a sudden stop or start is a spike.
 const vel=[],jerk=[],multi=samples.filter(s=>s.writes>1).length;
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dt=b.t-a.t||16.7;vel.push({t:b.t,v:Math.hypot(b.cam[0]-a.cam[0],b.cam[1]-a.cam[1])/dt});}
 for(let i=1;i<vel.length;i++)jerk.push(Math.abs(vel[i].v-vel[i-1].v));
 // Camera speed in the frame before it comes to rest: a smooth camera decelerates to ~0 first.
 const stops=[];for(let i=1;i<vel.length;i++)if(vel[i-1].v>.002&&vel[i].v<1e-6)stops.push(+(vel[i-1].v*1000).toFixed(1));
 // The HP bar must sit at a fixed offset from the hero canvas every frame; drift means one of them used a stale camera.
 const off=samples.filter(s=>Number.isFinite(s.bar[0])).map(s=>[s.bar[0]-s.hero[0],s.bar[1]-s.hero[1]]),barLag=off.length>1?Math.max(...off.slice(1).map((o,i)=>Math.hypot(o[0]-off[i][0],o[1]-off[i][1]))):null;
 const pct=(v,q)=>{const a=[...v].sort((x,y)=>x-y);return a.length?+a[Math.min(a.length-1,Math.floor(a.length*q))].toFixed(4):null;};
 const frames=samples.slice(1).map((s,i)=>s.t-samples[i].t);
 const result={url,viewport:[width,height],cpuThrottle:rate,frames:samples.length,frameIntervalMs:{p50:pct(frames,.5),p95:pct(frames,.95)},
  framesWithSeveralCameraWrites:multi,maxCameraSpeedPxPerS:+(Math.max(...vel.map(v=>v.v))*1000).toFixed(1),
  cameraSpeedBeforeRestPxPerS:stops,velocityChangePxPerS:{p95:+(pct(jerk,.95)*1000).toFixed(1),max:+(Math.max(...jerk)*1000).toFixed(1)},
  heroBarDriftPx:barLag===null?null:+barLag.toFixed(2),errors};
 if(process.env.REPORT)await fs.writeFile(process.env.REPORT,JSON.stringify({...result,trace:samples.map(s=>({t:+s.t.toFixed(1),cam:s.cam.map(v=>+v.toFixed(2)),hero:s.world}))},null,1));
 console.log(JSON.stringify(result,null,1));
}finally{await browser?.close();server?.kill();}
