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
