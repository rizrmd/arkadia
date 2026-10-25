import sharp from 'sharp';
import fs from 'node:fs/promises';
// The generated south corner is a pair of orthographic planes. Calibrate the left
// plane about the central vertical arris; a whole-image rotation would lean piers
// and put the other arm off-grid. Keep this in the export pipeline, not gameplay.
export async function buildLowerCorner(){
 const source='assets-src/frozen-frontier/v4/corner-s.png';
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cx=810, shear=.10, out=Buffer.alloc(data.length);
 for(let x=0;x<info.width;x++)for(let y=0;y<info.height;y++){
  const sy=y-Math.max(0,cx-x)*shear, y0=Math.floor(sy),t=sy-y0;
  if(y0<0||y0+1>=info.height)continue;
  const d=(y*info.width+x)*4,a=(y0*info.width+x)*4,b=a+info.width*4;
  const alpha=data[a+3]*(1-t)+data[b+3]*t;out[d+3]=Math.round(alpha);
  if(alpha)for(let c=0;c<3;c++)out[d+c]=Math.round((data[a+c]*data[a+3]*(1-t)+data[b+c]*data[b+3]*t)/alpha);
 }
 const width=647,height=Math.round(info.height*width/info.width),file='public/frozen-frontier/v3/assets/corner-s.png';
 await sharp(out,{raw:info}).resize(width,height).png().toFile(file);
 const k=width/info.width,path='public/frozen-frontier/v3/manifest.json';
 const m=JSON.parse(await fs.readFile(path,'utf8')),a=m.assets.find(a=>a.id==='corner-s');
 Object.assign(a,{size:[width,height],pivot:{x:+(cx*k).toFixed(1),y:+(760*k).toFixed(1)},widthWorld:width/4,source,
 recipe:{kind:'generated-grounded-corner',projection:'2:1 dimetric',leftPlaneShear:shear,centralArrisX:cx,baselineSamples:{left:[[65,408],[810,855]],right:[[810,855],[1515,499]]},note:'Built-in image_gen; same limestone and snow, calibrated left wall to the floor grid; snow bank included.'}});
 await fs.writeFile(path,JSON.stringify(m,null,1)+'\n');
 console.log('South corner: regenerated art, calibrated left baseline',((855-408)/(810-65)-shear).toFixed(4),'right',((499-855)/(1515-810)).toFixed(4));
}
if(process.argv[1]?.endsWith('/build-lower-corner.mjs'))await buildLowerCorner();
