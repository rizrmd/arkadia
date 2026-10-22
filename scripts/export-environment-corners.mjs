import sharp from 'sharp';
import fs from 'node:fs/promises';
const base='public/environment-corners/v1';
const assets=[];
for(const area of ['court','snow']) for(const variant of ['left','right','left-mobile','right-mobile']) {
  const name=`corner-${area}-${variant}`, mobile=variant.includes('mobile');
  const width=mobile?360:640,height=mobile?300:760;
  await sharp(`assets-src/environment-corners/v1/${name}.png`).resize(width,height,{fit:'fill'}).webp({quality:86,alphaQuality:100,effort:0}).toFile(`${base}/${name}.webp`);
  const {data,info}=await sharp(`${base}/${name}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0,partial=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;else if(data[i]<255)partial++;}
  if(clear<width*height*.25)throw Error(`Insufficient transparency: ${name}`);
  assets.push({file:`${name}.webp`,area,variant,width:info.width,height:info.height,bytes:(await fs.stat(`${base}/${name}.webp`)).size,transparentFraction:clear/(width*height),partialAlphaPixels:partial,anchor:mobile?`top-${variant.split('-')[0]}`:`bottom-${variant}`,motion:mobile?'static; area cross-fade only':'camera parallax; area cross-fade'});
}
await fs.writeFile(`${base}/manifest.json`,JSON.stringify({version:1,generatedWith:'built-in image_gen',assets},null,2)+'\n');
await fs.copyFile('docs/environment-corners/reference.jpg',`${base}/reference.jpg`);
const tiles=[];
for(let i=0;i<assets.length;i++){
 const a=assets[i];const img=await sharp(`${base}/${a.file}`).resize(240,285,{fit:'contain',background:'#263446'}).flatten({background:'#263446'}).png().toBuffer();
 tiles.push({input:img,left:(i%4)*260+10,top:Math.floor(i/4)*320+30});
}
await sharp({create:{width:1040,height:640,channels:3,background:'#263446'}}).composite(tiles).webp({quality:90}).toFile(`${base}/contact-sheet.webp`);
await fs.writeFile(`${base}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Environment corner assets</title><style>body{background:#151d29;color:#edf0f6;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}figure{margin:0;padding:12px;background:#263446}img{width:100%;height:300px;object-fit:contain;background:repeating-conic-gradient(#263446 0% 25%,#36475a 0% 50%) 0/24px 24px}a{color:#b8d4ff}</style><h1>Environment corners</h1><p>Artwork handoff · Desktop bottom corners / mobile static top corners. No gameplay integration.</p><main>${assets.map(a=>`<figure><img src="${a.file}" alt="${a.area} ${a.variant}"><figcaption><a href="${a.file}">${a.file}</a><br>${a.width} × ${a.height} · ${(a.bytes/1024).toFixed(1)} KiB<br>${a.motion}</figcaption></figure>`).join('')}</main>`);
console.log(JSON.stringify(assets,null,2));
