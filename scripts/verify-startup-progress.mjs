import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.VERIFY_URL||'http://127.0.0.1:3098';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3098',SITE_DIR:process.env.SITE_DIR||'dist'},stdio:'ignore'});
const results=[];let browser;
try{
 if(server)for(let i=0;i<30;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,viewport] of [['desktop',{width:1280,height:800}],['phone',{width:320,height:640}]]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let release,fontsBeforeGameplay=false,gameplayReleased=false;
  const gate=new Promise(resolve=>{release=resolve;});
  const fallback=setTimeout(()=>{gameplayReleased=true;release();},30000);
  page.on('request',request=>{if(request.url().includes('/typography/v2/fonts/')&&!gameplayReleased){fontsBeforeGameplay=true;gameplayReleased=true;clearTimeout(fallback);release();}});
  // Keep gameplay code pending until the engine starts its font requests. This
  // proves interface preparation overlaps gameplay imports instead of merely
  // moving a percentage timer past the previous 10% plateau.
  await page.route(/\/assets\/main-[^/]+\.js$/,async route=>{await gate;await route.continue();});
  await page.addInitScript(()=>{
   window.__startupSamples=[];
   addEventListener('DOMContentLoaded',()=>{
    const screen=document.querySelector('#loading-screen');if(!screen)return;
    const record=()=>{
     const label=screen.querySelector('#loading-label'),pct=screen.querySelector('#loading-pct');
     const range=document.createRange();range.selectNodeContents(label);
     const item={percent:Number(screen.getAttribute('aria-valuenow')),text:pct.textContent,label:label.textContent,state:screen.dataset.state,lines:new Set([...range.getClientRects()].map(rect=>Math.round(rect.top))).size,nowrap:getComputedStyle(label).whiteSpace==='nowrap'};
     if(JSON.stringify(window.__startupSamples.at(-1))!==JSON.stringify(item))window.__startupSamples.push(item);
    };
    record();new MutationObserver(record).observe(screen,{attributes:true,childList:true,subtree:true,characterData:true});
   });
  });
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>!document.querySelector('#loading-screen')&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:180000});
   const samples=await page.evaluate(()=>window.__startupSamples);
   assert(fontsBeforeGameplay,'fonts begin while gameplay module is still pending');
   assert(samples.some(s=>/^Loading game code · \d+\/\d+$/.test(s.label)),'code download count is visible');
   assert(samples.every((s,i)=>!i||s.percent>=samples[i-1].percent),'progress never decreases');
   assert(samples.every(s=>s.nowrap&&s.lines<=1),'every loading label stays on one line');
   assert(samples.every(s=>s.text===`${s.percent}%`),'visible percentage matches progress');
   assert.equal(samples.at(-1).percent,100);assert.equal(samples.at(-1).state,'done');assert.deepEqual(errors,[]);
   results.push({name,fontsBeforeGameplay,errors,samples});
   console.log('PASS',name,'parallel startup, one-line labels, monotonic percentage, Ready 100%');
  }finally{clearTimeout(fallback);release();await context.close();}
 }
 // Even a long failure explanation must retain one line, with full text in title.
 const page=await browser.newPage({viewport:{width:320,height:640}});
 await page.goto(base+'/?holdLoading=1&loadingPct=96&loadingText='+encodeURIComponent('Preparing the Stronghold · effects, visibility and graphics ready · 3/3'),{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>window.__LOADING_SCREEN__.fail('The Stronghold could not load. Check your connection and try again.'));
 const errorLayout=await page.locator('#loading-label').evaluate(label=>{const r=document.createRange();r.selectNodeContents(label);return {lines:new Set([...r.getClientRects()].map(rect=>Math.round(rect.top))).size,title:label.title,text:label.textContent,nowrap:getComputedStyle(label).whiteSpace};});
 assert(errorLayout.lines<=1&&errorLayout.nowrap==='nowrap');assert.equal(errorLayout.title,errorLayout.text);
 const report=process.env.REPORT||'/home/dev/loading-startup-verification.json';
 await fs.writeFile(report,JSON.stringify({base,passed:true,results,errorLayout},null,2)+'\n');
 console.log('PASS long error label stays on one line');
}finally{await browser?.close();server?.kill();}
