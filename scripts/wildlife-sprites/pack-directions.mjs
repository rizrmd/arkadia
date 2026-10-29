import sharp from 'sharp';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const report={generator:'Built-in imagegen',species:['deer','crocodile'],frameSize:256,columns:4,rows:16,pivot:[.5,210/256],directions:['N','NE','E','SE','S','SW','W','NW'],frames:[]},composites=[];
for(const [speciesIndex,species]of report.species.entries()){
 const source=`assets-src/wildlife/${species}-eight-directions${species==='crocodile'?'-v2':''}.png`;
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Generated spacing is not a perfect grid. Segment the entire source first,
 // so a snout, tail or antler crossing a nominal cell edge cannot be cropped.
 const seen=new Uint8Array(info.width*info.height),components=[];
 for(let seed=0;seed<seen.length;seed++){
  if(seen[seed]||data[seed*4+3]<=8)continue;
  const pixels=[seed];seen[seed]=1;let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let q=0;q<pixels.length;q++){
   const n=pixels[q],x=n%info.width,y=Math.floor(n/info.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=info.width||yy>=info.height)continue;const k=yy*info.width+xx;if(!seen[k]&&data[k*4+3]>8){seen[k]=1;pixels.push(k);}}
  }
  if(pixels.length>400)components.push({pixels,left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
 }
 const main=components.sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,32).sort((a,b)=>(a.top+a.height/2)-(b.top+b.height/2));
 if(main.length!==32)throw Error('Expected 32 separate animal silhouettes');
 const ordered=[];for(let row=0;row<8;row++)ordered.push(...main.slice(row*4,row*4+4).sort((a,b)=>a.left-b.left));
 const factor=Math.min(222/Math.max(...ordered.map(c=>c.width)),198/Math.max(...ordered.map(c=>c.height)));
 for(const [i,c]of ordered.entries()){
  const raw=Buffer.alloc(c.width*c.height*4);for(const n of c.pixels){const x=n%info.width-c.left,y=Math.floor(n/info.width)-c.top;data.copy(raw,(y*c.width+x)*4,n*4,n*4+4);}
  const width=Math.round(c.width*factor),height=Math.round(c.height*factor),row=speciesIndex*8+Math.floor(i/4),column=i%4;
  const input=await sharp(raw,{raw:{width:c.width,height:c.height,channels:4}}).resize(width,height).png().toBuffer();
  composites.push({input,left:column*256+Math.round((256-width)/2),top:row*256+210-height});report.frames.push({species,index:i,row,column,width,height,pivotY:210,sourceBounds:{left:c.left,top:c.top,width:c.width,height:c.height},sha256:createHash('sha256').update(input).digest('hex')});
 }
}
await sharp({create:{width:1024,height:4096,channels:4,background:'#00000000'}}).composite(composites).png().toFile('public/wildlife/eight-directions-atlas.png');await fs.writeFile('docs/wildlife-directions/atlas.json',JSON.stringify(report,null,2));console.log('Packed 64 complete silhouettes with fixed species scale and shared foot pivot');
