import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';

// Match the old Canvas crop exactly, but do the readback/alpha cleanup at build time.
const sprites=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8'));
const placements=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const dir='public/frozen-frontier/game';
const atlas=await sharp('public'+sprites.atlas).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const manifest={};
for(const p of placements.placements){
 const layer=placements.kit[p.a].layer;
 if(layer==='ground'&&!['foundation','temple-podium'].includes(p.a))continue;
 const key=p.a+(p.f?':flip':'');if(manifest[key])continue;
 const [x,y,w,h]=sprites.assets[p.a].frame,rgba=Buffer.alloc(w*h*4);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){
  const src=((y+row)*atlas.info.width+x+(p.f?w-1-col:col))*4,dst=(row*w+col)*4;
  // Occlusion consumes alpha only; uniform RGB compresses far better than scenery colour.
  rgba[dst]=rgba[dst+1]=rgba[dst+2]=255;
  rgba[dst+3]=atlas.data[src+3]<150?0:atlas.data[src+3];
 }
 const png=await sharp(rgba,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
 const hash=createHash('sha256').update(png).digest('hex').slice(0,16);
 const name=`occlusion-${p.a}${p.f?'-flip':''}-${hash}.png`;
 await fs.writeFile(`${dir}/${name}`,png);manifest[key]=`/frozen-frontier/game/${name}`;
}
await fs.writeFile('src/world/maps/frontier-occlusion.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${Object.keys(manifest).length} scenery occlusion masks`);
