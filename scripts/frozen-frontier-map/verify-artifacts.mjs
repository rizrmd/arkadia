import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
// Verify the actual deployable files, including immutable identity and valid packed rectangles.
const catalog=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8'));
const pixels=await fs.readFile('public'+catalog.atlas),hash=createHash('sha256').update(pixels).digest('hex');
assert.equal(hash,catalog.sha256,'Atlas pixels and frame catalog must belong to the same release');
assert.equal(catalog.atlas,`/frozen-frontier/game/atlas-${hash.slice(0,16)}.webp`);
assert.equal(pixels.length,catalog.bytes);
const image=await sharp(pixels).metadata();assert.deepEqual([image.width,image.height],catalog.size);
const entries=Object.entries(catalog.assets);
for(const [id,{frame:[x,y,w,h],pivot,world}] of entries){
 assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=image.width&&y+h<=image.height,`${id}: frame in atlas`);
 assert.ok(pivot.every(v=>v>=0&&v<=1)&&world.every(v=>v>0),`${id}: valid dimensions and ground pivot`);
 const {channels}=await sharp(pixels).extract({left:x,top:y,width:w,height:h}).stats();
 assert.ok(channels[3].max>150,`${id}: visible art in frame`);
 for(const [other,{frame:[a,b,c,d]}] of entries){if(id>=other)continue;
 assert.ok(x+w<=a||a+c<=x||y+h<=b||b+d<=y,`${id} overlaps ${other}`);}
}
// Ground contacts measured on the two doorway modules. The corrected baselines
// must follow the floor edges; a screen rotation would also lean the upright piers.
const baselines={'arch-ne':{a:[184,512],b:[544,423],target:-.5},'arch-se':{a:[188,486],b:[550,561],target:.5}};
for(const [id,{a,b,target}] of Object.entries(baselines)){
 const slope=(b[1]-a[1])/(b[0]-a[0])+catalog.assets[id].shear;
 assert.ok(Math.abs(slope-target)<.01,`${id}: doorway piers follow the 2:1 floor`);
}
assert.equal(catalog.assets['ruined-gate'].shear,undefined,'The already-correct landmark keeps its projection');
console.log(JSON.stringify({ok:true,sprites:entries.length,atlas:catalog.atlas,sha256:hash,archBaselineTolerance:.01}));
