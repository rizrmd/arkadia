// Authoring aid for src/stronghold/light-anchors.ts. Finds bright flame/arcane
// pixel clusters in each lit sprite and writes numbered review overlays.
// Candidates are suggestions only: the anchors are curated by hand from the sheets.
// Usage: node scripts/extract-emissive.mjs [output dir]
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {LIGHT_SPRITES as sprites,emissive} from '../src/stronghold/light-anchors.ts';
const out=process.argv[2]||'/home/dev/lighting-review';
await fs.mkdir(out,{recursive:true});
const emissiveKind=(r,g,b)=>emissive(r,g,b)?b>200&&r<150?'arcane':'warm':'';
const report={};
for(const file of Object.keys(sprites)){
 const src='public'+file,{data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell=Math.max(6,Math.round(info.width/80)),bins=new Map();
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i+3]<200)continue;const kind=emissiveKind(data[i],data[i+1],data[i+2]);if(!kind)continue;const key=`${(x/cell)|0},${(y/cell)|0}`,e=bins.get(key)||{n:0,x:0,y:0,arcane:0};e.n++;e.x+=x;e.y+=y;e.arcane+=kind==='arcane'?1:0;bins.set(key,e);}
 // Merge touching cells into clusters (4-neighbour flood fill on the cell grid).
 const seen=new Set(),clusters=[];
 for(const key of bins.keys()){if(seen.has(key))continue;const stack=[key],c={n:0,x:0,y:0,arcane:0,minX:1e9,minY:1e9,maxX:0,maxY:0};seen.add(key);
  while(stack.length){const k=stack.pop(),e=bins.get(k),[cx,cy]=k.split(',').map(Number);c.n+=e.n;c.x+=e.x;c.y+=e.y;c.arcane+=e.arcane;c.minX=Math.min(c.minX,cx*cell);c.minY=Math.min(c.minY,cy*cell);c.maxX=Math.max(c.maxX,cx*cell+cell);c.maxY=Math.max(c.maxY,cy*cell+cell);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=`${cx+dx},${cy+dy}`;if(bins.has(n)&&!seen.has(n)){seen.add(n);stack.push(n);}}}
  if(c.n>=cell*2)clusters.push({x:Math.round(c.x/c.n),y:Math.round(c.y/c.n),n:c.n,kind:c.arcane>c.n/2?'arcane':'warm',box:[c.minX,c.minY,c.maxX,c.maxY]});}
 clusters.sort((a,b)=>b.n-a.n);report[file]={size:[info.width,info.height],candidates:clusters.slice(0,40).map((c,i)=>({id:i,...c}))};
 const marks=report[file].candidates.map(c=>`<rect x="${c.box[0]}" y="${c.box[1]}" width="${c.box[2]-c.box[0]}" height="${c.box[3]-c.box[1]}" fill="none" stroke="#0f0" stroke-width="2"/><text x="${c.box[2]+2}" y="${c.box[1]+14}" font-size="16" fill="#0f0" font-family="sans-serif">${c.id}</text>`).join('');
 const authored=sprites[file].map(a=>`<circle cx="${a.x}" cy="${a.y}" r="${Math.max(6,a.size)}" fill="none" stroke="#f0f" stroke-width="3"/>`).join('');
 await sharp(src).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}">${marks}${authored}</svg>`)}]).flatten({background:'#203040'}).png().toFile(`${out}/${file.split('/').pop().replace(/\.\w+$/,'')}.png`);
}
await fs.writeFile(out+'/candidates.json',JSON.stringify(report,null,1));
for(const [file,r] of Object.entries(report))console.log(file,r.size.join('x'),r.candidates.slice(0,14).map(c=>`#${c.id}${c.kind[0]}(${c.x},${c.y})n${c.n}`).join(' '));
// One contact sheet of every overlay for review (magenta = authored anchors).
const names=Object.keys(sprites).map(f=>f.split('/').pop().replace(/\.\w+$/,'')),t=300,cols=5;
const tiles=await Promise.all(names.map(n=>sharp(`${out}/${n}.png`).resize(t,t,{fit:'contain',background:'#203040'}).toBuffer()));
await sharp({create:{width:t*cols,height:t*Math.ceil(names.length/cols),channels:3,background:'#203040'}}).composite(tiles.map((b,i)=>({input:b,left:(i%cols)*t,top:Math.floor(i/cols)*t}))).png().toFile(out+'/sheet.png');
