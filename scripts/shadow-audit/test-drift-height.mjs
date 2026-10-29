import fs from 'node:fs/promises';import assert from 'node:assert/strict';import ts from 'typescript';import{createHash}from'node:crypto';
const companions=JSON.parse(await fs.readFile('src/world/maps/drift-height-companions.json')),catalog=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json'));
let source=await fs.readFile('src/stronghold/drift-shadow.ts','utf8');source=source.replace(/^import companions.*$/m,'const companions=globalThis.__driftModels;').replace(/^import catalog.*$/m,'const catalog=globalThis.__driftCatalog;');globalThis.__driftModels=companions;globalThis.__driftCatalog=catalog;
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,{withDriftGeometry}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64')+'#direct-drift-test');let checks=0;
for(const [id,m]of Object.entries(companions.assets)){
 assert.equal(m.recipeSha256,createHash('sha256').update(await fs.readFile('scripts/frozen-frontier-map/ground-kit.mjs')).digest('hex'));assert.equal(m.sourceSha256,createHash('sha256').update(await fs.readFile('public/frozen-frontier/v3/assets/'+id+'.png')).digest('hex'));
 const base={key:'ff:'+id+':probe',sourceWidth:2048,sourceHeight:2048,frame:m.frame,width:m.world[0],height:m.world[1],pivot:m.pivot,x:0,y:0};
 for(const flip of [false,true])for(const scale of [.6,1,1.4])for(const vertical of [.8,1,1.2]){const p=withDriftGeometry({...base,flip,height:base.height*scale,vertical,lift:12});assert.ok(p.solidBody);for(let y=0;y<m.size[1];y++)for(let x=0;x<m.size[0];x++){const q=p.heightInterval((x+.5)/m.size[0],(y+.5)/m.size[1]);assert.ok(Math.abs(q.near-m.height[y*m.size[0]+x]/65535*p.height*vertical)<1e-9);assert.equal(q.far,0);checks++;}}
 assert.throws(()=>withDriftGeometry({...base,frame:[0,0,1,1]}),/frame mismatch/);assert.throws(()=>withDriftGeometry({...base,sourceWidth:1024}),/frame mismatch/);assert.equal(withDriftGeometry({...base,solidBody:false}).solidBody,false);
}
const stale=companions.atlasSha256;companions.atlasSha256='stale';const m=companions.assets['drift-ne'];assert.throws(()=>withDriftGeometry({key:'ff:drift-ne:probe'}),/revision mismatch/);companions.atlasSha256=stale;
console.log(JSON.stringify({checks,mirrorScaleVertical:true,atlasFrameGuards:true,sourceDepth:true}));
