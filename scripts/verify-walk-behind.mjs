import{chromium}from'playwright';import{spawn}from'node:child_process';import assert from'node:assert/strict';import fs from'node:fs/promises';import sharp from'sharp';
// The hero walks straight down behind the gateway and the mage tower until their real bases stop it, not an
// invisible wall far behind them (overhang-reflected footprints, braziers hidden behind the gate).
// Local build by default (npm run build first); DEMO_URL=https://… tests a deployed host instead. Close-ups of each
// stop land in docs/walk-behind/.
const out='docs/walk-behind';await fs.mkdir(out,{recursive:true});
const base=process.env.DEMO_URL?.replace(/\/$/,'');const server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3065'}});const url=base||'http://127.0.0.1:3065';let browser;
try{await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await (await browser.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 2x close-up around the resting hero. It stands hidden behind the sprite, so a gold ring marks its feet
 // (screen = surface translation - raster left/top * scale + world position * scale).
 const shot=async name=>{const b=await page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset,[l,t]=document.querySelector('#world-lightmap').dataset.origin.split(',').map(Number);
   const [tx,ty,k]=document.querySelector('#world-surface').style.transform.replace('translate3d','').match(/-?[\d.]+/g).map(Number).filter((_,i)=>i!==2);return {x:tx+(+d.x-l)*k,y:ty+(+d.y-t)*k};});
  const left=Math.round(Math.min(1440-440,Math.max(0,b.x-220))),top=Math.round(Math.min(1000-400,Math.max(0,b.y-240))),ring=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="400"><ellipse cx="${b.x-left}" cy="${b.y-top}" rx="14" ry="7" fill="none" stroke="#f2c46b" stroke-width="2.5"/></svg>`);
  await fs.writeFile(`${out}/${name}.webp`,await sharp(await sharp(await page.screenshot()).extract({left,top,width:440,height:400}).composite([{input:ring}]).toBuffer()).resize(880).webp({quality:82}).toBuffer());};
 const hero=()=>page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset;return {x:+d.x,y:+d.y};});
 // Saved position -> reload -> hold a key until the hero rests.
 const walk=async(x,y,key)=>{await page.evaluate(p=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify(p)),{x,y});await page.reload();await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x,null,{timeout:90000});await page.waitForTimeout(500);
  const start=await hero();assert.deepEqual([start.x,start.y],[x,y],'start position is free');await page.keyboard.down(key);let last=start;for(;;){await page.waitForTimeout(700);const now=await hero();if(Math.hypot(now.x-last.x,now.y-last.y)<.5)break;last=now;}await page.keyboard.up(key);return last;};
 await page.goto(url+'/?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x,null,{timeout:90000});
 // Gateway: straight south across its doors reaches its back wall (y ~754), as a walk along it from the east does.
 for(const x of [545,577,605]){const end=await walk(x,640,'KeyS');console.log('gate',x,end);assert(end.y>745,`south at x=${x} stops at the gateway, not y=${end.y}`);if(x===577)await shot('gate-south');}
 const east=await walk(650,700,'KeyS');const along=await walk(east.x,east.y,'KeyA');console.log('gate from east',along);assert(along.x<520,'the passage behind the gateway is open end to end');
 // Mage tower: straight south behind it stops at the tower base (front ~610), not near its roof (y ~300).
 for(const x of [245,300]){const end=await walk(x,430,'KeyS');console.log('mage',x,end);assert(end.y>500,`south behind the mage tower at x=${x} stops at its base, not y=${end.y}`);if(x===300)await shot('mage-south');}
 assert.deepEqual(errors,[]);console.log('PASS the hero walks behind the gateway and the mage tower up to their bases');
}finally{await browser?.close();server?.kill();}
