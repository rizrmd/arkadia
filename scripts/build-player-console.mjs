// Package generated raster masters into the existing DPI-aware HUD frame loader.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const base='public/typography/v2/hud/';
const source='assets-src/player-console/';
const manifest=JSON.parse(await readFile(base+'manifest.json','utf8'));
const meta=await sharp(source+'meter-materials.png').metadata();
for (const [i,name] of ['console-hp-material','console-gate-material','console-xp-material'].entries()) {
 const top=Math.round(meta.height*i/3);
 const cropHeight=Math.round(meta.width*72/960);
 const gradient=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="72"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity=".48"/></linearGradient></defs><rect width="960" height="72" fill="url(#g)"/></svg>');
 const strip=await sharp(source+'meter-materials.png').extract({left:0,top:top+25,width:meta.width,height:cropHeight}).resize(960,72).composite([{input:gradient}]).png().toBuffer();
 for(const scale of [1,2,3])await sharp(strip).resize(320*scale,24*scale).png().toFile(`${base}@${scale}x/${name}.png`);
 manifest.frames[name]={width:320,height:24};
}
for(const [hero,input] of [['rift-runner','rift-portrait.png'],['ember-warden','ember-portrait.png']]){
 const name=`console-portrait-${hero}`;
 // Trim only the transparent padding; keep all painted pixels and bezel.
 const portrait=await sharp(source+input).trim({threshold:10}).png().toBuffer();
 for(const scale of [1,2,3])await sharp(portrait).resize(140*scale,140*scale,{fit:'fill'}).png().toFile(`${base}@${scale}x/${name}.png`);
 manifest.frames[name]={width:140,height:140};
}
await writeFile(base+'manifest.json',JSON.stringify(manifest,null,1)+'\n');
