import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const port=3198, url=process.env.VERIFY_URL||`http://127.0.0.1:${port}`;
const server=process.env.VERIFY_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','inherit']});
let browser;
try {
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes(String(port)))resolve();});server.on('exit',c=>reject(Error(`Vite exited ${c}`)));});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-zygote'],env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'}});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  console.log(`Starting ${mobile?'touch':'keyboard'} verification`);
  await page.addInitScript(()=>localStorage.setItem('arkodia.hero','rift-runner'));
  await page.goto(`${url}/?offline=1&time=0.5`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_COMBAT__,null,{timeout:90000});
  const before=await page.evaluate(()=>{
   const c=window.__STRONGHOLD_COMBAT__;
   c.clearFoes();
   c.offer(['might','haste','vitality']);
   return c.snapshot();
  });
  assert.equal(before.run.pending,1);
  assert.equal(before.blessingUi.active,true);
  if(mobile){
   // Trusted touch events exercise the actual mobile joystick, including UI hit testing.
   const session=await context.newCDPSession(page);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:65,y:550}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:65,y:610}]});
   await page.waitForTimeout(650);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await page.keyboard.down('s');await page.waitForTimeout(650);await page.keyboard.up('s');
  }
  const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
  const distance=Math.hypot(after.hero.u-before.hero.u,after.hero.v-before.hero.v);
  assert(distance>.1,`${mobile?'touch':'keyboard'} movement blocked while choosing: ${distance}`);
  assert.equal(after.run.pending,1,'movement must leave the blessing available');
  assert.equal(after.blessingUi.active,true);
  const chosen=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.choose('might'));
  assert.equal(chosen.pending,0);
  assert.equal(chosen.skills.might,1);
  console.log(JSON.stringify({mode:mobile?'touch':'keyboard',distanceTiles:distance,pendingWhileMoving:after.run.pending,choiceApplied:true}));
  await context.close();
 }
}finally{await browser?.close();server?.kill();}
