import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import ts from 'typescript';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const companions=await read('src/world/maps/shadow-companions.json'),catalog=await read('src/world/maps/frozen-frontier-sprites.json');
globalThis.__shadowTestCompanions=companions;globalThis.__shadowTestCatalog=catalog;
let source=await fs.readFile('src/stronghold/shadow-geometry.ts','utf8');
source=source.replace(/^import companions.*$/m,`const companions=globalThis.__shadowTestCompanions;`).replace(/^import catalog.*$/m,`const catalog=globalThis.__shadowTestCatalog;`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateShadowCompanions,proxyGroundAt,reconstructProxy}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
validateShadowCompanions();let samples=0;
for(const [asset,s] of Object.entries(catalog.assets)){
 for(let i=0;i<=100;i++){
  const x=s.frame[2]*i/100,n=s.ground.length-1,t=Math.max(0,Math.min(n,x/s.frame[2]*n)),j=Math.min(n-1,Math.floor(t));
  const old=(n?s.ground[j]+(s.ground[j+1]-s.ground[j])*(t-j):s.ground[0])*s.frame[3];
  assert.equal(proxyGroundAt(asset,x),old,'baseline parity '+asset);samples++;
 }
 for(const flip of [false,true])for(const scale of [.6,1,1.4])for(const shear of [-.29,0,.25]){
  const p={asset,x:123,y:456,width:s.world[0]*scale,height:s.world[1]*scale,pivot:s.pivot,flip,shear,lift:25.3};
  for(const u of [0,s.frame[2]/2,s.frame[2]])for(const v of [0,s.frame[3]/2,s.frame[3]]){
   const q=reconstructProxy(p,u,v),sx=p.width/s.frame[2]*(flip?-1:1),sy=p.height/s.frame[3];
   assert.ok(Math.abs(q.x-(p.x+sx*(u-s.pivot[0]*s.frame[2])))<1e-9);
   assert.ok(Math.abs(q.y-q.z-(p.y-p.lift+shear*sx*(u-s.pivot[0]*s.frame[2])+sy*(v-s.pivot[1]*s.frame[3])))<1e-9,'screen reconstruction '+asset);
   for(const [dx,dy] of [[1.7,.6],[.2,.8],[-1.7,.6]])for(const receiver of [0,25.3]){assert.ok(Number.isFinite(q.x+dx*(q.z-receiver)));assert.ok(Number.isFinite(q.y-receiver+dy*(q.z-receiver)));samples++;}
  }
 }
}
const inventory=await read('docs/shadow-audit/inventory.json');
assert.equal(new Set(inventory.rows.map(r=>r.id)).size,inventory.rows.length);
for(const c of inventory.rows.filter(r=>r.alpha))assert.ok(c.alpha.nonzero>0,c.id+' empty frame');
for(const [id,c] of Object.entries((await read('public/assets/characters/manifest.json')).characters))for(const clip of Object.values(c.clips))for(const i of clip.frames)assert.ok(i>=0&&i<c.frames.length,`${id} invalid clip index ${i}`);
const before=catalog.sha256;companions.atlasSha256='stale';assert.throws(validateShadowCompanions,/revision mismatch/);companions.atlasSha256=before;
const first=Object.keys(companions.assets)[0],old=companions.assets[first].frame;companions.assets[first].frame=[0,0,1,1];assert.throws(validateShadowCompanions,/frame mismatch/);companions.assets[first].frame=old;
console.log(JSON.stringify({ok:true,samples,rows:inventory.rows.length,checks:['baseline parity','screen reconstruction','mirror/scale/shear/lift','three light vectors/two receiver heights finite','all alpha frames nonempty/in bounds','clip indices','stale atlas/frame rejection']}));

const solids=await read('src/world/maps/solid-shadow-companions.json');assert.equal(solids.atlasSha256,catalog.sha256);assert.equal(Object.keys(solids.assets).length,8);
for(const [id,m] of Object.entries(solids.assets)){const bytes=await fs.readFile('public'+m.source);assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sourceSha256,id+' stale source');const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(m.sourceSize,[info.width,info.height]);const [x,y,w,h]=m.frame,a=Buffer.alloc(w*h);for(let j=0;j<h;j++)for(let i=0;i<w;i++)a[j*w+i]=data[((y+j)*info.width+x+i)*4+3];assert.equal(createHash('sha256').update(a).digest('hex'),m.alphaSha256,id+' stale alpha/frame');assert.equal(m.frontGround.length,17);if(m.nativeBoxes){assert.ok(m.nativeBoxes.length>0);assert.ok(m.nativeBoxes.every(b=>b.length===6&&b.every(Number.isFinite)));}else{assert.equal(m.backGround.length,17);assert.ok(m.capHeightFraction>0&&m.capHeightFraction<1);}for(const v of [...m.frontGround,...(m.backGround??[])])assert.ok(Number.isFinite(v));assert.equal(inventory.rows.find(r=>r.id===id).cast,'WebGL original-alpha closed solid volume');}
console.log(JSON.stringify({solidModels:8,checks:['source SHA','atlas SHA','source dimensions','frame alpha SHA','front/back profiles','authored cap range','inventory disposition']}));

const recipes=await (await import('./native-solid-models.mjs')).nativeSolidBoxes();for(const [id,g] of Object.entries(recipes)){assert.deepEqual(solids.assets['frontier:'+id].nativeBoxes,g.boxes);assert.equal(solids.assets['frontier:'+id].recipeSha256,g.recipeSha256);}console.log(JSON.stringify({nativeRecipeMatches:Object.keys(recipes).length}));
