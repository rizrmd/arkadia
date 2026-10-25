import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const folder='docs/shadow-audit/family-legacy-final',report=JSON.parse(await fs.readFile(folder+'/report.json','utf8'));
if(report.errors.length||report.batches.some(b=>b.failures.length))throw Error('Refusing to publish failed family audit');
for(const batch of report.batches){if(batch.image.endsWith('.webp'))continue;const original=folder+'/'+batch.image,next=batch.image.replace(/\.png$/,'.webp'),rgba=await sharp(original).ensureAlpha().raw().toBuffer();await sharp(original).webp({lossless:true,effort:6}).toFile(folder+'/'+next);const decoded=await sharp(folder+'/'+next).ensureAlpha().raw().toBuffer();if(!rgba.equals(decoded))throw Error('Evidence pixel mismatch '+next);batch.image=next;batch.decodedRgbaSha256=createHash('sha256').update(decoded).digest('hex');await fs.unlink(original);}
report.imageEncoding='Lossless WebP; decoded RGBA bytes verified against original renderer PNG.';await fs.writeFile(folder+'/report.json',JSON.stringify(report,null,2)+'\n');
const current=JSON.parse(await fs.readFile('docs/shadow-audit/family-current-final/report.json','utf8')),visuals=new Map(report.batches.flatMap(b=>b.rows.map((row,i)=>[row.signature,{image:'../family-legacy-final/'+b.image,row:i}])));
for(const b of current.batches){delete b.image;for(const row of b.rows){row.visualReference=visuals.get(row.signature);if(!row.visualReference)throw Error('Missing geometry variant image '+row.key);}}
current.visualScope='Visual references use a matching geometry representative in the legacy contact sheet; numeric tests use each current placement and its own camera.';await fs.writeFile('docs/shadow-audit/family-current-final/report.json',JSON.stringify(current,null,2)+'\n');
await fs.mkdir('public/shadow-audit/family-legacy-final',{recursive:true});await fs.cp(folder,'public/shadow-audit/family-legacy-final',{recursive:true});await fs.mkdir('public/shadow-audit/family-current-final',{recursive:true});await fs.copyFile('docs/shadow-audit/family-current-final/report.json','public/shadow-audit/family-current-final/report.json');
console.log(JSON.stringify({variants:report.batches.reduce((n,b)=>n+b.rows.length,0),images:report.batches.length,lossless:true}));
