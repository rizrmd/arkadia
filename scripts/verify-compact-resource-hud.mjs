import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {launchOptions} from './typography/browser.mjs';
const live=process.env.LIVE==='1';
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));
 if(!live)await page.route('https://arkodia.online/**',async route=>{
  const u=new URL(route.request().url()),file=u.pathname==='/'?'dist/index.html':path.join('dist',decodeURIComponent(u.pathname));
  if((u.pathname==='/'||u.pathname.startsWith('/assets/'))&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':undefined});
  return route.continue();
 });
 await page.goto('https://arkodia.online/?offline=1&quality=low',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.__PIXI_UI__?.hud,null,{timeout:120000});
 if(await page.evaluate(()=>window.__PIXI_UI__.picker?.isOpen()))await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(1000);
  await page.evaluate(({width,height})=>{const ui=window.__PIXI_UI__;ui.app.renderer.resize(width,height);ui.hud.layout(width,height);ui.app.render();},{width,height});
  for(const [wood,food,gold] of [[0,0,0],[1250,500,875],[9999999,9999999,9999999]]){
   const t=await page.evaluate(({wood,food,gold})=>{const h=window.__PIXI_UI__.hud;h.setResources(wood,food);h.setGold(gold);h.setTime('16:15');window.__PIXI_UI__.app.render();return h.getTopRightTelemetry();},{wood,food,gold});
   assert.equal(t.woodLabel,wood.toLocaleString('en-US')+' Wood');assert.equal(t.foodLabel,food.toLocaleString('en-US')+' Food');
   assert.ok(t.resourceBounds.left>=0&&t.resourceBounds.right<=width+1,JSON.stringify(t.resourceBounds));
   if(width===1440)assert.equal(t.resourceScale,.3);
   const order=await page.evaluate(()=>{const h=window.__PIXI_UI__.hud;return [h.trRibbonGoldText,h.woodText,h.foodText,h.trRibbonClockText].map(t=>t.getBounds().minX);});
   assert.ok(order.every((x,i)=>!i||x>order[i-1]),'Gold Wood Food clock order');
   checks.push({width,height,wood,food,gold,...t});
  }
  await page.screenshot({path:`docs/compact-resource-hud/${live?'live-':''}${width}x${height}.png`});
 }
 // Verify that the actual gathering controller feeds both live counts into the HUD.
 await page.evaluate(()=>{window.__GATHERING__.step(0,{alive:true,steering:false,busy:false});});
 await page.waitForFunction(()=>window.__GATHERING__&&window.__PIXI_UI__?.hud,null,{timeout:120000});
 const integration=await page.evaluate(()=>({r:window.__GATHERING__.snapshot().resources,h:window.__PIXI_UI__.hud.getTopRightTelemetry()}));
 assert.equal(integration.h.woodLabel,integration.r.wood.toLocaleString('en-US')+' Wood');
 assert.equal(integration.h.foodLabel,integration.r.food.toLocaleString('en-US')+' Food');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`docs/compact-resource-hud/${live?'live-':''}verification.json`,JSON.stringify({live,checks,integration,errors},null,2));
 console.log(JSON.stringify({pass:true,live,cases:checks.length,errors}));
}finally{await browser.close();}
