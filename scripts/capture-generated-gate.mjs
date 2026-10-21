import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3071'}});let browser;
try{await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1000,height:900},deviceScaleFactor:2});
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:577,y:700})));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3071')+'/?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(1000);
 await fs.mkdir('docs/gate-generated',{recursive:true});
 const shot=async name=>{const clip=await page.locator('#world-gate-doors').evaluate(e=>{const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-110),y:Math.max(0,r.y-70),width:Math.min(300,innerWidth-r.x+110),height:Math.min(240,innerHeight-r.y+70)};});await page.screenshot({path:'docs/gate-generated/'+name+'.png',clip});};
 await shot('closed');await page.keyboard.down('s');await page.waitForFunction(()=>{const d=document.querySelector('#world-gate-doors').dataset;return d.state==='opening'&&+d.frame>=5&&+d.frame<=8;},{},{polling:10});await shot('opening');await page.keyboard.up('s');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='open');await shot('open');
 await page.keyboard.down('w');await page.waitForFunction(()=>{const d=document.querySelector('#world-gate-doors').dataset;return d.state==='closing'&&+d.frame>=5&&+d.frame<=9;},{},{polling:10,timeout:15000});await shot('closing');await page.keyboard.up('w');
 console.log('Captured generated gate frame playback');
}finally{await browser?.close();server?.kill();}
