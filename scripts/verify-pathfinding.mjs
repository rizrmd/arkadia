import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
try{
 const {detourDirection,navClear}=await vite.ssrLoadModule('/src/stronghold/detour.ts');
 const {createAutoWalk}=await vite.ssrLoadModule('/src/stronghold/auto-walk.ts');
 const {walkStep}=await vite.ssrLoadModule('/src/stronghold/net/movement.ts');
 const noCliff=()=>false;
 // A U opens away from the target. Greedy sliding gets trapped at its back wall.
 const free=p=>!(p.x>-2&&p.x<2&&p.y>-1&&p.y<0)&&!(Math.abs(p.x)>1.5&&Math.abs(p.x)<2&&p.y>=0&&p.y<3);
 const clear=(a,b)=>navClear(a,b,free,noCliff);
 let p={x:0,y:1},to={x:0,y:-2},state={points:[],target:to,ttl:0},away=false;
 for(let i=0;i<600&&Math.hypot(p.x-to.x,p.y-to.y)>.08;i++){
  const next=detourDirection(state,p,to,50,clear);assert.ok(next,'route must escape U');
  const dx=next.x-p.x,dy=next.y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,.04),q={x:p.x+dx/d*step,y:p.y+dy/d*step};
  assert.ok(clear(p,q),'detour crossed obstacle');p=q;away ||= p.y>2.8;
 }
 assert.ok(away&&Math.hypot(p.x-to.x,p.y-to.y)<.08,'must move away then reach target');
 // Moving targets invalidate cached paths; an unreachable target remains bounded.
 to={x:4,y:2};assert.ok(detourDirection(state,p,to,50,clear));
 const sealed=p=>Math.hypot(p.x,p.y)<1;
 const unreachable=detourDirection({points:[],target:{x:3,y:0},ttl:0},{x:0,y:0},{x:3,y:0},50,(a,b)=>navClear(a,b,sealed,noCliff));
 assert.ok(!unreachable||sealed(unreachable));
 // Actual player planner + movement executor: corner detour, rounded endpoints,
 // and recovery from a footprint covering the starting grid cell.
 for(const embedded of [false,true]){
  let pos={x:577,y:285};const start={...pos};
  const blocked=(x,y)=>x>600&&x<625&&y>250&&y<320 || embedded&&Math.hypot(x-start.x,y-start.y)<19;
  const walk=createAutoWalk({blocked,position:()=>pos});assert.ok(walk.goTo(651.8,286.1),'player route accepted');
  for(let i=0;i<2500&&walk.route();i++){
   const input=walk.input({x:0,y:0}),prev=pos;pos=walkStep(blocked,pos.x,pos.y,input,20);
   assert.ok(blocked(prev.x,prev.y)||!blocked(pos.x,pos.y),'player entered footprint');
  }
  assert.ok(Math.hypot(pos.x-651.8,pos.y-286.1)<4,`player failed to arrive: ${JSON.stringify(pos)}`);
  assert.ok(walk.goTo(550,280));assert.deepEqual(walk.input({x:-1,y:0}),{x:-1,y:0});assert.equal(walk.route(),null,'manual input cancels');
  assert.ok(walk.goTo(pos.x,pos.y));assert.deepEqual(walk.input({x:0,y:0}),{x:0,y:0});
 }
 console.log('PASS: U-shaped detour, moving/unreachable goals, player corner routing, embedded start recovery, manual takeover');
}finally{await vite.close();}
