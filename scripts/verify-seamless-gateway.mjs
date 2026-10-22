import {stoneMean} from './gateway-palette.mjs';
import sharp from 'sharp';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const base=process.env.DEMO_URL,root='public/modular-stronghold/v2/';
const read=async name=>{if(!base)return fs.readFile(root+name);const r=await fetch(base+'/modular-stronghold/v2/'+name);assert(r.ok,name+' must be published');return Buffer.from(await r.arrayBuffer());};
const meta=JSON.parse(await read('full-gateway-v7-sheet.json')),atlas=await read(meta.image),frames=[];
for(let i=0;i<meta.frames;i++)frames.push(await sharp(atlas).extract({left:i%meta.columns*meta.frame.w,top:Math.floor(i/meta.columns)*meta.frame.h,width:meta.frame.w,height:meta.frame.h}).ensureAlpha().raw().toBuffer());
const w=meta.frame.w,h=meta.frame.h,sx=w/384,sy=h/256,ap=meta.stabilization?.aperture??{left:Math.round(146*sx),right:Math.round(242*sx),top:Math.round(111*sy),bottom:Math.round(216*sy)},reference=frames[0];let oldStonePixelChanges=0;const doorHashes=[];
for(let i=0;i<frames.length;i++){
 const f=frames[i],door=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4;
  // Both towers, their ground contact, banners, flames and the complete upper arch must stay still.
  if(x<ap.left||x>ap.right||y<ap.top||y>ap.bottom){if((f[p+3]||reference[p+3])&&!f.subarray(p,p+4).equals(reference.subarray(p,p+4)))oldStonePixelChanges++;}
  if(x>=Math.round(154*sx)&&x<=Math.round(234*sx)&&y>=Math.round(136*sy)&&y<=Math.round(210*sy))door.push(...f.subarray(p,p+4));
 }
 doorHashes.push(createHash('sha256').update(Buffer.from(door)).digest('hex'));
}
assert.equal(oldStonePixelChanges,0,'stonework must remain pixel-identical across every opening and closing frame');
assert(new Set(doorHashes).size>=12,'the approved generated door movement must remain animated');
for(const x of [.2,.8])assert(reference[(Math.floor(h*.6)*w+Math.floor(w*x))*4+3]>200,'full stone towers are present');
const center=(f)=>f[(Math.round(170*sy)*w+Math.round(194*sx))*4+3];assert(center(frames[0])>200,'closed door covers passage');assert(center(frames.at(-1))<10,'open door clears passage');
const palette={wall:await stoneMean(await read('rampart-se.png'),{left:250,top:280,width:260,height:90}),gate:await stoneMean(await read('full-gateway-v7-closed.webp'),{left:177,top:183,width:90,height:180}),pillar:await stoneMean(await read('gate-connector-left-v3.png'),{left:30,top:75,width:70,height:130})};
for(const part of ['gate','pillar'])for(let c=0;c<3;c++)assert(Math.abs(palette[part][c]/palette.wall[c]-1)<.05,part+' limestone sample must match wall within 5% per channel');
assert.equal(meta.threshold.y,778,'atlas metadata follows the lowered gate');
const report={palette,frames:frames.length,frame:{w,h},stonePixelChanges:oldStonePixelChanges,distinctDoorPoses:new Set(doorHashes).size,closedAlpha:center(frames[0]),openAlpha:center(frames.at(-1))};
await fs.mkdir('docs/gate-seamless',{recursive:true});await fs.writeFile('docs/gate-seamless/stability.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
