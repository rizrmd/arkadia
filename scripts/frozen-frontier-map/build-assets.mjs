import sharp from 'sharp';import fs from 'node:fs/promises';
// Build the in-game Frozen Frontier atlas from the reviewed kits (public/frozen-frontier/v1 and v2) and the grounded
// v3 kit derived from them (ground-kit.mjs; a v3 export replaces the v1 export with the same id): each export is
// trimmed to its opaque pixels and resized to DENSITY px per world px (locked zoom 1.35 x DPR 1.75 = 2.36 screen px
// per world px, plus headroom for placements scaled up a little; soft decals that set their own lower density get
// that), then all are shelf-packed into one 2048 px WebP, so the scenery draws in one batch per layer and loads in
// one request. The pivot moves with the trim.
// Output: public/frozen-frontier/game/atlas.webp and src/world/maps/frozen-frontier-sprites.json (frames, pivots).
//   node scripts/frozen-frontier-map/build-assets.mjs
const OUT='public/frozen-frontier/game',CATALOG='src/world/maps/frozen-frontier-sprites.json',SIZE=2048,PAD=2;
await fs.mkdir(OUT,{recursive:true});
const parts=[];let sourceBytes=0;
// v3 retires the v1 snow-cap strips (every grounded module carries its own snow cap now).
const retired=new Set(JSON.parse(await fs.readFile('public/frozen-frontier/v3/manifest.json','utf8')).retired??[]);
for(const kit of ['v1','v2','v3','v4']){
 const manifest=JSON.parse(await fs.readFile(`public/frozen-frontier/${kit}/manifest.json`,'utf8'));
 for(const a of manifest.assets){
  if(retired.has(a.id))continue;
  const file=`public/frozen-frontier/${kit}/${a.file}`;sourceBytes+=(await fs.stat(file)).size;
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=-1,y1=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const pad=2;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(info.width-1,x1+pad);y1=Math.min(info.height-1,y1+pad);
  const old=parts.findIndex(p=>p.id===a.id);if(old>=0){sourceBytes-=parts[old].bytes;parts.splice(old,1);}
  parts.push({id:a.id,kit,bytes:(await fs.stat(file)).size,maxDensity:a.density??Infinity,file,crop:{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1},scale:a.scale,pivot:[(a.pivot.x-x0)/(x1-x0+1),(a.pivot.y-y0)/(y1-y0+1)],heightM:a.heightM,footprintM:a.footprintM});
 }
}
// Shelf packing, tallest first; lower the density until everything fits one SIZE x SIZE page.
function pack(density){
 for(const p of parts){const ww=p.crop.width*p.scale;p.w=Math.min(p.crop.width,Math.ceil(ww*Math.min(density,p.maxDensity)));p.h=Math.max(1,Math.round(p.crop.height*p.w/p.crop.width));}
 let x=0,y=0,row=0;
 for(const p of [...parts].sort((a,b)=>b.h-a.h)){if(x+p.w>SIZE){x=0;y+=row+PAD;row=0;}p.x=x;p.y=y;x+=p.w+PAD;row=Math.max(row,p.h);}
 return y+row<=SIZE;
}
let density=2.5;while(!pack(density))density=+(density-.05).toFixed(2);
const layers=await Promise.all(parts.map(async p=>({input:await sharp(p.file).extract(p.crop).resize(p.w,p.h,{kernel:'lanczos3'}).png().toBuffer(),left:p.x,top:p.y})));
const atlas=`${OUT}/atlas.webp`;
await sharp({create:{width:SIZE,height:SIZE,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:88,alphaQuality:90,effort:6}).toFile(atlas);
const bytes=(await fs.stat(atlas)).size;
const catalog={version:2,atlas:'/frozen-frontier/game/atlas.webp',size:[SIZE,SIZE],density,bytes,assets:{}};
for(const p of parts)catalog.assets[p.id]={kit:p.kit,frame:[p.x,p.y,p.w,p.h],world:[+(p.crop.width*p.scale).toFixed(2),+(p.crop.height*p.scale).toFixed(2)],
 pivot:[+p.pivot[0].toFixed(4),+p.pivot[1].toFixed(4)],heightM:p.heightM,footprintM:p.footprintM};
await fs.writeFile(CATALOG,JSON.stringify(catalog,null,1)+'\n');
console.log(parts.length,'sprites in one',SIZE+'px atlas at',density,'px/world px:',(bytes/1e6).toFixed(2),'MB (sources',(sourceBytes/1e6).toFixed(1),'MB)');
