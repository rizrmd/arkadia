import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
// Candidate generator: source replay validation must pass before renderer integration.
const source=await fs.readFile('scripts/frozen-frontier-map/ground-kit.mjs','utf8');
const hash=b=>createHash('sha256').update(b).digest('hex');
const grounded=Function(source.slice(source.indexOf('const GROUNDED='),source.indexOf('let seed=11;'))+'return GROUNDED;')();
const before=source.slice(source.indexOf("await sunk('floor-sunk'"),source.indexOf("await drift('drift-ne'"));
const prior=Object.keys(grounded).length+[...before.matchAll(/await (?:sunk|flagstones|chips)\(/g)].length;
const helper=source.slice(source.indexOf('const blank='),source.indexOf('async function save('));
const noise=source.slice(source.indexOf('const hash='),source.indexOf('// Snow matched'));
const snow=source.slice(source.indexOf('const SNOW='),source.indexOf('const snowAt='));
let recipe=source.slice(source.indexOf('async function drift('),source.indexOf('// ---- Trampled snow:'));
recipe=recipe.replace('const zb=new Float32Array(w*h)', 'const heights=new Float32Array(w*h);const zb=new Float32Array(w*h)').replace('zb[i]=gy;', 'zb[i]=gy;heights[i]=z/R;').replace('record(id,img,p,', 'capture={heights,physical:out,fullSize:[w,h],origin:c0,pivot:p,img};record(id,img,p,');
const calls=source.slice(source.indexOf("await drift('drift-ne'"),source.indexOf("await scuff('ground-scuff-a'"));
const run=Function('sharp',`return (async()=>{const R=4,OUT='unused';let seed=11+101*${prior},capture;const records=[];${helper}${noise}${snow}const save=async()=>{};const record=(id,img,pivot,meta)=>records.push({id,...capture,meta});${recipe}${calls}return records;})()`);
const records=await run(sharp),catalog=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8')),assets={},checks=[];
for(const r of records){
 const original=await sharp('public/frozen-frontier/v3/assets/'+r.id+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),raw=Buffer.from(Array.from(r.img.d,v=>Math.round(Math.min(1,Math.max(0,v))*255)));
 assert.equal(original.info.width,r.img.w);assert.equal(original.info.height,r.img.h);assert.deepEqual(raw,original.data,r.id+' recipe replay must exactly reproduce source RGBA');
 const sprite=catalog.assets[r.id],cropX=Math.round(r.origin[0]-r.pivot[0]),cropY=Math.round(r.origin[1]-r.pivot[1]);
 let x0=r.img.w,y0=r.img.h,x1=-1,y1=-1;for(let y=0;y<r.img.h;y++)for(let x=0;x<r.img.w;x++)if(raw[(y*r.img.w+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(r.img.w-1,x1+2);y1=Math.min(r.img.h-1,y1+2);
 const width=x1-x0+1,height=y1-y0+1;assert.equal(width/4,sprite.world[0]);assert.equal(height/4,sprite.world[1]);
 const floats=new Float32Array(width*height),weights=new Float32Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x),j=(y+y0+cropY)*r.fullSize[0]+x+x0+cropX;floats[i]=r.heights[j];weights[i]=r.physical.d[j*4+3];}
 // Replay the atlas crop and resampling footprint, averaging source-camera
 // depth only over physical snow. Baked contact-shadow pixels stay on ground.
 const [,,w,h]=sprite.frame,values=[];let maxError=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xa=x*width/w,xb=(x+1)*width/w,ya=y*height/h,yb=(y+1)*height/h;let sum=0,weight=0;for(let yy=Math.floor(ya);yy<Math.ceil(yb);yy++)for(let xx=Math.floor(xa);xx<Math.ceil(xb);xx++){const area=(Math.min(xb,xx+1)-Math.max(xa,xx))*(Math.min(yb,yy+1)-Math.max(ya,yy)),i=yy*width+xx,a=area*weights[i];sum+=floats[i]*a;weight+=a;}const z=weight>1e-6?sum/weight:0,n=Math.round(z/sprite.world[1]*65535);values.push(n);maxError=Math.max(maxError,Math.abs(n/65535*sprite.world[1]-z));}
 assets[r.id]={frame:sprite.frame,world:sprite.world,pivot:sprite.pivot,size:[w,h],height:values,units:'height / logical frame height, UNORM16',sourceSha256:hash(await fs.readFile('public/frozen-frontier/v3/assets/'+r.id+'.png')),recipeSha256:hash(source),seed:11+101*(prior+records.indexOf(r)+1),maxHeight:Math.max(...values)/65535*sprite.world[1]};
 checks.push({id:r.id,exactSourceRgbaPixels:r.img.w*r.img.h,frame:sprite.frame,crop:[x0,y0,width,height],sourceCrop:[cropX,cropY],maxQuantizationErrorWorldPx:maxError,heightCells:values.length});
}
const manifest={version:1,atlasSha256:catalog.sha256,recipe:'scripts/frozen-frontier-map/ground-kit.mjs',contract:'Exact procedural source replay; source-camera height, original atlas alpha remains silhouette; baked source shadow is ground height. No RGB-derived geometry.',assets};
await fs.writeFile('src/world/maps/drift-height-companions.json',JSON.stringify(manifest)+'\n');await fs.writeFile('public/shadow-audit/drift-height-companions.json',JSON.stringify(manifest)+'\n');await fs.writeFile('docs/shadow-audit/drift-height-source.json',JSON.stringify({status:'pass',checks,recipeSha256:hash(source),priorSeedIncrements:prior},null,2)+'\n');console.log(JSON.stringify({checks}));
