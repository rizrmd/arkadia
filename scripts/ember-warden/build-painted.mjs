import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';

sharp.concurrency(1);
const root='public/ember-warden/v2';
await fs.mkdir(root+'/sprites',{recursive:true});
const directions=['N','NE','E','SE','S','SW','W','NW'];
const actions=['Idle','Run','Flame Fan','Cinder Step','Ember Snare','Furnace Heart','Hurt','Death'];
const manifest={version:2,purpose:'painted-character-art-review',cell:[384,384],pivot:[192,320],directions,turnaround:[],poses:[],run:[],resources:{},notes:['Turnaround and action poses define the revised painted art direction.','Run is a four-frame motion study, not a validated production locomotion export.','The attack animation experiment has heading drift and is excluded from active playback.','Action-pose effects are painted into the concept images; separate production VFX remain in the legacy viewer.']};
async function bounds(buffer){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1)}
 if(x1<=x0||y1<=y0)throw Error('Empty sprite');
 return [x0,y0,x1,y1];
}
async function crop(file,col,row,cols,rows){
 const {width,height}=await sharp(root+'/source/'+file).metadata();
 const left=Math.round(col*width/cols),top=Math.round(row*height/rows);
 const buffer=await sharp(root+'/source/'+file).extract({left,top,width:Math.round((col+1)*width/cols)-left,height:Math.round((row+1)*height/rows)-top}).png().toBuffer();
 // Exclude disconnected pieces of neighboring cells before packing a sprite.
 // This operates on alpha components, without repainting the generated artwork.
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true}),seen=new Uint8Array(info.width*info.height),components=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<=16)continue;
  const queue=[p];seen[p]=1;let xmin=info.width,ymin=info.height,xmax=0,ymax=0;
  for(let q=0;q<queue.length;q++){const at=queue[q],x=at%info.width,y=Math.floor(at/info.width);xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);for(const next of [x>0?at-1:-1,x+1<info.width?at+1:-1,y>0?at-info.width:-1,y+1<info.height?at+info.width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>16){seen[next]=1;queue.push(next)}}
  components.push({pixels:queue,b:[xmin,ymin,xmax,ymax]});
 }
 components.sort((a,b)=>b.pixels.length-a.pixels.length);const main=components[0];if(!main)throw Error('Empty source cell');
 const keep=new Uint8Array(seen.length);
 for(const c of components){const near=c.b[2]>=main.b[0]-6&&c.b[0]<=main.b[2]+6&&c.b[3]>=main.b[1]-6&&c.b[1]<=main.b[3]+6;if(c===main||near)for(const p of c.pixels)keep[p]=1}
 for(let p=0;p<seen.length;p++)if(!keep[p])data[p*4+3]=0;
 return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
async function sprite(buffer,file,{scale,center,ground}={}){
 const b=await bounds(buffer),width=b[2]-b[0],height=b[3]-b[1];
 scale??=Math.min(270/height,340/width);
 const w=Math.round(width*scale),h=Math.round(height*scale);
 const left=Math.round(192-((center??((b[0]+b[2])/2))-b[0])*scale),top=Math.round(320-((ground??b[3])-b[1])*scale);
 if(left<2||top<2||left+w>382||top+h>382)throw Error('Sprite clipping '+file);
 const art=await sharp(buffer).extract({left:b[0],top:b[1],width,height}).resize(w,h).png().toBuffer();
 await sharp({create:{width:384,height:384,channels:4,background:'#00000000'}}).composite([{input:art,left,top}]).png().toFile(root+'/'+file);
 return {image:file,bounds:[left,top,left+w,top+h],pivot:[192,320]};
}
for(let i=0;i<8;i++){
 manifest.turnaround.push({direction:directions[i],...await sprite(await crop('turnaround.png',i%4,Math.floor(i/4),4,2),`sprites/idle-${directions[i]}.png`)});
 manifest.poses.push({action:actions[i],...await sprite(await crop('action-poses.png',i%4,Math.floor(i/4),4,2),`sprites/pose-${i}.png`)});
 const frames=await Promise.all([0,1,2,3].map(col=>crop('run.png',col,i,4,8))),bb=await Promise.all(frames.map(bounds));
 const scale=Math.min(260/Math.max(...bb.map(b=>b[3]-b[1])),320/Math.max(...bb.map(b=>b[2]-b[0])));
 const ground=Math.max(...bb.map(b=>b[3])),center=bb.reduce((n,b)=>n+(b[0]+b[2])/2,0)/4;
 const output=[];
 for(let f=0;f<4;f++)output.push(await sprite(frames[f],`sprites/run-${directions[i]}-${f}.png`,{scale,ground,center}));
 manifest.run.push({direction:directions[i],fps:8,frames:output});
}
// The exact approved painted Rift reference, retained at the same presentation height.
const reference=await fs.readFile('public/rift-runner/v1/source/idle-s-sw-w-nw.png');
const meta=await sharp(reference).metadata();
const rift=await sharp(reference).extract({left:0,top:0,width:Math.round(meta.width/4),height:Math.round(meta.height/4)}).png().toBuffer();
manifest.reference=await sprite(rift,'sprites/rift-reference.png');
// Previous Ember is shown only for an explicit before/after comparison.
const old=await sharp('public/ember-warden/v1/sheets/idle-2.png').extract({left:0,top:256,width:256,height:256}).png().toBuffer();
manifest.previous=await sprite(old,'sprites/previous-ember.png');
async function walk(dir){for(const e of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const rel=(dir?dir+'/':'')+e.name;if(e.isDirectory())await walk(rel);else if(/\.(png|webp)$/.test(rel))manifest.resources[rel]=createHash('sha256').update(await fs.readFile(root+'/'+rel)).digest('hex')}}
await walk('source');await walk('sprites');
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile('docs/ember-warden-v2/asset-audit.json',JSON.stringify({status:'art-export-pass',sprites:50,turnaround:8,poses:8,runStudyFrames:32,cell:manifest.cell,pivot:manifest.pivot,checks:['nonempty alpha','sprite bounds within cell','constant run scale per direction','source and sprite SHA-256'],animationAcceptance:'not evaluated; art review only'},null,2)+'\n');
console.log('Painted Ember: 8 turnaround views, 8 action key poses, 32 run study frames, 2 comparison sprites.');
