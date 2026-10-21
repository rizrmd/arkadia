// Before/after images for nights capped at dusk darkness (docs/dusk-night/*.webp).
// BEFORE_URL is the build still showing the old dark night; AFTER_URL defaults to dist/ served on port 3075.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
const before=process.env.BEFORE_URL||'https://arkadia-custom-whachat.fural.space/',after=process.env.AFTER_URL||'http://127.0.0.1:3075',out='docs/dusk-night';
const server=process.env.AFTER_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3075'}});
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote']});
async function shot(base,hour){
 const page=await browser.newPage({viewport:{width:1280,height:800}});try{await page.goto(`${base}/?time=${hour/24}`);await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.lighting&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});await page.waitForTimeout(1200);
  return await sharp(await page.screenshot()).extract({left:140,top:90,width:1000,height:620}).resize(640).toBuffer();}finally{await page.close();}
}
const row=async(frames,file)=>sharp({create:{width:640*frames.length+16*(frames.length-1),height:397,channels:3,background:'#11191e'}}).composite(frames.map((f,i)=>({input:f,left:i*656,top:0}))).webp({quality:82}).toFile(out+'/'+file);
try{
 await new Promise(r=>setTimeout(r,600));
 await row([await shot(before,19),await shot(before,0)],'before-dusk-midnight.webp');
 await row([await shot(after,19),await shot(after,0)],'after-dusk-midnight.webp');
 await row([await shot(after,21),await shot(after,2),await shot(after,4.5)],'after-night-hours.webp');
 console.log('Wrote before-dusk-midnight.webp, after-dusk-midnight.webp and after-night-hours.webp');
}finally{await browser.close();server?.kill();}
