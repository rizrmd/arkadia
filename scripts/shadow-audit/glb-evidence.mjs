import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** A stale report remains historical evidence; it must never silently certify new renderer code. */
export async function glbEvidence(hero,clip){
 const path=`docs/shadow-audit/glb-per-actor-low/${hero}-${clip}/report.json`,r=JSON.parse(await fs.readFile(path,'utf8'));
 if(r.failures.length||r.errors.length||r.rows.length!==6||r.rows.some(row=>row.tests.length!==3))throw Error('Incomplete GLB GPU report '+path);
 if(r.model.sha256!==hash(await fs.readFile('public'+r.model.path))||r.cellManifestSha256!==hash(await fs.readFile('public/assets/characters/manifest.json')))throw Error('Stale GLB/cell report '+path);
 for(const [file,sha] of Object.entries(r.rendererSources))if(sha!==hash(await fs.readFile('src/stronghold/'+file)))throw Error('Stale GLB renderer report '+path+' '+file);
 return {report:path.slice('docs/shadow-audit/'.length),quality:r.quality,poses:r.rows.length,cases:r.rows.reduce((n,row)=>n+row.tests.length,0),yaws:[...new Set(r.rows.map(row=>row.yaw))],times:[...new Set(r.rows.map(row=>row.time))],modelSha256:r.model.sha256,cellManifestSha256:r.cellManifestSha256,rendererSources:r.rendererSources};
}

async function journalEvidence(path){
 const bytes=await fs.readFile('docs/shadow-audit/'+path),r=JSON.parse(bytes);
 if(r.errors.length||r.failures.length||r.rows.length!==r.sourceFrames)throw Error('Incomplete GLB journal '+path);
 if(r.model.sha256!==hash(await fs.readFile('public'+r.model.path))||r.cellManifestSha256!==hash(await fs.readFile('public/assets/characters/manifest.json')))throw Error('Stale GLB journal model/cell '+path);
 for(const [file,sha] of Object.entries(r.rendererSources))if(sha!==hash(await fs.readFile('src/stronghold/'+file)))throw Error('Stale GLB journal source '+path+' '+file);
 if(r.maxVertexDelta>1e-5||r.maxHeightContractDelta>1e-4||r.maxGroundOffsetDelta>1e-4)throw Error('Invalid GLB journal alignment '+path);
 return {r,evidence:{report:path,reportSha256:hash(bytes),quality:r.quality,sourceFrames:r.sourceFrames,checkedVertices:r.checkedVertices,maxVertexDelta:r.maxVertexDelta,maxHeightContractDelta:r.maxHeightContractDelta,maxGroundOffsetDelta:r.maxGroundOffsetDelta,modelSha256:r.model.sha256,cellManifestSha256:r.cellManifestSha256}};
}
export async function glbSourceEvidence(hero,clip){
 const result=[];for(const quality of ['low','high']){const {r,evidence}=await journalEvidence(`glb-source-final-${quality}/${hero}-${clip}/report.json`),times=[...new Set([...r.metadata.times,...r.metadata.times.slice(1).map((v,i)=>(v+r.metadata.times[i])*.5)])];if(r.headings.length!==8||r.rows.length!==times.length*8||new Set(r.rows.map(row=>row.time+':'+row.yaw)).size!==r.rows.length)throw Error('Incomplete source time/heading matrix '+hero+':'+clip);result.push({...evidence,authoredKeys:r.authoredKeys,interpolationMidpoints:r.interpolationMidpoints,headings:r.headings.length,scope:'Original-alpha/skin/projected-height source alignment; detailed field GPU control is separate.'});}return result;
}
export async function glbBlendEvidence(hero){
 const result=[];for(const quality of ['low','high']){const {r,evidence}=await journalEvidence(`glb-blends-${quality}/${hero}/report.json`);if(r.sourceFrames+r.cachedFrames!==r.ticks||r.headings!==8||['idle','run','idle_cast','run_cast','hit','death'].some(clip=>!r.activeClips.includes(clip)))throw Error('Incomplete blend cycle '+hero);result.push({...evidence,ticks:r.ticks,cachedFrames:r.cachedFrames,headings:r.headings,scope:r.scope});}return result;
}
