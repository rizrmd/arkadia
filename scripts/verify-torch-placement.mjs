import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.VERIFY_URL||'http://127.0.0.1:3086';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3086'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.clear());
 await page.goto(url+'/?time=0');await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.torchAssets==='ready');
 await page.waitForTimeout(700);
 const layer=page.locator('#torch-flames');assert.equal(await layer.locator('canvas').count(),16);assert.equal(await layer.evaluate(e=>e.hidden),false);
 const dimensions=await layer.locator('canvas').first().evaluate(c=>({width:c.width,height:c.height,cssWidth:parseFloat(c.style.width),cssHeight:parseFloat(c.style.height)}));assert.equal(dimensions.width,72);assert.equal(dimensions.height,54);assert.equal(dimensions.cssWidth,24);assert.ok(Math.abs(dimensions.cssHeight-39*132/290)<.001);
 const posts=await layer.locator('canvas').evaluateAll(cs=>cs.slice(12).map(c=>({x:parseFloat(c.style.left),y:parseFloat(c.style.top)})));
 assert.equal(posts[0].x,posts[3].x,'rear and front posts align around the court');
 assert.ok(posts[3].y-posts[0].y>470,'tent has a generous north/south clearing');
 assert.ok(posts[2].x-posts[1].x>760,'side posts leave the tent ropes clear');
 const samples=[];for(let i=0;i<24;i++){samples.push(await layer.evaluate(e=>({frame:e.dataset.frame,pixels:[...e.children].map(c=>c.toDataURL()).join('|'),bakes:document.querySelector('#world-surface').dataset.lightPaints})));await page.waitForTimeout(47);}
 assert.equal(new Set(samples.map(s=>s.frame)).size,3);assert.ok(new Set(samples.map(s=>s.pixels)).size>=3,'three distinct animated poses remain visible');assert.equal(new Set(samples.map(s=>s.bakes)).size,1);
 await fs.mkdir('docs/torch-placement',{recursive:true});await page.screenshot({path:'docs/torch-placement/night.png'});
 await layer.locator('canvas').nth(12).screenshot({path:'docs/torch-placement/flame-closeup.png'});
 await page.locator('.clock-chip').click();await page.locator('#clock-slider').evaluate(e=>{e.value='720';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(500);
 assert.equal(await layer.evaluate(e=>e.hidden),true);await page.locator('.clock-chip').click();await page.screenshot({path:'docs/torch-placement/day.png'});await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.clock-chip').click();await page.locator('#clock-slider').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);const still=await layer.getAttribute('data-frame');await page.waitForTimeout(450);assert.equal(await layer.getAttribute('data-frame'),still,'reduced motion freezes flames');assert.deepEqual(errors,[]);
 const result={url,dimensions,torchCount:16,posts,frames:[...new Set(samples.map(s=>s.frame))],distinctPixelFrames:new Set(samples.map(s=>s.pixels)).size,lightBakesDuringAnimation:[...new Set(samples.map(s=>s.bakes))],dayFlamesHidden:true,errors};await fs.writeFile('docs/torch-placement/results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser?.close();server?.kill();}
