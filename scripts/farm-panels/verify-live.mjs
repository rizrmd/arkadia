import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const get=p=>execFileSync('curl',['-fsS','--retry','2','--max-time','25','https://arkodia.online'+p],{maxBuffer:40e6});
const sha=b=>createHash('sha256').update(b).digest('hex');
const health=JSON.parse(get('/healthz'));assert(health.ok);execFileSync('git',['merge-base','--is-ancestor','29b481d1',health.build]);
const release=JSON.parse(get('/kitchen-panels/release.json'));assert.equal(release.commit,health.build);
const report={health,releaseCommit:release.commit,farmSource:'29b481d1',checks:[]};
const paths=['/farm-panels/kit/farm.png','/farm-panels/kit/source-kit.zip','/farm-panels/kit/manifest.json','/farm-panels/browser.json','/farm-panels/knowledge.md','/farm-panels/pixi-desktop.png','/farm-panels/pixi-mobile.png',...Array.from({length:30},(_,i)=>'/farm-panels/target-'+String(i+1).padStart(2,'0')+'.png')];
for(const p of paths){
 const live=get(p),local=await fs.readFile((p.includes('/kit/')?'public':'docs')+p);
 const exact=sha(live)===sha(local);let pixels;
 if(p.endsWith('.png')){
  const a=await sharp(live).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(local).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(a.info,b.info);
  for(const v of [a,b])for(let i=0;i<v.data.length;i+=4)if(v.data[i+3]===0)v.data.fill(0,i,i+3);
  pixels=sha(a.data)===sha(b.data);assert(pixels,p);
 }else assert(exact,p);
 report.checks.push({path:p,bytes:live.length,sha256:sha(live),exactBytes:exact,...(pixels===undefined?{}:{decodedVisiblePixelsEqual:pixels})});
}
report.pass=true;report.note='Cumulative Kitchen release includes final Farm source. Publisher may serve PNG URLs as lossless WebP; visible decoded RGBA pixels match. Original PNG ZIP is byte-identical.';
await fs.writeFile('docs/farm-panels/production.json',JSON.stringify(report,null,2));console.log({pass:report.pass,commit:report.releaseCommit,checks:report.checks.length});
