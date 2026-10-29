// Replace only Run cells in existing atlases. Lossless encoding retains every other pose's decoded pixels.
import fs from 'node:fs/promises';import sharp from 'sharp';import {createHash} from 'node:crypto';
sharp.concurrency(1);sharp.cache(false);
const root='public/assets/characters/',path=root+'manifest.json',manifest=JSON.parse(await fs.readFile(path)),hash=b=>createHash('sha256').update(b).digest('hex');
const proof={};
for(const id of ['ember-warden','rift-runner']){
 const m=manifest.characters[id],file=root+m.image,atlas=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),original=Buffer.from(atlas.data);
 const src=await sharp(`assets-src/sprite-player/${id}-run.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const changed=new Set();
 for(const [row,dir]of ['N','NE','E','SE','S'].entries())for(let f=0;f<8;f++){
  const index=m.clips[`move-${dir}`].frames[f],rect=m.frames[index];changed.add(index);
  const density=rect.h/m.cell.h,s=m.scale*density,size=Math.round(384*s);
  const tile=await sharp(src.data,{raw:src.info}).extract({left:f*384,top:row*384,width:384,height:384}).resize(size,size).raw().toBuffer();
  const left=Math.round(m.cell.pivot.x*density-192*s),top=Math.round(m.cell.pivot.y*density-360*s);
  for(let y=0;y<rect.h;y++)for(let x=0;x<rect.w;x++){
   const out=((rect.y+y)*atlas.info.width+rect.x+x)*4,tx=x-left,ty=y-top;
   if(tx>=0&&ty>=0&&tx<size&&ty<size)tile.copy(atlas.data,out,(ty*size+tx)*4,(ty*size+tx)*4+4);else atlas.data.fill(0,out,out+4);
  }
 }
 const bytes=await sharp(atlas.data,{raw:atlas.info}).webp({lossless:true,effort:0}).toBuffer();await fs.writeFile(file,bytes);
 const decoded=await sharp(bytes).ensureAlpha().raw().toBuffer();
 let preserved=0;
 for(let i=0;i<m.frames.length;i++)if(!changed.has(i)){
  const r=m.frames[i];for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const p=((r.y+y)*atlas.info.width+r.x+x)*4;if(original[p+3]!==decoded[p+3]||(original[p+3]&&(!original.subarray(p,p+3).equals(decoded.subarray(p,p+3)))))throw Error(`Other pose changed: ${id} frame ${i}`);}preserved++;
 }
 m.revision=hash(bytes).slice(0,16);m.runCadence={frames:8,fps:10,cycleMs:800,source:'public/run-cadence/audit.json'};
 proof[id]={revision:m.revision,runCells:changed.size,preservedNonRunFrames:preserved,otherPosesPixelExact:true};
 console.log(id,proof[id]);
}
await fs.writeFile(path,JSON.stringify(manifest,null,1));await fs.writeFile('public/run-cadence/atlas-proof.json',JSON.stringify(proof,null,2)+'\n');
