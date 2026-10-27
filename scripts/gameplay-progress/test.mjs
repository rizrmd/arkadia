import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {createBurnSoilClock}=await vite.ssrLoadModule('/src/fx/burn-soil.ts');
 const ticks=[];const clock=createBurnSoilClock(3,at=>ticks.push(at));clock.advance(430);const resumed=createBurnSoilClock(3,at=>ticks.push(at),{elapsed:clock.elapsedMs,emitted:clock.emitted});resumed.advance(169);assert.deepEqual(ticks,[200,400]);resumed.advance(401);assert.deepEqual(ticks,[200,400,600,800,1000]);assert(resumed.complete);
 const {gameplayStore,validateGameplay}=await vite.ssrLoadModule('/src/stronghold/gameplay-save.ts');
 const {fresh,KEY}=await vite.ssrLoadModule('/src/stronghold/economy.ts');
 const progression=await vite.ssrLoadModule('/src/stronghold/progression.ts');
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const legacy=fresh(100);legacy.gold=351;storage.setItem(KEY,JSON.stringify(legacy));
 const original=storage.getItem(KEY);
 const fighter={state:'attack',t:360,facing:1,back:false,vertical:false,stride:1,hp:37,cooldown:540,impactDone:true,flash:0,deadFor:0,immune:321,x:2,y:3};
 const state=hero=>({run:{...progression.fresh(hero),level:7,xp:32,gold:85,pending:1,offers:['might'],skills:{[progression.DEFAULT_HERO_SKILL[hero]]:3,might:2},stars:1},hero:fighter,position:{x:4,y:5},maxHp:150,baseHp:140,kills:17,spawnTimer:750,seed:954,elapsedMs:123456,levelUpPulseMs:0,regenAccum:2,soulId:8,foes:[],souls:[],effects:{nextId:1,projectiles:[],aoes:[],burnSoils:[],cooldowns:{[progression.DEFAULT_HERO_SKILL[hero]]:654}},world:{clockBase:.45,gateOpen:true,doors:{index:9,target:15,elapsed:21},gateHealth:{hp:43,max:100}}});
 for(const hero of ['rift-runner','ember-warden']){
  const a=gameplayStore(storage,hero);assert.equal(a.initial,null);const s=state(hero);a.save(s);
  assert.deepEqual(gameplayStore(storage,hero).initial,s);
  const root=JSON.parse(storage.getItem(KEY));assert.equal(root.gold,351);assert.deepEqual(root.inventory,legacy.inventory);
  const stale=gameplayStore(storage,hero);s.elapsedMs++;a.save(s);assert.throws(()=>stale.save(s),/another tab/);
  const failed=storage.getItem(KEY),old=storage.setItem;storage.setItem=()=>{throw Error('quota')};assert.throws(()=>a.save(s),/quota/);assert.equal(storage.getItem(KEY),failed);storage.setItem=old;a.save(s);
  // Consumable count and resulting HP commit as one envelope.
  const next=JSON.parse(storage.getItem(KEY));s.hero={...s.hero,hp:75};next.inventory=structuredClone(legacy.inventory);
  const ack=a.prepare(next,s);next.revision++;storage.setItem(KEY,JSON.stringify(next));ack();assert.equal(gameplayStore(storage,hero).initial.hero.hp,75);
  const record=JSON.parse(storage.getItem(KEY)).gameplay[hero];record.version=99;assert.throws(()=>validateGameplay(record,hero));
 }
 const saved=storage.getItem(KEY),root=JSON.parse(saved);root.gameplay['rift-runner'].version=99;storage.setItem(KEY,JSON.stringify(root));const invalid=storage.getItem(KEY);assert.throws(()=>gameplayStore(storage,'rift-runner'));assert.equal(storage.getItem(KEY),invalid);
 // Reset removes the snapshot; the old page cannot resurrect it on pagehide.
 storage.setItem(KEY,saved);const active=gameplayStore(storage,'rift-runner');storage.setItem(KEY,original);assert.throws(()=>active.save(state('rift-runner')),/reset/);
 console.log('PASS: legacy preservation, both heroes, complete roundtrip, stale writer, quota failure/retry, atomic inventory effect, future save and reset fence');
}finally{await vite.close()}
