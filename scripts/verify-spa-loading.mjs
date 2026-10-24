import{chromium}from'playwright';import{spawn}from'node:child_process';import assert from'node:assert/strict';import fs from'node:fs/promises';import sharp from'sharp';import dns from'node:dns/promises';
// Single-page app + asset loading bar (npm run build first; DEMO_URL=https://… tests a deployed host instead).
// Artwork requests are slowed so the bar is observable: it must only move forward, reach 100 % and step aside
// for a painted world. Retired page URLs must land on / with their query, deep paths must stay in the SPA,
// and a missing artwork must leave a visible error with a retry instead of a blank screen.
const out='docs/spa-loading';await fs.mkdir(out,{recursive:true});
const shot=async(page,name)=>fs.writeFile(`${out}/${name}.webp`,await sharp(await page.screenshot()).webp({quality:82}).toBuffer());
const base=process.env.DEMO_URL?.replace(/\/$/,'');const server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3064'}});const url=base||'http://127.0.0.1:3064';let browser;
const trace=()=>{window.__loading=[];addEventListener('DOMContentLoaded',()=>{const s=document.querySelector('#loading-screen');if(!s)return;const log=()=>window.__loading.push({value:Number(s.getAttribute('aria-valuenow')),label:s.querySelector('.loading-label')?.textContent,state:s.dataset.state||''});log();new MutationObserver(log).observe(s,{attributes:true,subtree:true,childList:true,characterData:true});});};
const slow=async page=>{let n=0;await page.route(/\.(png|webp|json)(\?|$)/,async route=>{await new Promise(r=>setTimeout(r,120+(n++%12)*45));await route.continue();});};
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&(document.querySelector('#world-hero')||window.__WORLD_HERO__)?.dataset?.x&&!document.querySelector('#loading-screen'),null,{timeout:90000});
// Sandboxed Chromium may not resolve public hosts that Node can; pin the deployed host to Node's answer.
const rules=base?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${(await dns.lookup(new URL(base).hostname)).address}`]:[];
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process',...rules]});
// Single-process Chromium only survives one context, so every scenario gets a fresh browser.
try{await new Promise(r=>setTimeout(r,600));
 const errors=[];const page=async(viewport)=>{await browser?.close();browser=await launch();const p=await (await browser.newContext({viewport})).newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(trace);return p;};
 const results={};
 // 1. Root, desktop and phone: the bar is visible, monotonic, reaches 100 % and then gets out of the way.
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]){
  const p=await page(viewport);await slow(p);const response=await p.goto(url+'/?time=0.5');assert.equal(response.status(),200);
  await p.waitForFunction(()=>Number(document.querySelector('#loading-screen')?.getAttribute('aria-valuenow'))>=35);await shot(p,`loading-${name}`);
  await ready(p);await p.waitForTimeout(400);await shot(p,`ready-${name}`);
  const log=await p.evaluate(()=>window.__loading),values=log.map(x=>x.value);
  assert(values.every((v,i)=>!i||v>=values[i-1]),'bar never moves backwards: '+values.join(','));
  assert.equal(Math.max(...values),100);assert(new Set(values).size>=8,'bar advances in visible steps');
  for(const label of ['Loading artwork','Waking the hero','Raising the Stronghold'])assert(log.some(x=>x.label===label),'label '+label);
  assert.equal(log.at(-1).state,'done');assert.equal(new URL(p.url()).pathname,'/');
  results[name]={steps:new Set(values).size,labels:[...new Set(log.map(x=>x.label))]};await p.close();
 }
 // 2. Retired and deep URLs stay inside the one page.
 for(const [from,want] of [['/stronghold.html?time=0.5','/?time=0.5'],['/index.html','/'],['/arena.html','/'],['/some/deep/path?time=0.25','/?time=0.25']]){
  const p=await page({width:1024,height:768});await p.goto(url+from);await ready(p);const u=new URL(p.url());assert.equal(u.pathname+u.search,want,from);results[from]=want;await p.close();
 }
 // 3. A missing artwork leaves the reason and a working retry on screen.
 {const p=await page({width:390,height:844});await p.route(/barracks\.png/,r=>r.fulfill({status:404,body:'missing'}));await p.goto(url+'/');
  await p.locator('#loading-screen[data-state=error] .loading-retry').waitFor({timeout:60000});await p.waitForTimeout(1500);assert.match(await p.locator('.loading-label').textContent(),/could not load/);await shot(p,'error-phone');
  await p.unroute(/barracks\.png/);await p.locator('.loading-retry').click();await ready(p);results.retry='recovered after Try again';errors.splice(0);await p.close();}
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({url,passed:true,results},null,1));console.log('PASS',JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
