import {chromium} from 'playwright';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchOptions} from './typography/browser.mjs';
const remote=process.env.VERIFY_URL,out='docs/rift-dash',tag=remote?'live':'local';
await fs.mkdir(out,{recursive:true});
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5288,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
let browser;const report={tag,views:{},errors:[]};
try{for(const [view,width,height,touch] of [['desktop',1440,900,false],['mobile',390,844,true],['landscape',844,390,true]]){
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto((remote||'http://127.0.0.1:5288')+'/?offline=1&hero=rift-runner&time=.45');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_COMBAT__?.snapshot&&!document.getElementById('loading-screen'),null,{timeout:300000});
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.offer(['rift-dash','might','heal']);c.choose('rift-dash');c.clearFoes();c.resetCooldowns();});
 await page.waitForTimeout(1000);
 const snap=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
 let a=await snap();const socket=a.hudGeometry.sockets[1];
 // Use the real HUD/keyboard inputs, rather than calling a cast debug function.
 if(touch){const cdp=await page.context().newCDPSession(page);const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  await send('touchStart',[{x:socket.x,y:socket.y,id:1}]);
  await send('touchMove',[{x:socket.x-70,y:socket.y-50,id:1}]);await page.waitForTimeout(150);
  const held=await snap();assert(held.manualDash.aiming,'hold enters aim');assert.deepEqual(held.manualDash.last,null,'hold does not dash');
  await page.screenshot({path:`${out}/${tag}-${view}-aim.png`});
  await send('touchEnd',[]);
 }else{await page.mouse.move(width*.3,height*.55);await page.keyboard.press('2');}
 await page.waitForTimeout(80);let b=await snap();
 assert(b.manualDash.last,`${view} actual dash`);assert(b.manualDash.last.distance>.1);assert(b.vfx.cooldowns?.['rift-dash']>0||b.loadout.slots[1].cooldownMs>0,'cooldown starts');
 assert(b.hero.u<a.hero.u||b.hero.v<a.hero.v,'selected upper-left direction changes position');
 await page.screenshot({path:`${out}/${tag}-${view}-dash.png`});
 const last=JSON.stringify(b.manualDash.last);if(!touch)await page.keyboard.press('2');
 await page.waitForTimeout(70);assert.equal(JSON.stringify((await snap()).manualDash.last),last,'cooldown prevents recast');
 // K remains a Pixi skill-equip entry point for every device; touch tap-without-drag also opens it.
 if(touch){await page.waitForTimeout(1500);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:socket.x,y:socket.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.keyboard.press('k');
 await page.waitForTimeout(1000);assert((await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot())).open,'skill equip accessible');
 await page.keyboard.press('Escape');
 report.views[view]={before:a.hero,after:b.hero,dash:b.manualDash.last,pass:true};await browser.close();browser=null;
}}finally{await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await browser?.close();await vite?.close();}
assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
