import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3065'}});
let browser;
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:700})));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3065')+'/?time=0.5&offline=1');
 await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);
 const pos=()=>page.locator('#world-hero').evaluate(e=>({x:+e.dataset.x,y:+e.dataset.y}));
 assert.equal(await page.locator('#world-canvas').getAttribute('data-gate'),'closed');
 const start=await pos();assert(start.y>=695&&start.y<=705,JSON.stringify(start));
 await page.keyboard.down('s');await page.waitForFunction(()=>+document.querySelector('#world-hero').dataset.y>950,null,{timeout:15000});await page.keyboard.up('s');
 const outside=await pos();assert.equal(await page.locator('#world-canvas').getAttribute('data-gate'),'closed');
 await page.keyboard.down('w');await page.waitForFunction(()=>+document.querySelector('#world-hero').dataset.y<710,null,{timeout:15000});await page.keyboard.up('w');
 const inside=await pos();assert(Math.abs(inside.x-577)<1);assert.deepEqual(errors,[]);
 // Reload at a stone tower and walk toward it: the open passage must not remove its collision.
 await page.addInitScript(()=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:657,y:860})));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);
 await page.keyboard.down('w');await page.waitForTimeout(3000);await page.keyboard.up('w');
 const tower=await pos();assert(tower.y<810&&tower.y>785,'stone tower still blocks movement: '+JSON.stringify(tower));
 // Stop close enough to open; the camera can pan without changing proximity.
 await page.addInitScript(()=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:820})));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.gate==='open');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors')?.dataset.state==='open');await fs.mkdir('docs/gate-proximity',{recursive:true});
 await page.screenshot({path:'docs/gate-proximity/open.png'});
 await page.keyboard.down('s');await page.waitForFunction(()=>+document.querySelector('#world-hero').dataset.y>900,null,{timeout:15000});await page.keyboard.up('s');
 assert.equal(await page.locator('#world-canvas').getAttribute('data-gate'),'closed');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors')?.dataset.state==='closed');
 await page.screenshot({path:'docs/gate-proximity/closed.png'});
 console.log(JSON.stringify({start,outside,inside,tower,errors}));
}finally{await browser?.close();server?.kill();}
