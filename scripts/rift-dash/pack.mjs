// Deterministic sprite slicing only; generated alpha and original sources are preserved.
import sharp from 'sharp';import fs from 'node:fs/promises';import crypto from 'node:crypto';
const dir='public/rift-dash/v2';const manifest={generator:'Built-in image_gen',grid:[4,4],frames:16,assets:{}};
for(const name of ['departure','arrival','particles','trail']){
 const path=`${dir}/source/${name}.png`,bytes=await fs.readFile(path),m=await sharp(bytes).metadata(),stats=await sharp(bytes).stats();
 if(!m.hasAlpha||stats.channels[3].min!==0)throw Error(`${name}: missing transparency`);
 manifest.assets[name]={source:`source/${name}.png`,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:m.width,height:m.height,alpha:stats.channels[3]};
 if(name==='trail'){await sharp(bytes).resize(768,256).webp({lossless:true}).toFile(`${dir}/trail.webp`);continue;}
 // Equal grid boundaries, four-pixel inset and transparent gutters prevent neighboring frame bleed.
 const cells=[];for(let i=0;i<16;i++){
 const x=Math.floor(i%4*m.width/4)+4,y=Math.floor(Math.floor(i/4)*m.height/4)+4,w=Math.floor((i%4+1)*m.width/4)-x-4,h=Math.floor((Math.floor(i/4)+1)*m.height/4)-y-4;
 cells.push({input:await sharp(bytes).extract({left:x,top:y,width:w,height:h}).resize(248,248,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:i%4*256+4,top:Math.floor(i/4)*256+4});
 }
 await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}}).composite(cells).webp({lossless:true}).toFile(`${dir}/${name}.webp`);
}
await fs.writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2));console.log('Packed four alpha-preserving runtime textures; originals retained.');
