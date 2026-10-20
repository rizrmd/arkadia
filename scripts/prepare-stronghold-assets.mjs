import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='/home/dev/.codex/generated_images/01a158f5-aa8d-7cf0-9809-7b6aa0dcdefb/';
const sources={forge:'255541b6-b205-41f8-9003-e3d922d9bec4',barracks:'f22f3710-8dd7-49c8-ae56-43010d1f3b85',altar:'182d379f-a89b-4ed4-83d7-a18c78af8472',mage:'c977970e-f4c7-47d1-89f1-33163401818d',mine:'dc7a424a-921a-4ba0-a047-033e6bb4feaf',expedition:'2c3f32e9-9a15-4cb3-af3a-ddb077c7adb8',gate:'24ba8f21-a02d-4408-92ca-8bd8dd858b66'};
const manifest={generator:'Built-in imagegen',reference:'Knowledge Stronghold — Visuals & Player Experience / implementation reference v2',assets:{}};
const cells=[];let index=0;
for(const [id,uuid] of Object.entries(sources)){
 const source=`assets-src/stronghold/${id}.png`;try{await fs.access(source);}catch{await fs.copyFile(root+'exec-'+uuid+'.png',source);}
 const pipeline=sharp(source).trim({threshold:10,background:'#00000000'});await pipeline.resize({width:640,height:640,fit:'inside'}).png().toFile(`public/assets/stronghold/${id}.png`);
 const {data,info}=await sharp(`public/assets/stronghold/${id}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;if(data[i]>240)opaque++;}if(!transparent||!opaque)throw Error('Invalid alpha '+id);
 manifest.assets[id]={source,file:`/assets/stronghold/${id}.png`,width:info.width,height:info.height,transparentPixels:transparent,solidPixels:opaque,pivot:[.5,.95]};
 const thumb=await sharp(`public/assets/stronghold/${id}.png`).resize(280,260,{fit:'contain',background:'#182125'}).toBuffer();cells.push({input:thumb,left:(index%4)*300+10,top:Math.floor(index/4)*300+10});index++;
}
await sharp({create:{width:1200,height:600,channels:4,background:'#182125'}}).composite(cells).png().toFile('docs/stronghold-assets/contact-sheet.png');
await fs.writeFile('public/assets/stronghold/manifest.json',JSON.stringify(manifest,null,2));
console.log('Prepared seven distinct sprites; alpha validated.');
