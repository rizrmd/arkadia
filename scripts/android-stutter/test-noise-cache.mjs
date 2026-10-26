import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {cacheCornerGradient} from '../../src/fx/noise-gradient-cache.ts';import {originalCornerGradient} from '../vite/nixie-noise-cache.ts';
const file=new URL('../../node_modules/nixie-fx/dist/chunk-DDYEJ3XB.js',import.meta.url),original=await fs.readFile(file,'utf8');assert.ok(original.includes(originalCornerGradient));
const cached=original.replace(originalCornerGradient,originalCornerGradient.replace('function cornerGradient(','function uncachedCornerGradient(')+'\nconst cornerGradient=('+cacheCornerGradient.toString()+')(uncachedCornerGradient);');
const load=code=>import('data:text/javascript;base64,'+Buffer.from(code.replace(/from '(\.\/[^']+)'/g,(_m,p)=>`from '${new URL(p,file).href}'`)).toString('base64'));
const [before,after]=await Promise.all([load(original),load(cached)]),a=[0,0,0],b=[0,0,0];let checks=0;
let seed=13245;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
for(let i=0;i<40000;i++){const x=(random()-.5)*200,y=(random()-.5)*200,z=(random()-.5)*200,s=i%11?i%3*101:(random()*2**32)|0;for(const name of ['gradientNoise3DGradientInto','sampleCurlNoise3']){before[name](x,y,z,s,a);after[name](x,y,z,s,b);assert.deepEqual(b,a,`${name} ${i}`);checks++;}}
// Exercise int32 aliasing, slot collisions and eviction explicitly.
let calls=0;const fn=cacheCornerGradient((x,y,z,s,out)=>{calls++;out[0]=(x|0)*.125;out[1]=(y|0)+(s|0);out[2]=(z|0)*.25;});fn(1,2,3,4,a);fn(1+2**32,2,3,4,b);assert.deepEqual(a,b);assert.equal(calls,1);for(let i=0;i<20000;i++)fn(i,i+1,i-1,101,b);fn(1,2,3,4,b);assert.deepEqual(a,b);
const workload=m=>{let sum=0;const start=performance.now();for(let frame=0;frame<100;frame++)for(let particle=0;particle<500;particle++){const x=(particle%20)*.03+frame*.006,y=(particle%7)*.04,z=particle%13*.02+frame*.004;m.sampleCurlNoise3(x,y,z,particle%3*101,a);sum+=a[0];}return {ms:performance.now()-start,sum};};
workload(before);workload(after);const oldRuns=[],newRuns=[];for(let i=0;i<5;i++){oldRuns.push(workload(before));newRuns.push(workload(after));assert.equal(oldRuns[i].sum,newRuns[i].sum);}
const median=r=>r.map(x=>x.ms).sort((a,b)=>a-b)[2],result={checks,beforeMs:median(oldRuns),afterMs:median(newRuns),cacheBytes:8192*(1+4*4+3*8),exactSums:true};await fs.writeFile('docs/android-stutter/noise-cache-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
