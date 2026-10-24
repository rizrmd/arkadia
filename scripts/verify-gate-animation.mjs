import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3068'}});let browser;
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.addInitScript(()=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:700})));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3068')+'/?time=0.5&offline=1');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(1200);
 const centerAlpha=()=>page.locator('#world-gate-doors').evaluate(e=>e.getContext('2d').getImageData(Math.floor(e.width/2),Math.floor(e.height*.65),1,1).data[3]);
 assert(await centerAlpha()>100,'closed generated frame covers the passage');
 await page.evaluate(()=>{
  const surface=document.querySelector('#world-surface'),doors=document.querySelector('#world-gate-doors');
  window.gateCheck={before:[surface.dataset.paints,surface.dataset.lightBakes,surface.dataset.shadowPaints],samples:[],gaps:[]};
  let last=performance.now(),previous=doors.dataset.state;
  function sample(now){const state=doors.dataset.state;if(state==='opening'||state==='closing'||previous==='opening'||previous==='closing'){window.gateCheck.gaps.push(now-last);window.gateCheck.samples.push({state,progress:+doors.dataset.progress,frame:doors.dataset.frame});}previous=state;last=now;requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await page.keyboard.down('s');await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='open');assert(await centerAlpha()<10,'open generated frame clears the passage');await page.waitForFunction(()=>+document.querySelector('#world-hero').dataset.y>900,null,{timeout:20000});await page.keyboard.up('s');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='closed');
 const result=await page.evaluate(()=>{const s=document.querySelector('#world-surface');return {...window.gateCheck,after:[s.dataset.paints,s.dataset.lightBakes,s.dataset.shadowPaints]};});
 assert.deepEqual(result.after,result.before,'door motion must not rebuild world, light pools, or shadows');
 const opening=result.samples.filter(s=>s.state==='opening'),closing=result.samples.filter(s=>s.state==='closing');
 assert(new Set(opening.map(s=>s.progress)).size>=8,'visible opening frames');assert(new Set(closing.map(s=>s.progress)).size>=8,'visible closing frames');
 assert(new Set(opening.map(s=>s.frame)).size>=8,'opening must play generated sprite frames');assert(new Set(closing.map(s=>s.frame)).size>=8,'closing must play generated sprite frames');
 const gaps=result.gaps.sort((a,b)=>a-b),p95=gaps[Math.floor(gaps.length*.95)],max=Math.max(...gaps);
 assert(p95<100,`4x mobile transition p95 ${p95}ms`);assert(max<250,`4x mobile transition stall ${max}ms`);assert.deepEqual(errors,[]);
 assert(await centerAlpha()>100,'closing restores the opaque generated door frame');
 // Turn around while the doors are still opening: closing must continue from that pose.
 await page.reload();await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');
 await page.keyboard.down('s');await page.waitForFunction(()=>{const d=document.querySelector('#world-gate-doors').dataset;return d.state==='opening'&&+d.frame>=2&&+d.frame<=4;},null,{timeout:15000,polling:10});await page.keyboard.up('s');await page.keyboard.down('w');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='closing',null,{timeout:15000,polling:10});
 const reversal=await page.locator('#world-gate-doors').getAttribute('data-frame');assert(+reversal>0&&+reversal<15,'reverse before reaching the open endpoint');
 await page.keyboard.up('w');await page.waitForTimeout(110);assert(+(await page.locator('#world-gate-doors').getAttribute('data-frame'))<+reversal,'closing plays backward from current pose');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='closed');
 const report={reversalPassed:true,renderer:'full-gateway-sprite-sheet',viewport:'390x844',cpuSlowdown:4,openingFrames:opening.length,closingFrames:closing.length,p95FrameMs:p95,maxFrameMs:max,worldCountersBefore:result.before,worldCountersAfter:result.after,errors};
 await fs.mkdir('docs/gate-proximity',{recursive:true});await fs.writeFile('docs/gate-proximity/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server?.kill();}
