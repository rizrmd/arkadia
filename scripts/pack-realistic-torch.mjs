import sharp from 'sharp';
import fs from 'node:fs/promises';
// Fixed extraction, preserving source alpha. Register all frames on the iron collar.
const source='assets-src/realistic-torch/generated.png';
const centres=[360,840,1310,1850],width=450,height=724;
await fs.mkdir('public/realistic-torch',{recursive:true});
for(let i=0;i<4;i++)await sharp(source).extract({left:centres[i]-225,top:0,width,height}).resize(180,290).webp({lossless:true}).toFile(`public/realistic-torch/frame-${i}.webp`);
await fs.copyFile(source,'public/realistic-torch/generated.png');
try{await fs.copyFile('/home/dev/attachments/TA48454ae04adad23f00905539.png','public/realistic-torch/style-reference.png');}catch{}
