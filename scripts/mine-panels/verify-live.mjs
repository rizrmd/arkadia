import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const get=p=>execFileSync('curl',['-fsS','--retry','2','--max-time','25','https://arkodia.online'+p],{maxBuffer:40e6});
const sha=b=>createHash('sha256').update(b).digest('hex');
const health=JSON.parse(get('/healthz'));assert(health.ok);execFileSync('git',['merge-base','--is-ancestor','c3355066',health.build]);
const release=JSON.parse(get('/walls-panels/release.json'));assert.equal(release.commit,health.build);
const report={health,releaseCommit:release.commit,mineSource:'c3355066',checks:[]};report.bundleIncludesMine=false;
for(const file of Object.keys(release.files).filter(p=>p.startsWith('/assets/')&&p.endsWith('.js')).sort((a,b)=>Number(!a.includes('main'))-Number(!b.includes('main')))){if(get(file).toString().includes('/mine-panels/kit/mine.png')){report.bundleIncludesMine=true;report.mineBundle=file;break;}}assert(report.bundleIncludesMine,'Live lazy-loaded game bundle must contain Mine');
const paths=['/mine-panels/kit/mine.png','/mine-panels/kit/source-kit.zip','/mine-panels/kit/manifest.json','/mine-panels/kit/prompts.json','/mine-panels/all-targets.png','/mine-panels/browser.json','/mine-panels/pixi-desktop.png','/mine-panels/pixi-mobile.png',...Array.from({length:30},(_,i)=>'/mine-panels/target-'+String(i+1).padStart(2,'0')+'.png')];
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
report.pass=true;report.note='Cumulative release includes final Mine source and shared Core correction. Publisher may serve PNG URLs as lossless WebP; visible decoded RGBA pixels match. Original PNG ZIP is byte-identical.';
await fs.writeFile('docs/mine-panels/production.json',JSON.stringify(report,null,2));console.log({pass:report.pass,commit:report.releaseCommit,checks:report.checks.length});
