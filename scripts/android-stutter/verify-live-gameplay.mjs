// Production smoke: exercise combat outside the safe zone and verify native Flame Fan.
// Software GPU timings are diagnostic only; this is not an Android smoothness benchmark.
import {launch} from '../vfx/browser.mjs';
import fs from 'node:fs/promises';
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Keep synthetic samples out of the production device trace ring.
 await page.route('**/api/tracelogs',r=>r.request().method()==='POST'?r.fulfill({status:201,body:'{}'}):r.continue());
 await page.routeWebSocket('**/*',()=>{});
 await page.goto(`${process.env.GAME||'https://ark-whachat.fural.space'}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 const result=await page.evaluate(async()=>{
  const combat=window.__STRONGHOLD_COMBAT__;let spot=null;
  for(let u=18;u<34&&!spot;u+=.5)for(let v=18;v<34&&!spot;v+=.5)
   if(combat.clear(u,v)&&combat.teleport(u,v)&&!combat.snapshot().hero.safe)spot={u,v};
  if(!spot)throw Error('No combat spot');
  combat.clearFoes();combat.spawnAoE({kind:'flame-cone',skill:'flame-fan',duration:0});
  for(let i=0;i<90;i++){
   await new Promise(requestAnimationFrame);const snapshot=combat.snapshot();
   if(snapshot.vfx.flameSheets.length)return {spot,hero:snapshot.hero,vfx:snapshot.vfx};
  }
  throw Error('Active Flame Fan sheet not observed');
 });
 if(!result.vfx.flameSheets.every(sheet=>sheet.backend==='pixi-render-texture'))throw Error('Native backend missing');
 if(errors.length)throw Error(errors.join('\n'));
 const report={checkedAt:new Date().toISOString(),errors,result};
 await fs.writeFile(process.env.OUT||'docs/android-stutter/gpu-live-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS: live combat outside safe zone, native Flame Fan backend, no page errors');
}finally{await browser.close();}
