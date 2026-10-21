import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
// Phone pinch check: the snow layer must keep one size through a pinch (each resize re-rastered it and the bottom
// flickered), always cover the screen, and a second finger landing in the bottom-left quarter must zoom, not walk.
// Local run serves dist (or SITE_DIR); DEMO_URL=… checks a deployed build.
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3069'}});let browser;
const out=process.env.OUT||'docs/pinch-zoom',prefix=process.env.DEMO_URL?'live-':'';
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3069')+'/?time=0.5');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});await page.waitForTimeout(800);
 await page.evaluate(()=>{const snow=document.querySelector('#world-layers>div'),stick=document.querySelector('#move-stick');window.pinchCheck={resizes:0,gaps:0,stickFrames:0,frames:0};let size='';
  (function sample(){const r=snow.getBoundingClientRect(),k=snow.style.width+'x'+snow.style.height,c=window.pinchCheck;if(size&&k!==size)c.resizes++;size=k;
   if(r.left>.5||r.top>.5||r.right<innerWidth-.5||r.bottom<innerHeight-.5)c.gaps++;if(stick.dataset.active==='true')c.stickFrames++;c.frames++;requestAnimationFrame(sample);})();});
 const cdp=await context.newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
 const zoom=()=>page.evaluate(()=>+/scale\(([\d.]+)\)/.exec(document.querySelector('#world-surface').style.transform)[1]);
 // Two fingers from a to b; the second lands a frame after the first, as on a real screen.
 async function pinch(a,b,shot){await touch('touchStart',[a[0]]);await touch('touchStart',a);
  for(let i=1;i<=30;i++){const t=i/30;await touch('touchMove',a.map((p,k)=>[p[0]+(b[k][0]-p[0])*t,p[1]+(b[k][1]-p[1])*t]));await page.waitForTimeout(16);if(shot&&i===24)await sharp(await page.screenshot()).webp({quality:82}).toFile(`${out}/${prefix}${shot}`);}
  await touch('touchEnd',[]);await page.waitForTimeout(200);}
 await fs.mkdir(out,{recursive:true});
 const start=await zoom();await pinch([[195,300],[195,540]],[[195,405],[195,435]],'zoom-out-390.webp');const out1=await zoom();
 await pinch([[195,405],[195,435]],[[195,240],[195,600]],'zoom-in-390.webp');const in1=await zoom();
 await pinch([[270,300],[110,640]],[[235,390],[150,520]],'bottom-left-finger-390.webp');const diagonal=await zoom();
 const result=await page.evaluate(()=>window.pinchCheck);
 assert(out1<start,'pinch closes to zoom out');assert(in1>out1,'pinch spreads to zoom in');assert(diagonal<in1,'a second finger in the bottom-left quarter still zooms');
 assert.equal(result.resizes,0,'the snow layer keeps one size while pinching');assert.equal(result.gaps,0,'snow always covers the screen');assert.equal(result.stickFrames,0,'a pinch never shows the walk thumbstick');assert.deepEqual(errors,[]);
 const report={viewport:'390x844',url:process.env.DEMO_URL||'local dist',zoom:{start,afterZoomOut:out1,afterZoomIn:in1,afterBottomLeftPinch:diagonal},...result,errors};
 await fs.writeFile(`${out}/${prefix}results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server?.kill();}
