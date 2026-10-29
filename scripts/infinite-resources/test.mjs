import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
registerHooks({resolve(spec,ctx,next){if(spec.startsWith('.')&&ctx.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/.test(spec))spec+='.ts';return next(spec,ctx);},load(url,ctx,next){if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,ctx);}});
const {fresh,load,upgrade}=await import('../../src/stronghold/economy.ts');
const {INFINITE_WOOD_FOOD,resourceLabel,canPay,deductCost}=await import('../../src/stronghold/resource-mode.ts');
const {CONSTRUCTION_KINDS,constructionStatus,startConstruction,settleConstruction}=await import('../../src/stronghold/construction-rules.ts');
const {constructDefense,constructionReason}=await import('../../src/stronghold/building-branches.ts');
const {buildingEligibility}=await import('../../src/stronghold/building-panel-policy.ts');
const checks=[];const NOW=1800000000000;
const make=()=>{const s=fresh(NOW);s.gold=1e9;s.strongholdCore={completedLevel:30};s.farm={completedLevel:30};s.resources={wood:17,food:19,storedWood:23,storedFood:29};s.customPeer={map:'retained'};return s;};
assert.equal(typeof INFINITE_WOOD_FOOD,'boolean');assert.equal(resourceLabel(0,'wood',true),'∞ Wood');assert.equal(resourceLabel(0,'food',true),'∞ Food');assert.equal(resourceLabel(17,'wood',false),'17 Wood');
for(const enabled of [true,false])for(const kind of CONSTRUCTION_KINDS)for(const level of [0,1,29]){
 if(kind==='core'&&level===0)continue;
 const s=make(),key={core:'strongholdCore',farm:'farm',lumber:'lumberMill',kitchen:'kitchen',walls:'walls',mine:'mine'}[kind];s[key]={completedLevel:level};
 const r=constructionStatus(s,kind,enabled).recipe;
 if(!enabled)s.resources.storedWood=r.wood+7;
 const old=structuredClone(s),job=startConstruction(s,kind,NOW,enabled);
 assert.equal(job.to,level+1);assert.equal(job.readyAt-NOW,r.minutes*60000);assert.equal(s.gold,old.gold-r.gold);
 assert.equal(s.resources.storedWood,enabled?old.resources.storedWood:7);assert.equal(s.resources.wood,17);assert.equal(s.resources.food,19);assert.equal(s.resources.storedFood,29);
 const pending=load(JSON.stringify(s),NOW);assert.deepEqual(pending.construction,job);assert.equal(pending[key].completedLevel,level);
 const before=JSON.stringify(s);assert.throws(()=>startConstruction(s,kind,NOW,enabled),/progress/);assert.equal(JSON.stringify(s),before);
 assert.equal(settleConstruction(s,job.readyAt-1),false);assert.equal(s[key].completedLevel,level);assert.equal(settleConstruction(s,job.readyAt),true);assert.equal(s[key].completedLevel,level+1);assert.equal(settleConstruction(s,job.readyAt+1),false);
 const saved=load(JSON.stringify(s),NOW);assert.deepEqual(saved.customPeer,old.customPeer);assert.equal(saved[key].completedLevel,level+1);assert.equal(saved.construction,undefined);
 checks.push(`${enabled?'on':'off'} ${kind} ${level===0?'create':'upgrade '+level}: cost, timer, duplicate, reload, finite balances`);
}
for(const kind of CONSTRUCTION_KINDS){
 for(const reason of ['gold','requirements','max','online','wood']){
  const s=make(),key={core:'strongholdCore',farm:'farm',lumber:'lumberMill',kitchen:'kitchen',walls:'walls',mine:'mine'}[kind];s[key]={completedLevel:kind==='core'?1:0};
  if(reason==='gold')s.gold=0;
  if(reason==='wood')s.resources.storedWood=0;
  if(reason==='max')s[key].completedLevel=30;
  if(reason==='requirements'){if(kind==='core')continue;s.strongholdCore.completedLevel=1;s[key].completedLevel=1;}
  const before=JSON.stringify(s);assert.throws(()=>startConstruction(s,kind,NOW,reason!=='wood',reason==='online'));assert.equal(JSON.stringify(s),before);
 }
}
const kitchen=make();kitchen.kitchen={completedLevel:1};kitchen.farm.completedLevel=1;assert.throws(()=>startConstruction(kitchen,'kitchen',NOW),/requirements/);
for(const [hero,defense] of [['rift-runner','watchtower'],['ember-warden','arcane-tower']])for(const enabled of [true,false]){
 const s=make();s.resources.wood=enabled?0:30;assert.equal(constructionReason(s,hero,defense,false,enabled),'');constructDefense(s,hero,defense,false,enabled);assert.equal(s.resources.wood,enabled?0:5);assert.equal(s.resources.food,19);assert.equal(s.gold,1e9-100);assert.equal(load(JSON.stringify(s),NOW).careerDefenses[hero],defense);
 assert.throws(()=>constructDefense(s,hero,defense,false,enabled),/already/);
}
const mixed={gold:50,wood:0,food:0,mana:3,souls:1};assert(canPay({gold:50,wood:500,food:600,mana:3,souls:1},mixed,true));assert(!canPay({gold:51,wood:500},mixed,true));assert(!canPay({gold:0,mana:4},mixed,true));assert(!canPay({gold:0,souls:2},mixed,true));assert(!canPay({gold:0,wood:1},mixed,false));deductCost({gold:10,wood:500,food:600,mana:1},mixed,true);assert.deepEqual(mixed,{gold:40,wood:0,food:0,mana:2,souls:1});
const legacy=make();legacy.levels.mine=3;legacy.mana=0;assert.throws(()=>upgrade(legacy,'mage'),/Insufficient/);
const status={reason:'',operationAvailable:true},funds={gold:500,wood:100,status:()=>status,start:async()=>{}};assert(buildingEligibility({gold:100,wood:100},[{satisfied:true}],funds,'farm').operationAvailable);assert(!buildingEligibility({gold:100,wood:100},[{satisfied:false}],funds,'farm').operationAvailable);assert(!buildingEligibility({gold:100,wood:100},[],funds,'farm',false).operationAvailable);status.reason='Construction in progress';assert(!buildingEligibility({gold:100,wood:100},[],funds,'farm').operationAvailable);
const malformed=make();malformed.resources.wood=Infinity;assert.throws(()=>load(JSON.stringify(malformed),NOW),/resource save/);malformed.resources.wood=1;malformed.construction={kind:'farm',from:30,to:31,startedAt:NOW,readyAt:NOW+60000};assert.throws(()=>load(JSON.stringify(malformed),NOW),/timer/);
// Real transaction: quota failures must leave save and live gathering owner unchanged.
const {setGatheringCapture,setGatheringResourceCommit}=await import('../../src/stronghold/gameplay-save.ts');const {transactResources}=await import('../../src/stronghold/store.ts');
let serialized=JSON.stringify(make()),live=structuredClone(make().resources),fail=false;globalThis.localStorage={getItem:()=>serialized,setItem:(k,v)=>{if(fail)throw Error('Quota exceeded');serialized=v;}};Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(k,fn)=>fn()}},configurable:true});
setGatheringCapture(s=>{s.resources=structuredClone(live);});setGatheringResourceCommit(s=>{const next=structuredClone(s.resources);return ()=>{live=next;};});
const before=serialized;fail=true;await assert.rejects(transactResources(s=>startConstruction(s,'lumber',NOW,true)),/Quota/);assert.equal(serialized,before);assert.deepEqual(live,make().resources);fail=false;await transactResources(s=>startConstruction(s,'lumber',NOW,true));assert.deepEqual(live,make().resources);assert.equal(JSON.parse(serialized).construction.kind,'lumber');
checks.push('all six Gold, Core, Kitchen Farm, max, co-op and mode-off Wood gates; atomic rejection','both faction create paths on/off preserve finite Food','mixed resource policy keeps Gold Mana Souls; legacy upgrades retain checks','enabled/disabled/preview button policy','real store quota rollback and gathering owner acknowledgement');
const report={pass:true,at:new Date().toISOString(),checks};writeFileSync('docs/infinite-resources/tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
