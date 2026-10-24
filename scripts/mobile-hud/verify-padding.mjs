import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const out=process.env.HUD_OUT||'docs/mobile-hud/padding',base=process.env.VERIFY_URL||'http://127.0.0.1:8806';
await mkdir(out,{recursive:true});
const server=process.env.VERIFY_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8806'],{stdio:'pipe'});
let browser;
try{
 if(server)await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('8806'))ok();});server.on('exit',no);});
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/?offline=1&hero=rift-runner&time=.35');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000,polling:500});
 const results=[];
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);await page.evaluate(()=>window.__PIXI_UI__.app.ticker.stop());
  for(const gold of [430,9999]){
   const s=await page.evaluate(gold=>{const h=window.__STRONGHOLD_COMBAT__.hud;h.setGold(gold);h.setTime('08:23');window.__PIXI_UI__.app.render();const b=o=>{const b=o.getBounds();return {x:b.x,y:b.y,right:b.maxX,bottom:b.maxY,cy:typeof o.inkCenterY==='function'?o.getGlobalPosition().y+o.inkCenterY()*o.worldTransform.d:(b.minY+b.maxY)/2};};return {gold:b(h.trRibbonGoldText),coin:b(h.trRibbonGoldIcon),time:b(h.trRibbonClockText),clock:b(h.trRibbonClockIcon),scale:h.trRibbonGoldText.scale.x,timeScale:h.trRibbonClockText.scale.x};},gold);
   if(width<1024){assert(Math.abs(s.gold.cy-s.coin.cy)<.1);assert(Math.abs(s.time.cy-s.clock.cy)<.1);assert(s.gold.x-s.coin.right>3);assert(s.time.x-s.clock.right>3);assert(Math.abs(s.scale-s.timeScale)<.001);}
   results.push({width,height,gold,...s});
   if(gold===430)await page.screenshot({path:`${out}/${process.env.VERIFY_URL?'live-':''}${width}.png`,clip:{x:0,y:0,width,height:Math.min(height,150)}});
  }
  await page.evaluate(()=>window.__PIXI_UI__.app.ticker.start());
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/${process.env.VERIFY_URL?'live-':''}verification.json`,JSON.stringify({results,errors},null,2));console.log('PASS five sizes, 430/9999 Gold, icon/text centers and spacing');
}finally{await browser?.close();server?.kill();}
