import {launch} from '../vfx/browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
// Smoke the unmodified public runtime (no controlled-clock transform).
const width=Number(process.env.WIDTH||390),height=width===390?844:900;
const browser=await launch();const page=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.routeWebSocket('**/*',()=>{});
 await page.goto('https://ark-whachat.fural.space/?offline=1&hero=ember-warden&quality=low&time=.45',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready,null,{timeout:120000,polling:500});
 const before=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;if('testStep' in c)throw Error('Test hook shipped');c.setPreviewMode(true);c.clearFoes();c.teleport(18,22);
  for(let i=0;i<2;i++){c.offer(['flame-fan']);c.choose('flame-fan');}c.summon(20,22,25);const s=c.snapshot();c.castSkill('flame-fan',{targetU:21,targetV:22});return s;});
 assert.equal(before.run.skills['flame-fan'],3);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.flameSheets.some(s=>s.burnSoil&&s.age>=.86),null,{timeout:120000,polling:100});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Debugger.enable');await cdp.send('Debugger.pause');
 const shot=await cdp.send('Page.captureScreenshot',{format:'png'});await fs.writeFile(`docs/burn-soil/fan-shape/live-game-${width}-burn.png`,Buffer.from(shot.data,'base64'));
 await cdp.send('Debugger.resume');await cdp.detach();
 const burning=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());for(const s of burning.vfx.flameSheets.filter(s=>s.burnSoil)){assert.equal(s.burnHalfAngle,Math.PI*.3);assert(Math.abs(s.burnOpacity-(1-s.age))<1e-8);}
 await page.waitForFunction(n=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.burnSoil.totalTicks===n+5,before.vfx.burnSoil.totalTicks,{timeout:120000,polling:100});
 const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());assert.equal(after.vfx.burnSoil.damagePerTick,null);assert.equal(after.vfx.burnSoil.zones.length,0);assert(after.foes[0].hp<before.foes[0].hp);assert.equal(after.foes[0].hp,burning.foes[0].hp);assert.deepEqual(errors,[]);
 const release=await fetch('https://ark-whachat.fural.space/burn-soil/release.json',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
 await fs.writeFile(`docs/burn-soil/fan-shape/live-game-${width}-smoke.json`,JSON.stringify({pass:true,release,viewport:{width,height},scope:'Unmodified live runtime, manually invoked diagnostic cast, normal production frame loop; browser debugger paused only to capture the presented frame without advancing past expiry; no test clock hook',level:3,ticks:after.vfx.burnSoil.totalTicks-before.vfx.burnSoil.totalTicks,damagePerTick:null,initialDamage:before.foes[0].hp-after.foes[0].hp,burning:burning.vfx.flameSheets,errors},null,2));console.log('PASS unmodified live game, level 3, five events, pending damage, normal expiry');
}finally{await browser.close();}
