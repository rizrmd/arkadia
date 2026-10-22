import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
sharp.concurrency(1);sharp.cache(false);
const root='public/elegant-actions',directions=['N','NE','E','SE','S','SW','W','NW'];
const manifest={status:'candidate-rejected',cell:384,pivot:[192,360],directions,frames:8,generatedWith:'Built-in imagegen',sourceResolution:[1254,1254],exportNote:'Generated raster cells packed and upscaled; not native 3072 artwork.',acceptance:{motion:'FAIL: run leg alternation and continuity not reliable',anatomy:'FAIL: right-arm device inconsistent in some generated views',death:'FAIL: final prone headings lose directional fidelity',alpha:'Inspect composites; bright source RGB fringe is mostly alpha 1–4/255',liveGameplay:'Unchanged'},clips:[]};
for(const action of ['hurt','death','run'])for(const hero of ['ember','rift']){
 const file=`${hero}-${action}`,source=`sources/${file}.png`,{data,info}=await sharp(`${root}/${source}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames=[];
 for(let row=0;row<8;row++)for(let f=0;f<8;f++){
  const x0=Math.round(f*info.width/8),y0=Math.round(row*info.height/8),w=Math.round((f+1)*info.width/8)-x0,h=Math.round((row+1)*info.height/8)-y0;
  const {data:d,info:i}=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:w,height:h}).raw().toBuffer({resolveWithObject:true});
  let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>16){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
  if(r<l)throw Error(`Empty ${file} ${row} ${f}`);
  let footL=w,footR=0;for(let y=Math.max(t,b-3);y<=b;y++)for(let x=l;x<=r;x++)if(d[(y*w+x)*4+3]>128){footL=Math.min(footL,x);footR=Math.max(footR,x)}
  frames.push({d,i,row,f,l,t,w:r-l+1,h:b-t+1,foot:(footL+footR)/2,sourceEdgeContact:l===0||t===0||r===w-1||b===h-1});
 }
 // Fixed scale for the entire clip; death bodies are never scaled per frame.
 const scale=Math.min(330/Math.max(...frames.map(f=>f.h)),310/Math.max(...frames.map(f=>f.w)));
 const composite=[],audit=[];
 for(const q of frames){const w=Math.round(q.w*scale),h=Math.round(q.h*scale),left=Math.round((384-w)/2),top=360-h;
  const input=await sharp(q.d,{raw:q.i}).extract({left:q.l,top:q.t,width:q.w,height:q.h}).resize(w,h).png().toBuffer();
  composite.push({input,left:q.f*384+left,top:q.row*384+top});
  audit.push({direction:directions[q.row],frame:q.f+1,bounds:[left,top,w,h],sourceEdgeContact:q.sourceEdgeContact,sha256:createHash('sha256').update(input).digest('hex')});
 }
 await sharp({create:{width:3072,height:3072,channels:4,background:'#00000000'}}).composite(composite).png().toFile(`${root}/${file}.png`);
 // Verification contact sheets use genuine alpha compositing; no background color removal.
 for(const [name,color]of [['dark','#202c3d'],['light','#f3f0e8']])await sharp(`${root}/${file}.png`).resize(1024).flatten({background:color}).png().toFile(`${root}/${file}-${name}.png`);
 manifest.clips.push({hero,action,sheet:`${file}.png`,source,fps:action==='run'?10:8,loop:action==='run',holdLast:action==='death',scale,audit});
}
await fs.writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log('Packed six candidate atlases. Visual acceptance remains FAILED; see manifest.');
