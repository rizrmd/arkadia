import{chromium}from'playwright';import{spawn}from'node:child_process';import assert from'node:assert/strict';import fs from'node:fs/promises';import sharp from'sharp';
import{SAFE_TILES,SAFE_RADIUS_M,METERS_PER_TILE,SPAWN_MARGIN,fromCenter,meters,spawnPoint}from'../src/stronghold/safe-zone.ts';
// Stronghold encounters: a new game starts with the tent alone in the court; the hero has a health bar and HUD,
// auto-attacks revenants in reach, and revenants spawn (and stay) only outside 100 m of the tent.
// Local build by default (npm run build first); DEMO_URL=https://… tests a deployed host instead.
const out='docs/encounters';await fs.mkdir(out,{recursive:true});
// 1. The spawn sampler, directly: 20k draws from heroes inside and outside the zone never land within 100 m.
let seed=7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
assert.equal(SAFE_RADIUS_M,100);assert.equal(METERS_PER_TILE,3);
let draws=0,closest=Infinity;for(const hero of [{u:7.5,v:7.5},{u:12,v:12},{u:7.5+SAFE_TILES-.5,v:7.5},{u:7.5+SAFE_TILES+1,v:7.5},{u:60,v:9},{u:-20,v:40}])for(let i=0;i<4000;i++){const p=spawnPoint(random,hero,()=>true);if(!p)continue;draws++;closest=Math.min(closest,meters(fromCenter(p)));}
console.log('sampler',{draws,closestMeters:+closest.toFixed(2)});assert(draws>20000&&closest>=SAFE_RADIUS_M+SPAWN_MARGIN*METERS_PER_TILE-1e-9,'no sampled spawn inside the safe zone');
const shot=async(page,name)=>fs.writeFile(`${out}/${name}.webp`,await sharp(await page.screenshot()).webp({quality:82}).toBuffer());
const base=process.env.DEMO_URL?.replace(/\/$/,'');const server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3063'}});const url=base||'http://127.0.0.1:3063';let browser;
try{await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const errors=[],context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror',e.message);});
const ready=async()=>{await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});await page.waitForTimeout(600);};
// A new game: no saves at all.
await page.goto(url+'/?time=0.5');await page.evaluate(()=>localStorage.clear());await page.reload();await ready();
const snap=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
// 2. Tent-only start.
const start=await page.evaluate(()=>({buildings:document.querySelector('#world-canvas').dataset.buildings,hud:document.querySelector('#hero-hud')?.innerText}));
console.log('start',start);assert.equal(start.buildings,'expedition,gate','only the tent (and the gateway in the walls) stand at the start');
await shot(page,'1-tent-only-start');
// 3. Health HUD in English, full at the tent.
let s=await snap();console.log('hero',s.hero);assert.equal(s.hero.hp,100);assert(s.hero.safe&&s.hero.meters<20,'the hero starts at the tent');
assert.match(start.hud,/Health\s+100 \/ 100/);assert.match(start.hud,/Safe zone · \d+ m from the tent/);
// 4. Out in the wilds, 40 tiles (120 m) east of the tent: the bar shows over the hero and revenants spawn around them.
assert(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(7.5+40,7.5)),'teleport into the wilds');
await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().foes.length>=3,null,{timeout:30000});
s=await snap();console.log('wilds',s.hero,'foes',s.foes.length,'min spawn m',s.minSpawnMeters);
assert(!s.hero.safe&&s.hero.meters>100);assert.equal(await page.evaluate(()=>document.querySelector('#hero-health').dataset.visible),'true','health bar over the hero');
assert.match(await page.evaluate(()=>document.querySelector('#hero-hud').innerText),/Wilds · 1\d\d m from the tent/);
// 5. Auto attack: stand beside a revenant without touching the keys; the hero swings and it loses hit points.
const foe=s.foes.find(f=>f.state!=='die');const kills=s.kills;
await page.evaluate(f=>window.__STRONGHOLD_COMBAT__.teleport(f.u-.2,f.v+.05),foe);
const swung=await page.waitForFunction(()=>{const c=window.__STRONGHOLD_COMBAT__.snapshot();return c.hero.state==='attack'?c:null;},null,{timeout:8000,polling:16});console.log('swing',(await swung.jsonValue()).hero.state);
await page.waitForFunction(k=>{const c=window.__STRONGHOLD_COMBAT__.snapshot();return c.kills>k||c.foes.some(f=>f.hp<2);},kills,{timeout:10000});
await shot(page,'2-auto-attack');
await page.waitForFunction(k=>window.__STRONGHOLD_COMBAT__.snapshot().kills>k,kills,{timeout:15000});
s=await snap();console.log('after fight',{kills:s.kills,hp:s.hero.hp});assert(s.kills>kills,'auto attack defeats a revenant');
// 6. Revenants hurt the hero outside the zone; the health bar falls.
// Standing still: packs hunt the hero down and the ones behind land blows.
await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero.hp<100,null,{timeout:60000,polling:250});
s=await snap();const width=await page.evaluate(()=>document.querySelector('#hero-health i').style.transform);console.log('hero hp',s.hero.hp,width);assert(s.hero.hp<100&&width!=='scaleX(1)','revenants wound the hero outside the zone');
await shot(page,'3-health-bar');
// 7. Just inside the boundary (97 m): revenants gather at the edge but never cross it, and nothing spawns inside.
await page.evaluate(t=>window.__STRONGHOLD_COMBAT__.teleport(7.5+t,7.5),SAFE_TILES-1);
let minFoe=Infinity;for(let i=0;i<20;i++){await page.waitForTimeout(500);s=await snap();if(s.minFoeMeters!==null)minFoe=Math.min(minFoe,s.minFoeMeters);}
console.log('edge',{hero:s.hero.meters,safe:s.hero.safe,minFoe:+minFoe.toFixed(1),minSpawn:s.minSpawnMeters,spawns:s.spawns.length});
assert(s.hero.safe);assert(minFoe>=SAFE_RADIUS_M,'no revenant inside 100 m');assert(s.minSpawnMeters>=SAFE_RADIUS_M,'no spawn inside 100 m');
await shot(page,'4-safe-zone-edge');
// 8. Back at the tent the hero heals.
const hurt=s.hero.hp;await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(9,9));await page.waitForTimeout(2500);s=await snap();console.log('heal',hurt,'->',s.hero.hp);assert(s.hero.hp>=Math.min(100,hurt),'heals in the safe zone');
assert.deepEqual(errors,[]);
await fs.writeFile(`${out}/results.json`,JSON.stringify({sampler:{draws,closestMeters:+closest.toFixed(2)},start,minFoeMeters:+minFoe.toFixed(1),minSpawnMeters:s.minSpawnMeters,spawns:s.spawns.length,kills:s.kills,url},null,1));
console.log('PASS encounters',url);
}finally{await browser?.close();server?.kill();}
