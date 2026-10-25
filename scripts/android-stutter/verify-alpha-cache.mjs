import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';
const vite=await createServer({cacheDir:`/tmp/alpha-probe-${process.pid}`,server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage();await page.route('**/alpha-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Occlusion cache test</title>'}));
 await page.goto(vite.resolvedUrls.local[0]+'alpha-probe');
 const result=await page.evaluate(async()=>{const p=await import('/scripts/android-stutter/alpha-probe.ts');return p.alphaCacheProbe();});
 assert.equal(result.domReads,0);assert.equal(result.alphaMismatch,0);assert.equal(result.sameMask,true);assert.equal(result.distinctCanvases,true);assert.equal(result.gateInvalidates,true);
 await fs.writeFile('docs/android-stutter/alpha-cache-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();await vite.close();}
