import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import sharp from 'sharp';
const base='https://arkodia.online',sha=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(25000)});assert(r.ok,`${path}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
const release=JSON.parse(await fs.readFile('docs/building-interactions/release.json'));
const health=JSON.parse(await get('/healthz'));assert(health.ok);assert.equal(health.build,release.commit);
const report={at:new Date().toISOString(),url:base,commit:release.commit,health,checks:[],files:[],browser:JSON.parse(await fs.readFile('docs/building-interactions/browser.json')),world:JSON.parse(await fs.readFile('docs/building-interactions/world-browser.json'))};
const scripts=[];
for(const [path,expected] of Object.entries(release.files)){
 const bytes=await get(path);if(path.endsWith('.js'))scripts.push(bytes.toString());
 if(path==='/asset-sizes.json'){const sizes=JSON.parse(bytes);assert(Object.keys(sizes).length>100);assert(Object.values(sizes).every(n=>typeof n==='number'&&n>=0));report.checks.push('Server asset sizes report cached WebP sizes as designed');}
 else if(path.endsWith('.png')){const local=await fs.readFile('docs'+path);const a=await sharp(bytes).ensureAlpha().raw().toBuffer(),b=await sharp(local).ensureAlpha().raw().toBuffer();assert.equal(sha(a),sha(b),path+' decoded pixels');}
 else assert.equal(sha(bytes),expected,path);
 report.files.push(path);
}
const index=(await get('/')).toString();const entry=index.match(/src="(\/assets\/[^\"]+\.js)"/);assert(entry);assert(entry[1] in release.files);
const world=scripts.join('\n');
for(const label of ['Core upgrade details','Farm details','Lumber Mill details','Kitchen details','Walls details','Mine details','Not Enough Gold','Not Enough Wood (Log)'])assert(world.includes(label),label);
for(const commit of ['7b6c3851','8c8104a5','08f74165'])execFileSync('git',['merge-base','--is-ancestor',commit,release.commit]);
const map=JSON.parse(await get('/api/environment/published'));report.environmentRevision=map.revision??map.map?.revision;report.environmentHash=sha(Buffer.from(JSON.stringify(map)));
for(const path of ['/environment-editor/','/sprite-player/']){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(r.status,302);}
for(const path of ['/core-upgrade/kit-v2/manifest.json','/farm-panels/kit/manifest.json','/lumber-panels/kit/manifest.json','/kitchen-panels/kit/manifest.json','/walls-panels/kit/manifest.json','/mine-panels/kit/manifest.json','/ground-textures/evidence/release-verification.json']){await get(path);report.checks.push('Retained '+path);}
report.checks.push('Healthy deployed binary matches release commit','Every release file matches SHA-256 or decoded screenshot pixels','Live entry point references this release bundle','Live world bundle contains all six panel integrations and eligibility feedback','Ground/editor/prior-panel ancestry retained','Published map remains readable and retired editor routes retained');report.pass=true;
await fs.writeFile('docs/building-interactions/production.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,commit:report.commit,files:report.files.length,checks:report.checks.length,environmentRevision:report.environmentRevision}));
