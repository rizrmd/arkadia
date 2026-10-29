import {createServer} from 'vite';import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const vite=await createServer({server:{host:'127.0.0.1',port:5636,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();
const browser=await chromium.launch(launchOptions()),page=await browser.newPage({viewport:{width:1200,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/direction-gallery',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0"><script type="module" src="/scripts/wildlife-directions/gallery-entry.js"></script>'}));
 await page.goto('http://127.0.0.1:5636/direction-gallery');await page.waitForFunction(()=>window.galleryReady,null,{timeout:30000});
 for(let i=0;i<4;i++){await page.evaluate(i=>window.setFrame(i),i);await page.screenshot({path:`docs/wildlife-directions/pixi-frame-${i}.png`});}
 assert.deepEqual(errors,[]);await fs.writeFile('docs/wildlife-directions/gallery.json',JSON.stringify({passed:true,frames:4,directions:8,species:2,errors},null,2));console.log('PASS real Pixi rendering of all 64 direction/gait frames without errors');
}finally{await browser.close();await vite.close();}
