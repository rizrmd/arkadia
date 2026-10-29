import {createServer} from 'vite';
import assert from 'node:assert/strict';
const v=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {farmRecipe:r,farmPanelState:state,savedFarmLevel:saved}=await v.ssrLoadModule('/src/stronghold/farm-panel.ts');
 assert.deepEqual(r(0),{level:1,operation:'Build',gold:150,wood:100,minutes:3,requiredCore:1});
 assert.equal(r(29).gold,96936);assert.equal(r(29).wood,64624);assert.equal(r(29).minutes,594);assert.equal(r(30),null);
 for(let l=0;l<30;l++){
  const x=r(l);assert.equal(x.gold,Math.ceil(150*1.25**l));assert.equal(x.wood,Math.ceil(100*1.25**l));assert.equal(x.minutes,Math.ceil(3*1.2**l));
  assert.equal(state(l,l+1).requirements.length,1);assert.equal(state(l,l+1).requirements[0].satisfied,true);
  if(l>0)assert.equal(state(l,l).requirements[0].satisfied,false);
 }
 assert.equal(saved({farm:{completedLevel:29,upgrade:{targetLevel:30}}}),29);assert.equal(saved({}),0);assert.throws(()=>saved({farm:{completedLevel:31}}));assert.throws(()=>r(-1));assert.throws(()=>r(1.2));assert.throws(()=>state(1,0));
 console.log('PASS: all 30 Farm recipes, completed Core boundaries, maximum level, save metadata retention');
}finally{await v.close();}
