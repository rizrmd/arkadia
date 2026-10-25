import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const source=await fs.readFile('src/stronghold/shadow-field.ts','utf8'),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {makeField,visibilityAt,receiverPoint,encodeDepth,decodeDepth,encodeGeometry,decodeGeometry,writeGeometry,fieldBounds,lightPoint,rasterSample}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
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
const elevated={x:60,y:30,z:20,alpha:1,owner:2},self=makeField([{x:0,y:0,z:80,alpha:1,owner:2}],sun,1);assert.equal(visibilityAt(self,elevated,sun),0);assert.equal(visibilityAt(self,{...r,owner:2},sun),1,'contact region retains self shadow, matching the GPU contract');const mutual=makeField([{x:0,y:0,z:80,alpha:1,owner:2},{x:20,y:10,z:60,alpha:1,owner:3}],sun,1);assert.equal(visibilityAt(mutual,elevated,sun),1);checks+=3;
const partialOverSolid=makeField([{...a,owner:2,alpha:.2},{...b,owner:3}],sun,1);assert.equal(visibilityAt(partialOverSolid,r,sun,1),1,'partial front must not hide opaque lower caster');assert.ok(Math.abs(visibilityAt(partialOverSolid,{x:20,y:10,z:60,alpha:1},sun,1)-.2)<.005,'receiver above opaque lower layer receives only partial upper shadow');checks+=2;
const aliased=makeField([{...a,owner:2,alpha:.2},{...b,owner:10}],sun,1);assert.equal(visibilityAt(aliased,elevated,sun,1,8),0,'physical owner ignores its own opaque volume proxy');assert.equal(visibilityAt(aliased,{...r,owner:2},sun,1,8),1,'opaque volume still shades the ground');checks+=2;
// Regression: an opaque source-cell mesh must not tear into a dot lattice when
// an oblique sun stretches sample spacing beyond the former 2x2 point splat.
const mesh=[];for(let x=0;x<50;x+=2)for(let z=0;z<50;z+=2)mesh.push({x:x+1,y:100+2*(x+1),z:z+1+2*(x+1),alpha:1,owner:7,quad:new Float32Array([x,100+2*x,z+2+2*x,x+2,100+2*(x+2),z+2+2*(x+2),x+2,100+2*(x+2),z+2*(x+2),x,100+2*x,z+2*x])});
let oldPointHoles=0;for(const dx of [-1.7,-.3,.3,1.7])for(const dy of [-.7,.09,.7]){
 const light={dx,dy,alpha:.4},continuous=makeField(mesh,light,1.25),points=makeField(mesh.map(({quad,...p})=>p),light,1.25);let holes=0;
 for(let u=4;u<=46;u++)for(let z=8;z<=46;z++){const p={x:u+dx*(z+2*u),y:100+2*u+dy*(z+2*u),z:0,alpha:1};if(!visibilityAt(continuous,p,light,1))holes++;if(!visibilityAt(points,p,light,1))oldPointHoles++;checks++;}
 assert.equal(holes,0,`opaque quad coverage tore at sun ${dx},${dy}`);
}
assert.ok(oldPointHoles>0,'Regression fixture must expose old point-splat holes');
const cutout=mesh.filter(p=>!(p.x>18&&p.x<32&&p.z-2*p.x>18&&p.z-2*p.x<32)),holeSun={dx:1.7,dy:.7,alpha:.4},holeField=makeField(cutout,holeSun,1.25);
assert.equal(visibilityAt(holeField,{x:25+1.7*75,y:150+.7*75,z:0,alpha:1},holeSun,1),0,'Triangle coverage must preserve real alpha apertures');checks++;
for(let owner=1;owner<=4095;owner+=137)for(let z=0;z<2047.5;z+=3.7){const [r,g,b,a]=encodeGeometry(z,owner,128),q=decodeGeometry(r,g,b);assert.equal(q.owner,owner);assert.ok(Math.abs(q.z-z)<=.25001);assert.equal(a,128);const buffer=new Uint8ClampedArray(8);writeGeometry(buffer,4,z,owner,128);assert.deepEqual(Array.from(buffer.slice(4)),[r,g,b,a]);checks++;}
assert.throws(()=>encodeGeometry(2048,1));assert.throws(()=>encodeGeometry(1,4096));const huge=fieldBounds([{x:0,y:0,z:0,alpha:1},{x:1e9,y:1,z:0,alpha:1}],{dx:0,dy:0,alpha:1});assert.ok(huge.width<=4096&&huge.height<=4096);checks+=3;
// A solid native box must cast its full top projection without a depth-map
// silhouette interpolating to zero and creating spurious triangular curtains.
const nativeSource=await fs.readFile('src/stronghold/native-shadow-sampling.ts','utf8'),nativeJs=ts.transpileModule(nativeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {sampleNativeBoxes}=await import('data:text/javascript;base64,'+Buffer.from(nativeJs).toString('base64'));
const nativeAlpha=new Uint8ClampedArray(100*100*4).fill(255);
for(const flip of [false,true])for(const vertical of [.7,1,1.3])for(const light of [{dx:1.594,dy:.092,alpha:1},{dx:.278,dy:.307,alpha:1},{dx:-.826,dy:.743,alpha:1}]){
 const p={x:100,y:200,width:100,height:100,pivot:[.5,.7],flip,vertical,shear:.17,lift:5,nativeGeometry:{boxes:[[-.2,-.2,.2,.2,0,60]],world:[100,100],pivot:[.5,.7]}},samples=sampleNativeBoxes(p,nativeAlpha,100,100,1).samples,field=makeField(samples,light,1.25),z=5+60*vertical;
 for(const u of [-.15,-.1,0,.1,.15])for(const v of [-.15,-.1,0,.1,.15]){const x=100+64*(u-v)*(flip?-1:1),screenY=195+.17*(x-100)+(32*(u+v)-60)*vertical,y=screenY+z;for(const receiver of [0,20,z-2]){assert.equal(visibilityAt(field,{x:x+light.dx*(z-receiver),y:y+light.dy*(z-receiver),z:receiver,alpha:1},light,1),1,'Native top projection has a hole');checks++;}assert.equal(visibilityAt(field,{x:x-5*light.dx,y:y-5*light.dy,z:z+5,alpha:1},light,1),0,'Native box shaded above its top');checks++;}
}
// Casters cover intersected texels; receivers must not grow beyond visible
// geometry and accidentally suppress their own shadow beside the sprite.
const receiverQuad={x:10.6,y:10.6,z:0,alpha:1,quad:new Float32Array([10.6,10.6,0,12.4,10.6,0,12.4,12.4,0,10.6,12.4,0])},rb={left:0,top:0,step:1,width:24,height:24},castCells=new Set(),receiveCells=new Set();
rasterSample(receiverQuad,{dx:0,dy:0,alpha:1},rb,k=>castCells.add(k));rasterSample(receiverQuad,{dx:0,dy:0,alpha:1},rb,k=>receiveCells.add(k),false);assert.ok(castCells.has(10*24+10));assert.ok(!receiveCells.has(10*24+10));assert.ok(receiveCells.has(11*24+11));checks+=3;
console.log(JSON.stringify({ok:true,checks,oldPointHoles,coverage:['12 light vectors','snow and elevated receivers','above-caster rejection','transparent holes and partial-alpha coverage','depth order independence','partial-over-opaque occlusion','GPU-matched contact self-shadow policy','16-bit height precision','gap-free projected source-cell triangles','real alpha aperture preserved','packed instance/height/alpha precision','4096 texture dimension bound']}));
