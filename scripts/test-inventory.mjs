import ts from 'typescript';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
// Compile actual modules with an in-memory data URL dependency map.
const urls={};for(const name of ['items','economy','progression','gameplay-save','store','inventory-store']){
 let source=await fs.readFile(`src/stronghold/${name}.ts`,'utf8');
 source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 source=source.replace(/from ['"]\.\/([^'"]+)['"]/g,(_,dep)=>`from '${urls[dep]}'`);
 urls[name]='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const items=await import(urls.items),economy=await import(urls.economy),store=await import(urls['inventory-store']);
const data=new Map();let fail=false;
globalThis.localStorage={getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw Error('Storage full');data.set(k,v);}};
let tail=Promise.resolve();Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(_key,fn)=>{const previous=tail;let release;tail=new Promise(r=>release=r);await previous;try{return fn();}finally{release();}}}}});
assert.deepEqual(store.inventorySnapshot(),items.starterInventory());
const legacy=economy.fresh();delete legacy.inventory;legacy.gold=777;localStorage.setItem(economy.KEY,JSON.stringify(legacy));
await store.addItems('health-potion',2);assert.equal(store.inventorySnapshot()['health-potion'],7);assert.equal(economy.load(localStorage.getItem(economy.KEY)).gold,777);
await Promise.all(Array.from({length:10},()=>store.addItems('health-potion',1)));assert.equal(store.inventorySnapshot()['health-potion'],17);
await store.removeItems('health-potion',17);assert.equal(store.inventorySnapshot()['health-potion'],0);await assert.rejects(store.removeItems('health-potion',1));
for(const n of [-1,0,NaN,1.5])await assert.rejects(store.addItems('health-potion',n));
await store.addItems('health-potion',99);await assert.rejects(store.addItems('health-potion',1));assert.equal(store.inventorySnapshot()['health-potion'],99);
let hp=20,effects=0;const heal=()=>{const before=hp;hp=Math.min(100,hp+40);effects++;return {undo(){hp=before;}};};
const first=store.useItem('health-potion',heal),second=store.useItem('health-potion',heal);await first;await assert.rejects(second);assert.equal(hp,60);assert.equal(effects,1);assert.equal(store.inventorySnapshot()['health-potion'],98);
fail=true;await assert.rejects(store.useItem('health-potion',heal));fail=false;assert.equal(hp,60);assert.equal(store.inventorySnapshot()['health-potion'],98);
await assert.rejects(store.useItem('stronghold-scroll',()=>{throw Error('Teleport blocked');}));assert.equal(store.inventorySnapshot()['stronghold-scroll'],2);
let home=false;await store.useItem('stronghold-scroll',()=>{home=true;return {undo(){home=false;}};});assert(home);assert.equal(store.inventorySnapshot()['stronghold-scroll'],1);
const saved=JSON.stringify(economy.load(localStorage.getItem(economy.KEY)));localStorage.setItem(economy.KEY,saved);assert.equal(store.inventorySnapshot()['stronghold-scroll'],1);
assert.deepEqual(items.readInventory({'health-potion':-5,'stronghold-scroll':1e6}),{'health-potion':0,'stronghold-scroll':99});
console.log('PASS: legacy migration, stacking, add/remove, bounds, shared save lock, duplicate use, effect/save rollback, successful/failed teleport and save/load.');
