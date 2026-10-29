import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import sharp from 'sharp';
const base='https://arkodia.online',get=async p=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(30000)});assert(r.ok,p+' HTTP '+r.status);return Buffer.from(await r.arrayBuffer());};
const manifest=JSON.parse(await get('/wildlife-directions/release.json')),health=JSON.parse(await get('/healthz')),checks=[];assert.equal(health.build,manifest.commit);
for(const [path,expected]of Object.entries(manifest.files)){
 const bytes=await get(path);if(path.endsWith('.png')){const remote=await sharp(bytes).ensureAlpha().raw().toBuffer(),local=await sharp('public'+path).ensureAlpha().raw().toBuffer();assert(remote.equals(local),path+' RGBA differs');}else assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);
 checks.push(path);
}
for(const path of ['/environment-editor/','wildlife-directions/pixi-directions.png','/wildlife-directions/deer-eight-directions.png','/wildlife-directions/crocodile-eight-directions-v2.png'])await get(path.startsWith('/')?path:'/'+path);
await fs.writeFile('docs/wildlife-directions/live-verification.json',JSON.stringify({passed:true,health,manifest,verified:checks,at:new Date().toISOString()},null,2));console.log('PASS production server SHA, '+checks.length+' client/atlas files and preserved editor');
