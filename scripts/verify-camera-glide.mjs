import{chromium}from'playwright';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const out='public/camera-glide';await (await import('node:fs/promises')).mkdir(out,{recursive:true});
const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:'3051'}});let browser;
try{await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3051/stronghold.html');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');
const read=()=>page.evaluate(()=>{const m=document.querySelector('#world-surface').style.transform.match(/translate3d\(([-\d.]+)px, ?([-\d.]+)px/);return [+m[1],+m[2]];});
const before=await read();await page.screenshot({path:out+'/glide-0-before.png'});
// Sample the surface transform every animation frame after clicking the Mine.
await page.evaluate(()=>{window.samples=[];const s=document.querySelector('#world-surface'),t0=performance.now();const tick=()=>{const m=s.style.transform.match(/translate3d\(([-\d.]+)px, ?([-\d.]+)px/);window.samples.push([performance.now()-t0,+m[1],+m[2],document.querySelector('#world-canvas').dataset.camera]);if(document.querySelector('#world-canvas').dataset.camera!=='idle'||window.samples.length<3)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
const scale=Math.max(.65,Math.min(1.35,1000/900));await page.mouse.click(720+(905-577.5)*scale,500+(560-385)*scale);
await page.waitForFunction(b=>window.samples.some(s=>s[3]==='gliding'&&Math.abs(s[1]-b)>60),before[0],{timeout:15000});await page.screenshot({path:out+'/glide-1-mid.png'});
await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.camera==='idle',null,{timeout:15000});await page.screenshot({path:out+'/glide-2-after.png'});
const samples=await page.evaluate(()=>window.samples),after=await read();
const distinct=new Set(samples.map(s=>s[1].toFixed(1)+','+s[2].toFixed(1))).size;
const target=[before[0]-(905-577.5)*scale,before[1]-(560-385)*scale];
console.log('before',before,'after',after,'expected',target,'distinct frames',distinct,'states',[...new Set(samples.map(s=>s[3]))]);
assert(distinct>=10,'pan should pass through many intermediate frames, got '+distinct);
assert(Math.abs(after[0]-target[0])<1&&Math.abs(after[1]-target[1])<1,'camera should settle on the landmark');
// Largest per-frame step must be a fraction of the total travel (no instant jump).
let maxStep=0;for(let i=1;i<samples.length;i++)maxStep=Math.max(maxStep,Math.hypot(samples[i][1]-samples[i-1][1],samples[i][2]-samples[i-1][2]));const travel=Math.hypot(after[0]-before[0],after[1]-before[1]);
console.log('travel',travel.toFixed(1),'max frame step',maxStep.toFixed(1));assert(maxStep<travel*.25);
// A drag during a glide takes control back immediately.
await page.mouse.click(720+(565-905)*scale,500+(440-560)*scale);await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.camera==='gliding',null,{timeout:5000});
await page.mouse.move(700,500);await page.mouse.down();assert.equal(await page.evaluate(()=>document.querySelector('#world-canvas').dataset.camera),'idle');
await page.mouse.move(760,520,{steps:4});await page.mouse.up();const held=await read();await page.waitForTimeout(500);assert.deepEqual(await read(),held,'glide must not resume after a drag');
assert.deepEqual(errors,[]);console.log('PASS eased landmark glide, settles on target, drag interrupts');
}finally{await browser?.close();server.kill();}
