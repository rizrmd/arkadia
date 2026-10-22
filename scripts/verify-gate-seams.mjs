import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const base=process.env.DEMO_URL||'http://127.0.0.1:3078';
const server=process.env.DEMO_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3078']);
let browser;
try {
 await new Promise(r=>setTimeout(r,1200));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:process.env.CLOSEUP?2:1});
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:577,y:700})));
 await page.goto(base+'/?time='+ (process.env.TIME||'.5') +'&offline=1');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');
 await page.waitForTimeout(1000);
 const gate=page.locator('#world-gate-doors');let r=await gate.boundingBox();

 await page.mouse.move(800,400);await page.mouse.down();await page.mouse.move(800+550-(r.x+r.width/2),400+400-(r.y+r.height/2),{steps:8});await page.mouse.up();await page.waitForTimeout(100);r=await gate.boundingBox();
 await page.screenshot({path:`docs/gate-seams/${process.env.CAPTURE||'after'}.png`,clip:{x:Math.max(0,r.x-180),y:Math.max(0,r.y-70),width:Math.min(1000,r.width+360),height:Math.min(process.env.CLOSEUP?420:650,900-Math.max(0,r.y-70))}});
 console.log(JSON.stringify({gate:r,state:await gate.getAttribute('data-state')}));
} finally {await browser?.close();server?.kill();}
