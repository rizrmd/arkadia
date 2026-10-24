import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';

const port=String(8870+Math.floor(Math.random()*80));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const outDir='docs/soul-pickups';
const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{
 env:{...process.env,PORT:port,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit']
});

let browser;
try{
 await fs.mkdir(outDir,{recursive:true});
 if(server){
  await new Promise((ok,no)=>{
   const timer=setTimeout(()=>no(Error('Server startup exceeded 15 seconds')),15000);
   server.stdout.on('data',d=>{console.log(String(d).trim());if(String(d).includes('listening')){clearTimeout(timer);ok();}});
   server.on('error',no);
   server.on('exit',c=>no(Error('server exited '+c)));
  });
 }
 console.log('Launching browser');
 browser=await chromium.launch({
  timeout:15000,
  headless:true,
  env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
  args:['--no-sandbox','--no-zygote']
 });

 console.log('Browser launched');
 const results=[];
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
 console.log('Viewport',viewport);
 const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?offline=1&hero=rift-runner&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:30000});
 const death=await page.evaluate(()=>{
 const c=window.__STRONGHOLD_COMBAT__;let at;
 for(let u=19;u<27&&!at;u+=.5)for(let v=19;v<27;v+=.5)if(c.clear(u,v)&&c.clear(u+2,v+2)&&c.teleport(u+2,v+2)){at={u,v};break;}
 if(!at)throw Error('No tile');
 const before=c.snapshot().run.xp;
 for(let n=0;n<2;n++){const i=c.summon(at.u,at.v,1);for(let j=0;j<5;j++)c.hitFoe(i,false);}
 return {at,before,snap:c.snapshot()};
 });
 assert.equal(death.snap.run.xp,death.before);assert.equal(death.snap.souls.length,2);
 await page.waitForTimeout(400);
 assert.equal(await page.locator('.monster-soul:not(.collected)').count(),2);
 await sharp(await page.screenshot()).webp({quality:80}).toFile(`${outDir}/souls-${viewport.width}.webp`);
 const box=await page.locator('.monster-soul').first().boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x<viewport.width&&box.y<viewport.height,'Soul visible inside viewport');
 const glow=await page.locator('.monster-soul').first().evaluate(el=>getComputedStyle(el).boxShadow);assert.notEqual(glow,'none');
 await page.evaluate(at=>window.__STRONGHOLD_COMBAT__.teleport(at.u,at.v),death.at);
 await page.waitForTimeout(150);
 const pickup=await page.evaluate(()=>({snap:window.__STRONGHOLD_COMBAT__.snapshot(),anim:document.querySelectorAll('.monster-soul.collected').length,dialog:!document.querySelector('.level-cards').hidden}));
 assert.equal(pickup.snap.run.level,2);assert.equal(pickup.snap.run.xp,0);assert.equal(pickup.snap.run.gold,10);assert.equal(pickup.snap.souls.length,0);assert.ok(pickup.anim>0);assert.ok(pickup.dialog);
 await page.waitForTimeout(700);const repeat=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().run);assert.equal(repeat.gold,10);assert.equal(repeat.level,2);assert.deepEqual(errors,[]);
 await sharp(await page.screenshot()).webp({quality:80}).toFile(`${outDir}/blessing-${viewport.width}.webp`);
 const chosen=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;return c.choose(c.snapshot().run.offers[0]);});assert.equal(chosen.pending,0);
 results.push({viewport,killXP:death.snap.run.xp,pickup:repeat,animation:pickup.anim,errors});await page.close();
 }
 await fs.writeFile(`${outDir}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
