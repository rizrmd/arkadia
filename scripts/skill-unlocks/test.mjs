import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const m=await server.ssrLoadModule('/src/stronghold/progression.ts');
 const s=await server.ssrLoadModule('/src/stronghold/skill-unlocks.ts');
 const economy=await server.ssrLoadModule('/src/stronghold/economy.ts');
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const old=economy.fresh(123456);Object.assign(old,{gold:351,mana:22,souls:7,skill:2,training:1,weapon:2,affix:1,completedExpeditions:['frostpass-01']});
 storage.setItem(economy.KEY,JSON.stringify(old));const before=storage.getItem(economy.KEY);
 const checks=[];
 for(const hero of ['rift-runner','ember-warden']){
  let p=s.restoreSkillUnlocks(storage,hero);
  assert.deepEqual(p.skills,m.fresh(hero).skills);assert.equal(m.pointsSpent(p),0);
  const ids=m.HERO_ACTIVE_POOL[hero];
  let seed=9;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  // Earn each pending choice through XP and find the target through the actual offer builder.
  for(const target of [ids[1],ids[2],ids[0],ids[0],'might',ids[3]]){
   while(!p.pending)m.awardSoulXp(p,random,hero,p.level);
   for(let i=0;i<1000&&!p.offers.includes(target);i++)m.roll(p,random,hero);
   assert(p.offers.includes(target),target);assert(m.choose(p,target,random,hero));
   s.saveSkillUnlocks(storage,hero,p);
  }
  assert.equal(m.learnedActives(p,hero).length,4);
  // Keep the fourth learned active unequipped then persist a swap.
  assert(m.equip(p,1,ids[3],hero));s.saveSkillUnlocks(storage,hero,p);
  const slots=[...p.slots],learned=m.learnedActives(p,hero);
  for(let i=0;i<3;i++){
   p=s.restoreSkillUnlocks(storage,hero);
   assert.deepEqual(m.learnedActives(p,hero),learned);assert.deepEqual(p.slots,slots);
   assert(Object.values(p.skills).every(rank=>rank===1));assert.equal(p.level,1);assert.equal(p.xp,0);assert.equal(p.gold,0);assert.equal(p.pending,0);assert.equal(p.stars,0);assert.deepEqual(p.offers,[]);assert.equal(m.pointsSpent(p),0);
   assert(!m.riftCardUnlocked(p,'haste'));assert(m.equip(p,2,ids[1],hero));
   for(let j=0;j<100;j++){m.roll(p,random,hero);assert(!p.offers.includes('haste'));assert(!p.offers.includes('star'));assert(!p.offers.includes(ids[4]));}
   assert.equal(storage.getItem(economy.KEY),before);
  }
  checks.push(`${hero}: XP/roll/choose, four learned/three equipped, swap, repeated restore, rank/passive/XP/gold reset, run gates, learned limit`);
 }
 const valid=storage.getItem(s.SKILL_UNLOCK_KEYS['rift-runner']);
 for(const raw of ['{bad','null','{"version":99}',JSON.stringify({version:1,learned:['rift-bolt','flame-fan'],slots:['rift-bolt']}),JSON.stringify({version:1,learned:['rift-bolt'],slots:['rift-dash']})]){
  storage.setItem(s.SKILL_UNLOCK_KEYS['rift-runner'],raw);
  assert.throws(()=>s.restoreSkillUnlocks(storage,'rift-runner'));
  assert.throws(()=>s.saveSkillUnlocks(storage,'rift-runner',m.fresh()));assert.equal(storage.getItem(s.SKILL_UNLOCK_KEYS['rift-runner']),raw);
 }
 storage.setItem(s.SKILL_UNLOCK_KEYS['rift-runner'],valid);
 const locked={getItem:storage.getItem,setItem(){throw Error('QuotaExceededError');}};
 const p=m.fresh();assert.throws(()=>s.saveSkillUnlocks(locked,'rift-runner',p));assert.equal(storage.getItem(s.SKILL_UNLOCK_KEYS['rift-runner']),valid);
 const paid=economy.fresh(123456);economy.action(paid,'mage');assert.equal(paid.mana,50);assert.equal(paid.skill,1);
 const paidReload=economy.load(JSON.stringify(paid),123456);assert.equal(paidReload.skill,1);assert.equal(paidReload.mana,50);assert.throws(()=>economy.action(paidReload,'mage'));assert.equal(paidReload.mana,50);
 assert.equal(economy.load(before,123456).skill,2);assert.equal(storage.getItem(economy.KEY),before);
 globalThis.localStorage=storage;Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(k,fn)=>fn()}},configurable:true});
 storage.setItem('arkodia.hero','ember-warden');
 const reset=await server.ssrLoadModule('/src/stronghold/reset-progression.ts');await reset.resetProgression();
 for(const key of Object.values(s.SKILL_UNLOCK_KEYS))assert.equal(storage.getItem(key),null);
 assert.equal(storage.getItem('arkodia.hero'),'ember-warden');
 checks.push('legacy economy retained byte-for-byte; missing skill save fresh; malformed/foreign/future records retained; failed writes retain original; explicit reset clears both heroes and preserves preferences');
 await fs.mkdir('docs/skill-unlocks',{recursive:true});await fs.writeFile('docs/skill-unlocks/unit.json',JSON.stringify({passed:true,checks},null,2));console.log(checks);
}finally{await server.close();}
