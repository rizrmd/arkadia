import {chromium} from 'playwright';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
// Camera follow behaviour around the smoothed (spring) follow: a drag during the settle wins, walking resumes the
// follow, the camera comes to rest, a building tap glides uninterrupted, and a teleport snaps. VERIFY_URL checks a deployed build.
const url=process.env.VERIFY_URL||'http://127.0.0.1:3072',server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3072'}});let browser;
try{await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:590,y:420})));
 await page.goto(url+'/?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(1200);
 const cam=()=>page.locator('#world-surface').evaluate(e=>e.style.transform);
 // Walk, stop, then drag away while the camera is still settling: the drag wins and the camera stays put.
 await page.keyboard.down('d');await page.waitForTimeout(1500);await page.keyboard.up('d');await page.waitForTimeout(80);
 await page.mouse.move(640,400);await page.mouse.down();await page.mouse.move(400,300,{steps:8});await page.mouse.up();const dragged=await cam();
 await page.waitForTimeout(1200);assert.equal(await cam(),dragged,'camera must not drift back after a drag while the hero is idle');
 // Walking again brings the camera back after the hero.
 await page.keyboard.down('a');await page.waitForTimeout(2800);await page.keyboard.up('a');assert.notEqual(await cam(),dragged,'walking resumes follow');
 await page.waitForTimeout(1500);const rest=await cam();await page.waitForTimeout(500);assert.equal(await cam(),rest,'camera comes to rest');
 // Selecting a building glides to it and the settling follow does not interrupt.
 await page.keyboard.down('d');await page.waitForTimeout(800);await page.keyboard.up('d');
 await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
 // Tap the tent right after stopping, while the follow is still settling; record the camera state each frame.
 const tent=await page.evaluate(()=>{const b=/translate3d\(([-\d.]+)px, ?([-\d.]+)px/.exec(document.querySelector('#hero-health').style.transform),k=+/scale\(([\d.]+)\)/.exec(document.querySelector('#world-surface').style.transform)[1],h=document.querySelector('#world-hero').dataset;
  window.__G__=[];window.__C__=[];if(!window.__W__){window.__W__=1;const o=window.cancelAnimationFrame;window.cancelAnimationFrame=function(id){window.__C__.push(new Error().stack.split('\n').slice(1,4).join(' | '));return o.call(this,id);};}const c=document.querySelector('#world-canvas'),t=()=>{window.__G__.push(c.dataset.camera);if(window.__G__.length<2000)requestAnimationFrame(t);};requestAnimationFrame(t);
  return {x:+b[1]+(577-+h.x)*k,y:+b[2]+64*k+(270-+h.y)*k};});
 await page.mouse.click(tent.x,tent.y);await page.waitForFunction(()=>window.__G__.includes('gliding')&&window.__G__.at(-1)==='idle',null,{timeout:15000});const states=await page.evaluate(()=>window.__G__),n=states.filter(s=>s==='gliding').length;
 assert.equal((await page.evaluate(()=>window.__C__)).length,0,'nothing cancels the glide');assert.ok(n>=3,'tent tap glides: '+n);assert.equal(states.at(-1),'idle');const glided={tent,glidingFrames:n,transform:await cam()};
 // Teleport snaps the camera at once.
 const glideEnd=await cam(),moved=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=2;u<14;u++)for(let v=2;v<14;v++)if(Math.hypot(u-7.5,v-12)>3&&c.teleport(u,v))return [u,v];return null;});
 assert.ok(moved,'found a walkable tile to teleport to');const snapped=await cam();assert.notEqual(snapped,glideEnd,'teleport moves the camera in the same call');await page.waitForTimeout(400);assert.equal(await cam(),snapped,'and leaves nothing to settle');
 console.log(JSON.stringify({dragged,rest,glided,snapped,after:await cam(),errors}));assert.equal(errors.length,0);console.log('PASS');
}finally{await browser?.close();server?.kill();}
