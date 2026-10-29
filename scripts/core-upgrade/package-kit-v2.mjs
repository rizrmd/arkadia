import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=process.argv[2];if(!source)throw Error('Pass built-in imagegen output directory; originals are already preserved in kit/originals.');
const dest='public/core-upgrade/kit-v2';await fs.mkdir(dest+'/originals',{recursive:true});
const items=[["frame", "d9a8a923-183d-4896-9964-75ee7643d9ae", 1424], ["charcoal", "f4985e29-7acd-4574-9868-3aef360041af", 1000], ["hammer", "4f5ce60d-3457-4c02-9d80-e19d84029424", 320], ["campfire", "a382e54a-458a-4984-b0bd-98cb9c989dfe", 400], ["header", "ccf358ab-777f-43a3-8374-abf2c131e8fd", 600], ["gold", "cf5b2878-e6f6-4127-9102-d00c6d9b789b", 160], ["wood", "b80314c6-0cf6-482d-a65f-fd5198f0aacd", 160], ["clock", "9a5f4474-7e1e-443f-8219-6f3631a84135", 160], ["tick", "a5cfa99e-9c2d-479e-a351-ad08a2650347", 96], ["divider", "1530406e-1d59-44ec-9ab6-d6d2b63f6f99", 1000], ["button", "ee1ff921-57e1-4c34-92a5-55e4c245439f", 900], ["button-disabled", "f1500e6e-d313-43ae-8b77-5c5a6e93d26e", 900], ["button-pressed", "3818254f-66d4-46d6-83a1-f4b772a3253e", 900], ["core-01", "ebebc532-ff56-4504-a86f-98a58a0e1612", 320], ["core-05", "4c7f34b8-e1fa-40de-9d41-91477615ef86", 320], ["core-10", "cabe0567-489f-434d-b963-b2abc1caa61d", 320], ["core-15", "1c5d6912-8a19-4fec-a140-02826ba236db", 320], ["core-20", "f19a4024-698f-4ea6-a768-8d8514bfd290", 320], ["core-25", "bdda11e7-7215-44ea-94de-398a2901af14", 320], ["core-30", "114ef154-109a-4512-822c-4d31e5ec0d2a", 320]];
const manifest={reference:'DA89aad7756eefc3073e62e7ba; full approved panel DA5acc175c0ae712a3811fe761',generator:'built-in imagegen; one call per component; original reference input on every call',processing:'Lossless original retained. Runtime copies cropped to alpha bounds (>8), then downsampled only; no synthesized artwork.',assets:[]};
await fs.copyFile('/home/dev/attachments/core-panel-reference.png',dest+'/reference.png');
const composites=[];
for(const [i,[name,id,width]] of items.entries()){
 const original=await fs.readFile(`${source}/exec-${id}.png`);await fs.writeFile(`${dest}/originals/${name}.png`,original);
 const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=0,bottom=0,transparent=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;if(a>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 const crop={left,top,width:right-left+1,height:bottom-top+1};
 await sharp(original).extract(crop).resize({width,withoutEnlargement:true}).png().toFile(`${dest}/${name}.png`);
 const meta=await sharp(`${dest}/${name}.png`).metadata();manifest.assets.push({name,file:`${name}.png`,original:`originals/${name}.png`,originalSize:[info.width,info.height],crop,size:[meta.width,meta.height],transparentPixels:transparent,sha256:createHash('sha256').update(original).digest('hex')});
 const thumb=await sharp(`${dest}/${name}.png`).resize(270,180,{fit:'inside'}).png().toBuffer();const tm=await sharp(thumb).metadata();const x=(i%3)*320,y=Math.floor(i/3)*230;
 composites.push({input:thumb,left:x+Math.round((320-tm.width)/2),top:y+10+Math.round((180-tm.height)/2)});
 composites.push({input:Buffer.from(`<svg width="320" height="30"><text x="160" y="22" text-anchor="middle" fill="#e7cd95" font-family="sans-serif" font-size="18">${name}</text></svg>`),left:x,top:y+195});
}
await fs.writeFile(dest+'/manifest.json',JSON.stringify(manifest,null,2));
await sharp({create:{width:960,height:1610,channels:4,background:'#26313d'}}).composite(composites).png().toFile(dest+'/contact-sheet.png');
console.log('Packaged',manifest.assets.length,'assets, originals, alpha audit and contact sheet');
