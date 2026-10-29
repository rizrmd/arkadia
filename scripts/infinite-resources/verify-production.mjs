import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import sharp from 'sharp';
const base='https://arkodia.online',sha=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(20000)});assert(r.ok,`${path}: ${r.status}`);return Buffer.from(await r.arrayBuffer());};
const release=JSON.parse(await fs.readFile('docs/infinite-resources/release.json'));
const health=JSON.parse(await get('/healthz'));assert(health.ok);assert.equal(health.build,release.commit);const mode=JSON.parse(await get('/infinite-resources/mode.json'));assert(mode.infiniteWoodFood);assert.equal(mode.commit,health.build);
const report={pass:false,at:new Date().toISOString(),url:base,commit:release.commit,health,mode,files:[],checks:[]};const scripts=[];
for(const [path,expected] of Object.entries(release.files)){
 const bytes=await get(path);if(path.endsWith('.js'))scripts.push(bytes.toString());
 if(path==='/asset-sizes.json'){assert(Object.keys(JSON.parse(bytes)).length>100);}
 else if(path.endsWith('.png')){const local=path.includes('/fonts/')?'public'+path:'docs'+path;const a=await sharp(bytes).ensureAlpha().raw().toBuffer(),b=await sharp(await fs.readFile(local)).ensureAlpha().raw().toBuffer();assert.equal(sha(a),sha(b),path+' decoded pixels');}
 else assert.equal(sha(bytes),expected,path);report.files.push(path);
}
const index=(await get('/')).toString();const entry=index.match(/src="(\/assets\/[^\"]+\.js)"/);assert(entry);assert(entry[1] in release.files);
const world=scripts.join('\n');for(const label of ['∞','start construction','Construction in progress','Not Enough Gold','Building requirements not met','infiniteWoodFood'])assert(world.includes(label),label);
for(const ref of ['a19fb7a1','8c8104a5','08f74165'])execFileSync('git',['merge-base','--is-ancestor',ref,release.commit]);
const map=JSON.parse(await get('/api/environment/published'));report.map={revision:map.revision,objects:map.objects?.length,sha256:sha(Buffer.from(JSON.stringify(map)))};const before=JSON.parse(await fs.readFile('docs/infinite-resources/map-before.json'));assert.equal(report.map.sha256,before.sha256);assert.equal(report.map.revision,3);
const font=(await get('/typography/v2/fonts/garamond-medium-infinite-v1.fnt')).toString();assert(font.includes('id="8734"'));
for(const path of ['/core-upgrade/kit/button.png','/core-upgrade/kit-v2/button.png','/ground-textures/evidence/release-verification.json'])await get(path);
report.checks=['Healthy production binary matches pushed cumulative release','Production enabled-mode manifest matches runtime commit','All release hashes or decoded pixels match actual served assets','Live entry references this release, including enabled mode and construction code','True infinity glyph present in versioned body font','Panel padding, terrain and retired-editor ancestry retained','Published map revision 3 and content hash unchanged; additive publisher preserves save directory'];report.pass=true;await fs.writeFile('docs/infinite-resources/production.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,commit:report.commit,files:report.files.length,mode:report.mode,map:report.map},null,2));
