import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
registerHooks({resolve(spec,ctx,next){if(spec.startsWith('.')&&ctx.parentURL?.endsWith('.ts')&&!/\.[a-z]+$/.test(spec))spec+='.ts';return next(spec,ctx);},load(url,ctx,next){if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,ctx);}});
const {buildingBranch,allowedDefense,constructDefense,readDefenses,defenseTarget,DEFENSE_SITE}=await import('../../src/stronghold/building-branches.ts');
const {fresh,load,action,KEY}=await import('../../src/stronghold/economy.ts');
assert.equal(buildingBranch('rift-runner').name,'Stormshade');assert.equal(buildingBranch('ember-warden').hero,'Amber Warden');assert.equal(buildingBranch('other'),null);
assert.equal(allowedDefense('other',undefined),false);
for(const [hero,good,bad] of [['rift-runner','watchtower','arcane-tower'],['ember-warden','arcane-tower','watchtower']]){
 const s=fresh(123);s.strongholdCore={completedLevel:12};s.resources.wood=100;s.customLegacyField={preserved:true};const before=JSON.stringify(s);
 assert.throws(()=>constructDefense(s,hero,bad),/faction/);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>constructDefense(s,hero,good,true,false),/solo/);assert.equal(JSON.stringify(s),before);
 constructDefense(s,hero,good,false,false);assert.equal(s.gold,500);assert.equal(s.resources.wood,75);
 const built=JSON.stringify(s);assert.throws(()=>constructDefense(s,hero,good,false,false),/already/);assert.equal(JSON.stringify(s),built);
 const loaded=load(built,123);assert.equal(loaded.careerDefenses[hero],good);assert.deepEqual(loaded.customLegacyField,{preserved:true});
 const poor=fresh(123);poor.strongholdCore={completedLevel:12};const p=JSON.stringify(poor);assert.throws(()=>constructDefense(poor,hero,good,false,false),/Requires/);assert.equal(JSON.stringify(poor),p);
}
const locked=fresh(123),lockedRaw=JSON.stringify(locked);assert.throws(()=>constructDefense(locked,'rift-runner','watchtower',false,false),/Core level 12/);assert.equal(JSON.stringify(locked),lockedRaw);
const legacy=fresh(123);delete legacy.careerDefenses;assert.deepEqual(load(JSON.stringify(legacy),123).careerDefenses,{});
assert.throws(()=>readDefenses({'rift-runner':'arcane-tower'}),/Invalid/);
assert.throws(()=>readDefenses({'unknown':'watchtower'}),/Invalid/);
const common=fresh(123);action(common,'altar');assert.equal(common.hero,true);
const near={x:DEFENSE_SITE.u+1,y:DEFENSE_SITE.v,alive:true},dead={...near,alive:false},far={...near,x:100};assert.equal(defenseTarget([dead,far,near]),near);assert.equal(defenseTarget([dead,far]),undefined);
// Exercise live-owner synchronization and failed writes through the actual store transaction.
const {setGatheringCapture,setGatheringResourceCommit}=await import('../../src/stronghold/gameplay-save.ts');
const {transactResources}=await import('../../src/stronghold/store.ts');
let liveWood=100,serialized=JSON.stringify({...fresh(123),resources:{wood:100,food:0,storedWood:0,storedFood:0},strongholdCore:{completedLevel:12}}),failWrite=false;
globalThis.localStorage={getItem:()=>serialized,setItem:(key,value)=>{if(failWrite)throw Error('Storage full');serialized=value;}};
Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(key,fn)=>fn()}},configurable:true});
setGatheringCapture(s=>{s.resources.wood=liveWood;});
setGatheringResourceCommit(s=>{const next=s.resources.wood;return ()=>{liveWood=next;};});
failWrite=true;const original=serialized;await assert.rejects(transactResources(s=>constructDefense(s,'rift-runner','watchtower',false,false)),/Storage full/);assert.equal(liveWood,100);assert.equal(serialized,original);
failWrite=false;await transactResources(s=>constructDefense(s,'rift-runner','watchtower',false,false));assert.equal(liveWood,75);
const root=JSON.parse(serialized);setGatheringCapture(s=>{s.resources.wood=liveWood;});root.resources.wood=liveWood;assert.equal(root.resources.wood,75);
const report={pass:true,checks:['both approved building branches','unknown hero denied','cross-faction denied atomically','co-op denied atomically','allowed build and resource charge','duplicate denied without charge','insufficient resources preserve save','legacy and per-hero persistence','unknown save fields preserved','invalid defense save rejected and Core level 12 construction gate','common building regression','generic enemy targeting and range','live gathering owner acknowledges resource charges','failed storage writes preserve resources and save'],economyKey:KEY};
writeFileSync('docs/building-tree/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
