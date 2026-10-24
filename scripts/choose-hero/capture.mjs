// Evidence for the Choose Your Hero screen in the game (src/stronghold/choose-hero.ts):
//   node scripts/choose-hero/capture.mjs [shots|compare|crisp|input|all]   → docs/choose-hero/*, docs/choose-hero/evidence.json
// shots: desktop, portrait and landscape captures plus a live-resize sequence; compare: reference vs result side by
// side and a 50 % overlay at the reference resolution (desktop 1672 × 941 DPR 1, mobile 432 × 912 DPR 2 → 864 × 1824);
// crisp: text crops at DPR 1, 2, 3 and 2.625 with a measured edge width and the frame scale picked; input: mouse, touch
// and keyboard checks, ending with the chosen hero in the game. Every page records console errors.
// Builds the game (vite.config.ts) into ~/.cache/choose-hero-dist and serves it with vite preview on port 3061, offline (no
// co-op server), with the picker forced open.
import fs from 'node:fs';import os from 'node:os';import sharp from 'sharp';import {build,preview} from 'vite';import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
const OUT='docs/choose-hero',REF='public/typography/v2/references/',PORT=3061;
const only=process.argv[2]||'all';
fs.mkdirSync(OUT,{recursive:true});
const evidenceFile=`${OUT}/evidence.json`,evidence=fs.existsSync(evidenceFile)?JSON.parse(fs.readFileSync(evidenceFile,'utf8')):{};
// A production build in a private folder (the shared clone's dist/ belongs to releases), served by vite preview.
const DIST=`${os.homedir()}/.cache/choose-hero-dist`;
await build({configFile:'vite.config.ts',logLevel:'warn',build:{outDir:DIST,emptyOutDir:true}});
const server=await preview({configFile:'vite.config.ts',logLevel:'error',build:{outDir:DIST},preview:{port:PORT,strictPort:true}});
const errorsSeen=[];
// Single-process Chromium survives one context, so every capture launches its own browser.
// Vite's dev server may reload a page once while it optimises a dependency; such a page is retried once.
async function open(o,fn,retry=true){
 try{return await openOnce(o,fn);}catch(e){if(!retry||!/reading 'picker'|Execution context was destroyed/.test(String(e)))throw e;console.log('retry',o.width,o.height,String(e).split('\n')[0]);return openOnce(o,fn);}
}
async function openOnce({width,height,dpr=1,touch=false,hero='ember-warden'},fn){
 const browser=await chromium.launch(launchOptions());
 try{
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:touch,hasTouch:touch});
  const page=await ctx.newPage(),errors=[];let navigations=0;await page.route('**/api/tracelogs',r=>r.fulfill({status:204,body:''}));
  page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++;});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${PORT}/?offline=1&pick=1&time=0.35`);
  await page.waitForFunction(()=>window.__PIXI_UI__?.picker?.isOpen(),null,{timeout:180000});
  await page.evaluate(async h=>{const v=await window.__PIXI_UI__.picker.view();v.select(h);await v.layout(innerWidth,innerHeight);},hero);
  await page.waitForTimeout(700);
  const out=await fn(page);
  if(navigations>1)throw Error('Execution context was destroyed: the page reloaded during the capture');
  errorsSeen.push(...errors.map(e=>`${width}x${height}@${dpr}: ${e}`));
  return out;
 }finally{await browser.close();}
}
const state=page=>page.evaluate(async()=>{const v=await window.__PIXI_UI__.picker.view();return {layout:v.layoutName,frameScale:v.frameScale,stageScale:+v.stageScale.toFixed(4),hero:v.hero,open:window.__PIXI_UI__.picker.isOpen()};});
const caption=(w,text)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="44"><rect width="100%" height="100%" fill="#14110d"/><text x="16" y="29" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#f1e2c0">${text}</text></svg>`);
const webp=(buf,file,lossless=false)=>sharp(buf).webp(lossless?{lossless:true}:{quality:90}).toFile(`${OUT}/${file}`);

if(only==='shots'||only==='all'){
 evidence.shots=[];
 for(const s of [
  {name:'desktop-1440-ember',width:1440,height:900,dpr:2,hero:'ember-warden',label:'Desktop 1440 × 900 · DPR 2 · Ember Warden'},
  {name:'desktop-1280-rift',width:1280,height:720,dpr:1,hero:'rift-runner',label:'Desktop 1280 × 720 · DPR 1 · Rift Runner'},
  {name:'portrait-390-ember',width:390,height:844,dpr:3,touch:true,hero:'ember-warden',label:'Phone portrait 390 × 844 · DPR 3 · Ember Warden'},
  {name:'portrait-412-rift',width:412,height:915,dpr:2.625,touch:true,hero:'rift-runner',label:'Phone portrait 412 × 915 · DPR 2.625 · Rift Runner'},
  {name:'landscape-844-ember',width:844,height:390,dpr:3,touch:true,hero:'ember-warden',label:'Phone landscape 844 × 390 · DPR 3 · Ember Warden'},
  {name:'landscape-915-rift',width:915,height:412,dpr:2.625,touch:true,hero:'rift-runner',label:'Phone landscape 915 × 412 · DPR 2.625 · Rift Runner'},
  {name:'tablet-820-rift',width:820,height:1180,dpr:2,touch:true,hero:'rift-runner',label:'Tablet portrait 820 × 1180 · DPR 2 · Rift Runner'},
 ]){
  const r=await open(s,async p=>({png:await p.screenshot({timeout:180000}),state:await state(p)}));
  await webp(r.png,`${s.name}.webp`);evidence.shots.push({...s,file:`${s.name}.webp`,...r.state});console.log('shot',s.name,JSON.stringify(r.state));
 }
 // Live resize: one page rotated from portrait to landscape and widened to desktop, without reloading.
 const steps=[[390,844],[844,390],[1280,720]],frames=await open({width:390,height:844,dpr:2,touch:true,hero:'rift-runner'},async p=>{
  const out=[];for(const [w,h] of steps){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(900);out.push({w,h,png:await p.screenshot({timeout:180000}),state:await state(p)});}return out;});
 const H=420,parts=[];let x=0;
 for(const f of frames){const img=await sharp(f.png).resize({height:H}).png().toBuffer(),{width:w}=await sharp(img).metadata();parts.push({input:caption(w,`${f.w} × ${f.h} → ${f.state.layout} @${f.state.frameScale}x`),left:x,top:0},{input:img,left:x,top:44});x+=w+16;}
 await sharp({create:{width:x-16,height:H+44,channels:3,background:'#14110d'}}).composite(parts).webp({quality:90}).toFile(`${OUT}/resize-sequence.webp`);
 evidence.resize=frames.map(f=>({viewport:[f.w,f.h],...f.state}));console.log('resize',JSON.stringify(evidence.resize));
}

// Reference vs result at the reference's own resolution.
const COMPARE=[
 {name:'compare-desktop-ember',width:1672,height:941,dpr:1,hero:'ember-warden',ref:REF+'choose-your-hero-desktop.png',label:'Desktop 1672 × 941 · DPR 1 · Ember Warden'},
 {name:'compare-desktop-rift',width:1672,height:941,dpr:1,hero:'rift-runner',ref:REF+'rift-runner-desktop.png',label:'Desktop 1672 × 941 · DPR 1 · Rift Runner'},
 {name:'compare-mobile-ember',width:432,height:912,dpr:2,touch:true,hero:'ember-warden',ref:REF+'ember-warden-mobile.png',label:'Mobile 432 × 912 CSS px · DPR 2 · Ember Warden'},
 {name:'compare-mobile-rift',width:432,height:912,dpr:2,touch:true,hero:'rift-runner',ref:REF+'rift-runner-mobile.png',label:'Mobile 432 × 912 CSS px · DPR 2 · Rift Runner'},
];
if(only==='compare'||only==='all'){
 evidence.compare=[];
 for(const c of COMPARE){
  const r=await open(c,async p=>({png:await p.screenshot({timeout:180000}),state:await state(p)}));
  const {width:W,height:H}=await sharp(r.png).metadata(),ref=await sharp(c.ref).resize(W,H,{fit:'fill'}).png().toBuffer();
  await webp(r.png,`${c.name}.webp`,true);
  const gap=24,side=await sharp({create:{width:W*2+gap,height:H+44,channels:3,background:'#14110d'}}).composite([{input:caption(W,'Reference'),left:0,top:0},{input:caption(W,'Result: Pixi screen in the game'),left:W+gap,top:0},{input:ref,left:0,top:44},{input:r.png,left:W+gap,top:44}]).png().toBuffer();
  await webp(side,`${c.name}-side-by-side.webp`);
  await webp(await sharp(r.png).composite([{input:await sharp(ref).ensureAlpha(.5).png().toBuffer()}]).png().toBuffer(),`${c.name}-overlay.webp`);
  evidence.compare.push({name:c.name,label:c.label,viewport:[c.width,c.height],dpr:c.dpr,pixels:[W,H],reference:c.ref,...r.state,files:[`${c.name}.webp`,`${c.name}-side-by-side.webp`,`${c.name}-overlay.webp`]});
  console.log('compare',c.name,W,H,JSON.stringify(r.state));
 }
}

// NixieFX highlights: the select burst over time and the looping aura, the button glow on hover and the press flash.
if(only==='fx'||only==='all'){
 const rows=[];
 await open({width:1672,height:941,dpr:1,hero:'ember-warden'},async p=>{
  const t=await p.evaluate(async()=>(await window.__PIXI_UI__.picker.view()).targets());
  rows.push({label:'Highlights loaded',value:(await p.evaluate(async()=>(await window.__PIXI_UI__.picker.view()).highlights)).join(', ')});
  // The effect clock is frozen and stepped, so each frame shows the stated time after the event.
  const fxStep=s=>p.evaluate(async s=>{(await window.__PIXI_UI__.picker.view()).fxClock(true,s);},s),card=()=>p.screenshot({clip:{x:30,y:470,width:340,height:430}});
  await p.mouse.move(...t.cards['rift-runner']);await fxStep(.3);const hover=await card();
  await p.mouse.down();await p.mouse.up();
  const burst=[];let at=0;for(const s of [.06,.18,.42]){await fxStep(s-at);at=s;burst.push(await card());}
  await p.mouse.move(800,500);await fxStep(1.6);const aura=await card();
  const parts=[];let x=0;for(const [l,img] of [['Hover: rail glints +0.3 s',hover],['Select +0.06 s',burst[0]],['Select +0.18 s',burst[1]],['Select +0.42 s',burst[2]],['Selected aura +2 s (loop)',aura]]){parts.push({input:caption(340,l),left:x,top:0},{input:img,left:x,top:44});x+=356;}
  await sharp({create:{width:x-16,height:474,channels:3,background:'#14110d'}}).composite(parts).webp({quality:92}).toFile(`${OUT}/fx-card.webp`);
  const btn=()=>p.screenshot({clip:{x:1130,y:715,width:535,height:145}});
  await p.mouse.move(...t.journey);await fxStep(.7);const glow=await btn();
  await p.mouse.down();await fxStep(.12);const pressed=await btn();
  await p.mouse.move(800,500);await p.mouse.up();await fxStep(1.6);const rest=await btn();
  await p.evaluate(async()=>{const v=await window.__PIXI_UI__.picker.view();v.onConfirm=()=>{};v.confirm();});await fxStep(.11);const flash=await btn();
  const bp=[];let y=0;for(const [l,img] of [['Default (glow released)',rest],['Hover / focus: glow loop +0.7 s',glow],['Pressed +0.12 s',pressed],['Confirm: press flash +0.11 s',flash]]){bp.push({input:caption(535,l),left:0,top:y},{input:img,left:0,top:y+44});y+=145+52;}
  await sharp({create:{width:535,height:y,channels:3,background:'#14110d'}}).composite(bp).webp({quality:92}).toFile(`${OUT}/fx-button.webp`);
 });
 evidence.fx={files:['fx-card.webp','fx-button.webp'],...Object.fromEntries(rows.map(r=>[r.label,r.value]))};console.log('fx',JSON.stringify(evidence.fx));
}

// Edge width: along each row, the run of pixels between 10 % and 90 % of the crop's luminance range at a dark→light or
// light→dark step (scripts/typography/capture.mjs). One device pixel is an ideal anti-aliased edge.
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
// Text crops are measured; frame crops (larger padding) show the split 9-slices and icons at device resolution.
const TEXTS=['CHOOSE YOUR HERO','Choose a hero to begin your journey.','Selected','LOADOUT','Lv. 1','Skills cast automatically when enemies enter range. Gain new skills through random level-up blessings.'];
const FRAMES=[['Begin Journey',[60,26,60,26]],['Rift Runner',[60,300,60,40]],['Flame Fan',[12,150,12,40]]];
if(only==='crisp'||only==='all'){
 evidence.crisp=[];
 for(const dpr of [1,2,3,2.625]){
  const r=await open({width:1280,height:720,dpr},async p=>({png:await p.screenshot({timeout:180000}),texts:await p.evaluate(async()=>(await window.__PIXI_UI__.picker.view()).textBounds()),state:await state(p)}));
  const {width:W,height:H}=await sharp(r.png).metadata(),crops=[];
  for(const [want,pad] of [...TEXTS.map(t=>[t,[2,2,2,2]]),...FRAMES]){
   const t=r.texts.filter(x=>x.text.toUpperCase()===want.toUpperCase()).sort((a,b)=>a.y-b.y)[0];if(!t)throw Error(`no text ${want}`);
   const left=Math.max(0,Math.floor((t.x-pad[0])*dpr)),top=Math.max(0,Math.floor((t.y-pad[1])*dpr)),width=Math.min(W-left,Math.ceil((t.width+pad[0]+pad[2])*dpr)),height=Math.min(H-top,Math.ceil((t.height+pad[1]+pad[3])*dpr));
   const png=await sharp(r.png).extract({left,top,width,height}).png().toBuffer(),frame=pad[0]>2;
   crops.push({text:want.length>24?want.slice(0,24)+'…':want,frame,png,edge:frame?null:await edgeWidth(png),device:[width,height]});
  }
  const tag=`crisp-dpr${String(dpr).replace('.','_')}`,Z=Math.max(1,Math.round(6/dpr)),pieces=[];let y=48,maxW=0;
  for(const c of crops){const w=c.device[0]*Z,h=c.device[1]*Z;pieces.push({input:await sharp(c.png).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:16,top:y});y+=h+12;maxW=Math.max(maxW,w);}
  const title=`Choose Your Hero · 1280 × 720 · DPR ${dpr} · frames @${r.state.frameScale}x · stage scale ${r.state.stageScale} · zoom ${Z}× per device px`;
  const sw=Math.max(maxW+32,1000);
  await sharp({create:{width:sw,height:y+8,channels:3,background:'#14110d'}}).composite([{input:caption(sw,title),left:0,top:0},...pieces]).png().toFile(`${OUT}/${tag}.png`);
  evidence.crisp.push({dpr,viewport:[1280,720],...r.state,file:`${tag}.png`,edges:Object.fromEntries(crops.filter(c=>!c.frame).map(c=>[c.text,c.edge]))});
  console.log('crisp',dpr,`@${r.state.frameScale}x`,crops.filter(c=>!c.frame).map(c=>`${c.text}:${c.edge}`).join(' '));
 }
 // Full 1672 × 941 at DPR 2.625 is the case that needs @3x.
 const r=await open({width:1672,height:941,dpr:2.625},state);evidence.crisp.push({dpr:2.625,viewport:[1672,941],...r,note:'full desktop composition at DPR 2.625'});console.log('crisp full',JSON.stringify(r));
}

// Input: mouse hover/press/tap, touch tap, keyboard switch/begin; the pick must reach the game. The pick is one-time:
// there is no Back, and Escape or a tap where Back was does not close the screen.
if(only==='input'||only==='all'){
 const checks=[];const ok=(name,pass,detail='')=>{checks.push({name,pass,detail});console.log(pass?'PASS':'FAIL',name,detail);};
 const targets=p=>p.evaluate(async()=>(await window.__PIXI_UI__.picker.view()).targets());
 const hero=p=>p.evaluate(()=>localStorage.getItem('arkodia.hero'));
 await open({width:1672,height:941,dpr:1,hero:'rift-runner'},async p=>{
  // The game starts as Rift Runner (the default), so choosing Ember proves the pick reaches the game.
  const t=await targets(p),[cx,cy]=t.cards['ember-warden'],cardClip={x:40,y:125,width:320,height:410};
  await p.mouse.move(cx,cy);await p.waitForTimeout(250);await webp(await p.screenshot({clip:cardClip}),'input-card-hover.webp');
  await p.mouse.down();await p.waitForTimeout(150);await webp(await p.screenshot({clip:cardClip}),'input-card-pressed.webp');await p.mouse.up();
  ok('mouse tap on a card selects it',(await state(p)).hero==='ember-warden');
  const [bx,by]=t.journey;
  await p.mouse.move(bx,by);await p.waitForTimeout(250);const hover=await p.screenshot({clip:{x:1140,y:725,width:515,height:135}});
  await p.mouse.down();await p.waitForTimeout(150);const pressed=await p.screenshot({clip:{x:1140,y:725,width:515,height:135}});
  await p.mouse.move(bx,by-300);await p.mouse.up();await p.waitForTimeout(150);const normal=await p.screenshot({clip:{x:1140,y:725,width:515,height:135}});
  ok('releasing outside Begin Journey does not confirm',(await state(p)).open);
  const parts=[];let y=0;for(const [l,img] of [['Default',normal],['Hover / keyboard focus',hover],['Pressed',pressed]]){parts.push({input:caption(515,l),left:0,top:y},{input:img,left:0,top:y+44});y+=135+52;}
  await sharp({create:{width:515,height:y,channels:3,background:'#14110d'}}).composite(parts).webp({quality:92}).toFile(`${OUT}/input-button-states.webp`);
  await p.mouse.move(bx,by);await p.mouse.down();await p.mouse.up();await p.waitForTimeout(300);
  ok('mouse Begin Journey confirms and closes',!(await state(p)).open&&await hero(p)==='ember-warden',`saved hero ${await hero(p)}`);
  await p.waitForTimeout(1500);
  const hud=await p.evaluate(()=>window.__PIXI_UI__.hud.heroNameText?.text);
  ok('the game swaps to the chosen hero (HUD name)',hud==='Ember Warden',`HUD shows ${hud}, was Rift Runner`);
 });
 await open({width:1672,height:941,dpr:1,hero:'rift-runner'},async p=>{
  await p.keyboard.press('ArrowUp');ok('ArrowUp switches hero',(await state(p)).hero==='ember-warden');
  await p.keyboard.press('Tab');ok('Tab switches hero',(await state(p)).hero==='rift-runner');
  await p.keyboard.press('Shift+Tab');ok('Shift+Tab switches back',(await state(p)).hero==='ember-warden');
  await p.keyboard.down('Enter');await p.waitForTimeout(100);ok('Enter held keeps the screen open (pressed state)',(await state(p)).open);
  await p.keyboard.up('Enter');await p.waitForTimeout(300);ok('Enter release begins with the selected hero',!(await state(p)).open&&await hero(p)==='ember-warden',`saved hero ${await hero(p)}`);
 });
 await open({width:1672,height:941,dpr:1,hero:'rift-runner'},async p=>{
  await p.keyboard.press('Escape');await p.waitForTimeout(600);
  ok('Escape does not leave the one-time pick',(await state(p)).open&&(await targets(p)).back===null);
 });
 await open({width:390,height:844,dpr:3,touch:true,hero:'ember-warden'},async p=>{
  const t=await targets(p),[cx,cy]=t.cards['rift-runner'];await p.touchscreen.tap(cx,cy);await p.waitForTimeout(200);
  ok('touch tap on a card selects it',(await state(p)).hero==='rift-runner');
  const [bx,by]=(await targets(p)).journey;await p.touchscreen.tap(bx,by);await p.waitForTimeout(300);
  ok('touch Begin Journey confirms',!(await state(p)).open&&await hero(p)==='rift-runner',`saved hero ${await hero(p)}`);
 });
 await open({width:390,height:844,dpr:3,touch:true,hero:'ember-warden'},async p=>{
  await p.touchscreen.tap(24,24);await p.waitForTimeout(300);ok('touch where Back was does not close the one-time pick',(await state(p)).open);
 });
 evidence.input=checks;
}
evidence.consoleErrors=errorsSeen;
console.log('console errors:',errorsSeen.length?errorsSeen.join('\n'):'none');
fs.writeFileSync(evidenceFile,JSON.stringify(evidence,null,1)+'\n');
await server.close();
if(evidence.input?.some(c=>!c.pass)||errorsSeen.length)process.exitCode=1;
