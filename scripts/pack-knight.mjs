// Packs the reviewed unified imagegen sheet. No per-clip identity swaps or per-frame scaling.
import sharp from 'sharp';
import {packFootfalls} from './pack-knight-footfalls.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function packKnight() {
 const file='knight-unified-v4.png', path='assets-src/characters/'+file;
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const scale=.60, cell={w:200,h:150,pivot:{x:100,y:130}}, gutter=4, frames=[], parts=[], crops=[];
 // Seed each torso, then flood through alpha. Unlike rectangular crops, this retains swords
 // crossing a column boundary and discards disconnected fragments from neighbouring figures.
 const labels=new Int16Array(info.width*info.height).fill(-1),queue=[];
 const seedY=[100,275,480,670,840,1010,1190,1370];
 const seedX=[115,300,480,660,845,1035];
 for(let row=0;row<8;row++)for(let col=0;col<6;col++){
  let best=-1,distance=Infinity;
  const sx=seedX[col],sy=seedY[row];
  for(let y=Math.max(0,sy-45);y<Math.min(info.height,sy+45);y++)for(let x=Math.max(0,sx-45);x<Math.min(info.width,sx+45);x++){
   const p=y*info.width+x,d=(x-sx)**2+(y-sy)**2;
   if(data[p*4+3]>=32&&d<distance){best=p;distance=d;}
  }
  if(best<0)throw Error(`No torso seed ${row}/${col}`);
  labels[best]=row*6+col;queue.push(best);
 }
 for(let i=0;i<queue.length;i++){
  const p=queue[i],x=p%info.width,y=Math.floor(p/info.width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy,q=ny*info.width+nx;
   if(nx>=0&&nx<info.width&&ny>=0&&ny<info.height&&labels[q]<0&&data[q*4+3]>=16){labels[q]=labels[p];queue.push(q);}
  }
 }
 const bounds=Array.from({length:48},()=>({l:info.width,r:-1,t:info.height,b:-1}));
 for(const p of queue){const f=bounds[labels[p]],x=p%info.width,y=Math.floor(p/info.width);f.l=Math.min(f.l,x);f.r=Math.max(f.r,x);f.t=Math.min(f.t,y);f.b=Math.max(f.b,y);}
 for(let id=0;id<48;id++){
  const row=Math.floor(id/6),col=id%6,{l,r,t,b}=bounds[id],w=r-l+1,h=b-t+1;
  if(w<20||h<20)throw Error(`Empty knight ${id}`);
  const raw=Buffer.alloc(w*h*4);
  for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const p=y*info.width+x;if(labels[p]===id)data.copy(raw,((y-t)*w+x-l)*4,p*4,p*4+4);}
  const image=await sharp(raw,{raw:{width:w,height:h,channels:4}}).resize(Math.round(w*scale),Math.round(h*scale)).raw().toBuffer({resolveWithObject:true});
  for(let p=0;p<image.data.length;p+=4)if(image.data[p+3]<16)image.data.fill(0,p,p+4);
  let hl=w,hr=-1;
  for(let y=t;y<t+Math.round(h*.10);y++)for(let x=l;x<=r;x++)if(labels[y*info.width+x]===id&&data[(y*info.width+x)*4+3]>64){hl=Math.min(hl,x-l);hr=Math.max(hr,x-l);}
  crops.push({row,col,l,t,w,h,image,head:(hl+hr)/2});
 }
 const upright=crops.filter(f=>[0,1,4,5,6,7].includes(f.row));
 const height=upright.reduce((n,f)=>n+f.h,0)/upright.length;
 for(const f of crops){
  const {row,col,image}=f,standing=[0,1,4,5,6,7].includes(row);
  const ox=Math.round(cell.pivot.x-(!standing?f.w/2:f.head)*scale);
  // All standing crowns use a single height. Lifted boots remain lifted; frame bottoms aren't re-grounded.
  const oy=standing?Math.round(cell.pivot.y-height*scale):cell.pivot.y-image.info.height;
  if(ox<2||oy<2||ox+image.info.width>cell.w-2||oy+image.info.height>cell.h-2)throw Error(`Knight frame ${row}/${col} exceeds padded cell`);
  const x=gutter+col*(cell.w+gutter),y=gutter+row*(cell.h+gutter);
  parts.push({input:image.data,raw:{width:image.info.width,height:image.info.height,channels:4},left:x+ox,top:y+oy});
  frames.push({row,col,x,y,w:cell.w,h:cell.h,source:{file,x:f.l,y:f.t,w:f.w,h:f.h}});
 }
 const atlasSize=[6*(cell.w+gutter)+gutter,8*(cell.h+gutter)+gutter];
 const bytes=await sharp({create:{width:atlasSize[0],height:atlasSize[1],channels:4,background:'#00000000'}}).composite(parts).png().toBuffer();

 const clip=(row,fps=6,loop=true,indices=[0,1,2,3,4,5])=>({fps,loop,frames:indices.map(i=>row*6+i)});
 const meta={id:'hero',image:'hero.png',revision:createHash('sha256').update(bytes).digest('hex').slice(0,16),source:file,sourceSize:[info.width,info.height],atlasSize,scale,gutter,cell,
  direction:'Unified knight: diagonal front/back and straight front/back; mirror diagonals only',idleHeightSourcePx:height,
  clips:{idle:clip(0),move:clip(1,10),attack:{...clip(2,12,false),impact:3},hit:clip(3,10,false,[0,1]),die:clip(3,8,false,[2,3,4,5]),idleBack:clip(4),moveBack:clip(5,10),idleDown:clip(6,6,true,[1]),moveDown:clip(6,10),idleUp:clip(7,6,true,[1]),moveUp:clip(7,10)},frames};
 return packFootfalls(bytes,meta);
}

if(process.argv[1]?.endsWith('/pack-knight.mjs')){
 const path='public/assets/characters/manifest.json',manifest=JSON.parse(await fs.readFile(path,'utf8'));
 manifest.characters.hero=await packKnight();await fs.writeFile(path,JSON.stringify(manifest,null,1));
 console.log('Packed unified knight:',manifest.characters.hero.revision);
}
