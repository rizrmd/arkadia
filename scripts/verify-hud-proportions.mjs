import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { launchOptions } from './typography/browser.mjs';
const server = spawn(existsSync('server/bin/arkodia') ? 'server/bin/arkodia' : 'server/bin/arkodia', [], {env:{...process.env,PORT:'8807',SITE_DIR:'dist'},stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:8807')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 const results=[];
 for(const [width,height] of [[1440,900],[390,844],[844,390],[1672,941]]){
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:8807/?offline=1&time=0.35',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__ && document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});
  for(const gold of [0,9999,9999999]){
   const result=await page.evaluate(gold=>{
    if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));
    const hud=window.__STRONGHOLD_COMBAT__.hud; hud.setGold(gold);hud.setTime('18:44');
    return hud.getTopRightTelemetry();
   },gold);
   const {goldPlaque:g,clockPlaque:c}=result.designBounds;
   if(c.medX-c.medR-g.rightX<10)throw Error('Insufficient gap');
   if(result.screenBounds.left<0 || result.screenBounds.right>width)throw Error('HUD outside viewport');
   if(gold===0 && (g.rightX-g.medX>=154 || c.rightX-c.medX>=128))throw Error('Plaques are still too long');
   results.push({width,height,gold,...result});
   if(gold===0){await page.waitForTimeout(200);await page.screenshot({path:`docs/hud-proportions/${width}x${height}.png`});}
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile('docs/hud-proportions/verification.json',JSON.stringify({errors,results},null,2));
 console.log('PASS: four viewports, three gold balances, compact spans, plaque gaps and viewport bounds.');
}finally{await browser?.close();server.kill();}
