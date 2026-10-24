import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { launchOptions } from './typography/browser.mjs';
const base = process.env.BASE_URL;
const server = base ? null : spawn('node', ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8799'], {stdio:'ignore'});
let browser;
try {
 if(server) await new Promise(r=>setTimeout(r,1500));
 for(const mobile of [false,true]) {
  browser=await chromium.launch(launchOptions());
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${base??'http://127.0.0.1:8799'}/?offline=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
  if(await page.evaluate(()=>window.__PIXI_UI__?.picker?.isOpen()))await page.keyboard.press('Enter');
  await page.evaluate(()=>window.__COOP__?.net?.leave());
  await page.waitForTimeout(300);
  for(const mode of ['unlock','upgrade','popover']) {
   const before=await page.evaluate((mode)=>{
    const api=window.__STRONGHOLD_COMBAT__,s=api.snapshot();
    const id=mode==='unlock'?(s.loadout.heroId==='rift-runner'?'rift-dash':'cinder-step'):s.loadout.slots[0].skillId;
    api.offer([id]);
    return {id,snapshot:api.snapshot()};
   },mode);
   const s=before.snapshot;
   const pop=s.blessingUi.skillPopovers[0];assert.ok(pop,mode+' offer exists');
   const sock=s.hudGeometry.sockets.find(x=>x.index===pop.socketIndex);
   const pt=mode==='popover'?{x:(pop.rect.xMin+pop.rect.xMax)/2,y:(pop.rect.yMin+pop.rect.yMax)/2}:sock;
   if(mobile)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);
   await page.waitForTimeout(150);
   const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
   assert.equal(after.run.pending,s.run.pending-1,`${mobile?'touch':'mouse'} ${mode} consumes exactly one choice`);
   const old=s.loadout.slots.find(x=>x.skillId===before.id)?.rank??0;
   assert.equal(after.loadout.slots.find(x=>x.skillId===before.id)?.rank,old+1,`${mode} applies correct skill`);
  }
  assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile touch':'Desktop mouse'}: unlock circle, upgrade circle and popover passed`);
  await browser.close();browser=null;
 }
} finally {await browser?.close();server?.kill();}
