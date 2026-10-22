import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const port=String(8810+Math.floor(Math.random()*100));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{
 env:{...process.env,PORT:port,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit']
});
let browser;
try{
 if(server){
  await new Promise((ok,no)=>{
   server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
   server.on('exit',c=>no(Error('server '+c)));
  });
 }
 browser=await chromium.launch({
  headless:true,
  env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
  args:['--no-sandbox','--no-zygote','--single-process']
 });
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?offline=1&hero=rift-runner&time=0.5');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__,null,{timeout:120000});
 // Wait for the initial loading banner to finish its fade-out animation
 await page.waitForTimeout(800);
 await fs.mkdir('docs/combat-vfx',{recursive:true});

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

 // Defeat 1st revenant to advance HUD EXP bar to 10 / 20 XP (50%) at Lv. 1 (no level-up modal yet)
 await page.evaluate(({iKill})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.hitFoe(iKill,true);
  c.hitFoe(iKill,true);
 },spot);
 await page.waitForTimeout(450);

 // Trigger simultaneous RO Normal ('10' white) on left revenant and RO Critical ('15!' spiky red/gold badge) on right revenant
 const combatCheck=await page.evaluate(({u,v,iNorm,iCrit})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const hitNorm=c.hitFoe(iNorm,false);
  const hitCrit=c.hitFoe(iCrit,true);
  c.spawnProjectile({kind:'rift-bolt',u,v,angle:-0.35,speed:5.5,range:3.5});
  return {hitNorm,hitCrit,snap:c.snapshot(),hud:{
   lv:document.querySelector('.hud-lv-badge')?.textContent,
   xp:document.querySelector('.hud-xp-text')?.textContent,
   fillTransform:document.querySelector('.hud-exp-bar i')?.style.transform,
   skillButtons:document.querySelectorAll('#combat-skills .skill-btn').length,
   skillsVisible:!document.querySelector('#combat-skills')?.hasAttribute('hidden')
  }};
 },spot);

 assert.equal(combatCheck.hitNorm.crit,false,'normal hit flagged non-crit');
 assert.equal(combatCheck.hitCrit.crit,true,'crit hit flagged crit');
 assert.equal(combatCheck.hud.lv,'Lv. 1');
 assert.equal(combatCheck.hud.xp,'10 / 20 XP (50%)');
 assert.equal(combatCheck.hud.skillButtons,3,'combat skills bar rendered 3 auto-cast skill slots');
 assert.equal(combatCheck.hud.skillsVisible,true,'combat skills bar visible during active combat');

 await page.waitForTimeout(60);
 const critShot='docs/combat-vfx/ro-crit-and-exp-bar.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(critShot);

 // 2. Capture 2:1 Isometric AoE Ground Telegraphs (under character feet) + Projectiles in flight + Dash Afterimages (no modal obstructing view)
 if(await page.locator('.blessing-row button').first().isVisible().catch(()=>false)){
  await page.locator('.blessing-row button').first().click();
 }
 const aoeCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.spawnAoE({kind:'rift-trap',shape:'circle',u:u+1.15,v:v-.15,radius:1.45,duration:1200,forceCrit:true});
  c.spawnAoE({kind:'ember-snare',shape:'circle',u:u-1.15,v:v+.25,radius:1.45,duration:1200});
  c.spawnAoE({kind:'cleave-cone',shape:'cone',u,v,angle:Math.PI*.4,radius:1.6,spread:Math.PI*.65,duration:1200});
  c.spawnProjectile({kind:'flame-bolt',u,v,angle:-0.75,speed:5.2,range:4.5});
  c.spawnProjectile({kind:'flame-bolt',u,v,angle:-0.45,speed:5.2,range:4.5});
  c.spawnProjectile({kind:'rift-bolt',u,v,angle:-1.05,speed:5.6,range:4.5});
  c.castSkill('rift-dash');
  return c.snapshot();
 },spot);
 assert.ok(aoeCheck.vfx.activeAoEs.length>=3,'active 2:1 isometric AoE telegraphs on ground layer');
 assert.ok(aoeCheck.vfx.activeProjectiles.length>=3,'active projectiles in flight');

 await page.waitForTimeout(260);
 const telegraphShot='docs/combat-vfx/aoe-telegraph-and-projectiles.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(telegraphShot);

 // 3. Wait for AoE detonation -> triggers Over-Character AoE Impact Burst + 2nd kill -> Level-Up Vertical Light Pillar + Rune Ring + LEVEL UP Banner
 await page.waitForTimeout(820);
 const levelUpCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.triggerLevelUp(2);
  c.spawnAoE({kind:'ember-snare',shape:'circle',u:u+.75,v:v+.15,radius:1.45,duration:30,forceCrit:true});
  return {snap:c.snapshot(),hud:{
   lv:document.querySelector('.hud-lv-badge')?.textContent,
   xp:document.querySelector('.hud-xp-text')?.textContent,
   levelupPulse:document.querySelector('#hero-hud')?.dataset.levelup
  }};
 },spot);
 assert.equal(levelUpCheck.hud.levelupPulse,'true','HUD EXP bar pulses on level-up');
 assert.ok(levelUpCheck.snap.vfx.activeLevelUps.length>=1,'Level-Up vertical light pillar and rune ring active');

 await page.waitForTimeout(70);
 const levelUpShot='docs/combat-vfx/level-up-vfx-and-aoe-impact.webp';
 await sharp(await page.screenshot()).webp({quality:88}).toFile(levelUpShot);

 assert.deepEqual(errors,[],'zero page errors');
 const results={
  passed:true,
  expBar:combatCheck.hud,
  critStats:{critChance:combatCheck.snap.hero.critChance,critMultiplier:combatCheck.snap.hero.critMultiplier},
  vfxTotals:levelUpCheck.snap.vfx.totals,
  screenshots:[critShot,telegraphShot,levelUpShot]
 };
 await fs.writeFile('docs/combat-vfx/results.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
}finally{
 await browser?.close();
 server?.kill();
}
