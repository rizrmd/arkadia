import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const base='https://ark-whachat.fural.space';
const get=async p=>{const r=await fetch(base+p,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,p);return r};
const deployment=JSON.parse(await fs.readFile('docs/gameplay-progress/deployment.json','utf8'));let release,health;
for(let attempt=0;attempt<60;attempt++){try{release=await(await get('/gameplay-progress/release.json')).json();health=await(await get('/healthz')).json();if(health.ok&&health.build===deployment.commit&&release.commit===deployment.commit)break;}catch(e){if(attempt===59)throw e;}await new Promise(r=>setTimeout(r,2000));}
assert.equal(health.build,release.commit,'the running Go binary must match the client release');assert(health.ok);assert.equal(release.commit,deployment.commit);
const index=await(await get('/')).text(),entry=[...index.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/g)].map(x=>x[1]);assert(entry.length);assert(entry.some(p=>release.files[p]));
const verified=[];
for(const [file,sha] of Object.entries(release.files)){const bytes=Buffer.from(await(await get(file)).arrayBuffer());const actual=createHash('sha256').update(bytes).digest('hex');assert.equal(actual,sha,file);verified.push({file,sha256:sha,bytes:bytes.length});}
const remote=execFileSync('git',['ls-remote','origin','refs/heads/fix/complete-gameplay-progress'],{encoding:'utf8'}).trim().split(/\s+/)[0];assert(remote);execFileSync('git',['merge-base','--is-ancestor',release.commit,remote]);
const report={passed:true,commit:release.commit,backendBuild:health.build,remoteBranchTip:remote,indexStatus:200,healthStatus:200,entry,verified,at:new Date().toISOString()};if(!process.env.CHECK_ONLY)await fs.writeFile('docs/gameplay-progress/release-verification.json',JSON.stringify(report,null,2));console.log({passed:true,commit:release.commit,backendBuild:health.build,assetsVerified:verified.length});
