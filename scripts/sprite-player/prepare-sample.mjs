// Builds the sprite player's sample sheets from the Rift Runner and Ember Warden idle atlases shown in Knowledge
// (Art Direction › Characters › Rift Runner / Ember Warden › Sprites & Animation › Idle).
//   node scripts/sprite-player/prepare-sample.mjs
// Writes public/rift-runner/sprite-player/sheets/{rift-runner-idle,ember-warden-idle}{.webp,@0.5x.webp,.json,.js,-preview.webp}.
// Frames are copied, never redrawn.
import fs from 'node:fs/promises';import sharp from 'sharp';
const OUT='public/rift-runner/sprite-player/sheets';
const CELL=384,COLS=8,ROWS=8,PIVOT=[192,360],FPS=5,LABELS=['N','NE','E','SE','S','SW','W','NW'];
const SAMPLES=[
 {name:'rift-runner-idle',title:'Rift Runner — Idle',src:'assets-src/sprite-player/rift-runner-idle.png',knowledge:'NKBD5d29155bc5f9d7ba568672e6',attachment:'DA0addbe3d3b0d4d9e3631bdc0'},
 {name:'ember-warden-idle',title:'Ember Warden — Idle',src:'assets-src/sprite-player/ember-warden-idle.png',knowledge:'NKBD9c1df4ae8524e49a749059f3',attachment:'DA643ce3d7b15fb6e943e49c3c'}
];
await fs.mkdir(OUT,{recursive:true});
for(const {name:NAME,title,src:SRC,knowledge,attachment} of SAMPLES){
 const meta=await sharp(SRC).metadata();
 if(meta.width!==CELL*COLS||meta.height!==CELL*ROWS||!meta.hasAlpha)throw Error(`Expected a ${CELL*COLS}×${CELL*ROWS} RGBA sheet, got ${meta.width}×${meta.height}`);
 // Alpha-0 pixels keep whatever RGB the generator left; zero them so filtering never bleeds a background colour.
 const {data,info}=await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)if(data[i+3]<8)data[i]=data[i+1]=data[i+2]=data[i+3]=0;
 const clean=()=>sharp(data,{raw:{width:info.width,height:info.height,channels:4}});
 await clean().webp({quality:90,alphaQuality:100,effort:6}).toFile(`${OUT}/${NAME}.webp`);
 await clean().resize(info.width/2,info.height/2,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:6}).toFile(`${OUT}/${NAME}@0.5x.webp`);
 const manifest={name:title,sheet:`${NAME}.webp`,sheetHalf:`${NAME}@0.5x.webp`,cell:[CELL,CELL],columns:COLS,rows:ROWS,pivot:PIVOT,fps:FPS,loop:true,rowLabels:LABELS,defaultRow:LABELS.indexOf('S'),
  source:{knowledge,attachment,file:SRC}};
 await fs.writeFile(`${OUT}/${NAME}.json`,JSON.stringify(manifest,null,1)+'\n');
 // Same description as a script: Knowledge design frames sandbox the player to an opaque origin, where fetch() of the JSON fails without CORS.
 await fs.writeFile(`${OUT}/${NAME}.js`,`spritePlayerSheet(${JSON.stringify(manifest,null,1)});\n`);

 // Animated preview: all eight headings side by side (4 × 2), half scale, labelled, looping at the clip FPS.
 const P=CELL/2,PW=P*4,PH=P*2,half=await clean().resize(info.width/2,info.height/2,{kernel:'lanczos3'}).png().toBuffer();
 const labels=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}">${LABELS.map((l,r)=>`<text x="${(r%4)*P+10}" y="${Math.floor(r/4)*P+22}" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#cfe3dd">${l}</text>`).join('')}</svg>`);
 const frames=[];
 for(let f=0;f<COLS;f++){
  const parts=await Promise.all(LABELS.map(async(_,r)=>({input:await sharp(half).extract({left:f*P,top:r*P,width:P,height:P}).toBuffer(),left:(r%4)*P,top:Math.floor(r/4)*P})));
  frames.push(await sharp({create:{width:PW,height:PH,channels:4,background:'#161d22'}}).composite([...parts,{input:labels,left:0,top:0}]).png().toBuffer());
 }
 await sharp(frames,{join:{animated:true}}).webp({quality:88,effort:6,loop:0,delay:Array(COLS).fill(1000/FPS)}).toFile(`${OUT}/${NAME}-preview.webp`);
}
for(const f of await fs.readdir(OUT))console.log(f,(await fs.stat(`${OUT}/${f}`)).size);
