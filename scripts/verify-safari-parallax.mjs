import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium,webkit} from 'playwright';
import {launchOptions} from './typography/browser.mjs';
import {gaussianBlurRGBA} from '../src/stronghold/canvas-blur.ts';

// Transparent coloured texels must not leak colour into blurred opaque art.
const pixels=new Uint8ClampedArray(31*31*4);
for(let i=0;i<pixels.length;i+=4)pixels[i+2]=255;
pixels.set([240,80,20,255],(15*31+15)*4);
const blurred=gaussianBlurRGBA(pixels,31,31,3);
for(let i=0;i<blurred.length;i+=4)if(blurred[i+3]){
 assert.ok(Math.abs(blurred[i]-240)<=1);assert.ok(Math.abs(blurred[i+1]-80)<=1);assert.ok(Math.abs(blurred[i+2]-20)<=1);
}
assert.ok(blurred[(15*31+14)*4+3]>0,'Gaussian spreads beyond the original silhouette');

const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const base=server.resolvedUrls.local[0],results=[];
try{
 for(const engine of (process.env.WEBKIT_EXECUTABLE?['chromium','webkit']:['chromium'])){
  const options=launchOptions();options.args=options.args.filter(arg=>arg!=='--single-process');
  const browser=await (engine==='chromium'?chromium:webkit).launch(engine==='chromium'?options:{headless:true,executablePath:process.env.WEBKIT_EXECUTABLE});
  try{
   for(const fallback of [false,true]){
    const page=await browser.newPage();
    if(fallback)await page.addInitScript(()=>Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{configurable:true,get(){return 'none';},set(){}}));
    // A tiny module-only document avoids starting the game while exercising its real bake.
    await page.route('**/blur-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Parallax blur verification</title>'}));
    await page.goto(base+'blur-check');
    const result=await page.evaluate(async({fallback})=>{
     const {supportsCanvasBlur}=await import('/src/stronghold/canvas-blur.ts');
     const {bakeDepthBlur}=await import('/src/stronghold/parallax.ts');
     const cases=[];
     const energy=canvas=>{
      const {width:w,height:h}=canvas,d=canvas.getContext('2d').getImageData(0,0,w,h).data;
      let sum=0,count=0;
      // Interior opaque region: don't confuse feathered silhouettes with detail blur.
      for(let y=Math.round(h*.3);y<h-10;y++)for(let x=10;x<w-10;x++){
       const a=(y*w+x)*4,b=a+4;
       if(d[a+3]>240&&d[b+3]>240){sum+=Math.abs(d[a]-d[b])+Math.abs(d[a+1]-d[b+1])+Math.abs(d[a+2]-d[b+2]);count+=3;}
      }
      return sum/count;
     };
     for(const area of ['court','snow'])for(const mobile of [false,true])for(const side of ['left','right']){
      const img=new Image();img.src=`/environment-corners/v1/corner-${area}-${side}${mobile?'-mobile':''}.webp`;await img.decode();
      const source=document.createElement('canvas');source.width=img.width/2;source.height=img.height/2;source.getContext('2d').drawImage(img,0,0,source.width,source.height);
      const start=performance.now(),baked=bakeDepthBlur(img,!mobile),ms=performance.now()-start;
      cases.push({area,mobile,side,width:baked.width,height:baked.height,sharpEnergy:energy(source),blurEnergy:energy(baked),ms});
     }
     return {fallback,nativeBlur:supportsCanvasBlur(),cases};
    },{fallback});
    if(fallback)assert.equal(result.nativeBlur,false,'Pixel probe rejects ignored filters');
    for(const c of result.cases){assert.ok(c.blurEnergy<c.sharpEnergy*.75,`${engine} ${JSON.stringify(c)} must soften details`);assert.equal(c.width,c.mobile?180:320);assert.equal(c.height,c.mobile?150:380);}
    results.push({engine,...result});await page.close();
   }
  }finally{await browser.close();}
 }
 await fs.mkdir('docs/safari-parallax',{recursive:true});
 await fs.writeFile('docs/safari-parallax/verification.json',JSON.stringify({pass:true,results},null,2)+'\n');
 console.log(JSON.stringify({pass:true,results}));
}finally{await server.close();}
