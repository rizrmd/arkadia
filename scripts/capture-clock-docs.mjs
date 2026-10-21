// Documentation images for the in-game clock and sun shadows (docs/lighting/*.webp).
// Serves dist/ on port 3073 unless PREVIEW_URL; one fresh browser per shot (single-process Chromium).
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3073',out='docs/lighting';
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3073'}});
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
async function shot(vp,hour,openPanel=false){
 const browser=await launch();try{const page=await browser.newPage(vp);await page.goto(base+'/stronghold.html');await page.waitForSelector('#day-clock .clock-time');
  await page.evaluate(t=>localStorage.setItem('arkadia.stronghold.lighting',JSON.stringify({mode:'dynamic',time:t})),hour/24);await page.reload();
  await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.lighting&&document.querySelector('#world-canvas')?.dataset.ready==='true');
  if(openPanel)await page.click('.clock-chip');await page.waitForTimeout(900);return await page.screenshot();}finally{await browser.close();}
}
try{
 await new Promise(r=>setTimeout(r,500));const desktop={viewport:{width:1280,height:800}};
 // Shadows reach right in the morning, fall short to the lower right at noon and reach left in the evening.
 const hours=[7.5,12,16.5],frames=[];for(const h of hours)frames.push(await sharp(await shot(desktop,h)).extract({left:140,top:90,width:1000,height:620}).resize(640).toBuffer());
 await sharp({create:{width:640*3+16,height:397,channels:3,background:'#11191e'}}).composite(frames.map((f,i)=>({input:f,left:i*648,top:0}))).webp({quality:82}).toFile(out+'/sun-shadows.webp');
 await sharp(await shot(desktop,17,true)).webp({quality:82}).toFile(out+'/clock-desktop.webp');
 await sharp(await shot({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},18.75,true)).resize(390).webp({quality:82}).toFile(out+'/clock-mobile.webp');
 console.log('Wrote sun-shadows.webp, clock-desktop.webp and clock-mobile.webp');
}finally{server?.kill();}
