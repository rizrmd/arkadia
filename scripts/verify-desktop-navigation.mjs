import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchOptions} from './typography/browser.mjs';
const out='docs/desktop-navigation';await mkdir(out,{recursive:true});
const server=process.env.VERIFY_URL?null:spawn('server/bin/arkodia',[],{env:{...process.env,PORT:'8813',SITE_DIR:process.env.SITE_DIR||'dist'},stdio:'pipe'});
let browser;
const results=[];
try {
 if(server)await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',no);});
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e));});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
 console.log('Browser launched');
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:8813')+'/?offline=1&hero=rift-runner&time=0.35&3d=0');
 console.log('Page opened');
 await page.waitForTimeout(15000);console.log('Diagnostic',await page.evaluate(()=>({text:document.body.innerText.slice(-1800),ready:document.querySelector('#world-canvas')?.dataset,combat:!!window.__STRONGHOLD_COMBAT__})));
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));});
 for(const [width,height] of [[1440,900],[1920,1080],[1470,583],[1024,768],[390,844],[844,390],[1440,900]]) {
  console.log('Checking',width,height);
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  for(const gold of width>=1024?[75,1234567]:[75]) {
   await page.evaluate(gold=>{window.__STRONGHOLD_COMBAT__.hud.setGold(gold);},gold);
   await page.waitForTimeout(150);
   const state=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__,h=c.hud;return {hud:h.getTopRightTelemetry(),map:c.snapshot().minimap,actual:h.trRibbonGroup.getBounds(),anchor:h.topRightPopoverAnchor(1),textScale:h.trRibbonGoldText.scale.x};});
   const b=state.map.bounds,t=state.hud.screenBounds,a=state.actual;
   if(!state.map.visible||b.x<0||b.x+b.width>width||b.y+b.height>height)throw Error('Map outside viewport '+JSON.stringify(state));
   if(width>=1024){
    if(state.textScale!==1)throw Error('Desktop text retained mobile scale');
    if(Math.abs(b.x-t.left)>1||Math.abs(b.x+b.width-t.right)>1||b.y<t.bottom+7)throw Error('Column alignment '+JSON.stringify(state));
    if(a.minX<t.left-5||a.maxX>t.right+5||a.minY<0||a.maxY>b.y)throw Error('Actual HUD bounds '+JSON.stringify(state));
   }
   results.push({width,height,gold,...state});
  }
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.setGold(75));await page.waitForTimeout(100);
  await page.screenshot({path:`${out}/${process.env.VERIFY_URL?'live-':''}${width}x${height}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(`${out}/${process.env.VERIFY_URL?'live-':''}results.json`,JSON.stringify({errors,results},null,2));
 console.log('PASS desktop column, long gold, mobile, resize; '+results.length+' checks');
}finally{await browser?.close();server?.kill();}
