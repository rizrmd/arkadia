import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {createServer} from 'vite';
const baselineRef=process.env.BASE_NAV_REF||'d3caac5c',baseline=JSON.parse(execFileSync('git',['show',baselineRef+':server/internal/sim/nav.json']));
const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json'));
// The published snapshot predates snowy registration: 12 alpha-profile ramparts
// have 5.01px columns, three bastions 4.22px, the obsolete broken wall 3.98px.
// Derive those signatures from the prefab/profile stride, and assert exact counts.
const signature=width=>+(width/256*Math.max(1,Math.round(3.5*256/width))*1.2).toFixed(2);
const obsolete=new Map([[signature(356),1032],[signature(180),156],[signature(170),52]]);
for(const [width,count] of obsolete)assert.equal(baseline.columns.filter(c=>c.w===width).length,count,'Historical enclosure signature '+width);
const retained=baseline.columns.filter(c=>!obsolete.has(c.w)),removed=baseline.columns.length-retained.length;
const vite=await createServer({configFile:false,server:{middlewareMode:true},logLevel:'error'});
try{const {starterEnclosure,palisadeColumns}=await vite.ssrLoadModule('/src/stronghold/starter-enclosure.ts');const walls=starterEnclosure([]).flatMap(p=>palisadeColumns(p)).map(({x,w,back,front})=>({x:+x.toFixed(2),w:+w.toFixed(2),back:+back.toFixed(2),front:+front.toFixed(2)}));const nav={...baseline,columns:[...retained,...walls]};for(const f of ['public/coop/nav.json','server/internal/sim/nav.json'])await fs.writeFile(f,JSON.stringify(nav)+'\n');const report={baselineRef,removedObsoleteEnclosureColumns:removed,newWallColumns:walls.length,unrelatedColumnsPreserved:retained.length,total:nav.columns.length,clientServerEqual:true};await fs.writeFile('docs/starter-boundary/navigation-verification.json',JSON.stringify(report,null,2));console.log(report);}finally{await vite.close();}
