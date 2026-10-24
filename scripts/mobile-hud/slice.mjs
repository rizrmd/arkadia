import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const source='assets-src/mobile-hud/v1/mobile-hud-atlas.png',out='public/mobile-hud/v1';
await mkdir(out,{recursive:true});
// Coordinates are in the unscaled 1216×1294 generated source. Keep each part independently addressable.
const bounds={
 'map-frame':[847,34,356,344],
 'skill-ring':[15,635,260,253],
 'skill-plate':[789,669,414,91],
 'level-plate':[798,787,219,74],
 'coin':[744,385,109,99],
 'clock':[856,385,91,95],
 'pin':[962,386,72,95],
 'arrow':[1042,390,73,92],
 'upgrade':[1040,767,139,127],
 'hp-material':[66,540,170,39],
 'gate-material':[329,540,170,39],
 'xp-material':[589,540,170,39],
};
const manifest={source,sourceSize:[1216,1294],prompt:'Transparent antique-gold mobile HUD component atlas based on the approved mobile portrait concept. No labels or numeric values. Crimson, cyan and amber crystal materials, filigree minimap, skill sockets, plaques and utility symbols.',frames:{},qa:{}};
for(const [name,[left,top,width,height]] of Object.entries(bounds)){
 let pipeline=sharp(source).extract({left,top,width,height});
 // Remove near-transparent generation fringe while preserving true antialiased gold edges.
 let {data,info}=await pipeline.ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)if(data[i+3]<24){data[i]=data[i+1]=data[i+2]=data[i+3]=0;}
 if(name==='skill-ring'){for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(Math.hypot(x-130,y-126)<105){const i=(y*width+x)*4;data.fill(0,i,i+4);}}
 if(name==='map-frame'){
  // The map interior must be actual alpha, never generated map geometry or a dark baked panel.
  for(let y=25;y<height-25;y++)for(let x=25;x<width-25;x++){const i=(y*width+x)*4;data.fill(0,i,i+4);}
 }
 await sharp(data,{raw:info}).png({compressionLevel:9}).toFile(`${out}/${name}.png`);
 let transparent=0,partial=0;for(let i=3;i<data.length;i+=4){transparent+=data[i]===0;partial+=data[i]>0&&data[i]<255;}
 manifest.frames['mobile-'+name]={width,height,bounds:[left,top,width,height],file:name+'.png',scale:1};
 manifest.qa[name]={transparentPixels:transparent,antialiasedPixels:partial,totalPixels:width*height};
}
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
console.log(manifest.qa);
