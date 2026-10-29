// Three reviewed low-clearance key poses per facing. Down-facing v4 art remains byte-for-byte intact.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function packFootfalls(bytes,meta){
 const {cell,gutter}=meta,parts=[],frames=[...meta.frames];
 const old=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const bounds=(data,W,H,x0,y0,x1,y1)=>{
  let l=x1,r=-1,t=y1,b=-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*W+x)*4+3]>=32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(r<l)throw Error('Empty footfall pose');return {l,t,w:r-l+1,h:b-t+1};
 };
 const oldBounds=f=>bounds(old.data,old.info.width,old.info.height,f.x,f.y,f.x+f.w,f.y+f.h);
 const target=oldBounds(meta.frames[meta.clips.idleDown.frames[0]]).h;
 const specs=[{file:'knight-footfalls-front-v5.png',rows:1,row:0,name:'move',idle:'idle'},
  {file:'knight-footfalls-rear-v5.png',rows:2,row:0,name:'moveBack',idle:'idleBack'},
  {file:'knight-footfalls-rear-v5.png',rows:2,row:1,name:'moveUp',idle:'idleUp'}];
 const clips={...meta.clips};
 for(const [i,spec]of specs.entries()){
  const path='assets-src/characters/'+spec.file,{data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const list=Array.from({length:3},(_,col)=>bounds(data,info.width,info.height,Math.round(col*info.width/3),Math.round(spec.row*info.height/spec.rows),Math.round((col+1)*info.width/3),Math.round((spec.row+1)*info.height/spec.rows)));
  // One scale for all three poses. Fit the standing contact to the existing straight-down body height.
  const scale=target/list[0].h,indices=[];
  for(const [col,f]of list.entries()){
   let hl=f.w,hr=-1;
   for(let y=f.t;y<f.t+Math.round(f.h*.1);y++)for(let x=f.l;x<f.l+f.w;x++)if(data[(y*info.width+x)*4+3]>64){hl=Math.min(hl,x-f.l);hr=Math.max(hr,x-f.l);}
   const image=await sharp(path).extract({left:f.l,top:f.t,width:f.w,height:f.h}).resize(Math.round(f.w*scale),Math.round(f.h*scale)).raw().toBuffer({resolveWithObject:true});
   for(let p=0;p<image.data.length;p+=4)if(image.data[p+3]<16)image.data.fill(0,p,p+4);
   const ox=Math.round(cell.pivot.x-(hl+hr)/2*scale),oy=cell.pivot.y-image.info.height;
   if(ox<2||oy<2||ox+image.info.width>cell.w-2)throw Error('Footfall exceeds cell');
   const row=8+i,x=gutter+col*(cell.w+gutter),y=gutter+row*(cell.h+gutter),index=frames.length;
   parts.push({input:image.data,raw:{width:image.info.width,height:image.info.height,channels:4},left:x+ox,top:y+oy});
   frames.push({row,col,x,y,w:cell.w,h:cell.h,source:{file:spec.file,x:f.l,y:f.t,w:f.w,h:f.h},footfall:col===0?'contact':col===1?'rightSwing':'leftSwing'});indices.push(index);
  }
  clips[spec.idle]={fps:6,loop:true,frames:[indices[0]]};
  clips[spec.name]={fps:6,loop:true,strideScale:1.6,frames:[indices[0],indices[1],indices[0],indices[2]]};
 }
 const atlasSize=[meta.atlasSize[0],11*(cell.h+gutter)+gutter];
 // Copy raw RGBA directly. Re-compositing the old atlas would round translucent edge colors.
 const raw=Buffer.alloc(atlasSize[0]*atlasSize[1]*4);
 for(let y=0;y<old.info.height;y++)old.data.copy(raw,y*atlasSize[0]*4,y*old.info.width*4,(y+1)*old.info.width*4);
 for(const p of parts)for(let y=0;y<p.raw.height;y++)p.input.copy(raw,((p.top+y)*atlasSize[0]+p.left)*4,y*p.raw.width*4,(y+1)*p.raw.width*4);
 const output=await sharp(raw,{raw:{width:atlasSize[0],height:atlasSize[1],channels:4}}).png().toBuffer();
 await fs.writeFile('public/assets/characters/hero.png',output);
 return {...meta,revision:createHash('sha256').update(output).digest('hex').slice(0,16),atlasSize,frames,clips,
  direction:'Low-clearance alternating diagonal/rear footfalls; original straight-down walk retained; mirror diagonals only'};
}
