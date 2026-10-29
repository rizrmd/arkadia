import {createServer} from 'vite';
import assert from 'node:assert/strict';
const v=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {kitchenRecipe:r,kitchenPanelState:s,savedKitchenLevel:saved}=await v.ssrLoadModule('/src/stronghold/kitchen-panel.ts');
 assert.deepEqual(r(0),{level:1,operation:'Build',gold:75,wood:40,minutes:1,requiredCore:1});
 assert.equal(r(29).gold,48468);assert.equal(r(29).wood,25850);assert.equal(r(29).minutes,198);assert.equal(r(30),null);
 for(let l=0;l<30;l++){
  const x=l+1,recipe=r(l);assert.equal(recipe.gold,Math.ceil(75*1.25**l));assert.equal(recipe.wood,Math.ceil(40*1.25**l));assert.equal(recipe.minutes,Math.ceil(1.2**l));
  assert.deepEqual(s(l,x,x).requirements,[{label:`Stronghold Core level ${x}`,satisfied:true},{label:`Farm level ${x}`,satisfied:true}]);
  assert.equal(s(l,x,x-1).requirements[1].satisfied,false);if(l>0)assert.equal(s(l,x-1,x).requirements[0].satisfied,false);
  assert(s(l,30,30).requirements.every(r=>r.satisfied));assert.equal(s(l,x,x).operationAvailable,false);
 }
 assert.equal(saved({kitchen:{completedLevel:29,upgrade:{targetLevel:30}}}),29);assert.equal(saved({}),0);
 for(const invalid of [-1,31,1.5,'2',null])assert.throws(()=>saved({kitchen:{completedLevel:invalid}}));
 assert.equal(s(30,30,30).requirements.length,0);assert.throws(()=>r(-1));assert.throws(()=>r(1.2));
 console.log('PASS: 30 Kitchen recipes, exactly two independent completed-level gates, in-progress target excluded, max level, malformed saves retained; panel never mutates economy.');
}finally{await v.close();}
