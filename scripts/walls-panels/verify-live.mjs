import fs from 'node:fs/promises';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const cache=mkdtempSync(path.join(os.tmpdir(),'walls-verify-'));
const get=p=>{const f=path.join(cache,'download');try{execFileSync('curl',['-fsS','--retry','3','--retry-all-errors','--retry-max-time','75','--connect-timeout','6','--max-time','25','-o',f,'https://arkodia.online'+p],{maxBuffer:4000});return readFileSync(f);}finally{rmSync(f,{force:true});}};
const sha=b=>createHash('sha256').update(b).digest('hex');
const health=JSON.parse(get('/healthz'));assert(health.ok);execFileSync('git',['merge-base','--is-ancestor','b8b54734',health.build]);
const release=JSON.parse(get('/walls-panels/release.json'));assert.equal(release.commit,health.build);
const report={health,releaseCommit:release.commit,wallsSource:'b8b54734',checks:[]};
const main=Object.keys(release.files).find(p=>/^\/assets\/main-.*\.js$/.test(p));assert(main,'Compiled game chunk in release manifest');const bytes=get(main);assert.equal(sha(bytes),release.files[main]);const bundle=bytes.toString();
for(const name of ['WALLS_PANEL','MINE_PANEL','CORE_UPGRADE','FARM_PANEL','LUMBER_PANEL','KITCHEN_PANEL'])assert(bundle.includes('__'+name+'__'),name);
assert(bundle.includes('/walls-panels/kit/walls.png'));report.bundle={path:main,sha256:sha(bytes),allSixPanels:true};
const sizes=JSON.parse(get('/asset-sizes.json'));for(const p of ['/walls-panels/kit/walls.png','/mine-panels/kit/mine.png'])assert(sizes[p]>0);report.assetInventory=true;
const paths=['/walls-panels/kit/walls.png','/walls-panels/kit/source-kit.zip','/walls-panels/kit/manifest.json','/walls-panels/browser.json','/walls-panels/knowledge.md','/walls-panels/pixi-desktop.png','/walls-panels/pixi-mobile.png',...Array.from({length:30},(_,i)=>'/walls-panels/target-'+String(i+1).padStart(2,'0')+'.png')];
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
report.pass=true;report.note='Cumulative release includes final Walls source and shared Core correction. Publisher may serve PNG URLs as lossless WebP; visible decoded RGBA pixels match. Original PNG ZIP is byte-identical.';
await fs.writeFile('docs/walls-panels/production.json',JSON.stringify(report,null,2));rmSync(cache,{recursive:true,force:true});console.log({pass:report.pass,commit:report.releaseCommit,checks:report.checks.length});
