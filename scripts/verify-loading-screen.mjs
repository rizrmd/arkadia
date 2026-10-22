// Verify and capture the redesigned Pixi v8 loading screen (full-bleed generated background artwork,
// high-resolution ARKADIA compass logo without STRONGHOLD or modal box, and sleek antique-gold progress bar).
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

try{
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

  // Build side-by-side comparison against the original task attachment (Image 1)
  const ref1=`${process.env.HOME}/attachments/TAc040108c78d79a2ef66c4732.png`;
  if(fs.existsSync(ref1)){
   const W=1186,H=668,gap=24;
   const beforeBuf=await sharp(ref1).resize(W,H,{fit:'cover'}).png().toBuffer();
   const afterBuf=await sharp(`${OUT}/loading-desktop-96.webp`).resize(W,H,{fit:'cover'}).png().toBuffer();
   const cap=(w,t)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="44"><rect width="100%" height="100%" fill="#120e0a"/><text x="16" y="29" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#f1e2c0">${t}</text></svg>`);
   await sharp({create:{width:W*2+gap,height:H+44,channels:3,background:'#120e0a'}})
    .composite([
     {input:cap(W,'Before (modal box, STRONGHOLD title, overflowing orange bar)'),left:0,top:0},
     {input:cap(W,'After (full-bleed artwork, high-res ARKADIA logo, sleek gold bar)'),left:W+gap,top:0},
     {input:beforeBuf,left:0,top:44},
     {input:afterBuf,left:W+gap,top:44},
    ])
    .webp({quality:92})
    .toFile(`${OUT}/compare-before-after.webp`);
  }
 }finally{
  await browser.close();
 }

 fs.writeFileSync(`${OUT}/verification.json`,JSON.stringify({
  checkedAt:new Date().toISOString(),
  errors,
  results,
 },null,2)+'\n');
}finally{
 await server.close();
}

if(errors.length){
 console.error('Errors:',errors);
 process.exit(1);
}
