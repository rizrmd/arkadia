import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {launchOptions} from './typography/browser.mjs';

// Run after npm run build. Inspect the actual cached Pixi textures in the built game.
const server=process.env.PARALLAX_BASE_URL?null:await preview({preview:{host:'127.0.0.1',port:0}});
const base=process.env.PARALLAX_BASE_URL||server.resolvedUrls.local[0],results=[];
try{
 for(const engine of process.env.WEBKIT_EXECUTABLE?['chromium','webkit']:['chromium']){
  const options=launchOptions();options.args=options.args.filter(x=>x!=='--single-process');
  const browser=await (engine==='chromium'?chromium:webkit).launch(engine==='chromium'?options:{headless:true,executablePath:process.env.WEBKIT_EXECUTABLE});
  try{
   const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
   page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
   // Chromium simulates ignored filters; WebKit exercises its own capability result.
   if(engine==='chromium')await page.addInitScript(()=>Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{configurable:true,get(){return 'none';},set(){}}));
   await page.goto(base+'?offline=1&time=0.35',{waitUntil:'domcontentloaded'});
   try{await page.waitForFunction(()=>window.__STRONGHOLD_PARALLAX__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});}
   catch(e){console.error(JSON.stringify({engine,errors,failures,loading:await page.evaluate(()=>({text:document.body.innerText.slice(0,2000),parallax:!!window.__STRONGHOLD_PARALLAX__,ready:document.querySelector('#world-canvas')?.dataset.ready}))}));throw e;}
   for(const [width,height,mode] of [[1440,900,'desktop'],[390,844,'mobile-portrait'],[844,390,'mobile-landscape']]){
    await page.setViewportSize({width,height});
    const mobile=mode!=='desktop';
    await page.waitForFunction(mode=>window.__STRONGHOLD_PARALLAX__.snapshot().mode===mode,mode);
    for(const area of ['court','snow']){
     await page.evaluate(area=>{const p=window.__STRONGHOLD_PARALLAX__;p.stop();p.forceArea(area);},area);
     await page.waitForFunction(({area,mobile})=>window.__STRONGHOLD_PARALLAX__.snapshot().loadedSets.includes(area+':'+(mobile?'mobile':'desktop')),{area,mobile});
     const result=await page.evaluate(async()=>{
      const p=window.__STRONGHOLD_PARALLAX__,snapshot=p.snapshot();
      const textures=await Promise.all(p.container.children.filter(s=>s.texture&&s.visible).map(async(s,index)=>{
       const c=s.texture.source.resource;
       if(!(c instanceof HTMLCanvasElement))return {canvas:false};
       const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
       let fractionalAlpha=0,opaque=0;
       for(let i=3;i<d.length;i+=4){if(d[i]>0&&d[i]<255)fractionalAlpha++;if(d[i]===255)opaque++;}
       const image=new Image();image.src=index===0?snapshot.left.file:snapshot.right.file;await image.decode();
       const scaled=document.createElement('canvas');scaled.width=image.naturalWidth/2;scaled.height=image.naturalHeight/2;scaled.getContext('2d').drawImage(image,0,0,scaled.width,scaled.height);
       const offset=index===1?scaled.width-c.width:0;
       const sharp=scaled.getContext('2d').getImageData(offset,0,c.width,c.height).data;
       let sharpSum=0,blurSum=0,samples=0;
       for(let y=Math.round(c.height*.3);y<c.height-10;y++)for(let x=10;x<c.width-10;x++){
        const a=(y*c.width+x)*4,b=a+4;
        if(d[a+3]>240&&d[b+3]>240&&sharp[a+3]>240&&sharp[b+3]>240){
         for(let channel=0;channel<3;channel++){sharpSum+=Math.abs(sharp[a+channel]-sharp[b+channel]);blurSum+=Math.abs(d[a+channel]-d[b+channel]);samples++;}
        }
       }
       return {canvas:true,width:c.width,height:c.height,fractionalAlpha,opaque,samples,sharpEnergy:sharpSum/samples,blurEnergy:blurSum/samples};
      }));
      return {snapshot,textures};
     });
     assert.equal(result.snapshot.area,area);assert.equal(result.snapshot.mode,mode);assert.equal(result.snapshot.blurPx,3);
     assert.ok(result.textures.length>=2);
     for(const t of result.textures){assert.equal(t.canvas,true);assert.ok(t.fractionalAlpha>0);assert.ok(t.width<= (mobile?180:320));assert.equal(t.height,mobile?150:380);assert.ok(t.samples>0);assert.ok(t.blurEnergy<t.sharpEnergy*.75,`${engine} ${area} ${mode} actual texture must blur details: ${JSON.stringify(t)}`);}
     results.push({engine,width,height,area,...result});
    }
   }
   assert.deepEqual(errors,[],`${engine} runtime errors`);
  }finally{await browser.close();}
 }
 await fs.mkdir('docs/safari-parallax',{recursive:true});
 await fs.writeFile(`docs/safari-parallax/${process.env.PARALLAX_BASE_URL?'live':'game'}-verification.json`,JSON.stringify({pass:true,base,results},null,2)+'\n');
 console.log(JSON.stringify({pass:true,cases:results.length,engines:[...new Set(results.map(r=>r.engine))]}));
}finally{if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
