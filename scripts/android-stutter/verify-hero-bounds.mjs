import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import {launch} from '../vfx/browser.mjs';
const baseline=process.env.BASELINE==='1';
const vite=await createServer({plugins:baseline?[{name:'baseline-hero',enforce:'pre',transform(code,id){if(id.endsWith('/src/stronghold/hero.ts'))return execFileSync('git',['show','60ee0643:src/stronghold/hero.ts'],{encoding:'utf8'});}}]:[],cacheDir:`/tmp/hero-bounds-${process.pid}`,server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/*',()=>{});
 await page.addInitScript(()=>{
  const proto=CanvasRenderingContext2D.prototype,pad=256,original={drawImage:proto.drawImage,fillRect:proto.fillRect,clearRect:proto.clearRect};
  window.__BOUNDS__={outside:0,mismatch:0,maxDelta:0,maxPremultipliedDelta:0,maxAlphaDelta:0,frames:0,sizes:[]};let reference=null,target=null;
  function check(){if(!reference||!target)return;const report=window.__BOUNDS__,w=target.canvas.width,h=target.canvas.height,r=reference.getImageData(0,0,reference.canvas.width,reference.canvas.height),a=target.getImageData(0,0,w,h);let outside=0,mismatch=0;for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){const k=(y*r.width+x)*4,inside=x>=pad&&y>=pad&&x<pad+w&&y<pad+h;if(!inside){if(r.data[k+3])outside++;}else{const j=((y-pad)*w+x-pad)*4;for(let c=0;c<4;c++){const delta=Math.abs(a.data[j+c]-r.data[k+c]);if(delta)mismatch++;report.maxDelta=Math.max(report.maxDelta,delta);if(c<3)report.maxPremultipliedDelta=Math.max(report.maxPremultipliedDelta,Math.abs(a.data[j+c]*a.data[j+3]-r.data[k+c]*r.data[k+3])/255);if(c===3)report.maxAlphaDelta=Math.max(report.maxAlphaDelta,delta);}}}report.outside+=outside;report.mismatch+=mismatch;report.frames++;if(!report.sizes.some(s=>s[0]===w&&s[1]===h))report.sizes.push([w,h]);}
  for(const name of ['drawImage','fillRect','clearRect'])proto[name]=function(...args){
   if(this.canvas.id!=='world-hero')return original[name].apply(this,args);
   if(name==='clearRect'){
    // Finish the previous frame before clearing it. The runtime can resize between frames.
    if(target&&reference&&target.canvas.width===reference.canvas.width-pad*2&&target.canvas.height===reference.canvas.height-pad*2)check();
    const canvas=document.createElement('canvas');canvas.width=this.canvas.width+pad*2;canvas.height=this.canvas.height+pad*2;reference=canvas.getContext('2d',{willReadFrequently:true});target=this;
   }else if(reference){const t=this.getTransform();reference.setTransform(t.a,t.b,t.c,t.d,t.e+pad,t.f+pad);for(const key of ['globalAlpha','globalCompositeOperation','fillStyle','imageSmoothingEnabled','imageSmoothingQuality'])reference[key]=this[key];original[name].apply(reference,args);}
   return original[name].apply(this,args);
  };
 });
 await page.goto(vite.resolvedUrls.local[0]+'?offline=1&hero=ember-warden&time=0.2&quality=low');
 await page.waitForFunction(()=>window.__WORLD_HERO__?.dataset.mode==='3d-60fps'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=18;u<34;u+=.5){if(c.clear(u,18)&&c.teleport(u,18))break;}c.castSkill('flame-fan');window.__BOUNDS__.outside=window.__BOUNDS__.mismatch=window.__BOUNDS__.frames=0;});
 await page.waitForFunction(()=>window.__BOUNDS__.frames>=12,null,{timeout:30000}).catch(async e=>{console.log(JSON.stringify({errors,state:await page.evaluate(()=>({...window.__BOUNDS__,id:window.__WORLD_HERO__?.id,hero:window.__WORLD_HERO__?.dataset,source:String(CanvasRenderingContext2D.prototype.clearRect).slice(0,100)}))}));throw e;});
 const result=await page.evaluate(()=>({...window.__BOUNDS__,hero:{...window.__WORLD_HERO__.dataset}}));
 console.log(JSON.stringify(result));assert.equal(result.outside,0,'rendered pixels escaped reduced canvas');assert.equal(result.maxAlphaDelta,0,'alpha differs from oversized reference');// Integer translation/backing-store choice produces up to two premultiplied levels
 // even on the unchanged baseline. Alpha and out-of-bounds coverage must stay exact.
 assert.ok(result.maxPremultipliedDelta<=2,JSON.stringify(result));assert.equal(errors.length,0,errors.join('\n'));
 await fs.writeFile(`docs/android-stutter/hero-bounds-${baseline?'before':'after'}.json`,JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();await vite.close();}
