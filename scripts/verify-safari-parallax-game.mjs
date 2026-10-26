import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {launchOptions} from './typography/browser.mjs';

// Run after npm run build. Inspect the actual cached Pixi textures in the built game.
const server=await preview({preview:{host:'127.0.0.1',port:0}});
const base=server.resolvedUrls.local[0],results=[];
try{
 for(const engine of process.env.WEBKIT_EXECUTABLE?['chromium','webkit']:['chromium']){
  const options=launchOptions();options.args=options.args.filter(x=>x!=='--single-process');
  const browser=await (engine==='chromium'?chromium:webkit).launch(engine==='chromium'?options:{headless:true,executablePath:process.env.WEBKIT_EXECUTABLE});
  try{
   const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   // Chromium simulates ignored filters; WebKit exercises its own capability result.
   if(engine==='chromium')await page.addInitScript(()=>Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{configurable:true,get(){return 'none';},set(){}}));
   await page.goto(base+'?offline=1&time=0.35',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__STRONGHOLD_PARALLAX__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:120000});
   for(const [width,height,mode] of [[1440,900,'desktop'],[390,844,'mobile-portrait'],[844,390,'mobile-landscape']]){
    await page.setViewportSize({width,height});
    const mobile=mode!=='desktop';
    await page.waitForFunction(mode=>window.__STRONGHOLD_PARALLAX__.snapshot().mode===mode,mode);
    for(const area of ['court','snow']){
     await page.evaluate(area=>{const p=window.__STRONGHOLD_PARALLAX__;p.stop();p.forceArea(area);},area);
     await page.waitForFunction(({area,mobile})=>window.__STRONGHOLD_PARALLAX__.snapshot().loadedSets.includes(area+':'+(mobile?'mobile':'desktop')),{area,mobile});
     const result=await page.evaluate(()=>{
      const p=window.__STRONGHOLD_PARALLAX__,snapshot=p.snapshot();
      const textures=p.container.children.filter(s=>s.texture&&s.visible).map(s=>{
       const c=s.texture.source.resource;
       if(!(c instanceof HTMLCanvasElement))return {canvas:false};
       const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
       let fractionalAlpha=0,opaque=0;
       for(let i=3;i<d.length;i+=4){if(d[i]>0&&d[i]<255)fractionalAlpha++;if(d[i]===255)opaque++;}
       return {canvas:true,width:c.width,height:c.height,fractionalAlpha,opaque};
      });
      return {snapshot,textures};
     });
     assert.equal(result.snapshot.area,area);assert.equal(result.snapshot.mode,mode);assert.equal(result.snapshot.blurPx,3);
     assert.ok(result.textures.length>=2);
     for(const t of result.textures){assert.equal(t.canvas,true);assert.ok(t.fractionalAlpha>0);assert.ok(t.width<= (mobile?180:320));assert.equal(t.height,mobile?150:380);}
     results.push({engine,width,height,area,...result});
    }
   }
   assert.deepEqual(errors,[],`${engine} runtime errors`);
  }finally{await browser.close();}
 }
 await fs.mkdir('docs/safari-parallax',{recursive:true});
 await fs.writeFile('docs/safari-parallax/game-verification.json',JSON.stringify({pass:true,results},null,2)+'\n');
 console.log(JSON.stringify({pass:true,cases:results.length,engines:[...new Set(results.map(r=>r.engine))]}));
}finally{await new Promise(resolve=>server.httpServer.close(resolve));}
