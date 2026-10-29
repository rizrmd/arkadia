import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export async function attachStaticEvidence(rows){
 const path='static-final/report.json',bytes=await fs.readFile('docs/shadow-audit/'+path),r=JSON.parse(bytes);assert.equal(r.errors.length,0);assert.equal(r.receiverPainterOrder.mismatches,0);
 for(const [file,sha] of Object.entries(r.rendererSources))assert.equal(createHash('sha256').update(await fs.readFile('src/stronghold/'+file)).digest('hex'),sha,'Stale static evidence '+file);
 const visual=JSON.parse(await fs.readFile('docs/shadow-audit/static-visual-acceptance.json','utf8'));assert.equal(visual.staticReportSha256,createHash('sha256').update(bytes).digest('hex'),'Stale visual evidence');assert.equal(visual.variants,r.variants);
 const variants=r.batches.flatMap(b=>{assert.equal(b.failures.length,0);return b.rows});assert.equal(variants.length,r.variants);let receptionCases=0,mappedRows=0;
 for(const v of variants){assert.equal(v.tests.length,3);for(const t of v.tests){assert.equal(t.receive.status,'pass',v.key+' unexercised reception');receptionCases++;}}
 for(const row of rows){const matching=variants.filter(v=>row.id.startsWith('frontier:')?v.family==='ff:'+row.family:row.id.startsWith('court:')?v.family===row.family+':'+row.source:row.id.startsWith('building:')?v.family===row.family+':'+row.source:row.id.startsWith('terrain:')?v.family===({'terrain:temple-podium':'ff:temple-podium','terrain:temple-stairs':'ff:stairs-nw'}[row.id]??'relief:'+row.id.slice(8)):v.family===row.id);if(!matching.length)continue;
 row.staticAudit={report:path,reportSha256:createHash('sha256').update(bytes).digest('hex'),variants:matching.map(v=>v.id),sunCases:matching.length*3,scope:'Production cast and independent high/low receiver controls; software GPU.'};mappedRows++;
 row.visualReview={report:'static-visual-acceptance.json',scope:visual.scope};
 row.disposition=row.disposition.replace(/per-family visual acceptance pending|multi-angle visual acceptance pending|level visual acceptance pending/g,'three-sun cast/receive controls pass; per-variant visual disposition recorded');
 if(row.id==='terrain:temple-stairs'){row.receive='registered CWSCU stair sprite proxy; actor collision/ramp geometry remains separate';row.disposition='CWSCU-owned stair geometry retained. Three-sun sprite cast/receive controls pass; no measured per-tread reconstruction claimed.';}
 if(row.id==='terrain:temple-podium')row.disposition='Registered podium slab alpha/height proxy passes three-sun cast/receive controls; authored collision relief remains unchanged.';
 if(row.id==='building:expedition:1'){row.cast='original-alpha closed pitched-roof tent volume with structural alpha fringe';row.receive='native visible roof/wall geometry';row.companion='src/stronghold/tent-shadow.ts';row.disposition='Closed roof, walls and floor remove projection gaps; mirror/lift and original-alpha fringe checks pass. Three-sun cast/receive controls pass.';}
 }
 return {report:path,variants:variants.length,sunCases:receptionCases,mappedRows,registered:r.registered,placements:r.placements,receiverPainterOrder:r.receiverPainterOrder};
}
