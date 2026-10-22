import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='public/elegant-idle',dirs=['N','NE','E','SE','S','SW','W','NW'],size=384,pivot={x:192,y:360};
const manifest={version:1,scope:'Preview only',cell:{width:size,height:size},pivot,directions:dirs,frames:8,fps:5,characters:{},sources:[]};
for(const hero of ['ember','rift']){
 const composite=[],audit=[];
 for(let row=0;row<8;row++){
  const dir=dirs[row],suffix=['NW','SW'].includes(dir)?'final':'clean',source=`sources/${hero}-${dir}-${suffix}.png`;
  const {data,info}=await sharp(root+'/'+source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const frames=[];
  for(let f=0;f<8;f++){
   const left=Math.round(f%4*info.width/4),top=Math.round(Math.floor(f/4)*info.height/2),right=Math.round((f%4+1)*info.width/4),bottom=Math.round((Math.floor(f/4)+1)*info.height/2);
   const crop=await sharp(data,{raw:info}).extract({left,top,width:right-left,height:bottom-top}).raw().toBuffer({resolveWithObject:true});
   // Isolate the main figure; neighboring scarf/coat fragments can cross source cell edges.
   const cw=crop.info.width,ch=crop.info.height,seen=new Uint8Array(cw*ch);let largest=[];
   for(let seed=0;seed<cw*ch;seed++){if(seen[seed]||crop.data[seed*4+3]<=16)continue;const queue=[seed];seen[seed]=1;for(let q=0;q<queue.length;q++){const n=queue[q],x=n%cw,y=Math.floor(n/cw);for(const nn of [x>0?n-1:-1,x<cw-1?n+1:-1,y>0?n-cw:-1,y<ch-1?n+cw:-1])if(nn>=0&&!seen[nn]&&crop.data[nn*4+3]>16){seen[nn]=1;queue.push(nn)}}if(queue.length>largest.length)largest=queue;}
   const keep=new Uint8Array(cw*ch);for(const n of largest){const x=n%cw,y=Math.floor(n/cw);for(let yy=Math.max(0,y-2);yy<=Math.min(ch-1,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(cw-1,x+2);xx++)keep[yy*cw+xx]=1;}for(let n=0;n<keep.length;n++)if(!keep[n])crop.data[n*4+3]=0;
   let minx=crop.info.width,miny=crop.info.height,maxx=0,maxy=0,clear=0;
   for(let y=0;y<crop.info.height;y++)for(let x=0;x<crop.info.width;x++){const a=crop.data[(y*crop.info.width+x)*4+3];if(a>16){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}if(a===0)clear++;}
   const bootXs=[];
   for(let y=Math.max(miny,maxy-5);y<=maxy;y++)for(let x=minx;x<=maxx;x++)if(crop.data[(y*crop.info.width+x)*4+3]>128)bootXs.push(x);
   const footX=bootXs.length?(Math.min(...bootXs)+Math.max(...bootXs))/2:(minx+maxx)/2;
   frames.push({...crop,minx,miny,maxx,maxy,footX,clear});
  }
  // One fixed scale per heading. No per-frame rescaling or body deformation.
  const heights=frames.map(f=>f.maxy-f.miny+1).sort((a,b)=>a-b),scale=330/heights[4];
  for(let f=0;f<8;f++){
   const src=frames[f],w=src.maxx-src.minx+1,h=src.maxy-src.miny+1;
   const width=Math.round(w*scale),height=Math.round(h*scale),left=Math.round(pivot.x-(src.footX-src.minx)*scale),top=pivot.y-height;
   if(left<4||left+width>size-4||top<4)throw Error(`Clipped ${hero} ${dir} ${f}`);
   const input=await sharp(src.data,{raw:src.info}).extract({left:src.minx,top:src.miny,width:w,height:h}).resize(width,height).png().toBuffer();
   composite.push({input,left:f*size+left,top:row*size+top});
   audit.push({direction:dir,frame:f+1,source,scale,sourceBounds:[src.minx,src.miny,src.maxx,src.maxy],bounds:[left,top,width,height],pivot,transparentSourcePixels:src.clear,sha256:createHash('sha256').update(input).digest('hex')});
  }
  manifest.sources.push(source);
 }
 await sharp({create:{width:size*8,height:size*8,channels:4,background:'#00000000'}}).composite(composite).png().toFile(`${root}/${hero}-idle.png`);
 manifest.characters[hero]={name:hero==='ember'?'Ember Warden':'Rift Runner',sheet:`${hero}-idle.png`,audit};
}
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Packed 128 distinct generated frames into two 3072 x 3072 transparent atlases.');
