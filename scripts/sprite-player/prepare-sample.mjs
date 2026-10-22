// Builds the sprite player's pose sheets from the Rift Runner and Ember Warden atlases shown in Knowledge
// (Art Direction › Characters › Rift Runner / Ember Warden › Sprites & Animation › Idle / Hurt / Death / Run).
//   node scripts/sprite-player/prepare-sample.mjs
// Writes public/rift-runner/sprite-player/sheets/{rift-runner,ember-warden}-{idle,hurt,death,run}{.webp,@0.5x.webp,.json,.js,-preview.webp}.
// Frames are copied, never redrawn.
import fs from 'node:fs/promises';import {existsSync} from 'node:fs';import sharp from 'sharp';
const OUT='public/rift-runner/sprite-player/sheets',force=process.argv.includes('--force');
const CELL=384,COLS=8,ROWS=8,PIVOT=[192,360],LABELS=['N','NE','E','SE','S','SW','W','NW'];
const SAMPLES=[
 {name:'rift-runner-idle',hero:'rift-runner',pose:'idle',title:'Rift Runner — Idle',fps:5,loop:true,src:'assets-src/sprite-player/rift-runner-idle.png',knowledge:'NKBD5d29155bc5f9d7ba568672e6',attachment:'DA59302806cec76687789b5184'},
 {name:'rift-runner-hurt',hero:'rift-runner',pose:'hurt',title:'Rift Runner — Hurt',fps:8,loop:false,src:'assets-src/sprite-player/rift-runner-hurt.png',knowledge:'NKBDd93e7ee52b19d68efa7907c6',attachment:'DA87deea44505a2201746fa8a7'},
 {name:'rift-runner-death',hero:'rift-runner',pose:'death',title:'Rift Runner — Death',fps:8,loop:false,src:'assets-src/sprite-player/rift-runner-death.png',knowledge:'NKBDc0435b17089590ebf758c5b0',attachment:'DAfbd2c9a0c5da2fc637a70259'},
 {name:'rift-runner-run',hero:'rift-runner',pose:'run',title:'Rift Runner — Run',fps:10,loop:true,src:'assets-src/sprite-player/rift-runner-run.png',knowledge:'NKBD7b2d30906c8a963483c32888',attachment:'DA5aa74505c50e3ea9e9b4ce83'},
 {name:'ember-warden-idle',hero:'ember-warden',pose:'idle',title:'Ember Warden — Idle',fps:5,loop:true,src:'assets-src/sprite-player/ember-warden-idle.png',knowledge:'NKBD9c1df4ae8524e49a749059f3',attachment:'DA5c7edb22a60d30311056a24b'},
 {name:'ember-warden-hurt',hero:'ember-warden',pose:'hurt',title:'Ember Warden — Hurt',fps:8,loop:false,src:'assets-src/sprite-player/ember-warden-hurt.png',knowledge:'NKBD3acc769cfee0487d59def5e6',attachment:'DA5f14c906da737218c090449d'},
 {name:'ember-warden-death',hero:'ember-warden',pose:'death',title:'Ember Warden — Death',fps:8,loop:false,src:'assets-src/sprite-player/ember-warden-death.png',knowledge:'NKBD3c1f34f5ca7b63f32516d2e9',attachment:'DA500ea9e987c6c1501dcb9606'},
 {name:'ember-warden-run',hero:'ember-warden',pose:'run',title:'Ember Warden — Run',fps:10,loop:true,src:'assets-src/sprite-player/ember-warden-run.png',knowledge:'NKBDf18fa50ee1a4cc98cc5d2106',attachment:'DAfa0af16dd158809cacb0e5d3'}
];
await fs.mkdir(OUT,{recursive:true});
for(const {name:NAME,hero,pose,title,fps:FPS,loop:LOOP,src:SRC,knowledge,attachment} of SAMPLES){
 const manifest={name:title,hero,pose,sheet:`${NAME}.webp`,sheetHalf:`${NAME}@0.5x.webp`,cell:[CELL,CELL],columns:COLS,rows:ROWS,pivot:PIVOT,fps:FPS,loop:LOOP,rowLabels:LABELS,defaultRow:LABELS.indexOf('S'),
  source:{knowledge,attachment,file:SRC}};
 await fs.writeFile(`${OUT}/${NAME}.json`,JSON.stringify(manifest,null,1)+'\n');
 // Same description as a script: Knowledge design frames sandbox the player to an opaque origin, where fetch() of the JSON fails without CORS.
 await fs.writeFile(`${OUT}/${NAME}.js`,`spritePlayerSheet(${JSON.stringify(manifest,null,1)});\n`);
 if(!force&&existsSync(`${OUT}/${NAME}.webp`)&&existsSync(`${OUT}/${NAME}@0.5x.webp`)&&existsSync(`${OUT}/${NAME}-preview.webp`))continue;

 const meta=await sharp(SRC).metadata();
 if(meta.width!==CELL*COLS||meta.height!==CELL*ROWS||!meta.hasAlpha)throw Error(`Expected a ${CELL*COLS}×${CELL*ROWS} RGBA sheet, got ${meta.width}×${meta.height}`);
 // Alpha-0 pixels keep whatever RGB the generator left; zero them so filtering never bleeds a background colour.
 const {data,info}=await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)if(data[i+3]<8)data[i]=data[i+1]=data[i+2]=data[i+3]=0;
 const clean=()=>sharp(data,{raw:{width:info.width,height:info.height,channels:4}});
 await clean().webp({quality:90,alphaQuality:100,effort:2}).toFile(`${OUT}/${NAME}.webp`);
 await clean().resize(info.width/2,info.height/2,{kernel:'lanczos3'}).webp({quality:90,alphaQuality:100,effort:2}).toFile(`${OUT}/${NAME}@0.5x.webp`);

 // Animated preview: all eight headings side by side (4 × 2), half scale, labelled, looping at the clip FPS.
 const P=CELL/2,PW=P*4,PH=P*2,half=await clean().resize(info.width/2,info.height/2,{kernel:'lanczos3'}).png().toBuffer();
 const labels=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}">${LABELS.map((l,r)=>`<text x="${(r%4)*P+10}" y="${Math.floor(r/4)*P+22}" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" fill="#cfe3dd">${l}</text>`).join('')}</svg>`);
 const frames=[];
 for(let f=0;f<COLS;f++){
  const parts=await Promise.all(LABELS.map(async(_,r)=>({input:await sharp(half).extract({left:f*P,top:r*P,width:P,height:P}).toBuffer(),left:(r%4)*P,top:Math.floor(r/4)*P})));
  frames.push(await sharp({create:{width:PW,height:PH,channels:4,background:'#161d22'}}).composite([...parts,{input:labels,left:0,top:0}]).png().toBuffer());
 }
 await sharp(frames,{join:{animated:true}}).webp({quality:88,effort:2,loop:0,delay:Array(COLS).fill(Math.round(1000/FPS))}).toFile(`${OUT}/${NAME}-preview.webp`);
}
for(const f of (await fs.readdir(OUT)).sort())console.log(f,(await fs.stat(`${OUT}/${f}`)).size);
