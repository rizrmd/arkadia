import sharp from 'sharp';
import fs from 'node:fs/promises';

// Register the painted material pass to the existing silhouette. Its generated
// backdrop is deliberately discarded; authored alpha and moving doors stay exact.
const root='public/modular-stronghold/v2/';
const meta=JSON.parse(await fs.readFile(root+'full-gateway-v4-sheet.json','utf8'));
const {w,h}=meta.frame,ap=meta.stabilization.aperture;
// Match the walls' effective texel density instead of retaining generated microdetail.
const softened=await sharp('assets-src/gate-seamless/wall-matched-source.png').resize(600,400,{fit:'fill'}).png().toBuffer();
const art=await sharp(softened).resize(w,h,{fit:'fill',kernel:'linear'}).ensureAlpha().raw().toBuffer();
const atlas=await fs.readFile(root+meta.image),parts=[];
function material(pixels){
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const archY=201+50*Math.pow(Math.abs(x-384)/104,2);
  if(x>=ap.left&&x<=ap.right&&y>=archY&&y<=ap.bottom)continue;
  const p=(y*w+x)*4;
  for(let c=0;c<3;c++)pixels[p+c]=art[p+c];
 }
 return pixels;
}
for(let i=0;i<meta.frames;i++){
 const pixels=material(await sharp(atlas).extract({left:i%meta.columns*w,top:Math.floor(i/meta.columns)*h,width:w,height:h}).ensureAlpha().raw().toBuffer());
 const png=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
 parts.push({input:png,left:i%meta.columns*w,top:Math.floor(i/meta.columns)*h});
 if(i===meta.frames-1)await sharp(png).webp({lossless:true}).toFile(root+'full-gateway-v6-open.webp');
}
const closed=material(await sharp(root+'full-gateway-v4-closed.webp').ensureAlpha().raw().toBuffer());
await sharp(closed,{raw:{width:w,height:h,channels:4}}).webp({lossless:true}).toFile(root+'full-gateway-v6-closed.webp');
await sharp({create:{width:w*meta.columns,height:h*Math.ceil(meta.frames/meta.columns),channels:4,background:'#00000000'}}).composite(parts).webp({lossless:true}).toFile(root+'full-gateway-v6-sheet.webp');
await fs.writeFile(root+'full-gateway-v6-sheet.json',JSON.stringify({...meta,image:'full-gateway-v6-sheet.webp'},null,2));
console.log('Packed weathered gateway: original alpha, aperture and 16 moving door poses preserved.');
