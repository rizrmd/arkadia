// A browser capping rAF at 30 fps (Chrome Energy Saver) must be recognised, not "fixed" by cutting particles.
//  1. Replays every live tracelog (docs/frame-cap/live-tracelogs.json) through the real detector (frame-cap.ts):
//     only the desktop windows locked at 33.3 ms with light work count as a cap; JS-heavy phone windows do not.
//  2. A real-clock fight in headless SwiftShader (slow frames, like a struggling device) shrinks the particle budget;
//     once the cap is reported, the budget recovers to its maximum instead.
//  3. Captures the one-time player hint on desktop and phone (screenshots taken within its 9 s on screen).
//   node scripts/fps-profile/verify-frame-cap.mjs
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import sharp from 'sharp';
import {launch} from '../vfx/browser.mjs';
const OUT='docs/frame-cap';
const live=JSON.parse(readFileSync(`${OUT}/live-tracelogs.json`,'utf8'));
const vite=await createServer({server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const result={generatedAt:new Date().toISOString(),replay:[],governor:{},hint:{}};
const shot=async(page,name)=>{const png=`${OUT}/${name}.png`;await page.screenshot({path:png,timeout:240000});await sharp(png).webp({quality:82}).toFile(`${OUT}/${name}.webp`);unlinkSync(png);};
const open=async(viewport,query='')=>{
 const browser=await launch();const page=await browser.newPage({viewport});
 await page.routeWebSocket('**/*',()=>{});
 await page.route('**/api/tracelogs',r=>r.request().method()==='POST'?r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"x"}'}):r.continue());
 await page.goto(`${GAME}/?offline=1&hero=rift-runner&time=0.5${query}`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&window.__FPS_TRACELOG__&&window.__FRAME_CAP__&&!document.querySelector('#loading-screen'),null,{timeout:900000});
 return {browser,page};
};
// Feeds frames into the page's own frame-cap module (Vite serves the app's instance) on a synthetic clock.
const feed=(page,frames,seconds)=>page.evaluate(async([frames,seconds])=>{
 const m=await import('/src/stronghold/frame-cap.ts');
 let now=performance.now()+1e6;const end=now+seconds*1000;
 while(now<end)for(const [dt,work] of frames){now+=dt;m.noteFrame(now,dt,work);}
 return m.frameCapHz();
},[frames,seconds]);
try{
 // 1 + 2: desktop page.
 {
  const {browser,page}=await open({width:1440,height:702});
  try{
   for(const log of live.logs){
    await page.evaluate(async()=>(await import('/src/stronghold/frame-cap.ts')).resetFrameCap());
    const hz=await feed(page,log.frames,8);
    const work=log.frames.map(f=>f[1]).sort((a,b)=>a-b)[log.frames.length>>1];
    result.replay.push({id:log.id,receivedAt:log.receivedAt,device:log.device,fps:log.fps,p50FrameMs:log.p50FrameMs,medianWorkMs:work,loggedBottleneck:log.loggedBottleneck,capHz:hz});
   }
   await page.evaluate(async()=>(await import('/src/stronghold/frame-cap.ts')).resetFrameCap());
   for(const r of result.replay)if(r.capHz||r.device==='desktop')console.log(r.receivedAt.slice(11,19),r.device.padEnd(7),`fps=${String(r.fps).padEnd(6)} p50=${String(r.p50FrameMs).padEnd(5)} work=${String(r.medianWorkMs).padEnd(6)}`,r.loggedBottleneck.padEnd(20),'cap',r.capHz);
   const capped=result.replay.filter(r=>r.capHz===30);
   const expected=result.replay.filter(r=>r.device==='desktop'&&r.receivedAt>='2026-10-24T09:00'&&r.p50FrameMs>=31&&r.p50FrameMs<=36);
   result.replaySummary={logs:result.replay.length,capped:capped.length,expected:expected.length,cappedIds:capped.map(r=>r.id)};
   console.log('replay',JSON.stringify(result.replaySummary));
   assert.ok(expected.length>=5,'fixture holds the 30 fps desktop session');
   assert.deepEqual(capped.map(r=>r.id),expected.map(r=>r.id),'exactly the locked 30 fps desktop windows are a browser cap');

   // 2: governor. Level the hero, ring it with revenants and let auto-cast run on the real clock.
   await page.evaluate(()=>{
    const c=window.__STRONGHOLD_COMBAT__;
    for(let i=1;i<8;i++){const r=c.offer();if(r.offers?.length)c.choose(r.offers[0]);}
    for(let u=18;u<34;u+=.5)for(let v=18;v<34;v+=.5)if(c.clear(u,v)&&c.clear(u+2,v)&&c.clear(u-2,v)&&c.clear(u,v+2)&&c.clear(u,v-2)&&c.teleport(u,v)){
     c.clearFoes();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;c.summon(u+Math.cos(a)*1.4,v+Math.sin(a)*1.4,8);}return;
    }
   });
   const sample=()=>page.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.fxStage.stats();return {budget:s.particleBudget,particles:s.particles,frameMs:s.frameMs,capHz:window.__FRAME_CAP__.hz()};});
   const uncapped=[];
   for(let i=0;i<24&&!(uncapped.at(-1)?.budget<=400);i++){await page.waitForTimeout(500);uncapped.push(await sample());}
   console.log('no cap:',uncapped.map(s=>`${s.budget}/${s.particles}p/${s.frameMs}ms`).join(' '));
   assert.ok(Math.min(...uncapped.map(s=>s.budget))<1400,'slow uncapped frames with particles still shrink the budget');
   // Report the cap the way a 30 fps Energy Saver browser does, and keep reporting it while the fight runs.
   await page.evaluate(async()=>{
    const m=await import('/src/stronghold/frame-cap.ts');let now=performance.now()+2e6;
    const tick=()=>{for(let i=0;i<60;i++){now+=33.3;m.noteFrame(now,33.3,5);}};
    for(let i=0;i<4;i++)tick();window.__capFeed=setInterval(tick,100);
   });
   const capped2=[];
   for(let i=0;i<30&&!(capped2.at(-1)?.budget>=1400);i++){await page.waitForTimeout(500);capped2.push(await sample());}
   console.log('cap on:',capped2.map(s=>`${s.budget}/${s.particles}p/${s.frameMs}ms/cap${s.capHz}`).join(' '));
   result.governor={uncapped,capped:capped2,minUncapped:Math.min(...uncapped.map(s=>s.budget)),finalCapped:capped2.at(-1).budget};
   assert.ok(capped2.every(s=>s.capHz===30),'cap stays reported');
   assert.equal(capped2.at(-1).budget,1400,'under a browser cap the particle budget recovers to its maximum');
   await page.evaluate(()=>{clearInterval(window.__capFeed);});
  }finally{await browser.close();}
 }
 // 3: the hint, once per session, on a fresh page per viewport.
 for(const [name,viewport] of [['desktop',{width:1440,height:702}],['phone',{width:394,height:734}]]){
  const {browser,page}=await open(viewport);
  try{
   assert.equal(await feed(page,[[33.3,5]],6),30);
   await page.waitForTimeout(400);
   result.hint[name]=await page.evaluate(()=>window.__FRAME_CAP__.hint);
   console.log(name,'hint:',result.hint[name]);
   assert.match(result.hint[name],/30 fps/);
   await shot(page,`${name}-hint`);
  }finally{await browser.close();}
 }
 writeFileSync(`${OUT}/verification.json`,JSON.stringify(result,null,1));
 console.log('PASS');
}finally{await vite.close();}
