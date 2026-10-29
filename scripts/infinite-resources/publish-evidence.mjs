import {publishLayer,readDir} from '../arkodia/publish-layer.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base='https://arkodia.online',report=JSON.parse(await fs.readFile('docs/infinite-resources/production.json'));
const health=async()=>{const r=await fetch(base+'/healthz',{signal:AbortSignal.timeout(20000)});assert(r.ok);return r.json();};
assert.equal((await health()).build,report.commit);
const files=await readDir('docs/infinite-resources');
await publishLayer({name:'infinite-resources-evidence',files,prefix:'/infinite-resources',check:'/infinite-resources/production.json'});
for(const path of ['/production.json','/live-smoke.json','/README.md']){const r=await fetch(base+'/infinite-resources'+path,{signal:AbortSignal.timeout(20000)});assert(r.ok);assert.equal(await r.text(),await fs.readFile('docs/infinite-resources'+path,'utf8'));}
assert.equal((await health()).build,report.commit);console.log('Evidence read back byte-for-byte; runtime remains '+report.commit);
