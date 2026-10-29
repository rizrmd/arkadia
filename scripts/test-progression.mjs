import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=ts.transpileModule(fs.readFileSync('src/stronghold/progression.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

// 1. Default Level 1 loadout for Rift Runner & Ember Warden
const p=m.fresh('rift-runner');
assert.deepEqual(p.slots,['rift-bolt'],'Rift Runner starts with Rift Bolt in Slot 1');
assert.equal(m.skillRank(p,'rift-bolt'),1,'Rift Bolt starts at Lv. 1');

const pEmber=m.fresh('ember-warden');
assert.deepEqual(pEmber.slots,['flame-fan'],'Ember Warden starts with Flame Fan in Slot 1');
assert.equal(m.skillRank(pEmber,'flame-fan'),1,'Flame Fan starts at Lv. 1');

let seed=1;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
assert.equal(m.critChance(p),0.15);
assert.equal(m.critMultiplier(p),1.5);
assert.equal(m.xpPercent(p),0);
const normHit=m.rollHit(p,random,false);assert.equal(normHit.crit,false);assert.equal(normHit.display,10);
const critHit=m.rollHit(p,random,true);assert.equal(critHit.crit,true);assert.equal(critHit.display,15);
m.reward(p,random);assert.equal(m.xpPercent(p),10);
for(let i=1;i<9;i++)m.reward(p,random);assert.equal(p.level,1,'9 Lv.1 kills must not clear Lv.1');
m.reward(p,random);assert.equal(p.gold,50);assert.equal(p.level,2);assert.equal(new Set(p.offers).size,3);
assert.equal(m.choose(p,'forged',random),false);assert.equal(m.choose(p,p.offers[0],random),true);assert.equal(p.pending,0);
for(let i=0;i<500;i++)m.reward(p,random);assert.ok(p.level>=10);const pending=p.pending;for(let i=0;i<pending;i++)assert.ok(m.choose(p,p.offers[0],random));assert.equal(p.pending,0);
assert.ok(m.critChance(p)>0.15);assert.ok(m.critMultiplier(p)>1.5);

// 2. Test 3-Slot Unlock Progression (Slot 1 default -> Slot 2 -> Slot 3 -> Rank Upgrades Only)
const run3=m.fresh('rift-runner');
assert.deepEqual(run3.slots,['rift-bolt']);
const baseBoltCd=m.skillCooldownMs(run3,'rift-bolt');
const baseBoltDmg=m.skillDamageMultiplier(run3,'rift-bolt');

// Unlock Slot 2 with Rift Dash
run3.pending=1;run3.offers=['rift-dash','might','nova'];
assert.equal(m.choose(run3,'rift-dash',random,'rift-runner'),true);
assert.deepEqual(run3.slots,['rift-bolt','rift-dash'],'Picking new active skill fills Slot 2 first');
assert.equal(m.skillRank(run3,'rift-dash'),1);

// Upgrade Slot 1 (Rift Bolt -> Lv. 2)
run3.pending=1;run3.offers=['rift-bolt','vitality','heal'];
assert.equal(m.choose(run3,'rift-bolt',random,'rift-runner'),true);
assert.deepEqual(run3.slots,['rift-bolt','rift-dash'],'Picking equipped skill keeps slots and upgrades rank');
assert.equal(m.skillRank(run3,'rift-bolt'),2);
assert.ok(m.skillDamageMultiplier(run3,'rift-bolt')>baseBoltDmg,'Rank 2 increases skill damage multiplier');
assert.ok(m.skillCooldownMs(run3,'rift-bolt')<baseBoltCd,'Rank 2 reduces skill cooldown');

// Unlock Slot 3 with Rift Trap
run3.pending=1;run3.offers=['rift-trap','star','leech'];
assert.equal(m.choose(run3,'rift-trap',random,'rift-runner'),true);
assert.deepEqual(run3.slots,['rift-bolt','rift-dash','rift-trap'],'Picking 2nd new active skill fills Slot 3');
assert.equal(m.skillRank(run3,'rift-trap'),1);

// Once 3/3 slots are filled, random rolls must ONLY offer equipped active skills or passive blessings (never unequipped active skills like cleave/shockwave)
for(let i=0;i<40;i++){
 m.roll(run3,random,'rift-runner');
 assert.equal(new Set(run3.offers).size,3);
 for(const offer of run3.offers){
  if(m.isActiveSkill(offer)){
   assert.ok(run3.slots.includes(offer),`When 3/3 slots full, offered active skill ${offer} must be one of equipped [${run3.slots.join(',')}]`);
  }
 }
}

// 3. Test Proportional XP Curve (10 kills per level, +10 kills each level, at the scaled same-level XP reward)
const expectedThresholds={1:100,2:280,3:540,4:880,5:1300,6:1800};
let prevDelta=0;
for(let lv=1;lv<=6;lv++){
 const t=m.thresholdForLevel(lv);
 assert.equal(t,expectedThresholds[lv],`Level ${lv} threshold should be ${expectedThresholds[lv]}`);
 assert.equal(t/m.revenantXpReward(lv),m.killsForLevel(lv),`Level ${lv} costs ${m.killsForLevel(lv)} same-level kills`);
 assert.equal(m.killsForLevel(lv),10*lv);
 if(lv>1){
  const delta=t-m.thresholdForLevel(lv-1);
  assert.ok(delta>prevDelta,`XP increment at level ${lv} (+${delta}) must exceed previous increment (+${prevDelta})`);
  prevDelta=delta;
 }
}

// 4. Test Monster Level Stat Scaling (Max HP, Damage, XP Drop)
for(let lv=1;lv<=5;lv++){
 assert.equal(m.revenantMaxHp(lv),2+(lv-1),`Revenant Lv.${lv} Max HP`);
 assert.equal(m.revenantDamage(lv),4+(lv-1),`Revenant Lv.${lv} Damage`);
 assert.equal(m.revenantXpReward(lv),10+(lv-1)*4,`Revenant Lv.${lv} XP Reward`);
 if(lv>1){
  assert.ok(m.revenantMaxHp(lv)>m.revenantMaxHp(lv-1));
  assert.ok(m.revenantDamage(lv)>m.revenantDamage(lv-1));
  assert.ok(m.revenantXpReward(lv)>m.revenantXpReward(lv-1));
 }
}

console.log('Progression 3-slot loadout, slot 2/3 unlock, rank scaling, 3/3 pool restriction, progressive XP curve, monster stat scaling, EXP percent, and RO crit stats passed');
