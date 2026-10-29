import assert from 'node:assert/strict';import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
try{const r=await vite.ssrLoadModule('/src/stronghold/gathering-rules.ts');const {DAY_MS}=await vite.ssrLoadModule('/src/stronghold/daylight.ts');
const s=r.readGathering(undefined,12345),food=r.emptyResources();food.food=10;
for(let day=1;day<=10;day++){for(let i=0;i<DAY_MS/100;i++)r.advanceClock(s,100);assert.equal(s.hunger,100);}
assert(s.day>12345,'gathering clock must still advance');
for(const hunger of [0,20,78,99,100]){const loaded=r.readGathering({...s,hunger});assert.equal(loaded.hunger,100);assert.equal(loaded.day,s.day);assert.deepEqual(loaded.trees,s.trees);assert.deepEqual(loaded.animals,s.animals);}
s.hunger=20;r.advanceClock(s,0);assert.equal(s.hunger,100);
for(let i=0;i<30;i++)assert.equal(r.eat(s,food),false);assert.equal(food.food,10);assert.equal(s.hunger,100);
assert.deepEqual(r.readGathering(JSON.parse(JSON.stringify(s))),s);
const legacy={...s};delete legacy.hunger;assert.equal(r.readGathering(legacy).hunger,100);
for(const n of [-1,101,NaN,null])assert.throws(()=>r.readGathering({...s,hunger:n}));
for(const dt of [-1,121,NaN])assert.throws(()=>r.advanceClock(s,dt));
console.log('PASS fixed full hunger over 10 days, existing/legacy save normalization, unchanged gathering state, no Food spent, reload and invalid saves');}finally{await vite.close();}
