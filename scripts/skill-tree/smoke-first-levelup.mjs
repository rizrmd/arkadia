// Tier-gate smoke test in the browser (Knowledge: "Rift Runner — Ascension Tree Concept", Implementation → Tier gates):
//   node scripts/skill-tree/smoke-first-levelup.mjs              local Vite build of the working tree
//   VERIFY_URL=https://ark-whachat.fural.space node scripts/skill-tree/smoke-first-levelup.mjs
// A fresh Rift Runner kills ten Lv. 1 revenants and collects their souls (the game's own level-up path). The Lv. 2 offer
// must hold only Tier I cards or Rift Bolt rank-ups; the skill tree then shows the locked tiers with their requirement.
// Repeats over RUNS page loads (the game rolls with Math.random). Writes docs/skill-tree/gates-*.webp and gates-<tag>.json.
import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const OUT=process.env.OUT||'docs/skill-tree',remote=process.env.VERIFY_URL,port=5200+process.pid%700,tag=remote?'live':'local',RUNS=Number(process.env.RUNS||3);
const TIER_I=['rift-bolt','rift-dash','rift-trap','heal','might'];
await fs.mkdir(OUT,{recursive:true});
// VITE_CACHE_DIR: a private dependency cache, so another session's Vite re-optimizing the shared one cannot break the load.
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null},logLevel:'error',...(process.env.VITE_CACHE_DIR?{cacheDir:process.env.VITE_CACHE_DIR}:{})});await vite?.listen();
const base=remote||`http://127.0.0.1:${port}`;
const report={base,runs:[],errors:[]};
// One browser per run: the sandbox's single-process Chromium exits when its page closes.
let browser;
try{
 for(let i=0;i<RUNS;i++){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/?offline=1&hero=rift-runner&time=.45`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:300000,polling:500});
  await page.waitForTimeout(2000);
  const at=await page.evaluate(()=>{
   const c=window.__STRONGHOLD_COMBAT__;let at;
   for(let u=19;u<27&&!at;u+=.5)for(let v=19;v<27;v+=.5)if(c.clear(u,v)&&c.clear(u+2,v+2)&&c.teleport(u+2,v+2)){at={u,v};break;}
   if(!at)throw Error('No open tile outside the safe zone');
   for(let n=0;n<10;n++){const k=c.summon(at.u,at.v,1);for(let j=0;j<5;j++)c.hitFoe(k,false);}
   return at;
  });
  await page.evaluate(at=>window.__STRONGHOLD_COMBAT__.teleport(at.u,at.v),at);
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().run.pending>0,null,{timeout:240000,polling:1000}).catch(async e=>{
   console.error(await page.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return JSON.stringify({run:s.run,souls:s.souls,kills:s.kills,foes:s.foes?.length});}));throw e;});
  await page.waitForTimeout(1500);
  const run=await page.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return {...s.run,dialog:s.blessingUi.active};});
  const r={level:run.level,pending:run.pending,offers:run.offers,dialog:run.dialog};
  assert.equal(run.level,2,'levelled up once');assert.ok(run.dialog,'level-up dialog is shown');
  assert.equal(new Set(run.offers).size,3,'three distinct cards');
  for(const id of run.offers)assert.ok(TIER_I.includes(id),`Lv. 2 offer card ${id} is Tier I or a Rift Bolt rank-up`);
  if(i===0)r.shot=await shot(page,'gates-first-levelup');
  // Take the passive card, then open the tree with K: Tier II/III show "4 pts" / "8 pts", Ascendant Star "Lv. 20".
  await page.evaluate(id=>window.__STRONGHOLD_COMBAT__.choose(id),run.offers[0]);
  await page.waitForTimeout(600);
  await page.keyboard.press('k');await page.waitForTimeout(1500);
  const t=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
  r.tree=Object.fromEntries(t.nodes.filter(n=>!n.placeholder).map(n=>[n.id,n.learned?`Lv. ${n.level}`:n.locked??'open']));
  assert.equal(t.open,true,'K opens the tree');
  for(const id of ['astral-cleave','seismic-slam','arc-nova','soul-feast'])assert.equal(r.tree[id],'4 pts',`${id} locked at 4 pts`);
  for(const id of ['chrono-surge','furnace-heart'])assert.equal(r.tree[id],'8 pts',`${id} locked at 8 pts`);
  assert.equal(r.tree['ascendant-star'],'Lv. 20','Ascendant Star locked until Lv. 20');
  if(i===0){
   // Desktop opens at the root; wheel right so Tier II and III are on screen too.
   await page.mouse.move(t.view.x+t.view.width/2,t.view.y+t.view.height/2);
   await page.mouse.wheel(0,Math.round(t.maxScroll*.45));await page.waitForTimeout(1500);
   r.treeShot=await shot(page,'gates-tree-locked');
  }
  report.runs.push(r);
  await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[],'no page errors');
 report.ok=true;
}catch(e){report.ok=false;report.failure=String(e?.stack||e);throw e;}
finally{
 await fs.writeFile(`${OUT}/gates-${tag}.json`,JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify(report,null,1));
 await browser?.close();await vite?.close();
}
// A loaded host backs up the SwiftShader queue, so screenshots get a long timeout.
async function shot(page,name){if(remote)name=`live-${name}`;const png=`${OUT}/${name}.png`;await page.screenshot({path:png,timeout:240000});await sharp(png).webp({quality:84}).toFile(png.replace(/\.png$/,'.webp'));await fs.rm(png);return `${name}.webp`;}
