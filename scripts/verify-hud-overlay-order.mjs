import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL;
const server=remote?null:await createServer({server:{host:'127.0.0.1',port:5598,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await server?.listen();
const browser=await chromium.launch(launchOptions());
const report=[];
const page=await browser.newPage();
try{
 for(const [width,height] of [[390,844],[1440,900]]){
  await page.setViewportSize({width,height});
  await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','rift-runner');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30}));});
  await page.goto((remote||'http://127.0.0.1:5598')+'/?offline=1&hero=rift-runner&3d=0&time=.45');
  await page.waitForFunction(()=>window.__PIXI_UI__&&window.__STRONGHOLD_COMBAT__&&!document.querySelector('#loading-screen'),null,{timeout:300000});
  const result=await page.evaluate(async()=>{
   const ui=window.__PIXI_UI__,map=window.__WORLD_MAP__.map,stage=map.parent;
   const buttons=stage.children.filter(c=>['Open Inventory','Open Settings'].includes(c.label));
   const tree=window.__STRONGHOLD_COMBAT__.skillTree.tree;
   await tree.show();stage.sortChildren();
   const actions=buttons.map(b=>({label:b.label,z:b.zIndex,index:stage.children.indexOf(b),treeIndex:stage.children.indexOf(tree.panel),mapIndex:stage.children.indexOf(map),clockZ:40}));
   tree.open(false);
   window.__WORLD_MAP__.open(true);ui.app.render();
   ui.app.renderer.events.rootBoundary.rootTarget=ui.app.stage;
   const hits=buttons.map(b=>{const p=b.toGlobal({x:23,y:23});const hit=ui.app.renderer.events.rootBoundary.hitTest(p.x,p.y);let node=hit;while(node&&node!==b&&node!==map)node=node.parent;return {label:b.label,coveredByMap:node===map,hit:hit?.label};});
   window.__WORLD_MAP__.open(false);
   return {actions,hits};
  });
  assert.equal(result.actions.length,2);
  for(const b of result.actions){assert(b.z<b.clockZ);assert(b.index<b.treeIndex);assert(b.index<b.mapIndex);}
  for(const hit of result.hits)assert(hit.coveredByMap,JSON.stringify(hit));
  report.push({width,height,...result});console.log('PASS',width,height,JSON.stringify(result));

 }
 await fs.writeFile(`docs/hud-overlay-order/${remote?'live':'local'}-results.json`,JSON.stringify(report,null,2));
}finally{await browser.close();await server?.close();}
