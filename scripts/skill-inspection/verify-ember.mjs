import {createServer} from 'vite';import {launch} from '../vfx/browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL,tag=remote?'live':'local',base=remote||'http://127.0.0.1:5294',out='docs/skill-inspection';
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5294,hmr:false,watch:null},logLevel:'error'});await vite?.listen();let browser;
try{
 browser=await launch();const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.routeWebSocket('**/*',()=>{});await page.clock.install();
 await page.goto(base+'/?offline=1&hero=ember-warden&time=.45&quality=low');await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.skillTree&&!document.getElementById('loading-screen'),null,{timeout:180000});await page.clock.pauseAt(Date.now()+500);
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();});
 const snap=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
 const show=id=>page.evaluate(id=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show(id,0),id);
 const click=async id=>{const t=await snap(),b=t.inspection.controls[id];assert(b);await page.touchscreen.tap(t.panel.x+b.x,t.panel.y+b.y);await page.clock.runFor(80);};
 await show('molten-cleave');await page.clock.runFor(200);let t=await snap();assert(t.nodes.find(n=>n.id==='molten-cleave').locked);await click('skill-details');assert((await snap()).inspection.details);await click('details-equip');assert.equal((await snap()).nodes.find(n=>n.id==='flame-fan').slot,1);await click('details-close');
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.skillTree.close();c.offer(['cinder-step','might','heal']);c.choose('cinder-step');});await show('cinder-step');await page.clock.runFor(200);t=await snap();assert.equal(t.inspection.selected,'cinder-step');assert.equal(t.nodes.find(n=>n.id==='cinder-step').slot,2);await click('skill-details');
 t=await snap();assert(t.inspection.data.rows.some(r=>r.label==='Cooldown'&&r.current==='1.4 s'&&r.next==='1.29 s'));
 const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/${tag}-ember-portrait-details.png`,Buffer.from(data,'base64'));
 await click('details-equip');t=await snap();assert.equal(t.nodes.find(n=>n.id==='cinder-step').slot,1);assert.equal(t.nodes.find(n=>n.id==='flame-fan').slot,2);
 await click('back-to-tree');await show('inferno-avatar');await page.clock.runFor(100);assert.equal((await snap()).inspection.data.rows.length,0);await click('skill-details');await click('details-equip');assert.equal((await snap()).nodes.find(n=>n.id==='cinder-step').slot,1);
 await click('back-to-tree');await show('second-wind');await page.clock.runFor(100);await click('skill-equip');assert.equal((await snap()).nodes.find(n=>n.id==='cinder-step').slot,1);await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.skillTree.close();for(let i=0;i<4;i++){c.offer(['cinder-step','might','heal']);c.choose('cinder-step');}});await show('cinder-step');await page.clock.runFor(100);assert((await snap()).inspection.data.maxRank);assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/${tag}-ember-verification.json`,JSON.stringify({base,pass:true,checks:['locked inspect and disabled equip','actual Cinder Step rank comparison','explicit modal equip swaps slots','concept node with no invented data','passive cannot equip','Ember active cap displayed at rank 5'],errors},null,2));console.log('Ember portrait checks passed');
}finally{await browser?.close();await vite?.close();}
