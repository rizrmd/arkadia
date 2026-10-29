import fs from 'node:fs/promises';import assert from 'node:assert/strict';import sharp from 'sharp';import {createHash} from 'node:crypto';
const base='https://arkodia.online',manifest=await(await fetch(base+'/gathering-verification/release.json')).json(),health=await(await fetch(base+'/healthz')).json(),results=[];
assert.equal(health.build,manifest.commit);
for(const [file,hash]of Object.entries(manifest.files)){
 const response=await fetch(base+file);assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer()),actual=createHash('sha256').update(bytes).digest('hex');
 if(file.endsWith('.png')){
  const local=await sharp('public'+file).ensureAlpha().raw().toBuffer(),remote=await sharp(bytes).ensureAlpha().raw().toBuffer();assert.equal(local.length,remote.length);let pixels=0;
  for(let i=0;i<local.length;i+=4){assert.equal(local[i+3],remote[i+3],'alpha');if(local[i+3]){for(let c=0;c<3;c++)assert.equal(local[i+c],remote[i+c],'visible RGB');pixels++;}}
  results.push({file,transport:response.headers.get('content-type'),visiblePixels:pixels,exactVisibleRgba:true,sourceSha256:hash});
 }else{assert.equal(actual,hash,file);results.push({file,sha256:actual});}
}
for(const file of ['/environment-editor/','/api/environment/published','/world-map-review/v1/manifest.json']){const response=await fetch(base+file);assert(response.ok,file);results.push({file,status:response.status});}
await fs.writeFile('docs/wildlife-sprites/live-release.json',JSON.stringify({health,manifest,results},null,2));console.log('PASS live build; '+results.length+' exact bundle/visible RGBA and cumulative route checks');
