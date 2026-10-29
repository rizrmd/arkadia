import {chromium} from 'playwright';
import {build} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {createReadStream} from 'node:fs';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,dist='/tmp/skill-unlocks-bundle',port=5794,tag=remote?'live':'local',out='docs/skill-unlocks';
await fs.mkdir(out,{recursive:true});let server,browser;
const report={base:remote||`http://127.0.0.1:${port}`,cases:[],errors:[],method:'Actual roll via offer() level diagnostic, Pixi blessing selection, browser reload, tree equip and real combat cast. No injected skill records.'};
if(!remote){
 if(!process.env.SKIP_BUILD)await build({logLevel:'error',build:{copyPublicDir:false,outDir:dist,emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';let file=path.join(dist,rel);try{await fs.access(file);}catch{file=path.resolve('public',rel);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>{res.statusCode=404;res.end();});s.pipe(res);});await new Promise(r=>server.listen(port,'127.0.0.1',r));
}
try{
 for(const mobile of [false,true])for(const hero of ['ember-warden','rift-runner']){
  const name=`${mobile?'mobile':'desktop'}-${hero}`;
  if(process.env.ONLY&&!name.includes(process.env.ONLY))continue;
  browser=await chromium.launch(launchOptions(['--mute-audio']));
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  const url=`${report.base}/?hero=${hero}&quality=low&time=.45`;
  const ready=async()=>{
   await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:240000,polling:500});
   await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();});
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.preload());
  };
  const snapshot=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
  const tap=async(x,y)=>mobile?await page.touchscreen.tap(x,y):await page.mouse.click(x,y);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await ready();console.log(name,'ready');
  const initial=await snapshot();assert.equal(initial.run.level,1);assert.equal(initial.run.slots.length,1);
  // Pin a preexisting economy fixture after normal welcome-home settlement. No skill field is added to it.
  const economy=await page.evaluate(()=>{const k='arkodia-stronghold-v1',s=JSON.parse(localStorage.getItem(k));Object.assign(s,{gold:351,mana:22,souls:7,skill:2,training:1,weapon:2,affix:1,completedExpeditions:['frostpass-01']});localStorage.setItem(k,JSON.stringify(s));return s;});
  const currency=async()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('arkodia-stronghold-v1'));return [s.gold,s.mana,s.souls,s.skill,s.training,s.weapon,s.affix,s.completedExpeditions,s.inventory];});
  const funds=await currency();let learned;
  // The real builder always offers an unlearned tier-I active on the first level.
  let run=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.offer());
  const pool=hero==='ember-warden'?['cinder-step','ember-snare']:['rift-dash','rift-trap'];
  learned=run.offers.find(id=>pool.includes(id));assert(learned);
  // Exercise failed storage: choice and currencies must remain intact, then retry the very same card.
  await page.evaluate(()=>{window.__savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('arkodia.skills.'))throw new DOMException('Quota exceeded','QuotaExceededError');return window.__savedSetItem.call(this,k,v);};});
  await page.keyboard.press(String(run.offers.indexOf(learned)+1));
  assert.equal((await snapshot()).run.skills[learned],undefined);assert.equal((await snapshot()).run.pending,1);assert.deepEqual(await currency(),funds);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__savedSetItem;});
  // Use the actual Pixi card's numeric action for desktop and touch its card on mobile.
  if(mobile){
   const ui=(await snapshot()).blessingUi,card=ui.skillPopovers.find(x=>x.id===learned);assert(card);
   const rect=card.rect;await tap((rect.xMin+rect.xMax)/2,(rect.yMin+rect.yMax)/2);
  }else await page.keyboard.press(String(run.offers.indexOf(learned)+1));
  await page.waitForFunction(id=>window.__STRONGHOLD_COMBAT__.snapshot().run.skills[id]===1,learned,{timeout:10000});
  const unlocked=await snapshot();assert.equal(unlocked.run.pending,0);assert.deepEqual(await currency(),funds);
  // Add a run-only rank and passive through real offers, then verify they reset.
  for(let i=0;i<3;i++){
   run=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.offer());
   await page.keyboard.press(String(run.offers.indexOf(run.offers.find(id=>id===initial.run.slots[0])||run.offers[0])+1));
  }
  const saved=await page.evaluate(hero=>localStorage.getItem(`arkodia.skills.${hero}.v1`),hero);assert(saved);
  const savedRecord=JSON.parse(saved);
  const r={name,viewport:mobile?[390,844]:[1440,900],learned,saved:savedRecord,reloads:[],checks:['fresh legacy save','failed storage rolls back choice','actual Pixi blessing unlock','no currency deducted']};
  for(let reload=1;reload<=2;reload++){
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await ready();
   const s=await snapshot();assert.deepEqual(s.run.slots,savedRecord.slots);assert.deepEqual(Object.keys(s.run.skills).sort(),[...savedRecord.learned].sort());assert(Object.values(s.run.skills).every(n=>n===1));assert.equal(s.run.level,1);assert.equal(s.run.xp,0);assert.equal(s.run.gold,0);assert.equal(s.run.pending,0);assert.equal(s.run.stars,0);assert.deepEqual(s.run.offers,[]);assert.deepEqual(await currency(),funds);
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.open(1));await page.waitForTimeout(600);
   const tree=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
   const node=tree.nodes.find(n=>n.name.toLowerCase().replaceAll(' ','-')===learned||n.id===learned);assert(node?.learned);assert(!node.locked);
   await tap(tree.close.x,tree.close.y);r.reloads.push({reload,level:s.run.level,skills:s.run.skills,slots:s.run.slots,currencyUnchanged:true});console.log(name,'reload',reload,'passed');
  }
  // Retained skill must genuinely fire in combat, without another blessing or purchase.
  const at=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=18;u<42;u+=2)for(let v=18;v<42;v+=2){const i=c.summon(u+1,v,40);if(i>=0&&c.teleport(u,v))return {u,v};c.clearFoes();}throw Error('No test position');});
  const cast=await page.evaluate(({learned,at})=>{const c=window.__STRONGHOLD_COMBAT__;c.resetCooldowns();return c.castSkill(learned,{targetU:at.u+1,targetV:at.v});},{learned,at});assert(cast,'Restored skill can cast');r.checks.push('two reloads retain learned active and slots','level, XP, passives, stars, ranks and run gold reset','learned tree node unlocked','retained skill casts without repurchase','legacy economy/inventory unchanged');
  // Hero-specific saves must not leak into the other hero.
  const other=hero==='ember-warden'?'rift-runner':'ember-warden';
  await page.goto(url.replace(hero,other),{waitUntil:'domcontentloaded',timeout:120000});await ready();const otherState=await snapshot();assert.equal(Object.keys(otherState.run.skills).length,1);assert.equal(otherState.run.slots.length,1);assert.deepEqual(await currency(),funds);r.checks.push('other hero remains fresh');
  report.cases.push(r);await context.close();await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);throw e;}
finally{await fs.writeFile(`${out}/browser-${tag}.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server?server.close(r):r());console.log('Report',`${out}/browser-${tag}.json`);}
