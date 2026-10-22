import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const port=String(8870+Math.floor(Math.random()*80));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const outDir='docs/monster-scaling';
const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{
 env:{...process.env,PORT:port,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit']
});

let browser;
try{
 await fs.mkdir(outDir,{recursive:true});
 if(server){
  await new Promise((ok,no)=>{
   server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
   server.on('exit',c=>no(Error('server exited '+c)));
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

 // 1. Load Solo mode at Level 1 and verify progressive XP curve & Level 1 Revenant overhead badges
 await page.goto(`${base}/?offline=1&hero=rift-runner&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
 await page.waitForTimeout(600);

 const wildTile=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let u=18.5;u<27;u+=.25){
   for(let v=18.5;v<27;v+=.25){
    if(c.clear(u,v)&&c.clear(u+1.1,v-.25)&&c.clear(u-.95,v+.35)&&c.clear(u+.85,v+.85)&&c.teleport(u,v)){
     return {u,v};
    }
   }
  }
  throw Error('No clear wild tile found');
 });

 const lv1Check=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const i1=c.summon(u+1.05,v-.2);
  const i2=c.summon(u-.9,v+.3);
  c.hitFoe(i1,false);
  const snap=c.snapshot();
  const visibleBars=[...document.querySelectorAll('#world-foe-bars .foe-health:not([hidden])')].map(el=>({
   level:Number(el.dataset.level),
   hp:Number(el.dataset.hp),
   maxHp:Number(el.dataset.maxHp),
   wounded:el.dataset.wounded==='true',
   badgeText:el.querySelector('.foe-lv')?.textContent
  }));
  return {
   expBar:snap.expBar,
   xpCurve:snap.xpCurve,
   foes:snap.foes.slice(-2),
   visibleBars,
   hudLv:document.querySelector('.hud-lv-badge')?.textContent,
   hudXp:document.querySelector('.hud-xp-text')?.textContent
  };
 },wildTile);

 assert.equal(lv1Check.expBar.level,1,'Hero starts at Level 1');
 assert.equal(lv1Check.expBar.nextXp,20,'Level 1 -> 2 requires 20 XP');
 assert.deepEqual(
  lv1Check.xpCurve.map(x=>x.nextXp),
  [20,35,55,80,110,145],
  'Progressive XP curve matches 20, 35 (+15), 55 (+20), 80 (+25), 110 (+30), 145 (+35)'
 );
 assert.ok(lv1Check.visibleBars.length>=2,'Overhead Revenant health bars are visible on living Revenants');
 assert.ok(lv1Check.visibleBars.every(b=>b.badgeText==='Lv. 1'&&b.level===1&&b.maxHp===2),'Level 1 Revenants render Lv. 1 badge and MaxHP=2');

 const lv1Shot=`${outDir}/level1-monster-scaling.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(lv1Shot);

 // 2. Progress Hero to Level 4 and verify Revenants scale to Lv. 4 (MaxHP=5, DMG=7, XP=22) with overhead 'Lv. 4' badges
 const lv4Check=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  // Advance Hero to Level 4 through 3 level-up blessings
  c.offer(['rift-dash','might','nova']);
  c.choose('rift-dash');
  c.offer(['rift-trap','vitality','haste']);
  c.choose('rift-trap');
  c.offer(['rift-bolt','star','leech']);
  c.choose('rift-bolt');
  // Summon fresh Lv. 4 Revenants around the hero and wound one to show partial HP fill + Lv. 4 badge
  const idxA=c.summon(u+1.1,v-.25);
  const idxB=c.summon(u-.95,v+.35);
  const idxC=c.summon(u+.85,v+.85);
  c.hitFoe(idxA,true);
  c.castSimultaneous(['rift-bolt','rift-dash','rift-trap'],{targetU:u+1.1,targetV:v-.25,forceCrit:true});
  const snap=c.snapshot();
  const visibleBars=[...document.querySelectorAll('#world-foe-bars .foe-health:not([hidden])')].map(el=>({
   level:Number(el.dataset.level),
   hp:Number(el.dataset.hp),
   maxHp:Number(el.dataset.maxHp),
   wounded:el.dataset.wounded==='true',
   badgeText:el.querySelector('.foe-lv')?.textContent
  }));
  return {
   expBar:snap.expBar,
   foes:snap.foes,
   visibleBars,
   hudLv:document.querySelector('.hud-lv-badge')?.textContent,
   hudXp:document.querySelector('.hud-xp-text')?.textContent,
   progressText:document.querySelector('.run-progress')?.textContent
  };
 },wildTile);

 assert.equal(lv4Check.expBar.level,4,'Hero is now Level 4');
 assert.equal(lv4Check.expBar.nextXp,80,'Level 4 -> 5 requires 80 XP on progressive curve');
 assert.equal(lv4Check.hudLv,'Lv. 4');
 assert.ok(lv4Check.hudXp?.includes('/ 80 XP'),`HUD XP text shows / 80 XP (got ${lv4Check.hudXp})`);
 assert.ok(lv4Check.foes.every(f=>f.level===4&&f.maxHp===5&&f.damage===7&&f.xpReward===22&&f.label==='Lv. 4'),'All Revenants scaled to Lv. 4 (MaxHP=5, Damage=7, XP=22)');
 assert.ok(lv4Check.visibleBars.length>=2,'Multiple Lv. 4 Revenant overhead bars visible');
 assert.ok(lv4Check.visibleBars.every(b=>b.badgeText==='Lv. 4'&&b.level===4&&b.maxHp===5),'Every visible overhead bar renders Lv. 4 badge');

 await page.waitForTimeout(120);
 const lv4DesktopShot=`${outDir}/level4-monster-scaling-desktop.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(lv4DesktopShot);

 // 3. Mobile viewport (390x844) check with scaled Revenant overhead badges
 await page.setViewportSize({width:390,height:844});
 await page.goto(`${base}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});
 await page.waitForTimeout(500);
 const mobileCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.teleport(u,v);
  c.offer(['cinder-step','might','nova']);
  c.choose('cinder-step');
  c.offer(['ember-snare','vitality','haste']);
  c.choose('ember-snare');
  c.offer(['flame-fan','star','leech']);
  c.choose('flame-fan');
  const i1=c.summon(u+0.95,v-0.45);
  const i2=c.summon(u-0.85,v-0.55);
  c.hitFoe(i1,false);
  const snap=c.snapshot();
  const visibleBars=[...document.querySelectorAll('#world-foe-bars .foe-health:not([hidden])')].map(el=>({
   badgeText:el.querySelector('.foe-lv')?.textContent,
   level:Number(el.dataset.level),
   maxHp:Number(el.dataset.maxHp)
  }));
  return {
   heroLevel:snap.expBar.level,
   fitsViewport:document.documentElement.scrollWidth<=innerWidth,
   visibleBars,
   hudLv:document.querySelector('.hud-lv-badge')?.textContent,
   hudXp:document.querySelector('.hud-xp-text')?.textContent
  };
 },wildTile);

 assert.equal(mobileCheck.fitsViewport,true,'390x844 mobile viewport has no horizontal overflow');
 assert.ok(mobileCheck.heroLevel>=4,'Hero is Lv. 4+ on mobile');
 assert.ok(
  mobileCheck.visibleBars.some(b=>b.level===mobileCheck.heroLevel&&b.badgeText===`Lv. ${mobileCheck.heroLevel}`),
  `Mobile viewport renders Lv. ${mobileCheck.heroLevel} overhead monster badge`
 );

 const lv4MobileShot=`${outDir}/level4-monster-scaling-mobile.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(lv4MobileShot);

 // 4. Verify 20Hz Go Co-op Server synchronization of EnemyState.level and EnemyState.max
 await page.setViewportSize({width:1280,height:800});
 await page.goto(`${base}/?hero=ember-warden&time=0.5`);
 await page.waitForFunction(
  ()=>window.__STRONGHOLD_COMBAT__&&window.__COOP__?.stats().status==='online',
  null,
  {timeout:60000}
 );
 await page.waitForFunction(()=>{
  const snap=window.__STRONGHOLD_COMBAT__?.snapshot();
  return snap&&snap.foes&&snap.foes.length>0;
 },null,{timeout:15000});

 const coopSync=await page.evaluate(()=>{
  const snap=window.__STRONGHOLD_COMBAT__.snapshot();
  return {
   onlineStatus:window.__COOP__?.stats().status,
   foeCount:snap.foes.length,
   sampleFoe:snap.foes[0],
   expBar:snap.expBar
  };
 });
 assert.equal(coopSync.onlineStatus,'online','Connected to 20Hz Go Co-op room');
 assert.ok(coopSync.foeCount>0,'Go Co-op server spawned Revenants');
 assert.equal(coopSync.sampleFoe.level,1,'Co-op Revenant starts at Lv. 1 matching Hero Lv. 1');
 assert.equal(coopSync.sampleFoe.maxHp,2,'Co-op Revenant MaxHP=2');
 assert.equal(coopSync.sampleFoe.label,'Lv. 1','Co-op Revenant label is Lv. 1');

 assert.deepEqual(errors,[],'Zero page errors across Solo, Mobile, and 20Hz Co-op verification');

 const report={
  passed:true,
  base,
  xpCurve:lv1Check.xpCurve,
  lv1Check:{
   expBar:lv1Check.expBar,
   visibleBars:lv1Check.visibleBars,
   foes:lv1Check.foes
  },
  lv4Check:{
   expBar:lv4Check.expBar,
   hudLv:lv4Check.hudLv,
   hudXp:lv4Check.hudXp,
   visibleBars:lv4Check.visibleBars.slice(0,4),
   sampleFoe:lv4Check.foes[0]
  },
  mobileCheck,
  coopSync,
  screenshots:[lv1Shot,lv4DesktopShot,lv4MobileShot],
  errors
 };
 await fs.writeFile(`${outDir}/results.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:true,screenshots:report.screenshots,xpCurve:report.xpCurve}));
}finally{
 await browser?.close();
 server?.kill();
}
