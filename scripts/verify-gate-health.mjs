import assert from 'node:assert/strict';
import {preview} from 'vite';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {launchOptions} from './typography/browser.mjs';
const server=await preview({build:{outDir:process.env.SITE_DIR||'dist'},preview:{host:'127.0.0.1',port:0}});
const browser=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('arkodia.hero','rift-runner'));
 await page.goto(server.resolvedUrls.local[0]+'?offline=1&time=0.35');
 console.log('Waiting for game');
 await page.waitForFunction(()=>window.__PIXI_UI__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});
 const result=await page.evaluate(()=>{
  const hud=window.__PIXI_UI__.hud, bar=hud.worldGateBar;
  const assert=(v,m)=>{if(!v)throw Error(m);};
  assert(bar&&bar.parent,'world bar attached');
  assert(hud.playerConsole.rows.length===2,'HP and XP only');
  assert(hud.playerConsole.rows[1].label.text==='XP','XP preserved');
  bar.tick(0);assert(bar.filters?.length===1,'default blur');
  bar.setHealth(90,100,100);assert(!bar.filters?.length,'clear on damage');
  bar.tick(1099);assert(!bar.filters?.length,'clear before one second');
  bar.setHealth(80,100,900);bar.tick(1100);assert(!bar.filters?.length,'repeated hit extends reveal');
  bar.setHealth(90,100,1500);bar.tick(1900);assert(bar.filters?.length===1,'healing does not extend reveal');
  bar.setHealth(0,100,2000);assert(!bar.filters?.length,'lethal damage clears');
  bar.tick(3000);assert(bar.filters?.length===1,'returns to blur at one second');
  hud.setGateHp(75);assert(bar.hp===75,'HUD updates world HP');
  return {pass:true,position:{x:bar.x,y:bar.y},scale:bar.scale.x,labels:hud.playerConsole.rows.map(r=>r.label.text)};
 });
 assert.equal(result.pass,true);
 await fs.mkdir('docs/gate-health',{recursive:true});
 if(process.env.CAPTURE) {await page.evaluate(()=>window.__PIXI_UI__.app.stop());await page.screenshot({path:'docs/gate-health/desktop.png',timeout:60000});}
 for(const [width,height] of [[390,844],[844,390]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>window.__PIXI_UI__.hud.playerConsole.rows.length),2);
 }
 if(process.env.CAPTURE) await page.screenshot({path:'docs/gate-health/mobile-landscape.png',timeout:60000});
 assert.deepEqual(errors,[]);
 await fs.writeFile('docs/gate-health/verification.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally {await browser.close();await new Promise(r=>server.httpServer.close(r));}
