import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';

const external=process.env.BASE;
const vite=external?null:await createServer({server:{host:'127.0.0.1',port:18143,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite?.listen();
const base=external||'http://127.0.0.1:18143',browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:392,height:735},deviceScaleFactor:2.75,userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tracelogs',r=>r.request().method()==='POST'?r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"android-verification"}'}):r.continue());
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});
  localStorage.removeItem('arkodia.settings.v1');
 });
 await page.routeWebSocket('**/*',()=>{});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.goto(`${base}/?offline=1&hero=ember-warden&time=0.5&shadowField=0`,{timeout:60000});
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.fxStage.ready()&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 const boot=await page.evaluate(()=>({quality:window.__FPS_TRACELOG__.stats().targetFps,frontier:window.__FROZEN_FRONTIER__.stats(),fx:window.__STRONGHOLD_COMBAT__.fxStage.stats(),build:document.querySelector('script[type=module]')?.getAttribute('src')}));
 assert.equal(boot.quality,30);
 assert.ok(boot.frontier.occlusionImages>0);
 assert.ok(boot.fx.preparedEffects<boot.fx.effects,'unused hero effects must stay cold');
 assert.equal(boot.fx.ready,true);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;c.setMaxHp(1e6);
  for(let i=1;i<8;i++){const r=c.offer();if(r.offers?.length)c.choose(r.offers[0]);}
  c.triggerLevelUp(8);c.castSimultaneous(['flame-fan','ember-snare']);
 });
 await page.waitForTimeout(8000);
 await page.waitForFunction(()=>window.__FPS_TRACELOG__.stats().sampleCount>=15,null,{timeout:180000});
 const combat=await page.evaluate(async()=>({stats:window.__FPS_TRACELOG__.stats(),capture:(await window.__FPS_TRACELOG__.captureNow()).entry,fx:window.__STRONGHOLD_COMBAT__.fxStage.stats()}));
 combat.history=combat.capture.renderOperations||[];
 assert.ok(combat.capture.frames.length>0,'must inspect actual gameplay samples');
 assert.equal(combat.history.filter(x=>x.phase==='sceneryMask').length,0);
 assert.equal(combat.history.filter(x=>x.phase==='fxCreate'||x.phase==='fxWarmup').length,0,'pool creation must finish before playable frames');
 assert.deepEqual(errors,[]);
 const out={base,loadingCpuThrottle:4,combatCpuThrottle:1,shadowField:false,emulatedDevice:'Android / 4 GB / 392x735 / DPR 2.75 (software GPU, not Adreno hardware)',boot,combat,errors};
 await fs.mkdir('docs/android-stutter',{recursive:true});
 await fs.writeFile(`docs/android-stutter/${external?'live':'local'}-verification.json`,JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({base,targetFps:boot.quality,masks:boot.frontier.occlusionImages,combatFps:combat.stats.fps,errors}));
}finally{await browser.close();await vite?.close();}
