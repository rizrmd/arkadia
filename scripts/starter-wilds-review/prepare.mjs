import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='public/starter-wilds-review/v1', originals='assets-src/starter-wilds-review-v1/originals';
const names=['green-grass','dry-grass','bare-soil','gravel','green-oak','pine-tree','golden-tree','dead-tree','wild-bush','tall-grass','pond-reeds'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=[];
for(const name of names){
 const file=dir+'/'+name+'.png', source=await fs.readFile('assets-src/starter-wilds-review-v1/generated/'+name+'.png').catch(()=>fs.readFile(file)), original=await fs.readFile(originals+'/'+name+'.png');
 await fs.mkdir('assets-src/starter-wilds-review-v1/generated',{recursive:true});
 await fs.writeFile('assets-src/starter-wilds-review-v1/generated/'+name+'.png',source);
 const size=names.indexOf(name)<4?512:names.indexOf(name)<8?768:384;
 const image=await sharp(source).resize(size-16,size-16,{fit:'inside',withoutEnlargement:true}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,palette:true,quality:95,effort:10,colours:256}).toBuffer();
 await fs.writeFile(file,image);
 const meta=await sharp(image).metadata(), {data,info}=await sharp(image).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let min=255,max=0,clear=0,partial=0,borderMax=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];min=Math.min(min,a);max=Math.max(max,a);if(!a)clear++;else if(a<255)partial++;if(!x||!y||x===info.width-1||y===info.height-1)borderMax=Math.max(borderMax,a);}
 if(min!==0||max<240||borderMax!==0)throw Error('Invalid alpha: '+name);
 manifest.push({name,width:meta.width,height:meta.height,bytes:image.length,sha256:hash(image),originalBytes:original.length,originalSha256:hash(original),generatedSha256:hash(source),alpha:{min,max,transparentPixels:clear,partialPixels:partial,borderMax}});
}
await fs.writeFile(dir+'/manifest.json',JSON.stringify({status:'Review only; not activated in editor or gameplay',generator:'Built-in imagegen; individual reference-guided raster edits',optimization:'Sharp alpha-preserving resize; 8 px transparent padding; PNG indexed palette 256 colors quality 95',assets:manifest},null,2));
const font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const text=async(s,w,h)=>sharp({text:{text:s,font:'DejaVu Sans 14',fontfile:font,rgba:true,width:w,height:h}}).png().toBuffer();
const layers=[];const W=1400,H=1900;
layers.push({input:await text('STARTER WILDS — VISUAL REVISION v1\nOriginal → Revised | Separate review assets; gameplay unchanged',1350,60),left:25,top:16});
for(let i=0;i<names.length;i++){
 const n=names[i],row=Math.floor(i/3),col=i%3,x=col*464+12,y=row*440+100;
 layers.push({input:await text(n.replaceAll('-',' ').toUpperCase(),440,24),left:x,top:y});
 for(let j=0;j<2;j++){
  const p=j?dir+'/'+n+'.png':originals+'/'+n+'.png';
  const b=await sharp(p).resize(212,330,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  layers.push({input:b,left:x+j*226,top:y+35});
  layers.push({input:await text(j?'REVISED':'ORIGINAL',210,24),left:x+j*226,top:y+373});
 }
}
await sharp({create:{width:W,height:H,channels:3,background:'#c4c2b7'}}).composite(layers).png().toFile(dir+'/comparison.png');
const edges=[];for(let i=0;i<names.length;i++){const n=names[i];for(let j=0;j<2;j++){const b=await sharp(dir+'/'+n+'.png').resize(170,190,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).flatten({background:j?'#24262b':'#f2eee3'}).png().toBuffer();edges.push({input:b,left:(i%4)*350+j*175,top:Math.floor(i/4)*230+35});}edges.push({input:await text(n,340,25),left:i%4*350,top:Math.floor(i/4)*230+5});}
await sharp({create:{width:1400,height:700,channels:3,background:'#bcb9ae'}}).composite(edges).png().toFile(dir+'/alpha-review.png');
console.log(JSON.stringify({assets:manifest.length,bytes:manifest.reduce((s,a)=>s+a.bytes,0),originalBytes:manifest.reduce((s,a)=>s+a.originalBytes,0)}));
