// Normalize imagegen-authored NE/E/SE cycles; retain and rephase the existing N/S artwork.
// Only Run sheets are written. Re-run from checked-in reference strips, never from output.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const ROOT='public/run-cadence',CELL=384,DIRS=['N','NE','E','SE','S'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const audit={cell:[384,384],pivot:[192,360],fps:10,cycleMs:800,cyclesPerSheet:1,verticalOrder:[0,1,2,3,4,5,6,7],heroes:{}};
async function normalize(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(!info||info.channels!==4)throw Error('RGBA required: '+file);
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<8)transparent++;
 if(transparent<info.width*info.height*.05)throw Error('No transparent backdrop: '+file);
 if(info.width===CELL*4&&info.height===CELL*2)return Promise.all(Array.from({length:8},(_,f)=>sharp(data,{raw:info}).extract({left:(f%4)*CELL,top:Math.floor(f/4)*CELL,width:CELL,height:CELL}).png().toBuffer()));
 const cells=[];
 for(let f=0;f<8;f++){
  const x0=Math.round(f%4*info.width/4),x1=Math.round((f%4+1)*info.width/4),y0=Math.round(Math.floor(f/4)*info.height/2),y1=Math.round((Math.floor(f/4)+1)*info.height/2),w=x1-x0,h=y1-y0;
  const raw=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:w,height:h}).raw().toBuffer();
  const seen=new Uint8Array(w*h);let largest=[];
  for(let seed=0;seed<w*h;seed++){
   if(seen[seed]||raw[seed*4+3]<=24)continue;
   const q=[seed];seen[seed]=1;
   for(let i=0;i<q.length;i++){let n=q[i],x=n%w,y=Math.floor(n/w);for(const nn of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(nn>=0&&!seen[nn]&&raw[nn*4+3]>24){seen[nn]=1;q.push(nn);}}
   if(q.length>largest.length)largest=q;
  }
  if(largest.length<w*h*.08)throw Error('Missing figure '+file+' '+f);
  const keep=new Uint8Array(w*h);let l=w,r=0,t=h,b=0;
  for(const n of largest){let x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)keep[yy*w+xx]=1;}
  for(let n=0;n<w*h;n++)if(!keep[n]||raw[n*4+3]<8)raw.fill(0,n*4,n*4+4);
  const bw=r-l+1,bh=b-t+1,s=318/bh,nw=Math.min(336,Math.round(bw*s)),nh=318;
  const crop=await sharp(raw,{raw:{width:w,height:h,channels:4}}).extract({left:l,top:t,width:bw,height:bh}).resize(nw,nh).raw().toBuffer();
  // Same torso/pelvis median anchor as the existing sheet pipeline, independent of trailing cape/hair.
  const weights=Array(nw).fill(0);let total=0;
  for(let y=Math.floor(nh*.18);y<Math.floor(nh*.72);y++)for(let x=0;x<nw;x++){const a=crop[(y*nw+x)*4+3];if(a>64){weights[x]+=a;total+=a;}}
  let sum=0,cx=0;for(;cx<nw;cx++){sum+=weights[cx];if(sum>=total/2)break;}
  const left=Math.max(12,Math.min(CELL-12-nw,192-cx)),lift=[0,2,4,8,0,2,4,8][f],top=356-nh-lift;
  cells.push(await sharp({create:{width:CELL,height:CELL,channels:4,background:'#00000000'}}).composite([{input:await sharp(crop,{raw:{width:nw,height:nh,channels:4}}).png().toBuffer(),left,top}]).png().toBuffer());
 }
 return cells;
}
for(const hero of ['ember-warden','rift-runner']){
 const parts=[],stats={};
 for(const [row,dir]of DIRS.entries()){
  let cells;
  if(dir==='N'||dir==='S')cells=await Promise.all(audit.verticalOrder.map(f=>sharp(`${ROOT}/source/${hero}-${dir}-reference.png`).extract({left:f*CELL,top:0,width:CELL,height:CELL}).png().toBuffer()));
  else cells=await normalize(`${ROOT}/source/${hero}-${dir}.png`);
  stats[dir]={uniqueFrames:new Set(cells.map(hash)).size,hashes:cells.map(hash)};
  if(stats[dir].uniqueFrames!==8)throw Error('Duplicate frame '+hero+' '+dir);
  for(let f=0;f<8;f++)parts.push({input:cells[f],left:f*CELL,top:row*CELL});
 }
 const output=await sharp({create:{width:CELL*8,height:CELL*5,channels:4,background:'#00000000'}}).composite(parts).png().toBuffer();
 await fs.writeFile(`assets-src/sprite-player/${hero}-run.png`,output);
 await fs.writeFile(`${ROOT}/${hero}-run.png`,output);
 audit.heroes[hero]={sheetHash:hash(output),directions:stats,mirrorOf:{NW:'NE',W:'E',SW:'SE'}};
}
await fs.writeFile(`${ROOT}/audit.json`,JSON.stringify(audit,null,2)+'\n');
console.log('Both Run sheets rebuilt: 80 unique stored cells, one eight-frame cycle per direction.');
