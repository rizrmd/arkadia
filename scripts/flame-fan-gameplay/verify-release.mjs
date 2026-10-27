import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import sharp from 'sharp';
const base=process.env.VERIFY_URL||'https://arkodia.online',prefix='/ember-warden-review/flame-fan-gameplay/burst-v1';
const deployment=JSON.parse(await fs.readFile('docs/flame-fan-gameplay/burst-v1/deployment.json','utf8'));
const get=async path=>{const r=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r;};
const release=await(await get(prefix+'/release.json')).json(),health=await(await get('/healthz')).json();
assert(health.ok);assert.equal(release.commit,deployment.commit);assert.equal(health.build,release.commit,'Running server and client release must match');
const html=await(await get('/')).text(),entries=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(path=>path in release.files);assert(entries.length,'Index must load a release-owned compiled entry');
const verified=[];
for(const [path,expected]of Object.entries(release.files)){const bytes=Buffer.from(await(await get(path)).arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);verified.push(path);}
const original=await sharp('public/flame-fan-burst-candidate/v1/flame-burst-v1.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const response=await get(release.asset),served=await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(served.info.width,original.info.width);assert.equal(served.info.height,original.info.height);let visibleDifferences=0,alphaDifferences=0;
for(let i=0;i<original.data.length;i+=4){if(original.data[i+3]!==served.data[i+3])alphaDifferences++;if(original.data[i+3]||served.data[i+3])for(let c=0;c<3;c++)if(original.data[i+c]!==served.data[i+c])visibleDifferences++;}
assert.equal(alphaDifferences,0);assert.equal(visibleDifferences,0);
const remote=execFileSync('git',['ls-remote','origin','refs/heads/feat/stronghold'],{encoding:'utf8'}).trim().split(/\s+/)[0];execFileSync('git',['merge-base','--is-ancestor',release.commit,remote]);
const report={passed:true,base,commit:release.commit,backendBuild:health.build,remoteBranchTip:remote,entries,verified,asset:release.asset,assetFormat:response.headers.get('content-type'),alphaDifferences,visibleDifferences,at:new Date().toISOString()};
await fs.writeFile('docs/flame-fan-gameplay/burst-v1/release-verification.json',JSON.stringify(report,null,2));console.log({passed:true,commit:release.commit,assetsVerified:verified.length,alphaDifferences,visibleDifferences});
