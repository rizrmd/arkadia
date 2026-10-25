// Production smoke; intercept synthetic trace posts so real Android evidence remains intact.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {launch} from '../vfx/browser.mjs';
const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:394,height:734}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tracelogs',r=>r.request().method()==='POST'?r.fulfill({status:201,body:'{}'}):r.continue());await page.routeWebSocket('**/*',()=>{});
 await page.addInitScript(()=>{
  window.__SHADOW_TRANSFERS__=[];
  for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of ['texImage2D','texSubImage2D']){
   const original=proto[name];proto[name]=function(...args){const system=window.__PIXI_UI__?.app?.renderer?.texture;const source=system?._boundTextures?.[system._activeTextureLocation];if(source?.label?.startsWith('scene-shadow-'))window.__SHADOW_TRANSFERS__.push({name,label:source.label,bytes:args.at(-1)?.byteLength??0});return original.apply(this,args);};
  }
 });
 await page.goto(`${process.env.GAME||'https://ark-whachat.fural.space'}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__SCENE_SHADOWS__?.stats().ready&&window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 await page.evaluate(()=>{window.__BEFORE_SHADOW_REBUILDS__=window.__SCENE_SHADOWS__.stats().rebuilds;const c=window.__STRONGHOLD_COMBAT__;if(!c.teleport(18,18))throw Error('Combat teleport failed');});
 await page.waitForFunction(()=>window.__SCENE_SHADOWS__.stats().rebuilds>window.__BEFORE_SHADOW_REBUILDS__,null,{timeout:120000});
 const result=await page.evaluate(()=>{const s=window.__SCENE_SHADOWS__;return {build:[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-')),shadows:s.stats(),sources:['uDepth','uSecondDepth','uHeight'].map(k=>{const t=s.filter.resources[k];return {name:k,label:t.label,method:t.uploadMethodId,width:t.pixelWidth,height:t.pixelHeight};}),transfers:window.__SHADOW_TRANSFERS__};});
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(result.shadows.error,'');assert.ok(result.sources.every(s=>s.method==='shadow-rows'));assert.ok(result.transfers.length>3,'No staged transfers captured');assert.ok(result.transfers.every(t=>t.bytes<=65536),'Large scene shadow transfer');
 const report={checkedAt:new Date().toISOString(),result,errors};await fs.writeFile(process.env.OUT||'docs/android-stutter/chunked-upload-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:result.build,sources:result.sources,transfers:result.transfers.length,maxBytes:Math.max(...result.transfers.map(t=>t.bytes)),ready:result.shadows.ready,errors}));
}finally{await browser.close();}
