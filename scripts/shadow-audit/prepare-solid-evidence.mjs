import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const folder=process.env.FOLDER||'docs/shadow-audit/family-solid-final',tail='docs/shadow-audit/family-solid-tail';
const report=JSON.parse(await fs.readFile(folder+'/report.json','utf8')),last=process.env.FOLDER?{batches:[],errors:[]}:JSON.parse(await fs.readFile(tail+'/report.json','utf8'));
for(const batch of last.batches){if(!report.batches.some(b=>b.offset===batch.offset)){report.batches.push(batch);await fs.copyFile(tail+'/'+batch.image,folder+'/'+batch.image);}}
report.batches.sort((a,b)=>a.offset-b.offset);assert.equal(report.errors.length,0);assert.equal(last.errors.length,0);
const rows=report.batches.flatMap(b=>b.rows);assert.equal(rows.length,293);assert.equal(new Set(rows.map(r=>r.signature)).size,293);assert.equal(report.batches.flatMap(b=>b.failures).length,0);
for(const batch of report.batches){if(batch.image.endsWith('.webp'))continue;const original=folder+'/'+batch.image,next=batch.image.replace(/\.png$/,'.webp'),rgba=await sharp(original).ensureAlpha().raw().toBuffer();await sharp(original).webp({lossless:true,effort:6}).toFile(folder+'/'+next);const decoded=await sharp(folder+'/'+next).ensureAlpha().raw().toBuffer();assert.ok(rgba.equals(decoded));batch.image=next;batch.decodedRgbaSha256=createHash('sha256').update(decoded).digest('hex');await fs.unlink(original);}
report.imageEncoding='Lossless WebP; decoded RGBA verified against GPU PNG.';
report.runtimeContract='Native/source-authored closed faces clipped to original alpha, barrel ray-volume, visible-face receivers with per-object camera depth, raw packed-byte uploads and two-layer occlusion.';
await fs.writeFile(folder+'/report.json',JSON.stringify(report,null,2)+'\n');await fs.cp(folder,'public/shadow-audit/'+folder.split('/').pop(),{recursive:true});
await fs.cp('docs/shadow-audit/solid-volume-control','public/shadow-audit/solid-volume-control',{recursive:true});
await fs.cp('docs/shadow-audit/native-volume-control','public/shadow-audit/native-volume-control',{recursive:true});
console.log(JSON.stringify({variants:rows.length,directionalReceiveControls:rows.flatMap(r=>r.tests).filter(t=>t.receive?.status==='pass').length,images:report.batches.length,failures:0}));
