import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='public/expedition-tent';await fs.mkdir(out,{recursive:true});
const remote=process.env.DEMO_URL,server=remote?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3067'}});let browser;
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto((remote||'http://127.0.0.1:3067')+'/?time=0.5');assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x&&!document.querySelector('#loading-screen'));
 assert(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/expedition-tent.png'))));
 const pos=()=>page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset;return{x:+d.x,y:+d.y};});
 const start=await pos();await page.keyboard.down('w');await page.waitForTimeout(2400);await page.keyboard.up('w');await page.waitForTimeout(300);const stopped=await pos();
 assert(stopped.y<start.y-25,'hero approaches tent');assert(stopped.y>420,'tent blocks movement');
 await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');await page.waitForTimeout(300);const blocked=await pos();assert(Math.abs(blocked.y-stopped.y)<2,'tent collision holds');
 await page.screenshot({path:out+'/day.png'});
 await page.keyboard.down('d');await page.waitForTimeout(1600);await page.keyboard.up('d');await page.waitForTimeout(300);const aside=await pos();assert(aside.x>blocked.x+100,'can walk around tent');
 // The open doorway is not walkable, and from the north the tent covers the hero.
 // Reload first: a page that just stopped walking saves the hero's position 400 ms later, over the seeded one.
 const walk=async(from,key)=>{await page.reload();await page.evaluate(p=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify(p)),from);await page.reload();
  await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x&&!document.querySelector('#loading-screen'));
  await page.keyboard.down(key);await page.waitForTimeout(2400);await page.keyboard.up(key);await page.waitForTimeout(300);
  return page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset;return{x:+d.x,y:+d.y,behind:+d.behind};});};
 const doorway=await walk({x:532,y:500},'w');assert(doorway.y>485,'tent doorway blocks movement');
 const behind=await walk({x:565,y:390},'s');assert(behind.y<420&&behind.behind>0,'tent covers hero behind it');
 await page.screenshot({path:out+'/behind.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);await page.screenshot({path:out+'/phone.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,start,stopped,blocked,aside,doorway,behind,errors}));
}finally{await browser?.close();server?.kill();}
