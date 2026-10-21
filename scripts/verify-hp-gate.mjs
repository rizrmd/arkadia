import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GATE,SPAWN_DISTANCE_M,fromGate,meters,inSafeZone,spawnPoint} from '../src/stronghold/safe-zone.ts';
const out='docs/hp-gate';await fs.mkdir(out,{recursive:true});
let seed=7;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(const hero of [{u:7.5,v:7.5},{u:60,v:9}])for(let i=0;i<10000;i++){const p=spawnPoint(random,hero,()=>true);assert(p&&!inSafeZone(p));assert(Math.abs(meters(fromGate(p))-SPAWN_DISTANCE_M)<1e-9);}
assert.equal(spawnPoint(random,GATE,()=>false),null);
const base=process.env.DEMO_URL?.replace(/\/$/,'');const server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3064'}});let browser;
try{
 await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote']});
 const results=[];
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((base||'http://127.0.0.1:3064')+'/?time=0.5');await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_COMBAT__?.snapshot().spawns.length>=3,null,{timeout:60000});
  const state=await page.evaluate(async()=>{const img=new Image();img.src='/ui/health-frame.webp';await img.decode();const hud=document.querySelector('#hero-hud'),bar=hud.querySelector('.hud-bar'),clock=document.querySelector('.clock-chip');const r=bar.getBoundingClientRect(),h=hud.getBoundingClientRect(),c=clock.getBoundingClientRect();return {text:hud.innerText,ratio:r.width/r.height,hud:{left:h.left,right:h.right},clockLeft:c.left,art:{w:img.naturalWidth,h:img.naturalHeight},combat:window.__STRONGHOLD_COMBAT__.snapshot()};});
  console.log(width,state.hud,state.clockLeft,state.text);assert(Math.abs(state.ratio-2166/212)<.02);assert(state.hud.left>=0&&state.hud.right<state.clockLeft);assert(!/\d+\s*m\b|distance|from the tent/i.test(state.text));assert(state.combat.spawns.every(s=>s.m===10));assert(state.combat.foes.every(f=>!f.safe));
  const chip=await page.locator('.clock-chip').boundingBox();assert(chip.height<=32,'clock stays short');
  await page.locator('.clock-chip').click();
  assert.equal(await page.locator('.clock-chip').getAttribute('aria-expanded'),'true');
  const panel=await page.locator('.clock-panel').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=width);
  await page.locator('.clock-presets button').first().click();
  assert.equal(await page.locator('.clock-presets button').first().getAttribute('aria-pressed'),'true');
  await page.locator('.clock-presets button').nth(3).click();
  await page.locator('.clock-chip').click();
  assert.equal(await page.locator('.clock-chip').getAttribute('aria-expanded'),'false');
  console.log('screenshot',width);await page.screenshot({timeout:10000,animations:'disabled',path:`${out}/${width}.png`});
  // Stand just outside the gate beside a foe; confirm auto combat still works.
  console.log('combat',width);assert(await page.evaluate(()=>{const api=window.__STRONGHOLD_COMBAT__;return api.snapshot().foes.some(f=>api.teleport(f.u,f.v)||api.teleport(f.u+.3,f.v+.3));}),'can stand beside a current foe');
  await page.waitForFunction(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return s.hero.state==='attack'||s.kills>0;},null,{timeout:10000,polling:16});
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().kills>0,null,{timeout:15000});
  if(width===390){
   await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero.hp<100,null,{timeout:20000});
   const hurt=await page.evaluate(()=>({hp:window.__STRONGHOLD_COMBAT__.snapshot().hero.hp,fill:document.querySelector('.hud-bar i').style.transform}));assert.notEqual(hurt.fill,'scaleX(1)');
   await page.screenshot({path:`${out}/wounded.png`,timeout:10000,animations:'disabled'});
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(9,9));
   await page.waitForFunction(hp=>window.__STRONGHOLD_COMBAT__.snapshot().hero.hp>hp,hurt.hp,{timeout:5000});
  }
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(9,9));await page.waitForTimeout(500);
  assert((await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot())).foes.every(f=>!f.safe));assert.deepEqual(errors,[]);results.push({width,...state});console.log('passed',width);await page.close();
 }
 await fs.writeFile(`${out}/results.json`,JSON.stringify({url:base||'local',sampler:20000,results},null,2));console.log('PASS: 20,000 gate spawns, mobile proportions, HUD clearance, no distance, auto combat, safe court, no page errors');
}finally{await browser?.close();server?.kill();}
