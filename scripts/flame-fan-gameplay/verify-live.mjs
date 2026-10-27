import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {launch} from './browser.mjs';
const remote=process.env.VERIFY_URL,tag=remote?'live':'runtime-local',out='docs/flame-fan-gameplay/burst-v1';
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5396,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=remote||'http://127.0.0.1:5396';let browser;
const results=[],errors=[];
const bounded=(p,label)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error(label+' exceeded 15s')),15000))]);
try{
 for(const width of (process.env.WIDTH?[+process.env.WIDTH]:[1440,390])){
  browser=await launch();const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});await page.routeWebSocket('**/*',()=>{});
  await page.goto(base+'/?offline=1&hero=ember-warden&quality=low&time=.45',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.getElementById('loading-screen'),null,{timeout:180000});
  const at=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;if('testStep'in c)throw Error('Test clock shipped');c.setPreviewMode(true);c.clearFoes();
   for(let u=26;u<60;u+=2)for(let v=26;v<60;v+=2){let valid=true;for(const a of[0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4])for(const[x,y]of[[0,0],[2,-.8],[2,0],[2,.8],[-4,0],[9,0]])if(!c.clear(u+x*Math.cos(a)-y*Math.sin(a),v+x*Math.sin(a)+y*Math.cos(a)))valid=false;if(valid&&c.teleport(u,v))return{u,v};}throw Error('No open fixture origin');});
  if(process.env.INPUT_ONLY)await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let i=0;i<4;i++){c.offer(['flame-fan']);c.choose('flame-fan');}});
  const chooseThroughUi=async id=>{
   const previous=await page.evaluate(id=>window.__STRONGHOLD_COMBAT__.snapshot().run.skills[id]??0,id);
   await page.evaluate(id=>window.__STRONGHOLD_COMBAT__.offer([id]),id);
   if(width===390){
    await page.waitForFunction(id=>window.__STRONGHOLD_COMBAT__.snapshot().blessingUi.skillPopovers.some(p=>p.id===id),id,{timeout:30000});
    await page.waitForTimeout(350);
    const p=await page.evaluate(id=>window.__STRONGHOLD_COMBAT__.snapshot().blessingUi.skillPopovers.find(p=>p.id===id),id);
    await page.touchscreen.tap(p.rect.xMin+p.rect.width/2,p.rect.yMin+p.rect.height/2);
   }else await page.keyboard.press('Digit1');
   await page.waitForFunction(({id,previous})=>(window.__STRONGHOLD_COMBAT__.snapshot().run.skills[id]??0)>previous,{id,previous},{timeout:30000});
  };
  for(let rank=1;rank<=5&&!process.env.INPUT_ONLY;rank++){
   if(rank>1)await chooseThroughUi('flame-fan');
   const yaw=[0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4][rank-1];
   const before=await page.evaluate(({rank,yaw,at})=>{const c=window.__STRONGHOLD_COMBAT__;c.clearFoes();c.teleport(at.u,at.v);c.resetCooldowns();for(const [x,y]of [[2,-.8],[2,0],[2,.8],[-4,0],[9,0]])if(c.summon(at.u+x*Math.cos(yaw)-y*Math.sin(yaw),at.v+x*Math.sin(yaw)+y*Math.cos(yaw),25)<0)throw Error('Blocked fixture target');const before=c.snapshot();c.setPreviewMode(false);return before;},{rank,yaw,at});
   assert.equal(before.run.skills['flame-fan'],rank);
   await page.waitForFunction(rank=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.flameSheets.some(s=>s.rank===rank&&s.age>=.1&&s.age<.6),rank,{timeout:180000,polling:30});
   const active=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);return c.snapshot();});
   assert((active.run.autoCasts??0)>(before.run.autoCasts??0),'Normal gameplay auto-cast');const burst=active.vfx.flameSheets.find(s=>s.rank===rank);
   assert.equal(burst.material,'approved-projecting-burst-v1');assert.equal(burst.radius,4.4*(1+(rank-1)*.18));assert(Math.abs(Math.atan2(Math.sin(burst.yaw-yaw),Math.cos(burst.yaw-yaw)))<.15);assert(burst.burstOpacity>0);
   if(!process.env.NO_SHOTS&&((width===1440&&(rank===1||rank===3))||(width===390&&rank===5))){
    const cdp=await page.context().newCDPSession(page);await cdp.send('Debugger.enable');await bounded(cdp.send('Debugger.pause'),'Debugger pause');
    try{const {data}=await bounded(cdp.send('Page.captureScreenshot',{format:'png'}),'Frame capture');await fs.writeFile(`${out}/${tag}-game-${width}-lv${rank}-burst.png`,Buffer.from(data,'base64'));}finally{await bounded(cdp.send('Debugger.resume'),'Debugger resume');await cdp.detach();}
   }
   if(!process.env.NO_SHOTS&&width===1440&&rank===3){
    await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.flameSheets.some(s=>s.age>=.6&&s.age<1),null,{timeout:30000,polling:20});
    const cdp=await page.context().newCDPSession(page);await cdp.send('Debugger.enable');await bounded(cdp.send('Debugger.pause'),'Debugger pause');
    try{const {data}=await bounded(cdp.send('Page.captureScreenshot',{format:'png'}),'Frame capture');await fs.writeFile(`${out}/${tag}-game-${width}-lv3-soil.png`,Buffer.from(data,'base64'));}finally{await bounded(cdp.send('Debugger.resume'),'Debugger resume');await cdp.detach();}
   }
   await page.waitForFunction(({rank,ticks})=>{const v=window.__STRONGHOLD_COMBAT__.snapshot().vfx;return !v.flameSheets.length&&!v.burnSoil.zones.length&&v.burnSoil.totalTicks===ticks+(rank>=3?5:0);},{rank,ticks:before.vfx.burnSoil.totalTicks},{timeout:180000,polling:100});
   const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
   for(let i=0;i<3;i++){assert(after.foes[i].hp<before.foes[i].hp);assert.equal(after.foes[i].hp,active.foes[i].hp,'No unapproved tick damage');}
   for(const i of[3,4])assert.equal(after.foes[i].hp,before.foes[i].hp,'Excluded target');
   assert.equal(after.vfx.totals.projectiles,before.vfx.totals.projectiles);assert.equal(after.vfx.burnSoil.damagePerTick,null);
   results.push({width,rank,yaw,burst,damagedTargets:3,excludedTargets:2,burnTicks:after.vfx.burnSoil.totalTicks-before.vfx.burnSoil.totalTicks,damage:before.foes[0].hp-after.foes[0].hp});console.log('PASS real runtime',width,rank);
  }
  // Existing Flame Fan controls inspect/equip; the equipped skill auto-casts.
  await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.clearFoes();c.skillTree.close();});
  const socket=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hudGeometry.sockets[0]);
  if(width===390)await page.touchscreen.tap(socket.x,socket.y);else await page.keyboard.press('Digit1');
  await page.waitForFunction(()=>{const t=window.__STRONGHOLD_COMBAT__.skillTree.snapshot();return t.open&&t.loadState==='idle'&&t.inspection?.selected==='flame-fan';},null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().nodes.find(n=>n.id==='flame-fan').level),5);
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.close());await chooseThroughUi('cinder-step');
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('flame-fan',1));
  await page.waitForFunction(()=>{const t=window.__STRONGHOLD_COMBAT__.skillTree.snapshot();return t.open&&t.loadState==='idle'&&t.inspection?.selected==='flame-fan'&&t.inspection.controls['skill-equip'];},null,{timeout:60000});
  await page.waitForTimeout(350);
  const t=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot()),b=t.inspection.controls['skill-equip'];
  if(width===390)await page.touchscreen.tap(t.panel.x+b.x,t.panel.y+b.y);else await page.mouse.click(t.panel.x+b.x,t.panel.y+b.y,{delay:80});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().run.slots[1]==='flame-fan',null,{timeout:10000}).catch(async e=>{console.log('EQUIP DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({tree:window.__STRONGHOLD_COMBAT__.skillTree.snapshot(),run:window.__STRONGHOLD_COMBAT__.snapshot().run})),null,2));throw e;});
  const equipped=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());assert.equal(equipped.run.slots[1],'flame-fan');assert.equal(equipped.run.slots[0],'cinder-step');assert.equal(equipped.run.skills['flame-fan'],5);
  const fired=await page.evaluate(at=>{const c=window.__STRONGHOLD_COMBAT__;c.skillTree.close();c.clearFoes();c.summon(at.u+1.4,at.v,25);c.setPreviewMode(false);return c.snapshot().run.autoCasts??0;},at);await page.waitForFunction(n=>(window.__STRONGHOLD_COMBAT__.snapshot().run.autoCasts??0)>n,fired,{timeout:60000});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.flameSheets.some(s=>s.rank===5),null,{timeout:60000});
  assert.equal(await page.locator('input,button,select,textarea').count(),0);
  results.push({width,input:width===390?'touch HUD and Equip':'keyboard Digit1 and pointer Equip',rank:5,equippedSlot:2,autoCast:true,pixiOnly:true});
  await fs.writeFile(`${out}/${tag}-${width}.json`,JSON.stringify({passed:true,base,results:results.filter(r=>r.width===width),errors},null,2));
  await browser.close();browser=null;
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/${tag}-${process.env.WIDTH||'all'}.json`,JSON.stringify({passed:true,base,inputOnly:!!process.env.INPUT_ONLY,method:'Unmodified runtime, normal production frame loop; existing diagnostics seed eligible offers/targets; keyboard and touch select upgrades, then normal gameplay auto-casts every rank without a manual cast call; debugger pauses only for representative frame capture. Real keyboard/touch inspection, pointer equip and actual auto-cast path.',results,errors},null,2));
}catch(e){console.error(e);console.error('Runtime errors:',JSON.stringify(errors));throw e;}finally{await browser?.close();await vite?.close();}
