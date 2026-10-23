import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {launchOptions} from './typography/browser.mjs';
const out='docs/environment-corners';
const server=spawn('server/bin/arkodia',[],{env:{...process.env,PORT:'8819',SITE_DIR:'dist'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:8819')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 for(const [width,height] of [[1440,900],[1920,1080],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:8819/?offline=1&time=0.35');
  await page.waitForFunction(()=>window.__STRONGHOLD_PARALLAX__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
  const result=await page.evaluate(()=>{
   if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));
   const hud=window.__STRONGHOLD_COMBAT__.hud;
   if(hud.groups.bl.children.length)throw Error('Movement hint is still rendered');
   window.__STRONGHOLD_PARALLAX__.forceArea('court');
   const p=window.__STRONGHOLD_PARALLAX__;
   return p.snapshot();
  });
  await page.waitForTimeout(300);
  await sharp(await page.screenshot()).webp({quality:90}).toFile(`${out}/hint-fix-${width}x${height}.webp`);
  // Read actual baked textures, verifying the desktop top edge is transparent.
  const alpha=await page.evaluate(()=>{
   const c=window.__STRONGHOLD_PARALLAX__.container;
   const sprite=c.children.find(x=>x.texture?.source?.resource?.getContext);
   if(!sprite)throw Error('Missing baked corner texture');
   const canvas=sprite.texture.source.resource;
   const ctx=canvas.getContext('2d');
   return {top:ctx.getImageData(0,0,1,1).data[3],lower:ctx.getImageData(0,Math.floor(canvas.height*.3),1,1).data[3]};
  });
  if(result.mode==='desktop'){assert(alpha.top<=3);assert(alpha.lower>0);}
  results.push({width,height,mode:result.mode,alpha});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/hint-fix-verification.json`,JSON.stringify({errors,results},null,2));
 console.log('PASS: hint absent, desktop top edge transparent with artwork retained, four viewports, no runtime errors.');
}finally{await browser?.close();server.kill();}
