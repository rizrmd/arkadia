import sharp from 'sharp';
import fs from 'node:fs/promises';
const source='public/assets/source-kit.png';
await fs.copyFile('../attachments/kit-or-preview-1.png',source);
// Hand-reviewed rectangles in the original 1448 × 1086 sheet. No generated replacement pixels.
const regions=[['ash',64,69,425,261,'floor'],['limestone',510,70,426,261,'floor'],['corruption',950,68,428,264,'floor'],['wall-a',28,390,343,320,'prop'],['wall-b',396,418,359,292,'prop'],['arch',778,337,319,393,'prop'],['tree',1105,330,314,430,'prop'],['roots',18,750,320,270,'prop'],['rubble',340,804,307,220,'prop'],['relic',655,748,205,278,'prop'],['crack',882,846,308,169,'decal'],['grass',1215,833,196,184,'prop']];
const manifest=[];
for(const [id,left,top,width,height,kind] of regions){
 const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let removed=0; for(let i=0;i<data.length;i+=4){if(data[i+3]<24){data[i+3]=0;removed++;}}
 await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(`public/assets/${id}.png`);
 manifest.push({id,kind,rect:{left,top,width,height},pivot:kind==='floor'?[0.5,0.5]:[0.5,0.91],alphaThreshold:24,removedPixels:removed});
}
await fs.writeFile('public/assets/manifest.json',JSON.stringify({source:'DA0679ae3e0624f52236ea60ea',width:1448,height:1086,assets:manifest},null,2));
console.log('Extracted',manifest.length,'sprites; original alpha preserved except alpha < 24.');
