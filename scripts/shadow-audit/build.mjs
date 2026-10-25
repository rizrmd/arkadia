import {generateSolidCompanions} from './solid-models.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const catalog=await read('src/world/maps/frozen-frontier-sprites.json');
const map=await read('src/world/maps/frozen-frontier.json');
const prefab=await read('src/stronghold/prefabs/stronghold.json');
const main=await read('src/world/maps/arkodia-01.json');
const chars=await read('public/assets/characters/manifest.json');
const assets={},rows=[],errors=[];
const imageCache=new Map();
async function image(file){if(!imageCache.has(file))imageCache.set(file,(async()=>{const bytes=await fs.readFile('public'+file);const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data,info,sha256:hash(bytes)};})());return imageCache.get(file);}
async function alpha(file,frame){const {data,info,sha256}=await image(file);const [x,y,w,h]=frame??[0,0,info.width,info.height];if(x<0||y<0||x+w>info.width||y+h>info.height||w<1||h<1)throw Error(`${file}: invalid frame ${frame}`);const a=Buffer.alloc(w*h);let solid=0,edge=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=data[((y+j)*info.width+x+i)*4+3];a[j*w+i]=v;if(v)solid++;if(v&&v<255)edge++;}return {sha256,alphaSha256:hash(a),size:[w,h],nonzero:solid,partialAlpha:edge};}
for(const [id,s] of Object.entries(catalog.assets)){
 const kit=map.kit[id],placed=map.placements.filter(p=>p.a===id),slab=['foundation','temple-podium'].includes(id);
 const casts=!!kit&&(kit.layer!=='ground'||slab);
 const a=await alpha(catalog.atlas,s.frame);
 assets[id]={frame:s.frame,pivot:s.pivot,world:s.world,ground:s.ground,model:slab?'constant-height-slab':'piecewise-vertical-billboard',...(slab?{heightPx:25.3}:{}),alphaSha256:a.alphaSha256};
 rows.push({id:'frontier:'+id,map:'arkodia-01 / frozen-frontier',family:id,source:catalog.atlas,frame:s.frame,pivot:s.pivot,alpha:a,placements:placed.length,zones:[...new Set(placed.map(p=>p.zone))],variants:[...new Set(placed.map(p=>JSON.stringify({mirror:!!p.f,scale:p.s??1,lift:p.lift??0,rotation:p.r??0})))].map(JSON.parse),cast:casts?'WebGL original-alpha triangle depth field':kit?'excluded: flat ground decal':'unused catalog asset',receive:'WebGL geometry-height receiver; flat decals use terrain height',disposition:casts?'integrated explicit geometry companion; per-family visual acceptance pending':'retain original alpha; no new height inference',companion:'src/world/maps/shadow-companions.json#'+id,owner:/^(pillar-|stairs-)/.test(id)?'CWSCU: preserve renderer strip count and geometry':'this task'});
}
// All prefab props, including legacy-layout-only assets. No per-pixel 3D claim.
for(const id of [...new Set(prefab.props.map(p=>p.id))]){
 const ps=prefab.props.filter(p=>p.id===id),p=ps[0],file=`/modular-stronghold/${p.assetSet==='v1'?'':'v2/'}${id}.png`,a=await alpha(file),flat=['snowdrift-edge','weeds-edge','paving-worn'].includes(id),opaque=ps.some(p=>(p.opacity??1)>=1);
 rows.push({id:'court:'+id,map:'arkodia-01 / stronghold',family:id,source:file,alpha:a,placements:ps.length,variants:ps.map(p=>({u:p.u,v:p.v,width:p.width,foot:p.foot??.97,shear:p.shear??0,vertical:p.vertical??1,opacity:p.opacity??1,layout:p.layout??'default'})),cast:flat?'excluded: ground decal':opaque?'WebGL original-alpha folded-billboard depth field':'excluded: translucent decoration',receive:'WebGL explicit proxy-height receiver',disposition:flat?'retain flat decal':opaque?'integrated alpha proxy; per-family visual acceptance pending':'review translucent caster policy'});
}
for(const [id,b] of Object.entries(prefab.buildings))for(const level of (id==='forge'?[1,2,3]:[1])){
 const file=id==='forge'?`/fortress-ui/forge-${level}.webp`:id==='gate'?'/modular-stronghold/v2/full-gateway-v7-closed.webp':`/assets/${b.asset}.png`;
 rows.push({id:`building:${id}:${level}`,map:'arkodia-01 / stronghold',family:id,level,source:file,alpha:await alpha(file),pivot:[.5,b.pivot],groundEdges:b.groundEdges,cast:'WebGL original-alpha folded-billboard depth field',receive:'WebGL explicit proxy-height receiver',disposition:id==='gate'?'same-frame GPU gateway geometry; navigation threshold unchanged':'integrated alpha proxy; level visual acceptance pending',variants:id==='forge'?[level]:[1,2,3],note:id==='forge'?'unique level asset':'levels share the same sprite'});
}
const gate=await read('public/modular-stronghold/v2/full-gateway-v7-sheet.json');
for(let i=0;i<gate.frames;i++){
 const frame=[i%gate.columns*gate.frame.w,Math.floor(i/gate.columns)*gate.frame.h,gate.frame.w,gate.frame.h];
 rows.push({id:`gateway-frame:${i}`,map:'arkodia-01 / stronghold',family:'animated-gateway',source:'/modular-stronghold/v2/'+gate.image,frame,alpha:await alpha('/modular-stronghold/v2/'+gate.image,frame),cast:'same-frame GPU original-alpha ground-hinge mesh',receive:'same-frame GPU receiver-height mesh',disposition:'current stabilized unlit frame and closed-ground support; frame visual acceptance pending; navigation unchanged'});
}
for(const [id,c] of Object.entries(chars.characters))for(const [i,f] of c.frames.entries()){
 const uses=Object.entries(c.clips).filter(([,v])=>v.frames.includes(i)).map(([k])=>k);
 rows.push({id:`actor:${id}:${i}`,map:'arkodia-01 / actors; character review',family:id,source:'/assets/characters/'+c.image,frame:[f.x,f.y,f.w,f.h],pivot:c.cell.pivot,alpha:await alpha('/assets/characters/'+c.image,[f.x,f.y,f.w,f.h]),clips:uses,variants:['original','runtime mirror where selected'],cast:uses.length?'WebGL same-frame atlas-alpha crossed-body proxy':'unused frame',receive:'gameplay native Pixi actor-batch depth comparison; review arena excluded',disposition:uses.length?'frame rectangle/pivot/mirror integrated; frame visual acceptance pending':'unused source frame; retained'});
}
const mesh=await read('public/assets/characters/3d/manifest.json');
for(const [id,h] of Object.entries(mesh.heroes))for(const clip of h.animations)rows.push({id:`mesh:${id}:${clip.slug}`,map:'arkodia-01 / live 3D hero',family:id,source:h.glb,animation:clip.slug,loop:clip.loop,cast:'WebGL same-frame raw body alpha and crossed-body proxy',receive:'native Pixi actor-batch depth comparison',disposition:'no CPU readback; old projected shadow passes suppressed; proxy is not mesh volumetric depth; clip visual acceptance pending'});
for(const f of [...main.terrain.features,...map.terrain])rows.push({id:'terrain:'+f.id,map:'arkodia-01',family:f.type,geometry:f,cast:'relief geometry proxy; scenery visual handled by frontier',receive:'WebGL authored relief height reconstruction',disposition:'authored relief intersection integrated; multi-angle visual acceptance pending'});
// Explicit non-gameplay entry points, rather than implying procedural map UI has sprite casters.
const coverage=[{entry:'src/world/maps/arkodia-01.json',kind:'gameplay map',included:['stronghold prefab','frozen-frontier overlay','relief','actors']},{entry:'src/expedition/app.ts',kind:'procedural strategic map',disposition:'Graphics map markers; no world object sprite/shadow renderer'},{entry:'src/main.ts',kind:'asset placement lab',disposition:'review tool; wall sources and asset catalog not world gameplay inventory'},{entry:'src/characters/arena.ts',kind:'character review arena',disposition:'contact ellipse only; not gameplay shadow validation'}];
const companion={version:1,atlas:catalog.atlas,atlasSha256:catalog.sha256,model:'explicit geometry proxy; NOT measured volumetric depth',heightUnit:'world pixel; 24 px/m for relief; sprite scale applied once',assets};
await fs.writeFile('src/world/maps/shadow-companions.json',JSON.stringify(companion,null,1)+'\n');
const solids=await generateSolidCompanions({catalog,image,alpha});
for(const row of rows){const model=solids.assets[row.id];if(model){row.cast='WebGL original-alpha closed solid volume';row.receive=model.nativeBoxes||model.sourceVertices?'native visible-face geometric receiver':'front visible capped surface only';row.companion='src/world/maps/solid-shadow-companions.json#'+row.id;row.disposition=model.nativeBoxes?'actual source-authored box faces clipped to original alpha; multi-angle visual acceptance pending':model.sourceVertices?'authored closed source-space face proxy clipped to original alpha; multi-angle visual acceptance pending':'authored cap and camera-ray interval; original alpha coverage retained; multi-angle visual acceptance pending';}}
const report={version:2,acceptance:'incomplete: WebGL cast/receive integrated; all-family visual and physical-device performance acceptance pending',fallback:'Canvas retains legacy ground projection without GPU receiver reconstruction',coverage,counts:{rows:rows.length,frontierFamilies:Object.keys(assets).length,actorFrames:Object.values(chars.characters).reduce((n,c)=>n+c.frames.length,0)},rows,errors};
// Reapply frame evidence only when every original-alpha hash still matches.
try{const audit=JSON.parse(await fs.readFile('docs/shadow-audit/actor-frames-final/report.json','utf8')),frames=audit.batches.flatMap(b=>b.rows);if(audit.errors.length||audit.batches.some(b=>b.failures.length)||frames.length!==445)throw Error('Incomplete actor GPU evidence');for(const frame of frames){const row=rows.find(r=>r.id===frame.id);if(!row||row.alpha.alphaSha256!==frame.alphaSha256)throw Error('Stale actor GPU evidence '+frame.id);row.gpuAudit={report:'actor-frames-final/report.json',cases:frame.cases.length,alphaSha256:frame.alphaSha256};row.disposition=(frame.clips.length?'Integrated':'Unused source frame retained')+'; GPU cast alignment checked at three suns and both mirrors; native batch high/low receiver controls passed. 3D GLB poses are separate.';}}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.writeFile('docs/shadow-audit/inventory.json',JSON.stringify(report,null,1)+'\n');
await fs.writeFile('public/shadow-audit/inventory.json',JSON.stringify(report)+'\n');
await fs.writeFile('public/shadow-audit/companions.json',JSON.stringify(companion)+'\n');
await fs.writeFile('docs/shadow-audit/inventory.md','## Inventory dispositions\n\nGenerated by `node scripts/shadow-audit/build.mjs`. Frame-level alpha hashes and variants are in inventory.json. Status describes source inspection, not visual acceptance.\n\n| Asset | Cast | Receive | Disposition |\n|---|---|---|---|\n'+rows.map(r=>`| ${r.id} | ${r.cast} | ${r.receive} | ${r.disposition} |`).join('\n')+'\n');
console.log(JSON.stringify({counts:report.counts,errors}));
