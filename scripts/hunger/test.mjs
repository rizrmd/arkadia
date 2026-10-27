import assert from 'node:assert/strict';import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
try{const r=await vite.ssrLoadModule('/src/stronghold/gathering-rules.ts');const {DAY_MS}=await vite.ssrLoadModule('/src/stronghold/daylight.ts');
let s=r.readGathering(undefined,12345),food=r.emptyResources();assert.equal(s.hunger,100);
for(let day=1;day<=10;day++){for(let i=0;i<DAY_MS/100;i++)r.advanceClock(s,100);assert(Math.abs(s.hunger-(100-day*10))<1e-8);}assert.equal(s.hunger,0);r.advanceClock(s,120);assert.equal(s.hunger,0);
food.food=10;for(let i=0;i<5;i++)assert(r.eat(s,food));assert.equal(s.hunger,100);assert.equal(food.food,5);for(let i=0;i<30;i++)assert.equal(r.eat(s,food),false);assert.equal(food.food,5);
s.hunger=99;assert(r.eat(s,food));assert.equal(s.hunger,100);assert.equal(food.food,4);s.hunger=20;food.food=0;assert.equal(r.eat(s,food),false);assert.equal(s.hunger,20);
const raw=JSON.stringify(s);assert.deepEqual(r.readGathering(JSON.parse(raw),999999),s);delete s.hunger;assert.equal(r.readGathering(s).hunger,100);for(const n of [-1,101,NaN,null])assert.throws(()=>r.readGathering({...s,hunger:n}));
console.log('PASS exact 10-day depletion, clamps, cost/restoration, repeated/full/empty taps, reload, legacy migration and invalid saves');}finally{await vite.close();}
