import ts from 'typescript';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=ts.transpileModule(fs.readFileSync('src/stronghold/progression.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const p=m.fresh();let seed=1;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
m.reward(p,random);m.reward(p,random);assert.equal(p.gold,10);assert.equal(p.level,2);assert.equal(new Set(p.offers).size,3);
assert.equal(m.choose(p,'forged',random),false);assert.equal(m.choose(p,p.offers[0],random),true);assert.equal(p.pending,0);
for(let i=0;i<100;i++)m.reward(p,random);assert.ok(p.level>10);const pending=p.pending;for(let i=0;i<pending;i++)assert.ok(m.choose(p,p.offers[0],random));assert.equal(p.pending,0);
console.log('Progression reward, distinct cards, invalid choice, overflow and queued selections passed');
