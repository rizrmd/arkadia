// Builds the sprite player's pose sheets from the Rift Runner and Ember Warden 1-side atlases (N, NE, E, SE, S)
// shown in Knowledge (Art Direction › Characters › Rift Runner / Ember Warden › Sprites & Animation › Idle / Hurt / Death / Run).
// Left-facing headings (SW, W, NW) are mirrored at runtime from (SE, E, NE), saving 37.5% storage space.
//   node scripts/sprite-player/prepare-sample.mjs
// Writes public/rift-runner/sprite-player/sheets/{rift-runner,ember-warden}-{idle,hurt,death,run}{.webp,@0.5x.webp,.json,.js,-preview.webp}.
import fs from 'node:fs/promises';import {existsSync,readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import sharp from 'sharp';
const OUT='public/rift-runner/sprite-player/sheets',force=process.argv.includes('--force');
const CELL=384,COLS=8,ROWS=8,STORED_ROWS=5,PIVOT=[192,360],LABELS=['N','NE','E','SE','S','SW','W','NW'];
const ROW_MAP=[0,1,2,3,4,3,2,1],MIRROR_ROWS=[false,false,false,false,false,true,true,true];
const SAMPLES=[
 {name:'rift-runner-idle',hero:'rift-runner',pose:'idle',title:'Rift Runner — Idle',fps:5,loop:true,src:'assets-src/sprite-player/rift-runner-idle.png',knowledge:'NKBD5d29155bc5f9d7ba568672e6',attachment:'DA61033b1f2d5cffe17f848835'},
 {name:'rift-runner-hurt',hero:'rift-runner',pose:'hurt',title:'Rift Runner — Hurt',fps:8,loop:false,src:'assets-src/sprite-player/rift-runner-hurt.png',knowledge:'NKBDd93e7ee52b19d68efa7907c6',attachment:'DAf515bed0d2db57da0114953a'},
 {name:'rift-runner-death',hero:'rift-runner',pose:'death',title:'Rift Runner — Death',fps:8,loop:false,src:'assets-src/sprite-player/rift-runner-death.png',knowledge:'NKBDc0435b17089590ebf758c5b0',attachment:'DA79774e4e4d4e25c7eb7f45e3'},
 {name:'rift-runner-run',hero:'rift-runner',pose:'run',title:'Rift Runner — Run',fps:10,loop:true,src:'assets-src/sprite-player/rift-runner-run.png',knowledge:'NKBD7b2d30906c8a963483c32888',attachment:'DA61c459a00da2c3d875686b51'},
 {name:'rift-runner-attack',hero:'rift-runner',pose:'attack',title:'Rift Runner — Attack',fps:10,loop:true,src:'assets-src/sprite-player/rift-runner-attack.png',knowledge:'NKBDdb705923ddce75978796abda',attachment:'DA8febf57281c0e2ef1bbbbe98'},
 {name:'ember-warden-idle',hero:'ember-warden',pose:'idle',title:'Ember Warden — Idle',fps:5,loop:true,src:'assets-src/sprite-player/ember-warden-idle.png',knowledge:'NKBD9c1df4ae8524e49a749059f3',attachment:'DAf6e1cf7f58dd88661db7afdf'},
 {name:'ember-warden-hurt',hero:'ember-warden',pose:'hurt',title:'Ember Warden — Hurt',fps:8,loop:false,src:'assets-src/sprite-player/ember-warden-hurt.png',knowledge:'NKBD3acc769cfee0487d59def5e6',attachment:'DA74a29f88b0703a3c01142489'},
 {name:'ember-warden-death',hero:'ember-warden',pose:'death',title:'Ember Warden — Death',fps:8,loop:false,src:'assets-src/sprite-player/ember-warden-death.png',knowledge:'NKBD3c1f34f5ca7b63f32516d2e9',attachment:'DAf3c5c12f8b5016b9708c6c3e'},
 {name:'ember-warden-run',hero:'ember-warden',pose:'run',title:'Ember Warden — Run',fps:10,loop:true,src:'assets-src/sprite-player/ember-warden-run.png',knowledge:'NKBDf18fa50ee1a4cc98cc5d2106',attachment:'DAb2ee77a9f6e75fe9cbf014fd'},
 {name:'ember-warden-attack',hero:'ember-warden',pose:'attack',title:'Ember Warden — Attack',fps:10,loop:true,src:'assets-src/sprite-player/ember-warden-attack.png',knowledge:'NKBD903bcee333c2137d8b04adba',attachment:'DA051186c3aeb2539350a5eb30'}
];
await fs.mkdir(OUT,{recursive:true});
for(const {name:NAME,hero,pose,title,fps:FPS,loop:LOOP,src:SRC,knowledge,attachment} of SAMPLES.filter(s=>!process.argv.includes('--run-only')||s.pose==='run')){
 const srcMeta=await sharp(SRC).metadata();
 const storedRows=Math.round(srcMeta.height/CELL);
 const isFull8=storedRows===ROWS;
 const rowMap=isFull8?[0,1,2,3,4,5,6,7]:ROW_MAP;
 const mirrorRows=isFull8?[false,false,false,false,false,false,false,false]:MIRROR_ROWS;
 if(force||!existsSync(`${OUT}/${NAME}.webp`)||!existsSync(`${OUT}/${NAME}@0.5x.webp`)||!existsSync(`${OUT}/${NAME}-preview.webp`)){
  const meta=srcMeta;
  if(meta.width!==CELL*COLS||(meta.height!==CELL*STORED_ROWS&&meta.height!==CELL*ROWS)||!meta.hasAlpha)throw Error(`Expected a ${CELL*COLS}×${CELL*STORED_ROWS} RGBA sheet, got ${meta.width}×${meta.height}`);
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
   const parts=await Promise.all(LABELS.map(async(_,r)=>{
    const srcRow=rowMap[r],flip=mirrorRows[r];
    let tile=sharp(half).extract({left:f*P,top:srcRow*P,width:P,height:P});
    if(flip)tile=tile.flop();
    return {input:await tile.toBuffer(),left:(r%4)*P,top:Math.floor(r/4)*P};
   }));
   frames.push(await sharp({create:{width:PW,height:PH,channels:4,background:'#161d22'}}).composite([...parts,{input:labels,left:0,top:0}]).png().toBuffer());
  }
  await sharp(frames,{join:{animated:true}}).webp({quality:88,effort:2,loop:0,delay:Array(COLS).fill(Math.round(1000/FPS))}).toFile(`${OUT}/${NAME}-preview.webp`);
 }
 const ver=createHash('sha256').update(readFileSync(`${OUT}/${NAME}.webp`)).digest('hex').slice(0,8);
 const manifest={name:title,hero,pose,sheet:`${NAME}.webp?v=${ver}`,sheetHalf:`${NAME}@0.5x.webp?v=${ver}`,cell:[CELL,CELL],columns:COLS,rows:ROWS,storedRows,rowMap,mirrorRows,pivot:PIVOT,fps:FPS,loop:LOOP,rowLabels:LABELS,defaultRow:LABELS.indexOf('S'),
  source:{knowledge,attachment,file:SRC}};
 await fs.writeFile(`${OUT}/${NAME}.json`,JSON.stringify(manifest,null,1)+'\n');
 // Same description as a script: Knowledge design frames sandbox the player to an opaque origin, where fetch() of the JSON fails without CORS.
 await fs.writeFile(`${OUT}/${NAME}.js`,`spritePlayerSheet(${JSON.stringify(manifest,null,1)});\n`);
}
for(const f of (await fs.readdir(OUT)).sort())console.log(f,(await fs.stat(`${OUT}/${f}`)).size);
