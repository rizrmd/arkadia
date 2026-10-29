import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';

const vite=await createServer({cacheDir:`/tmp/gate-preparation-${process.pid}`,server:{host:'127.0.0.1',port:18149,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/gate-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Gate preparation test</title>'}));
 await page.goto('http://127.0.0.1:18149/gate-probe');
 const result=await page.evaluate(async()=>{
  const {createGateDoors}=await import('/src/stronghold/gate-doors.ts');
  const meta=await (await fetch('/modular-stronghold/v2/full-gateway-v7-sheet.json')).json();
  const load=async(url)=>{const img=new Image();img.src=url;await img.decode();return img;};
  const [image,sheet]=await Promise.all([load('/modular-stronghold/v2/full-gateway-v7-closed.webp'),load('/modular-stronghold/v2/'+meta.image)]);
  const original=window.createImageBitmap;let release;
  window.createImageBitmap=(...args)=>new Promise(resolve=>{release=async()=>resolve(await original(...args));});
  const updates=[];
  const make=(onShadowFrame)=>createGateDoors({addChild(){}},image,sheet,meta,()=>{},{raster:1.5,revision:()=>0,torches:()=>false,onShadowFrame,shade:(src,dst)=>{const c=dst.getContext('2d');c.globalCompositeOperation='copy';c.drawImage(src,0,0);c.globalCompositeOperation='source-over';}});
  const until=async(test)=>{for(let i=0;i<400&&!test();i++)await new Promise(r=>setTimeout(r,10));if(!test())throw Error('Gate state timeout');};
  const gate=make((source,index)=>updates.push(index));gate.setOpen(true);
  await until(()=>gate.canvas.dataset.state==='open');
  const before=updates.length;
  await release();await until(()=>gate.canvas.dataset.sheetState==='ready');
  const after=updates.length;
  window.createImageBitmap=async()=>{throw Error('Forced unsupported bitmap resize');};
  const fallback=make(()=>{});await until(()=>fallback.canvas.dataset.sheetState==='ready');
  fallback.setOpen(true);await until(()=>fallback.canvas.dataset.state==='open');
  window.createImageBitmap=original;
  const a=gate.canvas.getContext('2d').getImageData(0,0,gate.canvas.width,gate.canvas.height).data;
  const b=fallback.canvas.getContext('2d').getImageData(0,0,fallback.canvas.width,fallback.canvas.height).data;
  let error=0;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);
  return {shadowUpdatesBeforeReady:before,shadowUpdatesAfterReady:after,lastShadowFrame:updates.at(-1),fallbackState:fallback.canvas.dataset.state,meanFallbackError:error/a.length};
 });
 assert.equal(result.shadowUpdatesAfterReady,result.shadowUpdatesBeforeReady+1,'late sheet completion must refresh shadow even at the same final frame');
 assert.equal(result.lastShadowFrame,15);assert.equal(result.fallbackState,'open');assert.ok(result.meanFallbackError<1,JSON.stringify(result));assert.deepEqual(errors,[]);
 await fs.writeFile('docs/android-stutter/gate-preparation-verification.json',JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify({result,errors}));
}finally{await browser.close();await vite.close();}
