import {createServer} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const v=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {lumberRecipe:r,lumberPanelState:s,savedLumberLevel}=await v.ssrLoadModule('/src/stronghold/lumber-panel.ts');
 const coverage=[];
 for(let t=1;t<=30;t++){
  const recipe=r(t-1);assert.equal(recipe.level,t);assert.equal(recipe.gold,Math.ceil(75*1.25**(t-1)));assert.equal(recipe.wood,Math.ceil(40*1.25**(t-1)));assert.equal(recipe.minutes,Math.ceil(1.2**(t-1)));
  assert.deepEqual(s(t-1,t).requirements,[{label:`Stronghold Core level ${t}`,satisfied:true}]);
  if(t>1)assert.equal(s(t-1,t-1).requirements[0].satisfied,false);
  if(t<30)assert.equal(s(t-1,t+1).requirements[0].satisfied,true);
  assert.equal(s(t-1,t).operationAvailable,false);coverage.push(recipe);
 }
 assert.deepEqual(r(0),{level:1,operation:'Build',gold:75,wood:40,minutes:1,requiredCore:1});assert.equal(r(29).gold,48468);assert.equal(r(29).wood,25850);assert.equal(r(29).minutes,198);
 assert.equal(r(30),null);assert.deepEqual(s(30,30).requirements,[]);assert.throws(()=>r(-1));assert.throws(()=>r(31));assert.throws(()=>r(1.5));assert.equal(savedLumberLevel({}),0);assert.equal(savedLumberLevel({lumberMill:{completedLevel:29,upgrade:{targetLevel:30}}}),29);assert.throws(()=>savedLumberLevel({lumberMill:{completedLevel:31}}));
 await fs.writeFile('docs/lumber-panels/coverage.json',JSON.stringify({pass:true,checks:'All 30 published recipes; below/equal/above completed Core gating; maximum level; invalid saves; in-progress target ignored; no transaction handler',coverage},null,2));console.log('PASS: all 30 recipes, sole prerequisite and completed-level gating, max level and save safety');
}finally{await v.close();}
