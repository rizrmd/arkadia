import {createServer} from 'vite';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {launch} from '../vfx/browser.mjs';
const remote=process.env.VERIFY_URL,out='docs/skill-inspection',tag=remote?'live':'local';
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5293,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const report={base:remote||'http://127.0.0.1:5293',views:[],errors:[]};let browser;
try{

 for(const [name,width,height,touch] of [['desktop',1440,900,false],['portrait',390,844,true],['landscape',844,390,true]].filter(v=>!process.env.WIDTH||v[1]===Number(process.env.WIDTH))){
  browser=await launch();
  console.log('Checking',name);const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});page.on('pageerror',e=>report.errors.push(e.message));
  await page.routeWebSocket('**/*',()=>{});await page.clock.install();
  await page.goto(report.base+'/?offline=1&hero=rift-runner&time=.45&quality=low');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_COMBAT__?.skillTree&&!document.getElementById('loading-screen'),null,{timeout:300000});
  await page.clock.pauseAt(Date.now()+500);await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();});
  const capture=async name=>{const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/${tag}-${name}.png`,Buffer.from(data,'base64'));};
  const tree=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
  const click=async(x,y)=>{await page.clock.runFor(50);if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y,{delay:50});await page.clock.runFor(50);};
  const control=async id=>{const t=await tree(),b=t.inspection.controls[id];assert(b,id);await click(t.panel.x+b.x,t.panel.y+b.y);await page.clock.runFor(100);console.log('Clicked',id);};
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('astral-cleave',0));await page.clock.runFor(700);
  let t=await tree();
  const before=t.nodes.map(n=>n.slot);let locked=t.nodes.find(n=>n.id==='astral-cleave');assert(locked.locked);await click(locked.screen.x,locked.screen.y);await page.clock.runFor(200);t=await tree();assert.equal(t.inspection.selected,'astral-cleave');assert.deepEqual(t.nodes.map(n=>n.slot),before);
  await control('skill-details');t=await tree();assert(t.inspection.details);await capture(`${name}-locked`);await control('details-close');assert(!(await tree()).inspection.details);
  await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.skillTree.close();c.offer(['rift-dash','might','heal']);c.choose('rift-dash');c.clearFoes();});
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('rift-dash',0));await page.clock.runFor(500);t=await tree();assert.equal(t.nodes.find(n=>n.id==='rift-dash').slot,2);
  await click(t.nodes.find(n=>n.id==='rift-dash').screen.x,t.nodes.find(n=>n.id==='rift-dash').screen.y);await page.clock.runFor(100);t=await tree();assert.equal(t.nodes.find(n=>n.id==='rift-dash').slot,2);assert.equal(t.nodes.find(n=>n.id==='rift-bolt').slot,1);
  await capture(`${name}-inspection`);await control('skill-details');t=await tree();assert(t.inspection.details);assert(t.inspection.data.rows.some(r=>r.label==='Max distance'&&r.next==='1.5 tiles'));await capture(`${name}-details`);
  await control('back-to-tree');assert(!(await tree()).inspection.details);await control('skill-equip');t=await tree();assert.equal(t.nodes.find(n=>n.id==='rift-dash').slot,1);assert.equal(t.nodes.find(n=>n.id==='rift-bolt').slot,2);
  await control('skill-details');await page.keyboard.press('Escape');assert(!(await tree()).inspection.details);assert((await tree()).open);await page.keyboard.press('Escape');assert(!(await tree()).open);
  report.views.push({name,pass:true,inspection:t.inspection,panel:t.panel});await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);
}finally{await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await browser?.close();await vite?.close();}
console.log(JSON.stringify(report));
