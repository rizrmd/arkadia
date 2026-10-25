import sharp from 'sharp';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {renderBoxes,sample,faceTexture} from './iso-solid.mjs';

// One continuous podium, with a real opening at the stair landing. Two bordered
// foundation sprites put their corner blocks across the entrance and their join.
export async function buildTemplePodium(){
 const root='public/frozen-frontier/v3',R=3;
 const load=async file=>{const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {w:info.width,h:info.height,d:Float32Array.from(data,x=>x/255)};};
 const floor=await load('public/frozen-frontier/v1/assets/foundation.png');
 const shaft=await load('public/frozen-frontier/v1/assets/pillar-intact.png');
 const stone=faceTexture(shaft,{x0:160,x1:422,yt:470,yb:1592,ppm:500,desnow:true});
 const wrap=x=>{const q=((x+.7)%2.8+2.8)%2.8;return q<1.4?q-.7:2.1-q;};
 const top=(u,v)=>{const a=wrap(u),b=wrap(v);return sample(floor,384+(a-b)*192,208+(a+b)*100).slice(0,3);};
 const side=(f,s,t)=>stone(s,t).slice(0,3);
 const H=25.3,U=.979,V=1.979,boxes=[{u0:-U,v0:-V,u1:U,v1:V,z0:0,z1:H,top,side,rough:.5}];
 // Low perimeter stones, interrupted across the entire 1.2 tile stair mouth.
 const curb=(u0,v0,u1,v1)=>boxes.push({u0,v0,u1,v1,z0:H,z1:H+3,top,side,rough:.65});
 curb(-U,-V,-U+.1,V);curb(-U,-V,U,-V+.1);curb(-U,V-.1,U,V);
 curb(U-.1,-V,U,-.6);curb(U-.1,.6,U,V);
 const {img,pivot}=renderBoxes(boxes,{R,SS:2});
 const bytes=Buffer.from(Uint8Array.from(img.d,x=>Math.round(Math.max(0,Math.min(1,x))*255)));
 await sharp(bytes,{raw:{width:img.w,height:img.h,channels:4}}).png().toFile(`${root}/assets/temple-podium.png`);
 return {id:'temple-podium',file:'assets/temple-podium.png',size:[img.w,img.h],pivot:{x:pivot[0],y:pivot[1]},scale:1/R,widthWorld:img.w/R,heightM:H/24,footprintM:[U*6,V*6],source:'continuous 2:1 stone podium, textured from the reviewed foundation and pillar',recipe:{kind:'temple-podium',height:H,u:[-U,U],v:[-V,V],entrance:[-.6,.6]}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file='public/frozen-frontier/v3/manifest.json',m=JSON.parse(await fs.readFile(file,'utf8'));
 m.assets=m.assets.filter(a=>a.id!=='temple-podium');m.assets.push(await buildTemplePodium());
 await fs.writeFile(file,JSON.stringify(m,null,1)+'\n');
}
