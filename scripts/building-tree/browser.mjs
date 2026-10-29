import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:19761';
const server=process.env.BASE_URL?null:spawn('server/bin/arkodia',[],{env:{...process.env,PORT:'19761',SITE_DIR:process.env.SITE_DIR||'dist'},stdio:['ignore','pipe','pipe']});
let browser;const errors=[],results=[];
try{
 if(server)await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function click(page,label){const bounds=await page.evaluate(label=>{function find(c){if(c.label===label)return c;for(const ch of c.children??[]){const v=find(ch);if(v)return v;}}const c=find(window.__PIXI_UI__.app.stage);if(!c)throw Error('Missing '+label);const b=c.getBounds();return {x:b.x+b.width/2,y:b.y+b.height/2};},label);await page.mouse.click(bounds.x,bounds.y);}
 for(const hero of ['rift-runner','ember-warden']){
  const context=await browser.newContext({viewport:{width:1024,height:768}}),page=await context.newPage();
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.addInitScript(()=>{const k='arkodia-stronghold-v1';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,at:Date.now(),revision:0,gold:600,mana:80,souls:20,storedGold:0,storedMana:0,levels:{mine:1,altar:1,barracks:1,forge:1,mage:1,expedition:1,gate:1},strongholdCore:{completedLevel:12},hero:false,training:0,skill:0,weapon:0,affix:0,runId:'',rewarded:[],built:['expedition','gate'],resources:{wood:100,food:0,storedWood:0,storedFood:0}}));});
  await page.goto(`${base}/?hero=${hero}&time=${hero==='ember-warden'?'0.9':'0.5'}`);
  await page.waitForFunction(()=>window.__PIXI_UI__?.buildingTree,null,{timeout:90000});
  await click(page,'Open Building Tree');await page.waitForTimeout(100);
  const labels=await page.evaluate(()=>{const out=[];function walk(c){if(c.label)out.push(c.label);if(c.text)out.push(c.text);c.children?.forEach(walk);}walk(window.__PIXI_UI__.app.stage);return out;});
  for(const label of ['Building Tree','Stormshade','Runeseekers','Runetower'])assert(labels.some(x=>x.includes(label)),label);
  for(const label of ['Career Tree','Assassination','Witchcraft','Arcane Tower'])assert(!labels.some(x=>x.includes(label)),label);
  const wrong=hero==='rift-runner'?'Requires Runeseekers':'Requires Stormshade';await click(page,wrong);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).careerDefenses??{}).length),0);
  const good=hero==='rift-runner'?'Build Watchtower':'Build Runetower';await click(page,good);
  await page.waitForFunction(hero=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).careerDefenses?.[hero],hero);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));
  assert.equal(before.resources.wood,75);assert.equal(before.gold,500);assert.equal(before.careerDefenses[hero],hero==='rift-runner'?'watchtower':'arcane-tower');
  await click(page,'Built');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).resources.wood),75);
  await page.screenshot({path:`docs/building-tree/${hero}-tree.png`});
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);await page.waitForTimeout(100);const snap=await page.evaluate(()=>window.__PIXI_UI__.buildingTree.snapshot());assert(snap.open);if(viewport.height<500){assert(snap.maxScroll>0);await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,200);await page.waitForTimeout(100);assert((await page.evaluate(()=>window.__PIXI_UI__.buildingTree.snapshot())).scroll>0);}await page.screenshot({path:`docs/building-tree/${hero}-${viewport.width}.png`});}
  await page.setViewportSize({width:1024,height:768});await click(page,'Close');
  // The live gathering controller and subsequent autosaves must retain the charge.
  await page.waitForTimeout(3200);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).resources.wood),75);
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().fortressDefense.defense,null,{timeout:5000});
  const target=await page.evaluate(()=>{const a=window.__STRONGHOLD_COMBAT__;a.clearFoes();for(const [u,v] of [[18,12],[18,18],[12,18],[20,16]]){const i=a.summon(u,v,1);if(i>=0)return {i,u,v};}throw Error('No clear target site');});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().fortressDefense.shots>0,null,{timeout:10000});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().kills>0,null,{timeout:20000});
  const combat=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().fortressDefense);assert(combat.totalDamage>=10);
  const collision=await page.evaluate(()=>{const a=window.__STRONGHOLD_COMBAT__;return {siteClear:a.clear(12.5,10.5),siteTeleport:a.teleport(12.5,10.5),spawnClear:a.clear(7.5,9),kills:a.snapshot().kills};});assert.equal(collision.siteClear,false);assert.equal(collision.siteTeleport,false);assert(collision.spawnClear);assert(collision.kills>0);
  await page.screenshot({path:`docs/building-tree/${hero}-world.png`});
  await page.reload();await page.waitForFunction(()=>window.__PIXI_UI__?.buildingTree,null,{timeout:90000});
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.deepEqual(after.careerDefenses,before.careerDefenses);assert.equal(after.resources.wood,75);
  results.push({hero,pixiTree:true,constructed:after.careerDefenses[hero],crossFactionMenuDenied:true,duplicateMenuDenied:true,autosaveChargeRetained:true,reloadPreserved:true,responsive:true,target,combat,collision,night:hero==='ember-warden'});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 // A real new base must stay locked at Core level 1, even with sufficient resources.
 const starter=await browser.newContext({viewport:{width:1024,height:768}}),page=await starter.newPage();
 await page.addInitScript(()=>{const k='arkodia-stronghold-v1';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,at:Date.now(),revision:0,gold:600,mana:80,souls:20,storedGold:0,storedMana:0,levels:{mine:1,altar:1,barracks:1,forge:1,mage:1,expedition:1,gate:1},hero:false,training:0,skill:0,weapon:0,affix:0,runId:'',rewarded:[],built:['expedition','gate'],resources:{wood:100,food:0,storedWood:0,storedFood:0}}));});
 await page.goto(`${base}/?hero=rift-runner&time=0.5`);await page.waitForFunction(()=>window.__PIXI_UI__?.buildingTree,null,{timeout:90000});await click(page,'Open Building Tree');
 const hasGate=await page.evaluate(()=>{function check(c){return (c.text??'').includes('Requires completed Stronghold Core level 12.')||c.children?.some(check);}return check(window.__PIXI_UI__.app.stage);});assert(hasGate);
 await click(page,'Build Watchtower');const lockedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.equal(Object.keys(lockedSave.careerDefenses??{}).length,0);assert.equal(lockedSave.resources.wood,100);
 await page.screenshot({path:'docs/building-tree/starter-locked.png'});await starter.close();
 assert.deepEqual(errors,[]);const report={pass:true,base,results,starterCoreGate:true,errors};writeFileSync(`docs/building-tree/${process.env.BASE_URL?'live-':'browser-'}verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser?.close();server?.kill();}
