import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launchOptions} from './typography/browser.mjs';

const OUT='docs/combat-vfx';
await fs.mkdir(OUT,{recursive:true});

execFileSync(process.env.GO||'go',['build','-o','bin/arkadia','./cmd/arkadia'],{
 cwd:'server',
 stdio:'inherit',
 env:{...process.env,CGO_ENABLED:'0'},
});

const port=String(8810+Math.floor(Math.random()*100));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{
 env:{...process.env,PORT:port,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit'],
});
let browser;
try{
 if(server){
  await new Promise((ok,no)=>{
   server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
   server.on('exit',c=>no(Error('server '+c)));
  });
 }
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?offline=1&hero=rift-runner&time=0.5');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});
 await page.waitForTimeout(800);

 // 1. Move hero to a clear wild tile outside the gate and summon revenants spaced out on left and right
 const spot=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let u=18;u<28;u+=.25){
   for(let v=18;v<28;v+=.25){
    if(c.clear(u,v)&&c.clear(u+1.4,v-.3)&&c.clear(u-1.4,v+.3)&&c.teleport(u,v)){
     const iKill=c.summon(u+.3,v+.2);
     const iNorm=c.summon(u-1.35,v+.35);
     const iCrit=c.summon(u+1.35,v-.35);
     return {u,v,iKill,iNorm,iCrit};
    }
   }
  }
  throw Error('No clear wild tile found');
 });
 assert.ok(spot.iKill>=0&&spot.iNorm>=0&&spot.iCrit>=0,'summoned test revenants');

 // Defeat 1st revenant to advance HUD EXP bar to 10 / 20 XP (50%) at Lv. 1
 await page.evaluate(({iKill})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.hitFoe(iKill,true);
  c.hitFoe(iKill,true);
 },spot);
 await page.waitForTimeout(450);

 // Trigger simultaneous Normal ('10') on left revenant and Critical ('15!' + 'CRITICAL' frameless) on right revenant
 const combatCheck=await page.evaluate(({u,v,iNorm,iCrit})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const hitNorm=c.hitFoe(iNorm,false);
  const hitCrit=c.hitFoe(iCrit,true);
  c.spawnProjectile({kind:'rift-bolt',u,v,angle:-0.35,speed:5.5,range:3.5});
  const snap=c.snapshot();
  return {hitNorm,hitCrit,snap};
 },spot);

 assert.equal(combatCheck.hitNorm.crit,false,'normal hit flagged non-crit');
 assert.equal(combatCheck.hitCrit.crit,true,'crit hit flagged crit');
 assert.equal(combatCheck.snap.expBar.level,1);
 assert.equal(combatCheck.snap.expBar.xp,10);
 assert.equal(combatCheck.snap.expBar.nextXp,20);
 assert.equal(combatCheck.snap.expBar.percent,50);
 assert.equal(combatCheck.snap.loadout.slots.length,3,'combat skills bar rendered 3 auto-cast skill slots');
 assert.ok(combatCheck.snap.vfx.activeFloats.length>=2,'active floating damage numbers present');
 assert.ok(combatCheck.snap.vfx.activeFloats.every(f=>f.frameless===true),'all floating damage/crit texts render without bubble/frame');

 await page.waitForTimeout(60);
 const critShot='docs/combat-vfx/ro-crit-and-exp-bar.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(critShot);

 // 2. Capture Trinity Combo & AoE Ground Telegraphs + Projectiles in flight (frameless combo text, modal closed)
 const aoeCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  // If any blessing offer is pending, choose one so the modal does not obscure the world
  while(c.snapshot().run.pending>0){
   const off=c.snapshot().run.offers[0]||'might';
   c.choose(off);
  }
  c.spawnAoE({kind:'rift-trap',shape:'circle',u:u+1.15,v:v-.15,radius:1.45,duration:1200,forceCrit:true});
  c.spawnAoE({kind:'ember-snare',shape:'circle',u:u-1.15,v:v+.25,radius:1.45,duration:1200});
  c.spawnAoE({kind:'cleave-cone',shape:'cone',u,v,angle:Math.PI*.4,radius:1.6,spread:Math.PI*.65,duration:1200});
  c.spawnProjectile({kind:'flame-bolt',u,v,angle:-0.75,speed:5.2,range:4.5});
  c.spawnProjectile({kind:'flame-bolt',u,v,angle:-0.45,speed:5.2,range:4.5});
  c.spawnProjectile({kind:'rift-bolt',u,v,angle:-1.05,speed:5.6,range:4.5});
  c.castSimultaneous(['rift-bolt','rift-dash','rift-trap'],{targetU:u+1.15,targetV:v-.15,forceCrit:true});
  return c.snapshot();
 },spot);
 assert.ok(aoeCheck.vfx.activeAoEs.length>=3,'active 2:1 isometric AoE telegraphs on ground layer');
 assert.ok(aoeCheck.vfx.activeProjectiles.length>=3,'active projectiles in flight');
 assert.ok(aoeCheck.vfx.activeFloats.some(f=>f.kind==='banner'&&f.text.includes('TRINITY')),'Trinity combo floating text active');
 assert.ok(aoeCheck.vfx.activeFloats.every(f=>f.frameless===true),'combo banner floating text renders without bubble/frame');

 await page.waitForTimeout(100);
 const telegraphShot='docs/combat-vfx/aoe-telegraph-and-projectiles.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(telegraphShot);

 // 3. Trigger Level-Up + frameless LEVEL UP! floating text (keep modal closed so floating LEVEL UP! text is clearly visible)
 await page.waitForTimeout(600);
 const levelUpCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  while(c.snapshot().run.pending>0){
   const off=c.snapshot().run.offers[0]||'might';
   c.choose(off);
  }
  c.triggerLevelUp(2);
  c.spawnAoE({kind:'ember-snare',shape:'circle',u:u+.75,v:v+.15,radius:1.45,duration:30,forceCrit:true});
  return {snap:c.snapshot()};
 },spot);
 assert.equal(levelUpCheck.snap.expBar.pulsing,true,'HUD EXP bar pulses on level-up');
 assert.ok(levelUpCheck.snap.vfx.activeLevelUps.length>=1,'Level-Up vertical light pillar and rune ring active');
 assert.ok(levelUpCheck.snap.vfx.activeFloats.some(f=>f.kind==='banner'&&f.text==='LEVEL UP!'),'Level-Up floating text active');
 assert.ok(levelUpCheck.snap.vfx.activeFloats.every(f=>f.frameless===true),'Level-Up floating text renders without bubble/frame');

 await page.waitForTimeout(70);
 const levelUpShot='docs/combat-vfx/level-up-vfx-and-aoe-impact.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(levelUpShot);

 assert.deepEqual(errors,[],'zero page errors');
 const results={
  passed:true,
  framelessVerified:true,
  expBar:combatCheck.snap.expBar,
  critStats:{critChance:combatCheck.snap.hero.critChance,critMultiplier:combatCheck.snap.hero.critMultiplier},
  activeFloatsSample:aoeCheck.vfx.activeFloats,
  vfxTotals:levelUpCheck.snap.vfx.totals,
  screenshots:[critShot,telegraphShot,levelUpShot]
 };
 await fs.writeFile('docs/combat-vfx/results.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
}finally{
 await browser?.close();
 server?.kill();
}
