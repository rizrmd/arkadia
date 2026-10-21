import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.VERIFY_URL||'http://127.0.0.1:3078';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3078'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.clear());
 await page.goto(url+'/?time=0');await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.torchAssets==='ready');
 await page.waitForTimeout(700);
 const layer=page.locator('#torch-flames');assert.equal(await layer.locator('canvas').count(),16);assert.equal(await layer.evaluate(e=>e.hidden),false);
 const samples=[];for(let i=0;i<24;i++){samples.push(await layer.evaluate(e=>({frame:e.dataset.frame,pixels:[...e.children].map(c=>c.toDataURL()).join('|'),bakes:document.querySelector('#world-surface').dataset.lightPaints})));await page.waitForTimeout(47);}
 assert.equal(new Set(samples.map(s=>s.frame)).size,3);assert.equal(new Set(samples.map(s=>s.pixels)).size,3);assert.equal(new Set(samples.map(s=>s.bakes)).size,1);
 await fs.mkdir('docs/realistic-torch',{recursive:true});await page.screenshot({path:'docs/realistic-torch/night.png'});
 await layer.locator('canvas').nth(6).screenshot({path:'docs/realistic-torch/flame-closeup.png'});
 await page.locator('.clock-chip').click();await page.locator('#clock-slider').evaluate(e=>{e.value='720';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(500);
 assert.equal(await layer.evaluate(e=>e.hidden),true);await page.locator('.clock-chip').click();await page.screenshot({path:'docs/realistic-torch/day.png'});await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.clock-chip').click();await page.locator('#clock-slider').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);const still=await layer.getAttribute('data-frame');await page.waitForTimeout(450);assert.equal(await layer.getAttribute('data-frame'),still,'reduced motion freezes flames');assert.deepEqual(errors,[]);
 const result={url,torchCount:16,frames:[...new Set(samples.map(s=>s.frame))],distinctPixelFrames:new Set(samples.map(s=>s.pixels)).size,lightBakesDuringAnimation:[...new Set(samples.map(s=>s.bakes))],dayFlamesHidden:true,errors};await fs.writeFile('docs/realistic-torch/results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser?.close();server?.kill();}
