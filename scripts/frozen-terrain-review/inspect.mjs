import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='public/frozen-terrain-review/v1';
const files=(await fs.readdir(dir)).filter(n=>n.endsWith('.png')&&!n.startsWith('review-'));
const entries=[];
for(const name of files){
 const bytes=await fs.readFile(`${dir}/${name}`), {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info; let x=0,y=0,inner=0;
 for(let j=0;j<h;j++)for(let k=0;k<c;k++)x+=Math.abs(data[(j*w)*c+k]-data[(j*w+w-1)*c+k]);
 for(let i=0;i<w;i++)for(let k=0;k<c;k++)y+=Math.abs(data[i*c+k]-data[((h-1)*w+i)*c+k]);
 for(let j=0;j<h;j++)for(let i=1;i<w;i++)for(let k=0;k<c;k++)inner+=Math.abs(data[(j*w+i)*c+k]-data[(j*w+i-1)*c+k]);
 entries.push({name,width:w,height:h,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),edgeMeanAbsoluteDifference:{leftRight:x/(h*c),topBottom:y/(w*c),interiorHorizontal:inner/(h*(w-1)*c)}});
}
const bases=files.filter(n=>!n.includes('edge'));
for(const name of bases){const tile=await sharp(`${dir}/${name}`).resize(256,256).png().toBuffer();await sharp({create:{width:768,height:768,channels:3,background:'#333'}}).composite(Array.from({length:9},(_,i)=>({input:tile,left:(i%3)*256,top:Math.floor(i/3)*256}))).png().toFile(`${dir}/review-repeat-${name}`);}
for(const [label,names] of [['bases',bases],['edges',files.filter(n=>n.includes('edge'))]]){const layers=[];for(let i=0;i<names.length;i++)layers.push({input:await sharp(`${dir}/${names[i]}`).resize(384,384).png().toBuffer(),left:(i%3)*384,top:Math.floor(i/3)*384});await sharp({create:{width:1152,height:768,channels:3,background:'#333'}}).composite(layers).png().toFile(`${dir}/review-${label}.png`);}
await fs.writeFile(`${dir}/manifest.json`,JSON.stringify({generator:'Built-in imagegen; original generated PNG bytes preserved',scaleIntent:'3 metres per square; illustrative, not calibrated',entries},null,2));console.log(JSON.stringify(entries.map(e=>({name:e.name,seams:e.edgeMeanAbsoluteDifference})),null,2));
