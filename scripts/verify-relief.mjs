import {createServer} from 'vite';import fs from 'node:fs';import assert from 'node:assert/strict';
// Terrain height checks (Knowledge: Environment > Terrain Height): node scripts/verify-relief.mjs
// The client's heights and walk rule (world/relief.ts, net/movement.ts walkStep) give the same results as the Go
// tests in server/internal/sim/relief_test.go: cliff faces block, ramps climb, the flat court is unchanged.
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
try{
 const {heightAtTile,cliffTile,RELIEF,PX_PER_METER,MAX_STEP_M}=await vite.ssrLoadModule('/src/world/relief.ts');
 const {walkStep}=await vite.ssrLoadModule('/src/stronghold/net/movement.ts');
 const {walkableGround}=await vite.ssrLoadModule('/src/stronghold/navigation.ts');
 const {tilePoint}=await vite.ssrLoadModule('/src/stronghold/terrain.ts');
 const {unproject}=await vite.ssrLoadModule('/src/isometric.ts');
 assert.ok(fs.readFileSync('src/world/maps/arkodia-01.json').equals(fs.readFileSync('server/internal/sim/arkodia-01.json')),'server/internal/sim/arkodia-01.json must be a copy of the client map');
 for(const [u,v,want] of [[25.5,7.5,3],[23,5,3],[27.99,9.99,3],[28,7.5,0],[22.99,7.5,0],[25,10,3],[25,11.5,1.5],[25,12.99,3*.01/3],[25,13,0],[5,25,1.5],[9.5,25,.75],[7.5,7.5,0]])
  assert.ok(Math.abs(heightAtTile(u,v)-want)<1e-9,`height(${u}, ${v}) = ${heightAtTile(u,v)}, want ${want}`);
 // Walk like the Go test: a held direction in 50 ms ticks. Footprints are not needed here; ground walkability is.
 const tile=(x,y)=>{const g=unproject(x-577,y+160);return {u:g.x,v:g.y};};
 const walk=(u,v,d,seconds)=>{let p=tilePoint(u,v);const l=Math.hypot(d.x,d.y);for(let i=0;i<seconds*20;i++)p=walkStep((x,y)=>!walkableGround(x,y),p.x,p.y,{x:d.x/l,y:d.y/l},50);return tile(p.x,p.y);};
 const up={x:-64,y:-32},down={x:64,y:32},left={x:64,y:-32};
 let g=walk(29.5,7.5,up,3);assert.ok(g.u>=28-.05&&heightAtTile(g.u,g.v)===0,'walked into the cliff face: '+JSON.stringify(g));
 g=walk(25.5,13.8,left,4);assert.ok(heightAtTile(g.u,g.v)===3&&g.v<=9.5,'ramp climb ended at '+JSON.stringify(g));
 const top=g;
 g=walk(25.5,6,left,3);assert.ok(heightAtTile(g.u,g.v)===3&&g.v>=5-.05,'walked off the back edge: '+JSON.stringify(g));
 g=walk(25.5,11.5,down,3);assert.ok(g.u<=26+.05&&heightAtTile(g.u,g.v)>=.4,'walked off the ramp side: '+JSON.stringify(g));
 assert.ok(cliffTile(29,7.5,27.9,7.5)&&!cliffTile(25,12.9,25,12.8));
 console.log(JSON.stringify({features:RELIEF.map(f=>({id:f.id,type:f.type,court:[f.u0,f.v0,f.u1,f.v1],topM:f.heightM??f.topM})),pxPerMeter:PX_PER_METER,maxStepM:MAX_STEP_M,rampClimbEnd:top},null,1));
 console.log('PASS terrain heights, cliffs block, ramps climb');
}finally{await vite.close();}
