import assert from 'node:assert/strict';import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
try{const {moveWildlife}=await vite.ssrLoadModule('/src/stronghold/wildlife-motion.ts');
for(const species of ['deer','crocodile']){
 let seed=17;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const a={u:0,v:0,status:'alive'},r={home:{u:0,v:0},goal:null,wait:0,moving:false,facing:1};const positions=[];
 for(let i=0;i<600;i++){const old={...a};moveWildlife(a,species,r,100,3,{u:100,v:100},()=>true,()=>true,rng);assert(Math.hypot(a.u-old.u,a.v-old.v)*3<.121);assert(Math.hypot(a.u,a.v)*3<=6.001);if(i%100===0)positions.push([a.u,a.v]);}
 assert(new Set(positions.map(p=>JSON.stringify(p))).size>3);const p={...a};moveWildlife(a,species,r,100,3,a,()=>true,()=>true,rng);assert.deepEqual(a,p);assert(!r.moving);
 a.status='loot';for(let i=0;i<10;i++)moveWildlife(a,species,r,100,3,{u:100,v:100},()=>true,()=>true,rng);assert.equal(a.u,p.u);assert.equal(a.v,p.v);
 a.status='alive';r.goal={u:100,v:100};moveWildlife(a,species,r,100,3,{u:100,v:100},()=>false,()=>true,rng);assert.equal(a.u,p.u);assert(!r.moving);
 r.goal=null;moveWildlife(a,species,r,1000,3,{u:100,v:100},()=>true,()=>false,rng);assert.equal(a.u,p.u);assert.equal(a.v,p.v);
 console.log('PASS',species,'random displacement, speed/radius bounds, hunt windup, stationary loot, blocked terrain/path');}
}finally{await vite.close();}
