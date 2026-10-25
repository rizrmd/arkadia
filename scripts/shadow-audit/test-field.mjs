import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const source=await fs.readFile('src/stronghold/shadow-field.ts','utf8'),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {makeField,visibilityAt,receiverPoint,encodeDepth,decodeDepth,lightPoint}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let checks=0;
for(const dx of [-1.6,-.25,.2,1.6])for(const dy of [-.5,.05,.7]){
 const sun={dx,dy,alpha:.4},caster={x:100,y:200,z:80,alpha:1},field=makeField([caster],sun,1),ray=lightPoint(caster,sun);
 // Exact point on same light ray at lower receiver height must be blocked.
 for(const z of [0,12,40,76]){const p={x:ray.x-dx*z,y:ray.y-dy*z,z,alpha:1};assert.equal(visibilityAt(field,p,sun,1),1);const screen=receiverPoint(p.x,p.y-z,z);assert.deepEqual(screen,p);checks++;}
 // A surface above the caster must not receive the caster's shadow.
 for(const z of [80,90,120])assert.equal(visibilityAt(field,{x:ray.x-dx*z,y:ray.y-dy*z,z,alpha:1},sun,1),0);
 assert.equal(visibilityAt(field,{x:-1000,y:-1000,z:0,alpha:1},sun),0);checks+=4;
 const transparent=makeField([{...caster,alpha:0}],sun,1);assert.equal(visibilityAt(transparent,{x:ray.x,y:ray.y,z:0,alpha:1},sun),0);
 const edge=makeField([{...caster,alpha:.4}],sun,1);assert.ok(Math.abs(visibilityAt(edge,{x:ray.x,y:ray.y,z:0,alpha:1},sun)-.4)<.005);checks+=2;
}
for(let z=0;z<4000;z+=.37){const [r,g]=encodeDepth(z);assert.ok(Math.abs(decodeDepth(r,g)-z)<=1/32+.0001);checks++;}
// Depth, not source/placement iteration order, selects the nearest light-facing surface.
const sun={dx:1,dy:.5,alpha:.4},a={x:0,y:0,z:80,alpha:1},b={x:40,y:20,z:40,alpha:1},r={x:80,y:40,z:0,alpha:1};
assert.equal(visibilityAt(makeField([a,b],sun,1),r,sun),1);assert.equal(visibilityAt(makeField([b,a],sun,1),r,sun),1);checks+=2;
const self=makeField([{x:0,y:0,z:80,alpha:1,owner:2}],sun,1);assert.equal(visibilityAt(self,{...r,owner:2},sun),0);const mutual=makeField([{x:0,y:0,z:80,alpha:1,owner:2},{x:20,y:10,z:60,alpha:1,owner:3}],sun,1);assert.equal(visibilityAt(mutual,{...r,owner:2},sun),1);checks+=2;
console.log(JSON.stringify({ok:true,checks,coverage:['12 light vectors','snow and elevated receivers','above-caster rejection','transparent holes and partial-alpha coverage','depth order independence','16-bit height precision']}));
