import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export async function attachStaticEvidence(rows){
 const path='static-final/report.json',bytes=await fs.readFile('docs/shadow-audit/'+path),r=JSON.parse(bytes);assert.equal(r.errors.length,0);assert.equal(r.receiverPainterOrder.mismatches,0);
 for(const [file,sha] of Object.entries(r.rendererSources))assert.equal(createHash('sha256').update(await fs.readFile('src/stronghold/'+file)).digest('hex'),sha,'Stale static evidence '+file);
 const variants=r.batches.flatMap(b=>{assert.equal(b.failures.length,0);return b.rows});assert.equal(variants.length,r.variants);let receptionCases=0,mappedRows=0;
 for(const v of variants){assert.equal(v.tests.length,3);for(const t of v.tests){assert.equal(t.receive.status,'pass',v.key+' unexercised reception');receptionCases++;}}
 for(const row of rows){const matching=variants.filter(v=>row.id.startsWith('frontier:')?v.family==='ff:'+row.family:row.id.startsWith('court:')?v.family===row.family+':'+row.source:row.id.startsWith('building:')?v.family===row.family+':'+row.source:row.id.startsWith('terrain:')?v.family==='relief:'+row.id.slice(8):v.family===row.id);if(!matching.length)continue;
 row.staticAudit={report:path,reportSha256:createHash('sha256').update(bytes).digest('hex'),variants:matching.map(v=>v.id),sunCases:matching.length*3,scope:'Production cast and independent high/low receiver controls; software GPU.'};mappedRows++;
 if(row.id==='building:expedition:1'){row.cast='original-alpha closed pitched-roof tent volume with structural alpha fringe';row.receive='native visible roof/wall geometry';row.companion='src/stronghold/tent-shadow.ts';row.disposition='Closed roof, walls and floor remove projection gaps; mirror/lift and original-alpha fringe checks pass. Three-sun cast/receive controls pass.';}
 }
 return {report:path,variants:variants.length,sunCases:receptionCases,mappedRows,registered:r.registered,placements:r.placements,receiverPainterOrder:r.receiverPainterOrder};
}
