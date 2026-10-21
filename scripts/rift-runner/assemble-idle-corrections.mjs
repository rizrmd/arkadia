import fs from 'node:fs/promises';
import sharp from 'sharp';
import {inspect,isolateSprite} from './sheet-utils.mjs';
sharp.concurrency(1);
const root='public/rift-runner/v3',clips=[],sheets=[],audit=[];
await fs.mkdir(root+'/idle-corrections',{recursive:true});
for(const direction of ['W','NW']) {
 const source=`source/idle-${direction}-four.png`,meta=await sharp(root+'/'+source).metadata(),parts=[],stats=[];
 for(let n=0;n<4;n++) {
  const left=Math.round(n%2*meta.width/2),top=Math.round(Math.floor(n/2)*meta.height/2);
  const b=await isolateSprite(await sharp(root+'/'+source).extract({left,top,width:Math.round(meta.width/2),height:Math.round(meta.height/2)}).png().toBuffer());
  parts.push(b);stats.push(await inspect(b));
 }
 const scale=190/stats[0].height,frames=[],rendered=[];
 for(let n=0;n<4;n++) {
  const s=stats[n],b=s.bounds,input=await sharp(parts[n]).extract({left:b[0],top:b[1],width:b[2]-b[0],height:b[3]-b[1]}).resize({width:Math.round((b[2]-b[0])*scale)}).png().toBuffer(),im=await sharp(input).metadata();
  const left=Math.round(176-(s.footCenter-b[0])*scale),top=240-im.height;
  if(left<4||left+im.width>348||top<4)throw Error('Idle clipping '+direction);
  const out=await sharp({create:{width:352,height:352,channels:4,background:'#00000000'}}).composite([{input,left,top}]).png().toBuffer();
  rendered.push(out);frames.push({cell:[n,0],pivot:[176,240],alphaBounds:(await inspect(out)).bounds});
 }
 const image=`idle-corrections/idle-${direction}.png`;
 await sharp({create:{width:1408,height:352,channels:4,background:'#00000000'}}).composite(rendered.map((input,n)=>({input,left:n*352,top:0}))).png().toFile(root+'/'+image);
 const c={id:'idle-'+direction,action:'idle',direction,image:'../v3/'+image,cellSize:352,frames,fps:6,loop:true,duration:4/6,layer:'body'};
 clips.push(c);sheets.push({image:c.image,cell:[352,352],clips:[c]});audit.push({direction,source,scale,frames,policy:'constant clip scale, fixed boot ground and lower-foot center'});
}
await fs.writeFile(root+'/idle-corrections-manifest.json',JSON.stringify({cell:[352,352],bodyPivot:[176,240],actions:['idle'],clips,sheets},null,2));
await fs.writeFile('docs/rift-runner-v3/idle-corrections-audit.json',JSON.stringify(audit,null,2));
console.log({clips:clips.length,frames:8});
