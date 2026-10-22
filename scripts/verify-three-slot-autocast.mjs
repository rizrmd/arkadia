import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const port=String(8840+Math.floor(Math.random()*90));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const outDir='docs/three-slot-autocast';
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

 // 1. Verify Level 1 Default 1/3 Auto-Cast Loadout (Rift Runner: Slot 1 = Rift Bolt Lv. 1, Slot 2 & 3 = Empty/Locked)
 await page.goto(`${base}/?offline=1&hero=rift-runner&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
 await page.waitForTimeout(700);

 const wildTile=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let u=18.5;u<27;u+=.25){
   for(let v=18.5;v<27;v+=.25){
    if(c.clear(u,v)&&c.clear(u+1.1,v-.2)&&c.clear(u-.9,v+.35)&&c.teleport(u,v)){
     return {u,v};
    }
   }
  }
  throw Error('No clear wild tile found');
 });

 await page.waitForTimeout(150);
 const lv1State=await page.evaluate(()=>{
  const snap=window.__STRONGHOLD_COMBAT__.snapshot();
  const slotEls=[...document.querySelectorAll('#combat-skills .skill-slot')].map(el=>({
   slot:Number(el.dataset.slot),
   state:el.dataset.state,
   skill:el.dataset.skill,
   rank:Number(el.dataset.rank),
   keyText:el.querySelector('.skill-key')?.textContent,
   rankText:el.querySelector('.skill-rank')?.textContent,
   nameText:el.querySelector('.skill-name')?.textContent,
   statusText:el.querySelector('.skill-status')?.textContent
  }));
  return {
   loadout:snap.loadout,
   headerTitle:document.querySelector('#combat-skills .loadout-title')?.textContent,
   slotEls
  };
 });

 assert.equal(lv1State.slotEls.length,3,'HUD renders exactly 3 skill slots');
 assert.equal(lv1State.loadout.equippedCount,1,'Level 1 starts with 1/3 slots equipped');
 assert.equal(lv1State.slotEls[0].state,'equipped','Slot 1 is equipped at Level 1');
 assert.equal(lv1State.slotEls[0].skill,'rift-bolt','Rift Runner Slot 1 default skill is Rift Bolt');
 assert.equal(lv1State.slotEls[0].rank,1,'Slot 1 starts at Lv. 1');
 assert.equal(lv1State.slotEls[0].rankText,'Lv. 1');
 assert.equal(lv1State.slotEls[1].state,'empty','Slot 2 starts empty/locked');
 assert.equal(lv1State.slotEls[1].statusText,'Unlock via Blessing');
 assert.equal(lv1State.slotEls[2].state,'empty','Slot 3 starts empty/locked');
 assert.equal(lv1State.slotEls[2].statusText,'Unlock via Blessing');

 // Summon 1 Revenant inside AoE radius at Level 1 so Slot 1 auto-casts Rift Bolt on its own
 await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.summon(u+1.05,v-.15);
  c.autoCastNow();
 },wildTile);
 await page.waitForTimeout(110);

 const lv1Shot=`${outDir}/level1-default-slot1.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(lv1Shot);

 // 2. Offer Level-Up Blessing Cards to Unlock Slot 2 & Slot 3 + Upgrade Slot 1 Rank
 await page.evaluate(()=>{
  window.__STRONGHOLD_COMBAT__.offer(['rift-dash','rift-bolt','nova']);
 });
 await page.waitForTimeout(180);

 const modalCards=await page.evaluate(()=>[...document.querySelectorAll('.blessing-row button')].map(b=>({
  card:b.dataset.card,
  kind:b.dataset.kind,
  header:b.querySelector('small')?.textContent,
  title:b.querySelector('strong')?.textContent
 })));
 assert.equal(modalCards.length,3,'3 blessing cards displayed');
 assert.ok(modalCards[0].header?.includes('SLOT 2'),'New active skill card indicates unlocking Slot 2');
 assert.ok(modalCards[1].header?.includes('SLOT 1 UPGRADE'),'Equipped active skill card indicates upgrading Slot 1');

 const blessingShot=`${outDir}/blessing-unlock-slot2-slot3.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(blessingShot);

 // Pick 'rift-dash' -> equips Slot 2 (2/3), then offer & pick 'rift-trap' -> equips Slot 3 (3/3), then offer & pick 'rift-bolt' -> upgrades Slot 1 to Lv. 2
 const afterUnlocks=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.choose('rift-dash');
  const afterSlot2=c.snapshot().loadout;
  c.offer(['rift-trap','cleave','might']);
  c.choose('rift-trap');
  const afterSlot3=c.snapshot().loadout;
  c.offer(['rift-bolt','rift-dash','haste']);
  c.choose('rift-bolt');
  const afterRankUp=c.snapshot().loadout;

  // Verify 25 random rolls when 3/3 slots are full never offer an unequipped 4th active skill
  const equippedSet=new Set(afterRankUp.slots.map(s=>s.skillId));
  const activeIds=new Set(['rift-bolt','rift-dash','rift-trap','flame-fan','cinder-step','ember-snare','cleave','shockwave']);
  for(let i=0;i<25;i++){
   const r=c.offer();
   for(const off of r.offers){
    if(activeIds.has(off)&&!equippedSet.has(off)){
     throw Error(`Unequipped active skill ${off} offered when 3/3 slots full`);
    }
   }
   c.choose(r.offers[0]);
  }
  return {afterSlot2,afterSlot3,afterRankUp,finalLoadout:c.snapshot().loadout};
 });

 assert.equal(afterUnlocks.afterSlot2.equippedCount,2,'Picking 1st new active skill fills Slot 2 (2/3)');
 assert.equal(afterUnlocks.afterSlot2.slots[1].skillId,'rift-dash');
 assert.equal(afterUnlocks.afterSlot3.equippedCount,3,'Picking 2nd new active skill fills Slot 3 (3/3)');
 assert.equal(afterUnlocks.afterSlot3.slots[2].skillId,'rift-trap');
 assert.ok(afterUnlocks.afterRankUp.slots[0].rank>=2,'Picking equipped skill upgrades its Rank (Lv. 2+)');

 // 3. Simultaneous 3-Slot Auto-Cast & Trinity Combo Burst inside Hero AoE Radius
 const trinitySnap=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.teleport(u,v);
  c.summon(u+0.95,v-0.2);
  c.summon(u-0.85,v+0.25);
  c.summon(u+0.4,v+0.85);
  const fired=c.autoCastNow();
  return {
   fired,
   snap:c.snapshot(),
   hud:{
    slotsEquipped:document.querySelector('#combat-skills')?.dataset.slotsEquipped,
    aoeEngaged:document.querySelector('#combat-skills')?.dataset.aoeEngaged,
    comboActive:document.querySelector('#combat-skills')?.dataset.comboActive,
    stateText:document.querySelector('#combat-skills .loadout-state')?.textContent,
    slotRanks:[...document.querySelectorAll('#combat-skills .skill-slot .skill-rank')].map(e=>e.textContent)
   }
  };
 },wildTile);

 assert.equal(trinitySnap.fired.length,3,'All 3 equipped slots auto-cast simultaneously when enemies are in AoE radius');
 assert.deepEqual(trinitySnap.fired,['rift-bolt','rift-dash','rift-trap']);
 assert.ok(trinitySnap.snap.vfx.totals.trinityCasts>=1,'Trinity Simultaneous Cast counter incremented');
 assert.ok(trinitySnap.snap.vfx.activeCombos.length>=1,'Trinity Resonance Burst ground/over VFX active');
 assert.ok(trinitySnap.snap.vfx.activeProjectiles.length>=2,'Rank-upgraded Rift Bolt volley projectiles in flight');
 assert.ok(trinitySnap.snap.vfx.activeAoEs.length>=2,'Simultaneous AoE ground telegraphs active');
 assert.equal(trinitySnap.hud.slotsEquipped,'3');
 assert.equal(trinitySnap.hud.comboActive,'true');

 await page.waitForTimeout(90);
 const trinityShot=`${outDir}/trinity-simultaneous-autocast.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(trinityShot);

 // 4. Mobile Portrait (390x844) with Ember Warden 3-Slot Auto-Cast Loadout
 await page.setViewportSize({width:390,height:844});
 await page.goto(`${base}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});
 await page.waitForTimeout(950);

 const emberCheck=await page.evaluate(({u,v})=>{
  const c=window.__STRONGHOLD_COMBAT__;
  c.teleport(u,v);
  const lv1=c.snapshot().loadout;
  c.offer(['cinder-step','ember-snare','might']);
  c.choose('cinder-step');
  c.offer(['ember-snare','shockwave','nova']);
  c.choose('ember-snare');
  c.summon(u+0.8,v-0.2);
  c.summon(u-0.7,v+0.3);
  const fired=c.autoCastNow();
  return {
   lv1Slot1:lv1.slots[0],
   fired,
   fitsViewport:document.documentElement.scrollWidth<=innerWidth,
   loadout:c.snapshot().loadout
  };
 },wildTile);

 assert.equal(emberCheck.lv1Slot1.skillId,'flame-fan','Ember Warden starts with Flame Fan Lv. 1 in Slot 1');
 assert.equal(emberCheck.lv1Slot1.rank,1);
 assert.deepEqual(emberCheck.fired,['flame-fan','cinder-step','ember-snare'],'Ember Warden fires all 3 slots simultaneously in AoE');
 assert.equal(emberCheck.fitsViewport,true,'3-slot auto-cast HUD fits mobile 390px viewport without overflow');

 await page.waitForTimeout(90);
 const mobileShot=`${outDir}/mobile-ember-warden-trinity.webp`;
 await sharp(await page.screenshot()).webp({quality:90}).toFile(mobileShot);

 // 5. Verify 20Hz Authoritative Co-op Server Mode Synchronization
 await page.setViewportSize({width:1280,height:800});
 await page.goto(`${base}/?hero=ember-warden&time=0.5`);
 await page.waitForFunction(
  ()=>window.__STRONGHOLD_COMBAT__&&window.__COOP__?.stats().status==='online',
  null,
  {timeout:60000}
 );
 await page.waitForTimeout(300);
 const coopCheck=await page.evaluate(()=>{
  const snap=window.__STRONGHOLD_COMBAT__.snapshot();
  return {
   status:window.__COOP__?.stats().status,
   slots:snap.run.slots,
   loadout:snap.loadout
  };
 });
 assert.equal(coopCheck.status,'online');
 assert.deepEqual(coopCheck.slots,['flame-fan'],'20Hz Co-op server initializes Ember Warden with Flame Fan in Slot 1');

 assert.deepEqual(errors,[],'Zero page errors across all scenarios');

 const report={
  passed:true,
  lv1Default:lv1State,
  blessingCards:modalCards,
  slotProgression:{
   afterSlot2:afterUnlocks.afterSlot2.slots,
   afterSlot3:afterUnlocks.afterSlot3.slots,
   afterRankUp:afterUnlocks.afterRankUp.slots
  },
  trinitySimultaneousCast:{
   fired:trinitySnap.fired,
   hud:trinitySnap.hud,
   vfxTotals:trinitySnap.snap.vfx.totals
  },
  emberWardenMobile:emberCheck,
  coopServerSync:coopCheck,
  screenshots:[lv1Shot,blessingShot,trinityShot,mobileShot]
 };
 await fs.writeFile(`${outDir}/results.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();
 server?.kill();
}
