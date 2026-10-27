import assert from 'node:assert/strict';
import {analyzePixels,sliceGrid} from '../../src/fx/spritesheet-analysis.ts';
const pixels=(w,h,rects)=>{const p=new Uint8ClampedArray(w*h*4);for(const r of rects)for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++)p.set([200,100,40,255],(y*w+x)*4);return p;};
const rects=sliceGrid(70,46,3,2,3,4,2,2);const a=analyzePixels(70,46,pixels(70,46,rects));assert.equal(a.columns,3);assert.equal(a.rows,2);assert.deepEqual(a.frames,rects);assert.equal(a.spacingX,2);assert.equal(a.marginY,4);assert.equal(a.source,'pixels');assert.ok(a.confidence.order<.5);
const s=analyzePixels(64,64,pixels(64,64,[{x:10,y:12,width:40,height:39}]));assert.equal(s.frames.length,1);assert.deepEqual(s.frames[0],{x:0,y:0,width:64,height:64});
const opaque=new Uint8ClampedArray(32*32*4).fill(255);assert.equal(analyzePixels(32,32,opaque).frames.length,1);
assert.throws(()=>sliceGrid(8,8,16,16));assert.throws(()=>analyzePixels(20,20,new Uint8ClampedArray(2)));
console.log('Spritesheet pixel inference: grid, margins, spacing, static and invalid-image checks passed');
