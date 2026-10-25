import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {limitLowCostEffect} from '../../src/fx/low-cost.ts';

const fx={emitters:[{maxParticles:500,spawn:{rate:120,rateValue:{min:20,max:80,value:40},bursts:[{count:200}]}},{maxParticles:1,spawn:{rate:0,bursts:[{count:1}]}}]};
limitLowCostEffect(fx);
assert.equal(fx.emitters.length,2,'essential emitters must remain');
assert.equal(fx.emitters[0].maxParticles,24);
assert.deepEqual(fx.emitters[0].spawn,{rate:24,rateValue:{min:10,max:24,value:20},bursts:[{count:24}]});
assert.deepEqual(fx.emitters[1],{maxParticles:1,spawn:{rate:0,bursts:[{count:1}]}},'single sprite cues and burst-only zero rates remain intact');

const sprites=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8'));
const masks=JSON.parse(await fs.readFile('src/world/maps/frontier-occlusion.json','utf8'));
const placements=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
for(const p of placements.placements){
 if(placements.kit[p.a].layer==='ground'&&!['foundation','temple-podium'].includes(p.a))continue;
 assert.ok(masks[p.a+(p.f?':flip':'')],`missing mask for ${p.a}`);
}
const atlas=await sharp('public'+sprites.atlas).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(const [key,url] of Object.entries(masks)){
 const [name,flip]=key.split(':'),[x,y,w,h]=sprites.assets[name].frame;
 const crop=await sharp('public'+url).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(crop.info.width,w);assert.equal(crop.info.height,h);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){
  const a=atlas.data[((row+y)*atlas.info.width+x+(flip?w-1-col:col))*4+3];
  assert.equal(crop.data[(row*w+col)*4+3],a<150?0:a,`${key} alpha at ${col},${row}`);
 }
}
console.log(`PASS low-cost particle limits and exact alpha parity for ${Object.keys(masks).length} scenery masks`);
