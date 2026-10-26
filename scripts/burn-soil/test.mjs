import ts from 'typescript';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const code=ts.transpileModule(await fs.readFile('src/fx/burn-soil.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createBurnSoilClock,burnSoilState}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const results=[];
for(const rank of [1,2,3,4,5])for(const cadence of [[1000/144],[1000/60],[1000/30],[200],[750],[1200],[16,300,4,480,400]]){
 const calls=[],c=createBurnSoilClock(rank,(at,damage)=>calls.push({at,damage}));let i=0;while(c.elapsedMs<1300)c.advance(cadence[i++%cadence.length]);
 assert.deepEqual(calls,rank<3?[]:[200,400,600,800,1000].map(at=>({at,damage:null})));
 results.push({rank,cadence,calls});
}
for(const rank of [1,2,3,4,5])for(const t of [-1,0,199.999,200,999.999,1000,1200]){
 const b=burnSoilState(rank,t);assert.equal(b.active,rank>=3&&t>=0&&t<1000);assert.equal(b.ticks,rank<3?0:Math.max(0,Math.min(5,Math.floor(t/200))));assert.equal(b.damagePerTick,null);
}
await fs.writeFile('docs/burn-soil/scheduling.json',JSON.stringify({pass:true,results},null,2));console.log('PASS 35 rank/cadence cases; exact boundaries; pending balance');
