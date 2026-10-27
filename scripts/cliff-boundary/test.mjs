import {createServer} from 'vite';import assert from 'node:assert/strict';
const vite=await createServer({server:{hmr:false,watch:null},logLevel:'error'});
try{
 const r=await vite.ssrLoadModule('/src/world/relief.ts'),{tilePoint}=await vite.ssrLoadModule('/src/stronghold/terrain.ts');let count=0;
 for(const f of r.RELIEF.filter(f=>f.type==='hill')){
  let invalid;
  for(let u=f.u0+.1;u<f.u1&&!invalid;u+=.2)for(let v=f.v0+.1;v<f.v1;v+=.2)if(r.inside(f,u,v)&&r.reliefBlockedTile(u,v)){invalid=tilePoint(u,v);break}
  assert(invalid);
  const recovered=r.recoverReliefPosition(invalid.x,invalid.y,r.reliefBlocked);assert(recovered);assert(!r.reliefBlocked(recovered.x,recovered.y));assert(Math.abs(r.heightAt(recovered.x,recovered.y)-r.heightAt(invalid.x,invalid.y))<=r.MAX_STEP_M);assert(Math.hypot(recovered.x-invalid.x,recovered.y-invalid.y)<=128);
  assert.equal(r.recoverReliefPosition(invalid.x,invalid.y,()=>true),null,'fully blocked area must not invent a valid destination');count++;
 }
 const court=tilePoint(7.5,7.5);assert.equal(r.recoverReliefPosition(court.x,court.y,()=>false),null,'ordinary valid positions stay unchanged');console.log('PASS same-height recovery on',count,'hills');
}finally{await vite.close()}
