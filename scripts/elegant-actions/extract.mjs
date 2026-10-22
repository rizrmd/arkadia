import sharp from 'sharp';
// Extract connected sprite figures before packing. No color keying or limb manipulation.
export async function extractFigures(path,{columns=2,rows=4,order}={}){
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,seen=new Uint8Array(w*h),components=[];
 for(let seed=0;seed<w*h;seed++){
  if(seen[seed]||data[seed*4+3]<=16)continue;
  const queue=[seed];seen[seed]=1;let l=w,t=h,r=0,b=0;
  for(let q=0;q<queue.length;q++){const n=queue[q],x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const nn of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(nn>=0&&!seen[nn]&&data[nn*4+3]>16){seen[nn]=1;queue.push(nn)}
  }
  if(queue.length>500)components.push({pixels:queue,l,t,r,b,area:queue.length});
 }
 const selected=components.sort((a,b)=>b.area-a.area).slice(0,columns*rows);
 if(selected.length!==columns*rows)throw Error(`Expected ${columns*rows} complete figures in ${path}; got ${selected.length}`);
 // Sort figure centers by row, then x, independent of arbitrary source cell boundaries.
 selected.sort((a,b)=>(a.t+a.b)-(b.t+b.b));const sorted=[];
 for(let row=0;row<rows;row++)sorted.push(...selected.slice(row*columns,(row+1)*columns).sort((a,b)=>(a.l+a.r)-(b.l+b.r)));
 const frames=[];
 for(const [i,c]of sorted.entries()){
  const l=Math.max(0,c.l-3),t=Math.max(0,c.t-3),r=Math.min(w-1,c.r+3),b=Math.min(h-1,c.b+3),fw=r-l+1,fh=b-t+1;
  const keep=new Uint8Array(fw*fh),frame=Buffer.alloc(fw*fh*4);
  for(const n of c.pixels){const x=n%w-l,y=Math.floor(n/w)-t;for(let yy=Math.max(0,y-2);yy<=Math.min(fh-1,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(fw-1,x+2);xx++)keep[yy*fw+xx]=1;}
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(keep[y*fw+x])data.copy(frame,(y*fw+x)*4,((y+t)*w+x+l)*4,((y+t)*w+x+l)*4+4);
  let footL=fw,footR=-1,footY=0;
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(frame[(y*fw+x)*4+3]>128)footY=Math.max(footY,y);
  for(let y=Math.max(0,footY-5);y<=footY;y++)for(let x=0;x<fw;x++)if(frame[(y*fw+x)*4+3]>128){footL=Math.min(footL,x);footR=Math.max(footR,x)}
  frames.push({data:frame,width:fw,height:fh,sourceIndex:i,sourceBounds:[c.l,c.t,c.r,c.b],sourceEdgeContact:c.l===0||c.t===0||c.r===w-1||c.b===h-1,footX:(footL+footR)/2,footY});
 }
 return {sourceSize:[w,h],frames:order?order.map(i=>frames[i]):frames,componentAreas:components.map(c=>c.area)};
}
