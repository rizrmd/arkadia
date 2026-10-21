import sharp from 'sharp';
import fs from 'node:fs/promises';
// Packing only: preserve the 16 generated poses; crop fixed cells without creating motion or warping leaves.
const source='assets-src/gate-animation/generated-sheet.png',out='public/modular-stronghold/v2';
const info=await sharp(source).metadata();if(info.width!==info.height||!info.hasAlpha)throw Error('Expected square transparent generated 4x4 atlas');
const unit=info.width/1280;
const frame={w:136,h:148},parts=[];
for(let i=0;i<16;i++)parts.push({input:await sharp(source).extract({left:Math.round(((i%4)*320+32)*unit),top:Math.round((Math.floor(i/4)*320+16)*unit),width:Math.floor(272*unit),height:Math.floor(296*unit)}).resize(frame.w,frame.h).png().toBuffer(),left:(i%4)*frame.w,top:Math.floor(i/4)*frame.h});
await sharp({create:{width:frame.w*4,height:frame.h*4,channels:4,background:'#00000000'}}).composite(parts).webp({lossless:true}).toFile(out+'/gate-generated-sheet.webp');
await fs.writeFile(out+'/gate-generated-sheet.json',JSON.stringify({image:'gate-generated-sheet.webp',columns:4,frames:16,frame,fps:20,region:{x:97,y:62,w:76,h:84},source:'Built-in image generation: 16 changing-perspective opening poses; closing plays in reverse.'},null,2));
console.log('Packed 16 generated poses into 544x592 transparent atlas');
