import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { launchOptions } from './typography/browser.mjs';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8796'],{stdio:'pipe'});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('8796'))resolve();});server.on('exit',reject);});
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8796/?offline=1&time=0.35');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));window.__COOP__?.net?.leave();});
 const results=[];
 for(const [name,width,height,hp,gate,xp,hero] of [
  ['desktop',1440,900,100,100,10,'Rift Runner'],
  ['mobile',390,844,37,64,0,'Ember Warden'],
  ['landscape',844,390,0,0,20,'Rift Runner'],
  ['resize',1440,900,125,80,25,'Ember Warden'],
 ]){
  await page.setViewportSize({width,height});
  await page.waitForTimeout(200);
  await page.evaluate(()=>window.__PIXI_UI__?.app?.ticker?.stop());
  const state=await page.evaluate(({hp,gate,xp,hero})=>{
   const hud=window.__STRONGHOLD_COMBAT__.hud;
   hud.setHero(hero);hud.setLevel(12);hud.setHp(hp,100);hud.setGateHp(gate,100);hud.setXp(xp,20);
   const console=hud.playerConsole;
   window.__PIXI_UI__.app.render();
   const bounds=console.getBounds();
   return {values:console.rows.map(r=>r.value.text),name:console.nameText.text,bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},legacyXpVisible:hud.tlXpGroup.visible};
  },{hp,gate,xp,hero});
  if(state.legacyXpVisible||state.values.join('|')!==`${hp} / 100|${gate} / 100|${xp} / 20`)throw Error(JSON.stringify(state));
  if(state.bounds.x<0||state.bounds.x+state.bounds.width>width)throw Error('Console outside viewport');
  await page.screenshot({path:`docs/player-console/${name}.png`});
  results.push({name,...state});
 }
 await writeFile('docs/player-console/verification.json',JSON.stringify({results,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify(results));
} finally {await browser?.close();server.kill();}
