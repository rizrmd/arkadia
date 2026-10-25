import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
// Exercise the real Pixi transform, hero cutout coordinates and camera culling together.
// Checking just the catalog's baseline misses a renderer that ignores its calibration.
const server=await createServer({server:{host:'127.0.0.1',port:5469,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage();
 await page.route('**/arch-validation',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Arch validation</title>'}));
 await page.goto('http://127.0.0.1:5469/arch-validation');
 const result=await page.evaluate(async()=>{
  const {Container}=await import('/node_modules/.vite/deps/pixi__js.js');
  const {createFrontier}=await import('/src/stronghold/frontier-view.ts');
  const root=new Container(),frontier=createFrontier(root);frontier.load();await frontier.ready;
  const start=performance.now();while(frontier.stats().occlusionImages!==frontier.stats().sprites){if(performance.now()-start>15000)throw Error('Occlusion images failed to load');await new Promise(r=>setTimeout(r,30));}
  const arches=frontier.scene.filter(s=>/^arch-/.test(s.frontier.asset));
  return {stats:frontier.stats(),arches:arches.map(s=>{
   const p=s.frontier,index=frontier.scene.indexOf(s),sprite=root.children[1].children[index];
   sprite.updateLocalTransform();
   const corners=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>{
    const gpu=sprite.localTransform.apply({x:(u-p.pivot[0])*p.frame[2],y:(v-p.pivot[1])*p.frame[3]});
    const x=(p.flip?1-u:u)*p.width-p.width/2,y=v*p.height-s.foot*p.height;
    return Math.hypot(gpu.x-(s.x+x),gpu.y-(s.y+s.shear*x+s.vertical*y));
   });
   // Put just the topmost corner inside a short camera viewport. The calibrated
   // arch must remain visible even when its untransformed rectangle is outside it.
   const gpuTop=Math.min(...[[0,0],[1,0]].map(([u,v])=>sprite.localTransform.apply({x:(u-p.pivot[0])*p.frame[2],y:(v-p.pivot[1])*p.frame[3]}).y));
   frontier.place(200-p.x,96-gpuTop,1,400,100);
   return {asset:p.asset,flip:p.flip,shear:p.shear,maxCutoutError:Math.max(...corners),topEdgeVisible:sprite.visible};
  })};
 });
 assert.ok(result.stats.loaded&&!result.stats.failed,'Atlas must load');
 assert.deepEqual(new Set(result.arches.map(a=>a.asset)),new Set(['arch-ne','arch-se']));
 for(const a of result.arches){assert.ok(Math.abs(a.shear)>.1,`${a.asset}: correction reaches renderer`);assert.ok(a.maxCutoutError<.001,`${a.asset}: hero mask and drawn arch agree`);assert.ok(a.topEdgeVisible,`${a.asset}: corrected arch is not culled`);}
 await fs.mkdir('docs/arch-alignment',{recursive:true});
 await fs.writeFile('docs/arch-alignment/rendering-check.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({ok:true,arches:result.arches}));
}finally{await browser.close();await server.close();}
