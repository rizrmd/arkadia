import sharp from 'sharp';import fs from 'node:fs/promises';import {createHash}from 'node:crypto';import {extractFigures}from './extract.mjs';
sharp.concurrency(1);sharp.cache(false);
const root='public/elegant-actions/v2',directions=['N','NE','E','SE','S','SW','W','NW'],m={status:'in-validation',cell:384,pivot:[192,360],directions,frames:8,clips:[]};
for(const action of (process.env.ACTIONS||'hurt').split(','))for(const hero of ['ember','rift']){
 const composite=[],audit=[],scaleByHeading={};
 for(const [row,dir]of directions.entries()){
  const source=`sources/${hero}-${action}-${dir}.png`,{frames,sourceSize}=await extractFigures(root+'/'+source,{columns:dir==='SE'&&action==='hurt'?4:2,rows:dir==='SE'&&action==='hurt'?2:4});
  const scale=Math.min(328/Math.max(...frames.map(f=>f.footY)),...frames.map(f=>Math.min(168/Math.max(1,f.footX),168/Math.max(1,f.width-f.footX))));scaleByHeading[dir]=scale;
  for(const [f,q]of frames.entries()){
   const width=Math.round(q.width*scale),height=Math.round(q.height*scale),left=Math.round(192-q.footX*scale),top=Math.round(360-q.footY*scale);
   if(left<12||left+width>372||top<12||top+height>372)throw Error(`Clip ${hero} ${action} ${dir} ${f}: ${left} ${top} ${width} ${height}`);
   const input=await sharp(q.data,{raw:{width:q.width,height:q.height,channels:4}}).resize(width,height).png().toBuffer();
   composite.push({input,left:f*384+left,top:row*384+top});audit.push({direction:dir,frame:f+1,source,sourceSize,sourceBounds:q.sourceBounds,sourceEdgeContact:q.sourceEdgeContact,scale,bounds:[left,top,width,height],foot:[left+q.footX*scale,top+q.footY*scale],sha256:createHash('sha256').update(input).digest('hex')});
  }
 }
 const sheet=`${hero}-${action}.png`;await sharp({create:{width:3072,height:3072,channels:4,background:'#00000000'}}).composite(composite).png().toFile(root+'/'+sheet);
 for(const [name,color]of [['dark','#202c3d'],['light','#f3f0e8']])await sharp(root+'/'+sheet).resize(1536).flatten({background:color}).png().toFile(root+'/'+`${hero}-${action}-${name}.png`);
 m.clips.push({hero,action,sheet,audit,scaleByHeading});console.log(hero,action,'packed',audit.filter(f=>f.sourceEdgeContact).length,'source edge contacts');
}
await fs.writeFile(root+'/manifest.json',JSON.stringify(m,null,2)+'\n');
