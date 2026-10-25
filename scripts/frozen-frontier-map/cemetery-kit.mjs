import sharp from 'sharp';
import fs from 'node:fs/promises';
import {renderBoxes,faceTexture} from './iso-solid.mjs';
// Small funerary stones modelled on the same 2:1 grid as the existing ruin kit.
// Reuses the reviewed pillar's limestone texture; no new art dependency.
const OUT='public/frozen-frontier/v4',R=4;
await fs.mkdir(`${OUT}/assets`,{recursive:true});
const {data,info}=await sharp('public/frozen-frontier/v1/assets/pillar-intact.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const tex=faceTexture({w:info.width,h:info.height,d:Float32Array.from(data,x=>x/255)},{x0:160,x1:422,yt:470,yb:1592,ppm:500,desnow:true});
const stone=(u0,v0,u1,v1,z0,z1)=>({u0,v0,u1,v1,z0,z1,rough:.45,
 top:(u,v)=>{const n=Math.sin(u*173+v*291)*3;return [216+n,227+n,240+n];},
 side:(_f,s,t)=>{const c=tex(s,t);const engraving=t>.45&&t<.68&&s>.15&&s<.48?.65:1;return c.slice(0,3).map(x=>x*engraving);}});
// Raised plinths and thicker silhouettes keep the graves legible at gameplay zoom.
const base=()=>stone(-.18,-.28,.18,.28,0,9);
const recipes={
 'grave-headstone':[base(),stone(-.14,-.25,.14,-.08,9,52),stone(-.1,-.25,.1,-.08,52,59),stone(-.16,-.27,.16,-.06,9,14)],
 'grave-cross':[base(),stone(-.055,-.24,.055,-.08,9,68),stone(-.18,-.24,.18,-.08,45,55)],
 'grave-sarcophagus':[stone(-.24,-.42,.24,.42,0,8),stone(-.2,-.38,.2,.38,8,30),stone(-.25,-.43,.25,.43,30,37)],
 'grave-memorial':[stone(-.5,-.5,.5,.5,0,7),stone(-.37,-.37,.37,.37,7,14),stone(-.23,-.23,.23,.23,14,35),stone(-.11,-.11,.11,.11,35,88),stone(-.17,-.17,.17,.17,88,93)],
};
const assets=[];
for(const [id,boxes] of Object.entries(recipes)){
 const {img,pivot}=renderBoxes(boxes,{R,SS:2,pad:12});
 const rgba=Buffer.from(img.d.map(v=>Math.round(v*255)));
 // A soft ground contact shadow anchors the plinth; alpha stays below the actor-occlusion threshold.
 const shadow=Buffer.from(`<svg width="${img.w}" height="${img.h}"><defs><radialGradient id="s"><stop stop-color="#182633" stop-opacity=".42"/><stop offset="1" stop-color="#182633" stop-opacity="0"/></radialGradient></defs><ellipse cx="${pivot[0]}" cy="${pivot[1]+5*R}" rx="${(boxes[0].u1-boxes[0].u0+boxes[0].v1-boxes[0].v0)*32*R+6*R}" ry="${12*R}" fill="url(#s)"/></svg>`);
 await sharp(shadow).composite([{input:rgba,raw:{width:img.w,height:img.h,channels:4}}]).png().toFile(`${OUT}/assets/${id}.png`);
 assets.push({id,file:`assets/${id}.png`,size:[img.w,img.h],pivot:{x:pivot[0],y:pivot[1]},scale:1/R,heightM:Math.max(...boxes.map(b=>b.z1))/37,footprintM:[(boxes[0].u1-boxes[0].u0)*3,(boxes[0].v1-boxes[0].v0)*3]});
}
await fs.writeFile(`${OUT}/manifest.json`,JSON.stringify({version:4,generator:'scripts/frozen-frontier-map/cemetery-kit.mjs',assets},null,1)+'\n');
console.log('Built',assets.length,'cemetery sprites');
