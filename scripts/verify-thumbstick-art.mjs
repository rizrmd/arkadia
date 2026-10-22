import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// Real touch regression for the full-width bottom-third pad and walking-to-pinch handoff.
// Local run serves dist (or SITE_DIR); DEMO_URL=… checks a deployed build.
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3069'}});let browser;
const out=process.env.OUT||'docs/thumb-pad',prefix=process.env.DEMO_URL?'live-':'';
try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3069')+'/?offline=1&time=0.5');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});await page.waitForTimeout(800);
 await page.evaluate(()=>{const snow=document.querySelector('#world-layers>div'),stick=document.querySelector('#move-stick');window.pinchCheck={resizes:0,gaps:0,stickFrames:0,frames:0};let size='';
  (function sample(){const r=snow.getBoundingClientRect(),k=snow.style.width+'x'+snow.style.height,c=window.pinchCheck;if(size&&k!==size)c.resizes++;size=k;
   if(r.left>.5||r.top>.5||r.right<innerWidth-.5||r.bottom<innerHeight-.5)c.gaps++;if(stick.dataset.active==='true')c.stickFrames++;c.frames++;requestAnimationFrame(sample);})();});
 const cdp=await context.newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
 const zoom=()=>page.evaluate(()=>+/scale\(([\d.]+)\)/.exec(document.querySelector('#world-surface').style.transform)[1]);
 // Two fingers from a to b; the second lands a frame after the first, as on a real screen.
 async function pinch(a,b){await touch('touchStart',[a[0]]);await touch('touchStart',a);
  for(let i=1;i<=30;i++){const t=i/30;await touch('touchMove',a.map((p,k)=>[p[0]+(b[k][0]-p[0])*t,p[1]+(b[k][1]-p[1])*t]));await page.waitForTimeout(16);}
  await touch('touchEnd',[]);await page.waitForTimeout(200);}
 await fs.mkdir(out,{recursive:true});
 const active=()=>page.evaluate(()=>document.querySelector('#move-stick').dataset.active==='true');
 const hero=()=>page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset;return {x:+d.x,y:+d.y};});
 for(const x of [35,195,355]){
  await touch('touchStart',[[x,650]]);assert(await active(),'bottom third activates across full width');
  await touch('touchMove',[[x+25,650]]);await page.waitForTimeout(150);
  assert(await active());await touch('touchEnd',[]);assert(!(await active()));
 }
 await touch('touchStart',[[35,520]]);assert(!(await active()),'old left-half area above third pans');await touch('touchEnd',[]);
 await touch('touchStart',[[195,650]]);assert(await active());
 // The generated base and cap must ship together, load successfully, and retain separate movement.
 for(const part of ['base','knob'])assert(await page.evaluate(async part=>{const img=new Image();img.src='/ui/thumbstick-'+part+'.webp';await img.decode();return img.naturalWidth>0;},part));
 await page.waitForTimeout(200);const baseBox=await page.locator('#move-stick').boundingBox();
 await touch('touchMove',[[215,650]]);await page.waitForTimeout(180);
 assert.deepEqual(await page.locator('#move-stick').boundingBox(),baseBox,'base stays fixed while cap moves');
 assert.notEqual(await page.locator('.stick-knob').evaluate(el=>el.style.transform),'');
 await page.screenshot({path:`${out}/${prefix}thumbstick.png`});
 await touch('touchCancel',[]);
 assert(!(await active()));
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/${prefix}results.json`,JSON.stringify({viewport:'390x844',assetsLoaded:true,baseFixed:true,capMoves:true,releaseHides:true,errors},null,2));console.log('PASS generated thumbstick loads; bottom-third touch activation, cap movement, fixed base and release');
}finally{await browser?.close();server?.kill();}
