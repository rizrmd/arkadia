import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { launchOptions } from './typography/browser.mjs';
const server=process.env.VERIFY_URL ? null : spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8796'],{stdio:'pipe'});
let browser;
console.log('Starting preview');
server?.stderr.on('data',d=>process.stderr.write(d));
try {
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('8796'))resolve();});server.on('exit',reject);});
 console.log('Preview ready; launching browser');
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:Number(process.env.VERIFY_DPR||1)});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 console.log('Opening game');
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:8796')+'/?offline=1&time=0.35');
 console.log('Waiting for world ready');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:180000});
 console.log('World ready');
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));window.__COOP__?.net?.leave();});
 const results=[];
 for(const [name,width,height,hp,gate,xp,hero] of [
  ['desktop',1440,900,100,100,10,'Rift Runner'],
  ['mobile',390,844,37,64,0,'Ember Warden'],
  ['landscape',844,390,0,0,20,'Rift Runner'],
  ['resize',1440,900,125,80,25,'Ember Warden'],
 ]){
  console.log('Checking',name);
  await page.setViewportSize({width,height});
  await page.waitForTimeout(200);
  await page.evaluate(()=>window.__PIXI_UI__?.app?.ticker?.stop());
  const state=await page.evaluate(({hp,gate,xp,hero})=>{
   const hud=window.__STRONGHOLD_COMBAT__.hud;
   hud.setHero(hero);hud.setLevel(12);hud.setHp(hp,100);hud.setGateHp(gate,100);hud.setXp(xp,20);
   const console=hud.playerConsole;
   window.__PIXI_UI__.app.render();
   const bounds=console.getBounds();
   return {values:console.rows.map(r=>r.value.text),hero:console.nameText.text,portrait:console.portrait,portraitVisible:console.art.children[0].visible,ratios:console.rows.map(r=>r.ratio),bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},legacyXpVisible:hud.tlXpGroup.visible};
  },{hp,gate,xp,hero});
  if(state.legacyXpVisible||state.values.join('|')!==`${hp} / 100|${gate} / 100|${xp} / 20`)throw Error(JSON.stringify(state));
  if(state.bounds.x<0||state.bounds.x+state.bounds.width>width)throw Error('Console outside viewport');
  await page.screenshot({path:`docs/player-console/${process.env.VERIFY_URL?'live-':''}${name}.png`});
  if(name==='desktop'){
   const data=await page.evaluate(async()=>{const app=window.__PIXI_UI__.app,hud=window.__STRONGHOLD_COMBAT__.hud;hud.setHero('Rift Runner');hud.setLevel(1);hud.setHp(100,100);hud.setGateHp(100,100);hud.setXp(10,20);return await app.renderer.extract.base64({target:hud.playerConsole,resolution:3});});
   await writeFile(`docs/player-console/${process.env.VERIFY_URL?'live-':''}console-detail.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  results.push({name,...state});
 }
 await writeFile(`docs/player-console/${process.env.VERIFY_URL?'live-':''}verification.json`,JSON.stringify({results,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify(results));
} finally {await browser?.close();server?.kill();}
