import {chromium} from 'playwright';
import {build} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {createReadStream} from 'node:fs';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,dist='/tmp/gameplay-progress-bundle',port=5796,out='docs/gameplay-progress';
await fs.mkdir(out,{recursive:true});let server,context;
const report={base:remote||`http://127.0.0.1:${port}`,cases:[],errors:[],method:'Persistent Chromium userDataDir; actual complete browser termination/relaunch, two reloads, snapshots captured before simulation starts behind loading; real blessing choices, enemies, kills, consumable effects, independent heroes and paused timers.'};
if(!remote){
 if(!process.env.SKIP_BUILD)await build({logLevel:'error',build:{copyPublicDir:false,outDir:dist,emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';let file=path.join(dist,rel);try{await fs.access(file);}catch{file=path.resolve('public',rel);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>{res.statusCode=404;res.end();});s.pipe(res);});await new Promise(r=>server.listen(port,'127.0.0.1',r));
}
const record=page=>page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.flush();return JSON.parse(localStorage.getItem('arkodia-stronghold-v1'));});
const ready=page=>page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:240000,polling:200});
const snap=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
async function launch(profile,mobile){return chromium.launchPersistentContext(profile,{...launchOptions(['--mute-audio']),viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});}
function observe(page,name){page.setDefaultTimeout(15000);page.on('pageerror',e=>{console.error(name,e.message);report.errors.push(name+': '+e.message);});page.on('crash',()=>console.error(name,'PAGE CRASH'));}
try{
 for(const mobile of [false,true])for(const hero of ['rift-runner','ember-warden']){
  const name=`${mobile?'mobile':'desktop'}-${hero}`;if(process.env.ONLY&&!name.includes(process.env.ONLY))continue;
  const profile=await fs.mkdtemp('/home/dev/gameplay-browser-');
  context=await launch(profile,mobile);let page=context.pages()[0];observe(page,name);
  const url=`${report.base}/?hero=${hero}&quality=low`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await ready(page);
  assert.equal((await snap(page)).persistence.error,'');console.log(name,'ready');
  // Actual progression API: pending cards use the same choose path as the Pixi
  // overlay; no saved gameplay data is injected into localStorage.
  const root=hero==='rift-runner'?'rift-bolt':'flame-fan',second=hero==='rift-runner'?'rift-dash':'cinder-step';
  console.log(name,'progression start');
  await page.evaluate(({root,second})=>{const c=window.__STRONGHOLD_COMBAT__;c.clearFoes();c.setPreviewMode(true);for(const id of [root,root,second,'might','vitality']){c.offer([id]);c.choose(id);}c.hud.setGateHp(43,160);}, {root,second});
  console.log(name,'progression applied');
  let state=await snap(page);assert.equal(state.run.skills[root],3);assert.equal(state.run.skills[second],1);assert.equal(state.run.skills.might,1);assert.equal(state.run.skills.vitality,1);
  // Find walkable wild tiles with real collision validation, away from hero.
  console.log(name,'find wild tile');
  const at=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=-55;u<=55;u+=2)for(let v=-55;v<=55;v+=2){const i=c.summon(u,v,3);if(i>=0)return {u,v,i};}throw Error('No wild tile');});
  console.log(name,'wild tile',at);
  await page.evaluate(({u,v,i})=>{const c=window.__STRONGHOLD_COMBAT__;for(let n=0;n<40&&c.snapshot().foes[i].hp>0;n++)c.hitFoe(i,true);c.summon(u+1,v,4);c.spawnProjectile({u,v,range:20,speed:.1});c.spawnAoE({u,v,duration:20000});c.offer(['might']);c.flush();},at);
  console.log(name,'kill/effect pending applied');
  await page.waitForTimeout(650);
  let saved=await record(page),p=saved.gameplay[hero].state;assert.equal((await snap(page)).persistence.error,'');assert(p.run.level>=6);assert(p.run.gold>=5);assert(p.souls.length);assert(p.foes.some(f=>f.state==='die'));assert.equal(p.run.pending,1);
  const row={name,initial:{level:p.run.level,xp:p.run.xp,gold:p.run.gold,hp:p.hero.hp,maxHp:p.maxHp,elapsedMs:p.elapsedMs,skills:p.run.skills,gate:p.world.gateHealth,souls:p.souls.length},checks:[],reloads:[]};
  // Stop simulation through the existing Settings action. Button is Pixi.
  async function pause(){const point=await page.evaluate(()=>{const find=c=>c.label==='Open Settings'?c:(c.children||[]).map(find).find(Boolean);const b=find(window.__PIXI_UI__.app.stage).getBounds();return {x:b.x+b.width/2,y:b.y+b.height/2};});if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();}
  console.log(name,'pause settings');
  await pause();console.log(name,'paused');saved=await record(page);p=saved.gameplay[hero].state;
  await page.waitForTimeout(1200);const held=await record(page);assert.deepEqual(held.gameplay[hero].state,p);row.checks.push('paused Settings preserves all simulation state');
  for(let i=0;i<2;i++){
   const before=await record(page);const expected=before.gameplay[hero].state;
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});
   // bindPersistence performs the first atomic checkpoint while loading still
   // holds hero/combat loops. It must restore exact durations with zero offline time.
   await page.waitForFunction(({hero,revision})=>window.__STRONGHOLD_COMBAT__&&JSON.parse(localStorage.getItem('arkodia-stronghold-v1'))?.gameplay?.[hero]?.revision>revision,{hero,revision:before.gameplay[hero].revision},{timeout:240000,polling:100});
   const restored=await page.evaluate(hero=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).gameplay[hero].state,hero);
   assert.deepEqual(restored,expected,'exact checkpoint restoration behind loading');
   row.reloads.push({exact:true,elapsedMs:restored.elapsedMs,remainingCooldowns:restored.effects.cooldowns});
   await ready(page);assert.equal((await snap(page)).persistence.error,'');await pause();
  }
  saved=await record(page);p=saved.gameplay[hero].state;
  // A real browser shutdown, not storageState export or a new incognito context.
  await context.close();context=null;await new Promise(r=>setTimeout(r,1600));
  context=await launch(profile,mobile);page=context.pages()[0];observe(page,name+' reopen');
  // Capture disk state before navigation; pagehide may have added an identical
  // newer revision, but the simulation itself was paused when the browser closed.
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.flush(),null,{timeout:240000,polling:100});
  const reopened=(await record(page)).gameplay[hero].state;assert.deepEqual(reopened,p,'closed browser must resume without offline simulation');
  row.checks.push('two exact refreshes','full browser close/relaunch with persistent profile','offline gameplay/effect/cooldown durations unchanged','gold and dead-enemy reward markers unchanged','uncollected souls retained','ranks/passives/pending cards/gate restored');
  await ready(page);await pause();
  // One item use and effect share a single economy/snapshot write, including rollback.
  await page.keyboard.press('Escape');await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();});
  // Independent hero state is exercised by visiting the other hero and returning.
  const other=hero==='rift-runner'?'ember-warden':'rift-runner';saved=await record(page);const originalRun=saved.gameplay[hero].state.run;
  await page.goto(`${report.base}/?hero=${other}&quality=low`,{waitUntil:'domcontentloaded',timeout:120000});await ready(page);assert.equal((await snap(page)).run.level,1);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await ready(page);assert.deepEqual((await snap(page)).run,originalRun);row.checks.push('separate hero saves');
  assert.equal((await snap(page)).persistence.error,'');
  report.cases.push(row);await context.close();context=null;await fs.rm(profile,{recursive:true,force:true});console.log(name,'PASS');
 }
 assert.equal(report.errors.length,0,report.errors.join('\n'));
}catch(e){console.error('BROWSER TEST FAILURE',e);throw e;}finally{if(context)await Promise.race([context.close(),new Promise(r=>setTimeout(r,10000))]);server?.closeAllConnections();await new Promise(r=>server?server.close(r):r());await fs.writeFile(`${out}/browser-${remote?'live':'local'}.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
