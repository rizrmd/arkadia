// Evidence for the typography sample (src/typography): reference-vs-result side-by-side and 50 % overlay images at the
// reference resolution, and crispness crops at DPR 1, 2, 3 and 2.625 with a measured edge width.
//   node scripts/typography/capture.mjs [compare|crisp]      → docs/typography/v2/*.png, docs/typography/v2/evidence.json
// Starts the sample's Vite dev server itself (vite.typography.config.ts) on port 3047.
import fs from 'node:fs';import sharp from 'sharp';import {createServer} from 'vite';import {chromium} from 'playwright';
import {launchOptions} from './browser.mjs';
const OUT='docs/typography/v2',REF='public/typography/v2/references/';
const only=process.argv[2],onlyScreen=process.argv[3];
fs.mkdirSync(OUT,{recursive:true});
const evidenceFile=`${OUT}/evidence.json`,evidence=fs.existsSync(evidenceFile)?JSON.parse(fs.readFileSync(evidenceFile,'utf8')):{};

const server=await createServer({configFile:'vite.typography.config.ts',logLevel:'error'});await server.listen();
// Single-process Chromium survives one context, so every capture launches its own browser.
async function open(query,width,height,dpr,fn){
 const browser=await chromium.launch(launchOptions());
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:3047/typography/?capture=1&${query}`);
  await page.waitForFunction(()=>window.typography?.ready,null,{timeout:90000});await page.waitForTimeout(600);
  if(errors.length)throw Error(errors.join('\n'));
  return await fn(page);
 }finally{await browser.close();}
}
const caption=(w,text)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="44"><rect width="100%" height="100%" fill="#14110d"/><text x="16" y="29" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#f1e2c0">${text}</text></svg>`);

// Reference vs result at the reference's own resolution.
const COMPARE=[
 {name:'hud-desktop',query:'screen=hud',vw:1672,vh:941,dpr:1,ref:'public/typography/reference.png',label:'HUD · desktop 1672 × 941 · DPR 1'},
 {name:'hud-mobile',query:'screen=hud',vw:836,vh:470,dpr:2,ref:'public/typography/reference.png',label:'HUD · phone landscape 836 × 470 CSS px · DPR 2'},
 {name:'hero-desktop-ember',query:'screen=hero&hero=ember-warden',vw:1672,vh:941,dpr:1,ref:REF+'choose-your-hero-desktop.png',label:'Choose Your Hero · desktop · Ember Warden'},
 {name:'hero-desktop-rift',query:'screen=hero&hero=rift-runner',vw:1672,vh:941,dpr:1,ref:REF+'rift-runner-desktop.png',label:'Choose Your Hero · desktop · Rift Runner'},
 {name:'hero-mobile-ember',query:'screen=hero&hero=ember-warden',vw:432,vh:912,dpr:2,ref:REF+'ember-warden-mobile.png',label:'Choose Your Hero · mobile 432 × 912 CSS px · DPR 2 · Ember'},
 {name:'hero-mobile-rift',query:'screen=hero&hero=rift-runner',vw:432,vh:912,dpr:2,ref:REF+'rift-runner-mobile.png',label:'Choose Your Hero · mobile 432 × 912 CSS px · DPR 2 · Rift'},
];
if(!only||only==='compare'){
 evidence.compare=(evidence.compare||[]).filter(c=>onlyScreen&&!c.name.startsWith(onlyScreen));
 for(const c of COMPARE){
  if(onlyScreen&&!c.name.startsWith(onlyScreen))continue;
  const shot=await open(c.query,c.vw,c.vh,c.dpr,p=>p.screenshot({timeout:180000}));
  const {width:W,height:H}=await sharp(shot).metadata();
  const ref=await sharp(c.ref).resize(W,H,{fit:'fill'}).png().toBuffer();
  // Comparisons are photographic: WebP (lossless result, q90 side-by-side/overlay). Crispness sheets stay PNG.
  await sharp(shot).webp({lossless:true}).toFile(`${OUT}/${c.name}.webp`);
  const gap=24,side=await sharp({create:{width:W*2+gap,height:H+44,channels:3,background:'#14110d'}}).composite([{input:caption(W,'Reference'),left:0,top:0},{input:caption(W,'Result: MSDF text + 9-slice frames'),left:W+gap,top:0},{input:ref,left:0,top:44},{input:shot,left:W+gap,top:44}]).png().toBuffer();
  await sharp(side).webp({quality:90}).toFile(`${OUT}/${c.name}-side-by-side.webp`);
  const half=await sharp(ref).ensureAlpha(.5).png().toBuffer();
  await sharp(shot).composite([{input:half}]).webp({quality:90}).toFile(`${OUT}/${c.name}-overlay.webp`);
  evidence.compare.splice(COMPARE.indexOf(c),0,{name:c.name,label:c.label,viewport:[c.vw,c.vh],dpr:c.dpr,pixels:[W,H],reference:c.ref,files:[`${c.name}.webp`,`${c.name}-side-by-side.webp`,`${c.name}-overlay.webp`]});
  console.log('compare',c.name,W,H);
 }
}

// Edge width: along each row, the run of pixels between 10 % and 90 % of the crop's luminance range at a dark→light
// or light→dark step. One device pixel is an ideal anti-aliased edge.
// Only the lower 70 % of the crop is scanned: the glyph body, not frame rails that a crop's top padding can catch.
async function edgeWidth(png){
 const m=await sharp(png).metadata(),top=Math.floor(m.height*.3);
 const {data,info}=await sharp(png).extract({left:0,top,width:m.width,height:m.height-top}).greyscale().raw().toBuffer({resolveWithObject:true});
 const sorted=[...data].sort((a,b)=>a-b),lo=sorted[Math.floor(sorted.length*.05)],hi=sorted[Math.floor(sorted.length*.98)],t=v=>(v-lo)/Math.max(1,hi-lo);
 let runs=0,total=0;
 for(let y=0;y<info.height;y++){let start=-1,from=0;for(let x=0;x<info.width;x++){const v=t(data[y*info.width+x]),s=v<.1?0:v>.9?2:1;
  if(s===1){if(start<0){start=x;from=x>0?(t(data[y*info.width+x-1])<.1?0:2):-1;}}
  else{if(start>=0&&from>=0&&from!==s&&x-start<=8){runs++;total+=x-start;}start=-1;}}}
 return runs?+(total/runs).toFixed(2):null;
}
// Text crops measure edges; frame crops (pad = CSS px added left, top, right, bottom) show the 9-slice frames and icons.
const CRISP={hud:{query:'screen=hud',texts:['Ember Warden','AUTO','Flame Fan','06:27','Esc'],frames:[['250 Gold',[62,14,34,14]],['Esc',[30,14,64,14]]]},
 // Begin Journey (gold gradient on a red button) and the panel's Ember Warden (under the panel crest and rails) are shown
// as crops only: their crops are dominated by ornament gradients, which the edge scan would measure instead of the glyphs.
 hero:{query:'screen=hero&hero=ember-warden',texts:['CHOOSE YOUR HERO','Selected','LOADOUT','Skills cast automatically when enemies enter range. Gain new skills through random level-up blessings.'],frames:[['Ember Warden',[6,4,6,4]],['Begin Journey',[6,4,6,4]]]}};
const DPRS=[1,2,3,2.625];
if(!only||only==='crisp'){
 evidence.crisp=(evidence.crisp||[]).filter(c=>onlyScreen&&c.screen!==onlyScreen);
 for(const [screen,cfg] of Object.entries(CRISP))for(const fix of [true,false])for(const dpr of DPRS){
  if(onlyScreen&&screen!==onlyScreen)continue;
  if(!fix&&dpr<2)continue;
  const r=await open(cfg.query+(fix?'':'&fix=0'),1280,720,dpr,async p=>({png:await p.screenshot({timeout:180000}),texts:await p.evaluate(()=>window.typography.texts()),frameScale:await p.evaluate(()=>window.typography.frameScale),sceneScale:await p.evaluate(()=>window.typography.sceneScale)}));
  const {width:W,height:H}=await sharp(r.png).metadata(),crops=[];
  for(const [want,pad] of [...cfg.texts.map(t=>[t,[2,2,2,2]]),...cfg.frames]){
   // The panel title and the card name share 'Ember Warden': the larger one is the display caps.
   const t=r.texts.filter(x=>x.text.toUpperCase()===want.toUpperCase()).sort((a,b)=>b.height-a.height)[0];if(!t)throw Error(`${screen}: no text ${want}`);
   const left=Math.max(0,Math.floor((t.x-pad[0])*dpr)),top=Math.max(0,Math.floor((t.y-pad[1])*dpr)),width=Math.min(W-left,Math.ceil((t.width+pad[0]+pad[2])*dpr)),height=Math.min(H-top,Math.ceil((t.height+pad[1]+pad[3])*dpr));
   const png=await sharp(r.png).extract({left,top,width,height}).png().toBuffer(),frame=pad[0]>2;
   crops.push({text:want.length>24?want.slice(0,24)+'…':want,frame,png,edge:frame?null:await edgeWidth(png),device:[width,height]});
  }
  const tag=`${screen}-dpr${String(dpr).replace('.','_')}${fix?'':'-stock'}`;
  // Sheet: every crop at 4 screen pixels per device pixel (nearest neighbour, so the pixel grid stays visible).
  const Z=Math.max(1,Math.round(6/dpr)),pieces=[];let y=48,maxW=0;
  for(const c of crops){const w=c.device[0]*Z,h=c.device[1]*Z;pieces.push({input:await sharp(c.png).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:16,top:y});y+=h+12;maxW=Math.max(maxW,w);}
  const title=`${screen.toUpperCase()} · DPR ${dpr} · ${fix?'resolution-aware MSDF edge':'Pixi stock MSDF edge'}${screen==='hud'?` · frames @${r.frameScale}x`:''} · zoom ${Z}× per device px`;
  await sharp({create:{width:Math.max(maxW+32,900),height:y+8,channels:3,background:'#14110d'}}).composite([{input:caption(Math.max(maxW+32,900),title),left:0,top:0},...pieces]).png().toFile(`${OUT}/crisp-${tag}.png`);
  evidence.crisp.push({screen,dpr,fix,viewport:[1280,720],frameScale:r.frameScale||null,sceneScale:+r.sceneScale.toFixed(4),file:`crisp-${tag}.png`,edges:Object.fromEntries(crops.filter(c=>!c.frame).map(c=>[c.text,c.edge]))});
  console.log('crisp',tag,crops.map(c=>`${c.text}:${c.edge}`).join(' '));
 }
}
// Optional glow (toolbar checkbox / ?glow=1): the same crops without and with it, DPR 2.
if(!only||only==='fx'){
 const rows=[];
 for(const [query,[x,y,w,h]] of [['screen=hero&hero=ember-warden',[420,18,830,120]],['screen=hero&hero=ember-warden',[1160,190,480,70]],['screen=hud',[580,790,520,40]]])
  for(const glow of ['0','1']){const png=await open(`${query}&glow=${glow}`,1672,941,2,p=>p.screenshot({timeout:180000,clip:{x,y,width:w,height:h}}));rows.push({png,glow,w:w*2,h:h*2});}
 let top=44;const parts=[];for(const r of rows){parts.push({input:caption(r.w,r.glow==='1'?'Glow on':'Glow off'),left:0,top},{input:r.png,left:0,top:top+44});top+=r.h+52;}
 const W=Math.max(...rows.map(r=>r.w));
 await sharp({create:{width:W,height:top,channels:3,background:'#14110d'}}).composite([{input:caption(W,'Optional MSDF glow · DPR 2 · display caps and HUD skill names'),left:0,top:0},...parts]).png().toFile(`${OUT}/fx-glow.png`);
 evidence.fx={file:'fx-glow.png',dpr:2};console.log('fx glow');
}
fs.writeFileSync(evidenceFile,JSON.stringify(evidence,null,1)+'\n');
await server.close();
