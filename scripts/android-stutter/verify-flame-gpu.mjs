import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';
const vite=await createServer({cacheDir:`/tmp/flame-gpu-${process.pid}`,server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/flame-gpu-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Flame GPU parity test</title>'}));
 await page.goto(vite.resolvedUrls.local[0]+'flame-gpu-probe');
 const result=await page.evaluate(async()=>{const p=await import('/scripts/android-stutter/flame-gpu-probe.ts');return p.flameGpuProbe();});
 await fs.writeFile('docs/android-stutter/flame-gpu-verification.json',JSON.stringify({result,errors},null,2)+'\n');
 for(const row of [...result.rows,result.clipped]){assert.ok(row.alphaMean<1,JSON.stringify(row));assert.ok(row.colorMean<2,JSON.stringify(row));}
 assert.equal(result.contextsForNative,0);assert.equal(result.steadyTextureUploads,0);assert.equal(result.maxLive,3);assert.equal(result.backend,'pixi-render-texture');assert.equal(result.radius,4.4);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({maxAlphaMean:Math.max(...result.rows.map(x=>x.alphaMean)),maxColorMean:Math.max(...result.rows.map(x=>x.colorMean)),clipped:result.clipped,contextsForNative:result.contextsForNative,steadyTextureUploads:result.steadyTextureUploads,maxLive:result.maxLive,errors}));
}finally{await browser.close();await vite.close();}
