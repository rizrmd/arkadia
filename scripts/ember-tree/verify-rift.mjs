// Smoke the unchanged Rift tap-to-equip workflow against the deployed shared panel.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {launchOptions} from '../typography/browser.mjs';
const base=process.env.VERIFY_URL||'https://ark-whachat.fural.space',report={base,errors:[],views:{}};
for(const mobile of [false,true]){
 const b=await chromium.launch(launchOptions());
 try{
  const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(`${base}/?offline=1&hero=rift-runner&quality=low&time=.45`,{waitUntil:'domcontentloaded',timeout:120000});
  await p.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:180000});
  await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.preload());
  await p.keyboard.press('k');await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open);
  let s=await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());assert.equal(s.highlighted,'rift-bolt');assert.equal(s.nodes.length,15);assert.equal(s.nodes.filter(n=>n.learned).length,1);
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.offer(['rift-dash','might','heal']);c.choose('rift-dash');c.resetCooldowns();});
  const socket=await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets[1]);
  if(mobile)await p.touchscreen.tap(socket.x,socket.y);else await p.mouse.click(socket.x,socket.y);
  await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open);
  s=await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());assert.equal(s.highlighted,'rift-dash');assert.equal(s.slot,1);assert(s.nodes.find(n=>n.id==='rift-dash').inView);
  assert((await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.slots.map(x=>x.cooldownMs))).every(ms=>ms===0));
  await p.keyboard.press('k');assert(!(await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot())).open);
  report.views[mobile?'mobile':'desktop']={pass:true,checks:['Rift roster and fresh root preserved','K/Esc toggle','HUD tap opens slot tree without casting','Rift Dash focused and visible']};
 }finally{await b.close();}
}
assert.deepEqual(report.errors,[]);await fs.writeFile('docs/ember-tree/rift-live-regression.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
