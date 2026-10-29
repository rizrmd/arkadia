import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=process.argv[2];if(!source)throw Error('Pass built-in imagegen output directory; originals are already preserved in kit/originals.');
const dest='public/core-upgrade/kit';await fs.mkdir(dest+'/originals',{recursive:true});
const items=[['frame','74efe5e8-3b70-4a0e-9255-1a2dfb2058b2',1424],['charcoal','2c1fa1bd-25b9-49da-8dab-f85852f53070',1000],['button','5dc3774f-8d2b-4954-91a6-de09835f6e96',900],['hammer','483fb30d-274e-4518-b920-b905e36b4840',320],['campfire','d1097eee-0592-4f67-ac11-9c83cabd1515',400],['header','380fb20b-9a0d-4d30-97ee-b9d4e974b51d',600],['gold','0b60304b-aeb6-4ee4-b9ea-d76cf64938ff',160],['wood','e8469dc4-5de5-4933-87c7-17e8dd8d52bf',160],['clock','937959d2-a796-413f-bf93-17ecc12a3565',160],['tick','b2a42007-e49a-42a7-a031-8323d167363d',96],['divider','ab3e0fd3-ae1f-4366-ab04-51e4fe0f2582',1000],['button-disabled','6d6e7f32-748a-4c6a-ab84-444944c11a89',900],['button-pressed','93eae968-e1c5-44f4-847b-22850eac8397',900]];
const manifest={reference:'DA5acc175c0ae712a3811fe761',generator:'built-in imagegen; one call per component; original reference input on every call',processing:'Lossless original retained. Runtime copies cropped to alpha bounds (>8), then downsampled only; no synthesized artwork.',assets:[]};
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
await sharp({create:{width:960,height:1150,channels:4,background:'#26313d'}}).composite(composites).png().toFile(dest+'/contact-sheet.png');
console.log('Packaged',manifest.assets.length,'assets, originals, alpha audit and contact sheet');
