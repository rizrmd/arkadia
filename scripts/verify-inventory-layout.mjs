// Isolated browser component check; gameplay use and reload are tested in verify-inventory.mjs.
import {createServer} from 'vite';import {chromium} from 'playwright';import {launchOptions} from './typography/browser.mjs';import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5592,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch(launchOptions());try{
 const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});
 await page.route('**/inventory-check',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#273338"><script type="module">import {createInventory} from '/src/stronghold/inventory.ts';window.menu=createInventory({solo:true,canOpen:()=>true,bounds:()=>({x:innerWidth-150,y:80,width:130,height:100}),reason:()=>'',apply:()=>({undo(){}})});menu.open();</script></body></html>`}));
 await page.goto('http://127.0.0.1:5592/inventory-check');await page.getByRole('dialog').waitFor();
 for(const [width,height] of [[1440,900],[390,844],[844,390],[667,375],[320,568]]){
  await page.setViewportSize({width,height});const panel=await page.getByRole('dialog').boundingBox(),use=await page.getByRole('button',{name:'Use',exact:true}).boundingBox();
  assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);assert(use.y>=0&&use.y+use.height<=height,JSON.stringify({width,height,use}));
  const sizes=await page.locator('button.inventory-slot').evaluateAll(es=>es.map(e=>[e.clientWidth,e.clientHeight]));for(const [w,h] of sizes)assert(w>=44&&h>=44);console.log('PASS layout',width,height,{panel,use});
 }
}finally{await browser.close();await server.close();}
