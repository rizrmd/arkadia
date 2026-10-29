import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const vite=await createServer({server:{host:'127.0.0.1',port:5897,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();let browser;
try{
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:393,height:830},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__WORLD_LOADING__=[];new MutationObserver(()=>{const text=document.querySelector('#loading-label')?.textContent;const list=window.__WORLD_LOADING__;if(text?.startsWith('Drawing the world · ')&&list.at(-1)!==text)list.push(text);}).observe(document,{subtree:true,childList:true,characterData:true});});
 await page.route('**/api/environment/published*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schema:1,revision:0,name:'Loading fixture',objects:[]})}));
 await page.goto('http://127.0.0.1:5897/?offline=1&hero=rift-runner&quality=low');
 await page.waitForFunction(()=>window.__WORLD_LOADING__?.some(t=>{const m=t.match(/(\d+)\/(\d+)/);return m&&m[1]===m[2];}),null,{timeout:120000});
 const labels=await page.evaluate(()=>window.__WORLD_LOADING__);
 const counts=labels.map(t=>t.match(/(\d+)\/(\d+)/).slice(1).map(Number));
 assert.equal(counts[0][0],0);assert.ok(counts.length>2);assert.equal(counts.at(-1)[0],counts[0][1]);
 counts.forEach(([done,total],i)=>{assert.equal(total,counts[0][1]);assert.equal(done,i);});
 assert.deepEqual(errors,[]);
 const report={viewport:'393x830',labels,errors};await fs.writeFile('docs/loading-world/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser?.close();await vite.close();}
