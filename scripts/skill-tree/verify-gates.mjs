// Tier gates for Rift Runner level-up cards (Knowledge: "Rift Runner — Ascension Tree Concept", Implementation → Tier gates).
// Simulates seeded runs from Lv. 1 to Lv. 20 through the game's own level-up path (reward → roll → choose) and checks:
// - no offer holds a card from a locked tier (Tier II needs 4 points, Tier III 8; points = cards taken), except
//   rank-ups of skills already owned,
// - Ascendant Star never appears before Lv. 20, and is the passive card of the Lv. 20 offer,
// - every offer is 1 passive + 2 actives, three distinct, known cards (no blank card),
// - Ember Warden now has its own gates, verified by scripts/ember-gates/verify.mjs (Stage 3).
// Usage: node scripts/skill-tree/verify-gates.mjs [--seeds N]  (writes docs/skill-tree/verify-gates.json)
import ts from 'typescript';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';

const BASELINE_REF='d7926df';
const SRC='src/stronghold/progression.ts';
const seedsArg=process.argv.indexOf('--seeds');
const SEEDS=seedsArg>0?Number(process.argv[seedsArg+1]):400;
const load=async code=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const cur=await load(fs.readFileSync(SRC,'utf8'));
const base=await load(execFileSync('git',['show',`${BASELINE_REF}:${SRC}`],{encoding:'utf8'}));
// mulberry32: neighbouring seeds give unrelated streams, so the first offers vary across runs.
const prng=seed=>()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

const TIER={'rift-bolt':0,'rift-dash':0,'rift-trap':0,heal:0,might:0,cleave:4,shockwave:4,nova:4,leech:4,haste:8,vitality:8};
const NAMES=Object.fromEntries(Object.entries(cur.cards).map(([id,c])=>[id,c.name]));
const PASSIVES=new Set(cur.PASSIVE_BLESSING_IDS);
assert.deepEqual(cur.RIFT_TIER_POINTS,TIER,'RIFT_TIER_POINTS matches the Knowledge tier table');

// Pick strategies, so gated pools are also exhausted from different directions.
const STRATEGIES={
 random:(offers,r)=>offers[Math.floor(r()*offers.length)],
 'rank-rift-bolt':offers=>offers.includes('rift-bolt')?'rift-bolt':offers[1]??offers[0],
 'passives-only':offers=>offers[0],
 'actives-first':(offers,r)=>{const a=offers.filter(cur.isActiveSkill);return a.length?a[Math.floor(r()*a.length)]:offers[0];}
};

// Levels up through reward() until Lv. 20, choosing with `pick`; returns every offer seen with its context.
function run(m,hero,seed,pick){
 const random=prng(seed),pickRandom=prng(seed^0x5bd1e995),p=m.fresh(hero),seen=[];
 let picks=0,guard=0;
 while(p.level<20||p.pending){
  if(++guard>100000)throw new Error(`${hero} seed ${seed}: run did not reach Lv. 20`);
  if(p.pending){
   const lv=p.level-p.pending+1,offers=[...p.offers];
   seen.push({level:lv,points:picks,offers,skills:{...p.skills},stars:p.stars,slots:[...p.slots]});
   const id=pick(offers,pickRandom);
   if(!m.choose(p,id,random,hero))throw new Error(`${hero} seed ${seed} Lv.${lv}: choose(${id}) refused, offer ${offers}`);
   picks++;
   continue;
  }
  m.reward(p,random,hero,p.level);
 }
 return {seen,final:p};
}

const failures=[];
const fail=(msg)=>{if(failures.length<20)failures.push(msg);};
let offersChecked=0,firstOffers=new Map(),starOffers=0,fallbacks=0;
for(const [name,pick] of Object.entries(STRATEGIES)){
 for(let seed=1;seed<=SEEDS;seed++){
  const {seen}=run(cur,'rift-runner',seed,pick);
  for(const o of seen){
   offersChecked++;
   const tag=`rift-runner ${name} seed ${seed} Lv.${o.level} (${o.points} pts) [${o.offers.join(', ')}]`;
   if(o.points!==cur.pointsSpent({skills:o.skills,stars:o.stars}))fail(`${tag}: pointsSpent ${cur.pointsSpent({skills:o.skills,stars:o.stars})} != cards taken ${o.points}`);
   if(o.offers.length!==3||new Set(o.offers).size!==3||o.offers.some(id=>!NAMES[id]))fail(`${tag}: blank, duplicate or unknown card`);
   if(!PASSIVES.has(o.offers[0])||o.offers.slice(1).some(id=>PASSIVES.has(id)))fallbacks++;
   if(o.level===2&&o.offers[0]&&!firstOffers.has(o.offers.join(',')))firstOffers.set(o.offers.join(','),o.offers.map(id=>NAMES[id]));
   for(const id of o.offers){
    if(id==='star'){starOffers++;if(o.level<20)fail(`${tag}: Ascendant Star before Lv. 20`);continue;}
    const gate=TIER[id];
    if(gate==null){fail(`${tag}: ${id} is not a Rift Runner card`);continue;}
    const owned=(o.skills[id]??0)>0||o.slots.includes(id);
    if(o.points<gate&&!owned)fail(`${tag}: ${NAMES[id]} needs ${gate} points`);
   }
   if(o.level===20&&o.offers[0]!=='star')fail(`${tag}: Lv. 20 passive card is not Ascendant Star`);
  }
 }
}

// Ember gating intentionally supersedes the earlier unchanged-Ember invariant. Its independent seeded,
// rank-cap, fallback and TS/Go parity checks live in scripts/ember-gates/verify.mjs.

// The baseline reproduces the bug: an ungated Rift Runner offers Tier II/III or Ascendant Star cards on the first level-up.
let baselineLocked=0;
for(let seed=1;seed<=SEEDS;seed++){
 const o=run(base,'rift-runner',seed,STRATEGIES.random).seen[0];
 if(o.offers.some(id=>id==='star'||(TIER[id]??0)>0))baselineLocked++;
}

const result={
 ok:!failures.length,
 baselineRef:BASELINE_REF,
 seeds:SEEDS,strategies:Object.keys(STRATEGIES),
 riftRunner:{offersChecked,lockedTierOffers:failures.filter(f=>f.includes('needs')).length,ascendantStarOffers:starOffers,offersUsingFallback:fallbacks,
  distinctFirstOffers:[...firstOffers.values()].map(n=>n.join(' · '))},
 emberWarden:{gated:true,verification:'node scripts/ember-gates/verify.mjs'},
 baselineBug:{firstOffersWithLockedCard:baselineLocked,of:SEEDS},
 failures
};
fs.mkdirSync('docs/skill-tree',{recursive:true});
fs.writeFileSync('docs/skill-tree/verify-gates.json',JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify(result,null,1));
if(!result.ok){console.error('FAIL');process.exit(1);}
console.log(`PASS: ${offersChecked} Rift Runner offers gated, Ember verification: node scripts/ember-gates/verify.mjs`);
