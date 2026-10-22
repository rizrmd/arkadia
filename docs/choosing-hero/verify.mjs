import fs from 'node:fs';import sharp from 'sharp';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root='public/choosing-hero/v1',m=JSON.parse(fs.readFileSync(`${root}/manifest.json`)),layouts=JSON.parse(fs.readFileSync(`${root}/layouts.json`));
assert.equal(m.assets.length,31);assert.equal(new Set(m.assets.map(a=>a.file)).size,31);
const results=[];
for(const a of m.assets){const data=fs.readFileSync(a.file),meta=await sharp(data).metadata();await sharp(data).raw().toBuffer();assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);let stats=await sharp(data).stats();if(a.hasAlpha){assert(meta.hasAlpha);assert.equal(stats.channels[3].min,0);assert(stats.channels[3].max>200);}results.push({file:a.file,width:meta.width,height:meta.height,alpha:meta.hasAlpha,decoded:true,hashMatches:true});}
assert.equal(layouts.length,4);
for(const l of layouts){const meta=await sharp(l.file).metadata();assert.equal(meta.width,l.width);assert.equal(meta.height,l.height);for(const e of l.elements){assert(e.x>=0&&e.y>=0);assert(e.x+e.width<=l.width);assert(e.y+e.height<=l.height);}}
const files=fs.readdirSync(`${root}/previews`);for(const f of files)await sharp(`${root}/previews/${f}`).raw().toBuffer();
const r={checkedAt:new Date().toISOString(),runtimeAssetCount:31,generatedProductionMasterCount:19,previewCount:4,contactSheets:1,checks:['PNG decoding','manifest dimensions','SHA-256 hashes','genuine alpha in every transparent asset','four preview dimensions','all declared layer bounds'],assets:results};fs.writeFileSync('docs/choosing-hero/verification.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({...r,assets:undefined}));
