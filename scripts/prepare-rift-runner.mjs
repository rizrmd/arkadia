import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='public/rift-runner/v1';
const generation=JSON.parse(await fs.readFile('docs/rift-runner-v1/generation.json','utf8'));
const manifest={version:1,status:'animation-study-requires-art-review',cell:[256,256],bodyPivot:[128,224],vfxPivot:[128,128],directions:['N','NE','E','SE','S','SW','W','NW'],sheets:[],clips:[]};
const audit=[];
await fs.mkdir(`${dir}/sheets`,{recursive:true});
function bounds(data,w,h,threshold=24){let x0=w,y0=h,x1=-1,y1=-1,n=0,edge=0,zero=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[(y*w+x)*4+3];if(!a)zero++;if(a<=threshold)continue;n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(x===0||y===0||x===w-1||y===h-1)edge++;}return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,n,edge,zero};}
const componentCache=new Map();
function isolateFigures(source,count,columns){
 const {width:w,height:h}=source.info,d=source.data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),components=[];let label=0;
 for(let p=0;p<w*h;p++){
  if(labels[p]||d[p*4+3]<=24)continue;label++;let head=0,tail=1;queue[0]=p;labels[p]=label;let x0=w,y0=h,x1=0,y1=0,sx=0,sy=0;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x;sy+=y;
   for(const n of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(n>=0&&!labels[n]&&d[n*4+3]>24){labels[n]=label;queue[tail++]=n}
  }components.push({label,n:tail,x0,y0,x1,y1,cx:sx/tail,cy:sy/tail});
 }
 const selected=components.sort((a,b)=>b.n-a.n).slice(0,count).sort((a,b)=>a.cy-b.cy),ordered=[];
 if(selected.length!==count||selected.at(-1).n<1000)throw Error('Unable to isolate expected whole figures');
 for(let i=0;i<count;i+=columns)ordered.push(...selected.slice(i,i+columns).sort((a,b)=>a.cx-b.cx));
 return ordered.map(c=>{const x0=Math.max(0,c.x0-2),y0=Math.max(0,c.y0-2),cw=Math.min(w,c.x1+3)-x0,ch=Math.min(h,c.y1+3)-y0,data=Buffer.alloc(cw*ch*4);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const p=(y+y0)*w+x+x0;let keep=labels[p]===c.label;
   if(!keep&&d[p*4+3]<=24)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+x0+dx,ny=y+y0+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h&&labels[ny*w+nx]===c.label){keep=true;break}}
   if(keep)d.copy(data,(y*cw+x)*4,p*4,p*4+4);
  }return {data,w:cw,h:ch,sourceBounds:{x:x0,y:y0,w:cw,h:ch},componentPixels:c.n};
 });
}
for(const s of generation.sheets){
 const source=await sharp(`${dir}/source/${s.name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});const {width,height}=source.info;
 const crops=[];let gridSourceEdges=0;
 const figures=s.layer==='body'?isolateFigures(source,s.rows*s.columns,s.columns):null;
 const correction=generation.corrections?.find(c=>Object.hasOwn(c.selectedRows,s.name));
 const override=correction?await sharp(`${dir}/source/${correction.name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}):null;
 for(let row=0;row<s.rows;row++)for(let col=0;col<s.columns;col++){
  const active=override&&row===0?override:source;
  const aw=active.info.width,ah=active.info.height,ar=override&&row===0?correction.selectedRows[s.name]:row,rows=override&&row===0?correction.rows:s.rows;
  const left=Math.round(col*aw/s.columns),top=Math.round(ar*ah/rows),w=Math.round((col+1)*aw/s.columns)-left,h=Math.round((ar+1)*ah/rows)-top;
  const data=await sharp(active.data,{raw:{width:aw,height:ah,channels:4}}).extract({left,top,width:w,height:h}).raw().toBuffer();
  gridSourceEdges+=bounds(data,w,h).edge;
  let finalData=data,fw=w,fh=h;
  if(figures){const key=override&&row===0?correction.name:s.name;
   if(!componentCache.has(key))componentCache.set(key,override&&row===0?isolateFigures(override,correction.rows*s.columns,s.columns):figures);
   const fig=componentCache.get(key)[ar*s.columns+col];finalData=fig.data;fw=fig.w;fh=fig.h;
  }
  const b=bounds(finalData,fw,fh);if(!b.n)throw Error(`Empty ${s.name} ${row}/${col}`);
  crops.push({row,col,data:finalData,w:fw,h:fh,b});
 }
 const composites=[];const frames=[];
 for(const f of crops){
  // One scale per body row, derived from standing ready (idle and skill) or median run height.
  const rowCrops=crops.filter(v=>v.row===f.row);
  let scale;
  if(s.layer==='body'){
   const neutral=s.action==='run'?[...rowCrops].sort((a,b)=>a.b.h-b.b.h)[Math.floor(s.columns/2)].b.h:rowCrops[0].b.h;
   scale=Math.min(190/neutral,...rowCrops.map(v=>222/v.b.w),...rowCrops.map(v=>210/v.b.h));
  }else scale=Math.min(...crops.map(v=>216/Math.max(v.b.w,v.b.h)));
  const nw=Math.max(1,Math.round(f.b.w*scale)),nh=Math.max(1,Math.round(f.b.h*scale));
  const buf=await sharp(f.data,{raw:{width:f.w,height:f.h,channels:4}}).extract({left:f.b.x,top:f.b.y,width:f.b.w,height:f.b.h}).resize(nw,nh).png().toBuffer();
  const x=128-Math.round(nw/2),y=s.layer==='body'?224-nh:128-Math.round(nh/2);
  composites.push({input:buf,left:f.col*256+x,top:f.row*256+y});
  frames.push({row:f.row,column:f.col,sourceBounds:f.b,scale,outputBounds:{x,y,width:nw,height:nh},pivot:s.layer==='body'?[128,224]:[128,128]});
 }
 const file=`sheets/${s.name}.png`;
 await sharp({create:{width:s.columns*256,height:s.rows*256,channels:4,background:'#00000000'}}).composite(composites).png().toFile(`${dir}/${file}`);
 const sheet={...s,file,source:`source/${s.name}.png`,sourceSize:[width,height],frames};manifest.sheets.push(sheet);
 if(s.directions[0]==='omni')manifest.clips.push({id:s.action,action:s.action,layer:s.layer,direction:'omni',sheet:s.name,frames:frames.map(f=>[f.column,f.row]),fps:10,loop:false});
 else s.directions.forEach((direction,row)=>manifest.clips.push({id:`${s.action}-${direction}`,action:s.action,layer:s.layer,direction,sheet:s.name,frames:frames.filter(f=>f.row===row).map(f=>[f.column,f.row]),fps:s.action==='idle'?5:s.action==='run'?10:8,loop:['idle','run'].includes(s.action)}));
 audit.push({sheet:s.name,sourceSize:[width,height],expectedFrames:s.rows*s.columns,nonemptyFrames:crops.length,hasAlpha:true,sourceZeroAlphaPixels:crops.reduce((a,v)=>a+v.b.zero,0),sourceEdgePixelsAbove24:gridSourceEdges,processedCell:[256,256],minimumOutputMargin:Math.min(...frames.map(f=>Math.min(f.outputBounds.x,f.outputBounds.y,256-f.outputBounds.x-f.outputBounds.width,256-f.outputBounds.y-f.outputBounds.height)))});
}
manifest.frameCount=manifest.sheets.reduce((n,s)=>n+s.frames.length,0);
await fs.writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2));
await fs.writeFile('docs/rift-runner-v1/pixel-audit.json',JSON.stringify({frameCount:manifest.frameCount,clipCount:manifest.clips.length,sheets:audit,limitations:['Pivots use silhouette bottom-center, not artist-annotated planted-foot or pelvis landmarks.','Body figures are isolated by global alpha components before slicing to remove neighboring hands/boots/scarf fragments. VFX uses nominal grid slicing. Outer-source clipping cannot be reconstructed.','Per-row scale is fixed; generated anatomy and apparent scale can still vary.','Direction labels are requested coverage, not a visual pass. See playback review.']},null,2));
console.log(JSON.stringify({sheets:manifest.sheets.length,frames:manifest.frameCount,clips:manifest.clips.length,audit},null,2));
