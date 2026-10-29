// Seeded real progression paths, independent gate contract, exact Rift baseline, and Go/client random-tape parity.
import ts from 'typescript';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const BASE='2de5e4d',SRC='src/stronghold/progression.ts',OUT='docs/ember-gates';fs.mkdirSync(OUT,{recursive:true});
const load=async code=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const m=await load(fs.readFileSync(SRC,'utf8')),old=await load(execFileSync('git',['show',`${BASE}:${SRC}`],{encoding:'utf8'}));
const rng=seed=>()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const gates={'flame-fan':0,'cinder-step':0,'ember-snare':0,heal:0,might:0,cleave:4,shockwave:4,nova:4,leech:4,haste:8,vitality:8};
assert.deepEqual(m.EMBER_TIER_POINTS,gates);
let offers=0,fallbacks=0,riftCompared=0,parity=0;
const strategies={random:(p,r)=>p.offers[Math.floor(r()*3)],passive:p=>p.offers[0],rank:p=>p.offers.includes('flame-fan')?'flame-fan':p.offers[1],active:p=>p.offers.find(m.isActiveSkill)??p.offers[0]};
function check(p,picks){
 assert.equal(m.pointsSpent(p),picks,'points equal cards actually taken');assert.equal(p.offers.length,3);assert.equal(new Set(p.offers).size,3);
 const lv=p.level-p.pending+1;
 const available=m.eligibleActiveSkills(p,'ember-warden').filter(id=>m.emberCardEligible(p,id));
 assert.equal(p.offers.filter(m.isActiveSkill).length,Math.min(2,available.length),'two active cards whenever possible');
 assert(!m.isActiveSkill(p.offers[0]),'passive first');
 for(const id of p.offers){
  assert(m.cards[id],`known card ${id}`);
  if(id==='star'){assert(lv>=20,'capstone pending level');continue;}
  assert(id in gates,'no concepts/other hero');assert((p.skills[id]??0)>0||picks>=gates[id],`locked ${id}`);
  if(m.isActiveSkill(id)){assert((p.skills[id]??0)<5,'active rank cap');assert((p.skills[id]??0)>0||m.learnedActives(p,'ember-warden').length<4,'learned limit');}
 }
 if(lv===20)assert.equal(p.offers[0],'star');
 if(p.offers.slice(1).some(id=>!m.isActiveSkill(id)))fallbacks++;
 offers++;
}
for(const pick of Object.values(strategies))for(let seed=1;seed<=400;seed++){
 const p=m.fresh('ember-warden'),r=rng(seed),pr=rng(seed^0x123456);let picks=0;
 while(p.level<20||p.pending){
  if(!p.pending){m.reward(p,r,'ember-warden',p.level);continue;}
  check(p,picks);assert(m.choose(p,pick(p,pr),r,'ember-warden'));picks++;
  assert(p.slots.length<=3);assert(m.learnedActives(p,'ember-warden').length<=4);
 }
 // Preserve Rift seed-for-seed through its own reward and choose paths.
 const a=old.fresh(),b=m.fresh(),ar=rng(seed),br=rng(seed),pr2=rng(seed^0xabcdef);
 while(a.level<20||a.pending){
  if(!a.pending){old.reward(a,ar,'rift-runner',a.level);m.reward(b,br,'rift-runner',b.level);continue;}
  assert.deepEqual(b,a,'Rift state/offers unchanged');riftCompared++;
  const id=pick(a,pr2);assert(old.choose(a,id,ar));assert(m.choose(b,id,br));
 }
 assert.deepEqual(b,a);
}
for(const pts of [0,3,4,7,8]){
 const p=m.fresh('ember-warden');p.skills.heal=pts;p.level=10;p.pending=1;
 assert.equal(m.emberCardEligible(p,'cleave'),pts>=4);assert.equal(m.emberCardEligible(p,'haste'),pts>=8);
 for(let seed=1;seed<=50;seed++){m.roll(p,rng(seed),'ember-warden');check(p,pts);}
}
const owned=m.fresh('ember-warden');owned.skills.cleave=1;assert(m.emberCardEligible(owned,'cleave'));
const batch=m.fresh('ember-warden');batch.level=20;batch.pending=19;let picks=0;const r=rng(19);
while(batch.pending){m.roll(batch,r,'ember-warden');check(batch,picks);assert(m.choose(batch,batch.offers[0],r,'ember-warden'));picks++;}
const full=m.fresh('ember-warden');full.level=19;full.pending=1;full.skills={'flame-fan':5,'cinder-step':5,'ember-snare':5,cleave:5};full.slots=['flame-fan','cinder-step','ember-snare'];
for(let seed=1;seed<=100;seed++){m.roll(full,rng(seed),'ember-warden');check(full,19);assert(full.offers.every(id=>!m.isActiveSkill(id)));}
full.skills.cleave=4;full.offers=['cleave'];assert(m.choose(full,'cleave',rng(1),'ember-warden'));assert.equal(full.skills.cleave,5);assert.equal(full.slots.length,3);
full.pending=1;full.offers=['cleave'];assert.equal(m.choose(full,'cleave',rng(1),'ember-warden'),false);
const stale=m.fresh('ember-warden');stale.level=2;stale.pending=1;stale.offers=['cleave'];assert.equal(m.choose(stale,'cleave',rng(1),'ember-warden'),false);
const tmp=path.join(os.tmpdir(),`ember-parity-${process.pid}.json`);
try{
 const go=path.join(os.homedir(),'.local/go/bin/go');
 console.log(execFileSync(go,['test','./internal/sim','-run','TestEmber|TestRiftRunnerTierGates|TestRiftGateRegressionDigest','-count=1'],{cwd:'server',env:{...process.env,GOFLAGS:'-p=1',GOMAXPROCS:'2',GOMEMLIMIT:'256MiB',EMBER_PARITY_OUT:tmp},encoding:'utf8',timeout:180000}));
 for(const f of JSON.parse(fs.readFileSync(tmp))){
  const p=f.before;let i=0;m.roll(p,()=>f.random[i++],'ember-warden');assert.deepEqual(p.offers,f.offers,'Go/TS offer parity');
  assert(m.choose(p,f.pick,()=>0,'ember-warden'));
  for(const k of ['level','pending','skills','stars','slots','offers'])assert.deepEqual(p[k],f.after[k],`Go/TS choice parity ${k}`);
  parity++;
 }
}finally{fs.rmSync(tmp,{force:true});}
const report={ok:true,baseline:BASE,seeds:400,strategies:Object.keys(strategies),emberOffersChecked:offers,validFallbackOffers:fallbacks,riftOffersIdentical:riftCompared,goSeededOffers:300*4*19,goClientParityCases:parity,boundaryPoints:[0,3,4,7,8],checks:['batched pending capstone','owned rank-up bypass','rank five cap','four learned/three equipped','all-actives-capped passive fallback','stale choice rejection']};
fs.writeFileSync(`${OUT}/verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
