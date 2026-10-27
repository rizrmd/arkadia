import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const composites=[],report={generator:'Built-in imagegen',species:['deer','crocodile'],frameSize:256,columns:8,rows:4,pivot:[.5,.82],clips:[],frames:[]};
for(const [speciesIndex,species] of report.species.entries()){
 const path=`assets-src/wildlife/${species}-source.png`,meta=await sharp(path).metadata();
 if(!meta.hasAlpha)throw Error('Source lacks transparency');
 const cells=[];
 for(let i=0;i<16;i++){
  const left=Math.round(i%4*meta.width/4),top=Math.round(Math.floor(i/4)*meta.height/4),right=Math.round((i%4+1)*meta.width/4),bottom=Math.round((Math.floor(i/4)+1)*meta.height/4);
  const {data,info}=await sharp(path).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Keep the main connected silhouette; generated cell edges can include tiny adjacent-cell fragments.
  const seen=new Uint8Array(info.width*info.height);let largest=[];
  for(let seed=0;seed<seen.length;seed++){
   if(seen[seed]||data[seed*4+3]<=8)continue;
   const component=[seed];seen[seed]=1;
   for(let q=0;q<component.length;q++){const n=component[q],x=n%info.width,y=Math.floor(n/info.width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=info.width||yy>=info.height)continue;const k=yy*info.width+xx;if(!seen[k]&&data[k*4+3]>8){seen[k]=1;component.push(k);}}}
   if(component.length>largest.length)largest=component;
  }
  const keep=new Uint8Array(seen.length);for(const n of largest)keep[n]=1;
  for(let n=0;n<keep.length;n++)if(!keep[n])data[n*4+3]=0;
  let x0=info.width,y0=info.height,x1=0,y1=0,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}if(a===0)transparent++;}
  if(!transparent||x1<=x0)throw Error('Invalid frame');
  cells.push({data,info,bounds:{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}});
 }
 const factor=Math.min(222/Math.max(...cells.map(c=>c.bounds.width)),198/Math.max(...cells.map(c=>c.bounds.height)));
 for(const [i,c]of cells.entries()){
  const width=Math.round(c.bounds.width*factor),height=Math.round(c.bounds.height*factor);
  const input=await sharp(c.data,{raw:c.info}).extract(c.bounds).resize(width,height).png().toBuffer();
  const row=speciesIndex*2+Math.floor(i/8),column=i%8,left=column*256+Math.round((256-width)/2),top=row*256+210-height;
  composites.push({input,left,top});report.frames.push({species,index:i,row,column,width,height,pivotY:210,sha256:createHash('sha256').update(input).digest('hex')});
 }
}
report.clips=[{name:'deer-walk',row:0,frames:8,ms:1600},{name:'deer-run',row:1,frames:8,ms:800},{name:'crocodile-crawl',row:2,frames:8,ms:2400},{name:'crocodile-swim',row:3,frames:8,ms:2000}];
await sharp({create:{width:2048,height:1024,channels:4,background:'#00000000'}}).composite(composites).png().toFile('public/wildlife/imagegen-atlas.png');
await fs.writeFile('docs/wildlife-sprites/atlas.json',JSON.stringify(report,null,2));
console.log('Packed 32 unique generated frames into transparent PNG atlas with fixed species scale and shared pivot.');
