import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';

sharp.concurrency(1);
const root='public/ember-warden/v3',docs='docs/ember-warden-v3',CELL=384,PIVOT=[192,320],hash=b=>createHash('sha256').update(b).digest('hex');
const definitions=[['idle',6,true],['run',12,true],['flame-fan',10,false],['cinder-step',12,false],['ember-snare',9,false],['furnace-heart',8,false],['hurt',12,false],['death',8,false]];
await fs.mkdir(root+'/sheets',{recursive:true});await fs.mkdir(root+'/previews',{recursive:true});
async function pixels(buffer){return sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})}
async function inspect(buffer){const {data,info}=await pixels(buffer);let b=[info.width,info.height,0,0],boot=[info.width,0,0],count=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const p=(y*info.width+x)*4;if(data[p+3]>16){b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x+1),Math.max(b[3],y+1)];count++;if(y>info.height*.6&&data[p+3]>220&&data[p]<160&&data[p+1]<130&&data[p+2]<110&&data[p]<2.5*(data[p+1]+1)){boot=[Math.min(boot[0],x),Math.max(boot[1],x+1),Math.max(boot[2],y+1)]}}}if(!count)throw Error('Empty source cell');return {bounds:b,boot,opaquePixels:count}}
async function clean(buffer){
 const {data,info}=await pixels(buffer),seen=new Uint8Array(info.width*info.height),components=[];
 for(let p=0;p<seen.length;p++){if(seen[p]||data[p*4+3]<=16)continue;const queue=[p];seen[p]=1;let b=[info.width,info.height,0,0];for(let i=0;i<queue.length;i++){const at=queue[i],x=at%info.width,y=Math.floor(at/info.width);b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];for(const n of [x?at-1:-1,x+1<info.width?at+1:-1,y?at-info.width:-1,y+1<info.height?at+info.width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>16){seen[n]=1;queue.push(n)}}components.push({queue,b})}
 components.sort((a,b)=>b.queue.length-a.queue.length);const main=components[0],keep=new Uint8Array(seen.length);if(!main)throw Error('Empty alpha');
 for(const c of components)if(c===main||(c.b[2]>=main.b[0]-12&&c.b[0]<=main.b[2]+12&&c.b[3]>=main.b[1]-12&&c.b[1]<=main.b[3]+12))for(const p of c.queue)keep[p]=1;
 for(let p=0;p<seen.length;p++)if(!keep[p])data[p*4+3]=0;
 return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
const clips=[],audit=[],atlasOverlays=[],textureFrames={},tags=[];let neutral;
for(let row=0;row<definitions.length;row++){
 const [id,fps,loop]=definitions[row],file=`source/${id}-SE.png`,meta=await sharp(root+'/'+file).metadata(),source=[];
 for(let n=0;n<8;n++){const left=Math.round(n%4*meta.width/4),top=Math.round(Math.floor(n/4)*meta.height/2),right=Math.round((n%4+1)*meta.width/4),bottom=Math.round((Math.floor(n/4)+1)*meta.height/2);source.push(await clean(await sharp(root+'/'+file).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer()))}
 const stats=await Promise.all(source.map(inspect)),first=stats[0].bounds;
 // One scale for the entire clip; crouches and falls retain their proportions.
 const scale=Math.min(250/(first[3]-first[1]),340/Math.max(...stats.map(s=>s.bounds[2]-s.bounds[0])),290/Math.max(...stats.map(s=>s.bounds[3]-s.bounds[1])));
 const frames=[];
 for(let n=0;n<8;n++){
  const s=stats[n],b=s.bounds,w=Math.round((b[2]-b[0])*scale),h=Math.round((b[3]-b[1])*scale);
  const hasBoot=s.boot[1]>s.boot[0],center=id==='death'&&n>=3?(b[0]+b[2])/2:hasBoot?(s.boot[0]+s.boot[1])/2:(b[0]+b[2])/2,ground=hasBoot?s.boot[2]:b[3];
  const left=Math.round(PIVOT[0]-(center-b[0])*scale),top=Math.round(PIVOT[1]-(ground-b[1])*scale);
  if(left<3||top<3||left+w>CELL-3||top+h>CELL-3)throw Error(`Clipping ${id} frame ${n}: ${[left,top,w,h]}`);
  frames.push(await sharp({create:{width:CELL,height:CELL,channels:4,background:'#00000000'}}).composite([{input:await sharp(source[n]).extract({left:b[0],top:b[1],width:b[2]-b[0],height:b[3]-b[1]}).resize(w,h).png().toBuffer(),left,top}]).png().toBuffer());
 }
 if(id==='idle'){neutral=frames[0];frames[7]=neutral}
 else if(id==='death'){frames[0]=neutral;frames[7]=frames[6]}
 else if(!loop){frames[0]=neutral;frames[7]=neutral}
 const clip={id:id+'-SE',action:id,direction:'SE',image:`sheets/${id}-SE.png`,fps,loop,holdLastFrame:id==='death',next:loop||id==='death'?null:'idle',durationMs:Math.round(8000/fps),frames:[],effects:['idle','run','hurt','death'].includes(id)?'none':'baked into RGBA frames'};
 const composites=[];
 for(let n=0;n<8;n++){
  const s=await inspect(frames[n]),rect=[n%4*CELL,Math.floor(n/4)*CELL,CELL,CELL],atlasRect=[n*CELL,row*CELL,CELL,CELL];
  composites.push({input:frames[n],left:rect[0],top:rect[1]});atlasOverlays.push({input:frames[n],left:atlasRect[0],top:atlasRect[1]});
  clip.frames.push({index:n,rect,atlasRect,pivot:PIVOT,alphaBounds:s.bounds,durationMs:1000/fps,sha256:hash(frames[n])});
  textureFrames[`${id}-SE-${String(n).padStart(3,'0')}`]={frame:{x:atlasRect[0],y:atlasRect[1],w:CELL,h:CELL},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:CELL,h:CELL},sourceSize:{w:CELL,h:CELL},pivot:{x:PIVOT[0]/CELL,y:PIVOT[1]/CELL},duration:Math.round(1000/fps)};
 }
 await sharp({create:{width:CELL*4,height:CELL*2,channels:4,background:'#00000000'}}).composite(composites).png().toFile(root+'/'+clip.image);
 const raw=await Promise.all(frames.map(f=>sharp(f).raw().toBuffer()));
 await sharp(Buffer.concat(raw),{raw:{width:CELL,height:CELL*8,channels:4,pageHeight:CELL}}).webp({quality:90,loop:loop?0:1,delay:Math.round(1000/fps)}).toFile(root+`/previews/${id}-SE.webp`);
 const unique=new Set(clip.frames.map(f=>f.sha256)).size;if(unique<6)throw Error('Insufficient unique frames '+id);
 const margin=Math.min(...clip.frames.map(f=>Math.min(...f.alphaBounds.slice(0,2),CELL-f.alphaBounds[2],CELL-f.alphaBounds[3])));
 if(margin<3)throw Error('Atlas margin '+id);
 audit.push({action:id,frames:8,uniqueFrames:unique,scale,minimumMargin:margin,neutralEndpoints:!loop&&id!=='death'?clip.frames[0].sha256===clip.frames[7].sha256:null,terminalHold:id==='death'?clip.frames[6].sha256===clip.frames[7].sha256:null,source:file,calibration:'alpha bounds and dark boot pixels; not a source-rig foot-contact measurement'});
 tags.push({name:id,from:row*8,to:row*8+7,direction:'forward',repeat:loop?0:1});clips.push(clip);
}
await sharp({create:{width:CELL*8,height:CELL*8,channels:4,background:'#00000000'}}).composite(atlasOverlays).png().toFile(root+'/ember-warden-SE.png');
const atlas={frames:textureFrames,animations:Object.fromEntries(clips.map(c=>[c.action,c.frames.map(f=>`${c.action}-SE-${String(f.index).padStart(3,'0')}`)])),animationSettings:Object.fromEntries(clips.map(c=>[c.action,{fps:c.fps,loop:c.loop,holdLastFrame:c.holdLastFrame,next:c.next}])),meta:{app:'Arkadia Ember Warden animation export',version:'3',image:'ember-warden-SE.png',format:'RGBA8888',size:{w:CELL*8,h:CELL*8},scale:'1',frameTags:tags}};
await fs.writeFile(root+'/atlas.json',JSON.stringify(atlas,null,2)+'\n');
const resources={};for(const dir of ['source','sheets','previews'])for(const file of await fs.readdir(root+'/'+dir))resources[dir+'/'+file]=hash(await fs.readFile(root+'/'+dir+'/'+file));
for(const file of ['ember-warden-SE.png','atlas.json'])resources[file]=hash(await fs.readFile(root+'/'+file));
const manifest={version:3,status:'painted-animation-candidate',direction:'SE',directions:['SE'],cell:[CELL,CELL],pivot:PIVOT,atlas:'ember-warden-SE.png',atlasJson:'atlas.json',actions:definitions.map(d=>d[0]),clips,resources,notes:['Eight southeast animations, eight frames each.','Skills have baked effects; these are not separate body and VFX layers.','Single-direction export; no gameplay hero or mechanics integration.','Generated gait, foot contacts and cloth continuity still require animator review; pixel/playback checks do not prove physical correctness.']};
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(docs+'/asset-audit.json',JSON.stringify({status:'atlas-export-pass',clips:8,frames:64,cell:[CELL,CELL],atlas:[CELL*8,CELL*8],audit},null,2)+'\n');
console.log(JSON.stringify({clips:8,frames:64,atlas:atlas.meta.size,status:'atlas-export-pass'}));
