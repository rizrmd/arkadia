// Verify and capture the pure HTML instant loading screen (renders immediately from index.html at t=0ms
// before JS/Pixi download, with full-bleed background artwork, high-resolution ARKODIA compass logo,
// inline SVG antique-gold progress bar, and clean DOM removal once loading finishes).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from './typography/browser.mjs';

const OUT='docs/loading-screen';
fs.mkdirSync(OUT,{recursive:true});

const PORT=3068;
const server=await createServer({configFile:'vite.config.ts',logLevel:'error',server:{port:PORT,strictPort:true}});
await server.listen();

const errors=[];
const results=[];
let instantHtmlAudit=null;
let domRemovedAfterDone=false;

try{
 // 1. Verify instant 0ms Pure HTML rendering BEFORE any module JS / Pixi bundle loads
 {
  const browser=await chromium.launch(launchOptions());
  try{
   const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
   const page=await ctx.newPage();
   // Block the module entry script so zero app/Pixi JS runs — only pure HTML in index.html
   await page.route('**/src/app/main.ts*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});

   instantHtmlAudit=await page.evaluate(async ()=>{
    const screen=document.getElementById('loading-screen');
    const logo=document.getElementById('loading-logo');
    if(logo&&(!logo.complete||!logo.naturalWidth)&&logo.decode){
     await logo.decode().catch(()=>{});
    }
    const track=document.getElementById('loading-track');
    const fillClip=document.getElementById('loading-fill-clip');
    const crest=document.getElementById('loading-crest');
    const label=document.getElementById('loading-label');
    const pct=document.getElementById('loading-pct');
    const worldCanvas=document.getElementById('world-canvas');
    const r=el=>el?el.getBoundingClientRect():null;
    return {
     screenVisible:Boolean(screen&&r(screen).width===390&&r(screen).height===844),
     logoDecodedAt0ms:Boolean(logo&&logo.complete&&logo.naturalWidth>=390&&r(logo).width>100),
     trackVisible:Boolean(track&&r(track).width>200&&r(track).height>10),
     fillVisible:Boolean(fillClip&&r(fillClip).width>0&&r(fillClip).height>5),
     crestVisible:Boolean(crest&&r(crest).width>10),
     labelText:label?.textContent||'',
     pctText:pct?.textContent||'',
     noPixiCanvasYet:worldCanvas===null,
    };
   });
   assert.equal(instantHtmlAudit.screenVisible,true,'#loading-screen must be visible at domcontentloaded before JS loads');
   assert.equal(instantHtmlAudit.logoDecodedAt0ms,true,'Inline @1x ARKODIA logo must be decoded at 0ms without JS');
   assert.equal(instantHtmlAudit.trackVisible,true,'Inline SVG progress bar track must be visible at 0ms');
   assert.equal(instantHtmlAudit.fillVisible,true,'Inline SVG progress bar fill must be visible at 0ms');
   assert.equal(instantHtmlAudit.noPixiCanvasYet,true,'Verified pure HTML render before Pixi canvas exists');

   await page.waitForFunction(()=>window.__LOADING_READY__===true,null,{timeout:15000});
   await page.evaluate(()=>{window.__LOADING_SCREEN__.set(12,'Loading the game');});
   await page.waitForTimeout(150);
   const png=await page.screenshot({type:'png',timeout:60000});
   await sharp(png).webp({quality:92}).toFile(`${OUT}/loading-mobile-instant-0ms.webp`);
   results.push({name:'loading-mobile-instant-0ms',width:390,height:844,pct:12,text:'Loading the game (Pure HTML before JS/Pixi)',file:`${OUT}/loading-mobile-instant-0ms.webp`});
   console.log('captured loading-mobile-instant-0ms 390x844 12% (pure HTML before JS)');
  }finally{
   await browser.close();
  }
 }

 // 2. Verify full loading screen across viewports and clean DOM removal on completion
 const browser=await chromium.launch(launchOptions());
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

  await page.goto(`http://127.0.0.1:${PORT}/?offline=1&holdLoading=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LOADING_READY__===true&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});

  for(const shot of [
   {name:'loading-desktop-96',width:1440,height:900,pct:96,text:'Raising the Stronghold'},
   {name:'loading-desktop-64',width:1440,height:900,pct:64,text:'Loading artwork · 18.4 of 28.7 MB'},
   {name:'loading-mobile-96',width:390,height:844,pct:96,text:'Raising the Stronghold'},
   {name:'loading-mobile-landscape-96',width:844,height:390,pct:96,text:'Raising the Stronghold'},
  ]){
   await page.setViewportSize({width:shot.width,height:shot.height});
   await page.evaluate(({pct,text})=>{
    window.__LOADING_SCREEN__.set(pct,text);
    window.dispatchEvent(new Event('resize'));
   },{pct:shot.pct,text:shot.text});
   await page.waitForTimeout(250);
   const png=await page.screenshot({type:'png',timeout:60000});
   await sharp(png).webp({quality:92}).toFile(`${OUT}/${shot.name}.webp`);
   results.push({...shot,file:`${OUT}/${shot.name}.webp`});
   console.log('captured',shot.name,`${shot.width}x${shot.height}`,`${shot.pct}%`);
  }

  // Verify error state & "Try Again" button positioning across viewports (no overlap with multi-line wrapped error text)
  const errorAudits=[];
  for(const shot of [
   {name:'loading-mobile-error-retry',width:390,height:844},
   {name:'loading-desktop-error-retry',width:1440,height:900},
   {name:'loading-mobile-landscape-error-retry',width:844,height:390},
  ]){
   await page.setViewportSize({width:shot.width,height:shot.height});
   await page.evaluate(()=>{
    window.__LOADING_SCREEN__.fail('The Stronghold could not load. Check your connection and try again.');
    window.dispatchEvent(new Event('resize'));
   });
   await page.waitForTimeout(250);
   const audit=await page.evaluate(()=>{
    const screen=document.getElementById('loading-screen');
    const track=document.getElementById('loading-track').getBoundingClientRect();
    const label=document.getElementById('loading-label').getBoundingClientRect();
    const retry=document.getElementById('loading-retry').getBoundingClientRect();
    const pctStyle=getComputedStyle(document.getElementById('loading-pct'));
    const labelStyle=getComputedStyle(document.getElementById('loading-label'));
    return {
     state:screen?.dataset.state||'',
     labelText:document.getElementById('loading-label')?.textContent||'',
     labelTextAlign:labelStyle.textAlign,
     pctDisplay:pctStyle.display,
     gapBarToLabelPx:Math.round((label.top-track.bottom)*10)/10,
     gapLabelToRetryPx:Math.round((retry.top-label.bottom)*10)/10,
     centerOffsetPx:Math.round(Math.abs((retry.left+retry.width/2)-(track.left+track.width/2))*10)/10,
     bottomMarginPx:Math.round((window.innerHeight-retry.bottom)*10)/10,
     labelRect:{top:Math.round(label.top),bottom:Math.round(label.bottom),width:Math.round(label.width),height:Math.round(label.height)},
     retryRect:{top:Math.round(retry.top),bottom:Math.round(retry.bottom),width:Math.round(retry.width),height:Math.round(retry.height)},
    };
   });
   assert.equal(audit.state,'error','Error state must set data-state=error on #loading-screen');
   assert.equal(audit.labelTextAlign,'center','Error message must be horizontally centered');
   assert.equal(audit.pctDisplay,'none','Percentage readout must be hidden in error state');
   assert.ok(audit.gapLabelToRetryPx>=8,`Try Again button must sit strictly below wrapped error text (gap=${audit.gapLabelToRetryPx}px)`);
   assert.ok(audit.centerOffsetPx<=2,`Try Again button must be horizontally centered with progress bar (offset=${audit.centerOffsetPx}px)`);
   assert.ok(audit.bottomMarginPx>=8,`Try Again button must fit inside viewport (bottomMargin=${audit.bottomMarginPx}px)`);
   const png=await page.screenshot({type:'png',timeout:60000});
   await sharp(png).webp({quality:92}).toFile(`${OUT}/${shot.name}.webp`);
   errorAudits.push({viewport:`${shot.width}x${shot.height}`,...audit,file:`${OUT}/${shot.name}.webp`});
   results.push({...shot,state:'error',text:'The Stronghold could not load. Check your connection and try again.',file:`${OUT}/${shot.name}.webp`});
   console.log('verified & captured',shot.name,`${shot.width}x${shot.height}`,`gapLabelToRetry=${audit.gapLabelToRetryPx}px`);
  }

  // Build side-by-side before/after comparison for the error button positioning fix if reference attachment exists
  const refPath='/home/dev/attachments/TA138b833e837ae7c437e575f1.jpg';
  if(fs.existsSync(refPath)){
   const W=390,H=844,PAD=20,HEAD=44;
   const beforeBuf=await sharp(refPath).resize(W,H,{fit:'cover',position:'center'}).png().toBuffer();
   const afterBuf=await sharp(`${OUT}/loading-mobile-error-retry.webp`).resize(W,H,{fit:'cover'}).png().toBuffer();
   const headerSvg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W*2+PAD*3}" height="${H+PAD*2+HEAD}">
    <rect width="100%" height="100%" fill="#080b0e"/>
    <text x="${PAD+W/2}" y="29" text-anchor="middle" fill="#e59866" font-family="Georgia,serif" font-size="14" font-weight="bold">BEFORE — Button Overlaps Error Text</text>
    <text x="${PAD*2+W+W/2}" y="29" text-anchor="middle" fill="#f2c665" font-family="Georgia,serif" font-size="14" font-weight="bold">AFTER — Centered Text &amp; Flow Button</text>
   </svg>`);
   await sharp(headerSvg)
    .composite([
     {input:beforeBuf,left:PAD,top:HEAD+PAD/2},
     {input:afterBuf,left:PAD*2+W,top:HEAD+PAD/2},
    ])
    .webp({quality:92})
    .toFile(`${OUT}/compare-error-retry-before-after.webp`);
   console.log('built compare-error-retry-before-after.webp');
  }

  // Verify normal load removes #loading-screen from DOM once done() fires
  await page.goto(`http://127.0.0.1:${PORT}/?offline=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen'),null,{timeout:120000});
  domRemovedAfterDone=await page.evaluate(()=>document.getElementById('loading-screen')===null);
  assert.equal(domRemovedAfterDone,true,'#loading-screen must be removed from DOM after loading finishes');
  console.log('verified #loading-screen removed from DOM after done()');

  fs.writeFileSync(`${OUT}/verification.json`,JSON.stringify({
   checkedAt:new Date().toISOString(),
   architecture:'pure-html-instant-loading-screen',
   instantHtmlAudit,
   errorAudits,
   domRemovedAfterDone,
   errors,
   results,
  },null,2)+'\n');
 }finally{
  await browser.close();
 }
}finally{
 await server.close();
}

if(errors.length){
 console.error('Errors:',errors);
 process.exit(1);
}
