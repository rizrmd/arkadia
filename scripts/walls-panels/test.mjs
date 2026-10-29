import {createServer} from 'vite';
import assert from 'node:assert/strict';
const v=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {wallsRecipe:r,wallsPanelState:state,savedWallsLevel:saved}=await v.ssrLoadModule('/src/stronghold/walls-panel.ts');
 assert.deepEqual(r(0),{level:1,operation:'Build',gold:25,wood:30,minutes:1,requiredCore:1});
 assert.equal(r(29).gold,16156);assert.equal(r(29).wood,19388);assert.equal(r(29).minutes,198);assert.equal(r(30),null);
 for(let l=0;l<30;l++){
  const x=r(l);assert.equal(x.gold,Math.ceil(25*1.25**l));assert.equal(x.wood,Math.ceil(30*1.25**l));assert.equal(x.minutes,Math.ceil(1*1.2**l));
  assert.equal(state(l,l+1).requirements.length,1);assert.equal(state(l,l+1).requirements[0].satisfied,true);
  if(l>0)assert.equal(state(l,l).requirements[0].satisfied,false);
 }
 assert.equal(saved({walls:{completedLevel:29,upgrade:{targetLevel:30}}}),29);assert.equal(saved({}),0);assert.throws(()=>saved({walls:{completedLevel:31}}));assert.throws(()=>r(-1));assert.throws(()=>r(1.2));assert.throws(()=>state(1,0));
 console.log('PASS: all 30 Walls recipes, completed Core boundaries, maximum level, save metadata retention');
}finally{await v.close();}
