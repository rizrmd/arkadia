import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const get=p=>execFileSync('curl',['-fsS','--retry','2','--max-time','25','https://arkodia.online'+p],{maxBuffer:40e6});
const sha=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(get('/kitchen-panels/release.json')),health=JSON.parse(get('/healthz'));assert(health.ok);
// A later cumulative release may replace the entry point while retaining Kitchen assets.
execFileSync('git',['merge-base','--is-ancestor',original.commit,health.build]);
let release;
for(const path of ['/walls-panels/release.json','/core-upgrade/release.json','/kitchen-panels/release.json','/mine-panels/release.json','/farm-panels/release.json','/lumber-panels/release.json']){
 const candidate=JSON.parse(get(path));if(candidate.commit===health.build){release=candidate;break;}
}
assert(release,'A release manifest must match the current healthy build');
const report={at:new Date().toISOString(),health,releaseCommit:health.build,kitchenReleaseCommit:original.commit,checks:[]};
const main=Object.keys(release.files).find(p=>/^\/assets\/main-.*\.js$/.test(p));assert(main,'Current compiled game entry');
for(const p of ['/index.html',main]){const live=get(p);assert.equal(sha(live),release.files[p],p);report.checks.push({path:p,sha256:sha(live),exactBytes:true});
 if(p===main){const bundle=live.toString();for(const name of ['CORE_UPGRADE','KITCHEN_PANEL','FARM_PANEL','LUMBER_PANEL','MINE_PANEL','WALLS_PANEL'])assert(bundle.includes('__'+name+'__'),name);report.allSixPanels=true;}}
const paths=['/kitchen-panels/kit/kitchen-original.png','/kitchen-panels/kit/kitchen.png','/kitchen-panels/pixi-mobile.png','/kitchen-panels/kit/source-kit.zip','/kitchen-panels/browser.json',...Array.from({length:30},(_,i)=>`/kitchen-panels/target-${String(i+1).padStart(2,'0')}.png`)];
for(const p of paths){
 const live=get(p),local=await fs.readFile((p.includes('/kit/')?'public':'docs')+p);let pixels;
 const exact=sha(live)===sha(local);
 if(p.endsWith('.png')){const a=await sharp(live).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(local).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(a.info,b.info,p);for(const image of [a,b])for(let i=0;i<image.data.length;i+=4)if(image.data[i+3]===0)image.data.fill(0,i,i+3);pixels=sha(a.data)===sha(b.data);assert(pixels,p);}else assert(exact,p);
 report.checks.push({path:p,bytes:live.length,sha256:sha(live),exactBytes:exact,decodedPixelsEqual:pixels});
}
for(const p of ['/farm-panels/kit/source-kit.zip','/lumber-panels/kit/source-kit.zip','/core-upgrade/kit-v2/manifest.json']){const live=get(p);assert.equal(sha(live),sha(await fs.readFile('public'+p)),p);report.checks.push({path:p,exactBytes:true});}
for(const p of ['/environment-editor/','/sprite-player/']){const status=execFileSync('curl',['-sS','--max-time','15','-o','/dev/null','-w','%{http_code}','https://arkodia.online'+p],{encoding:'utf8'});assert.equal(status,'302',p);report.checks.push({path:p,status});}
assert.equal(JSON.parse(get('/healthz')).build,health.build,'Build changed during verification; rerun against the new release');
report.pass=true;report.note='Current release is a descendant of the Kitchen release. Current entry and bundle hashes match its manifest; all six panels remain integrated. Kitchen PNG endpoints match visible RGBA pixels; source ZIP bytes match exactly.';
await fs.writeFile('docs/kitchen-panels/production.json',JSON.stringify(report,null,2));console.log({pass:true,commit:health.build,checks:report.checks.length,allSixPanels:true});
