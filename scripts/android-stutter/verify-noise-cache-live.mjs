import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {launch} from '../vfx/browser.mjs';
const browser=await launch();try{
 const page=await browser.newPage({viewport:{width:394,height:734}}),errors=[],payloads=[],responses=[];let cacheProof=null;
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/chunk-DDYEJ3XB-'))responses.push(r.text().then(code=>{cacheProof={url:r.url(),boundedCache:code.includes('8192')&&code.includes('new Float64Array')&&code.includes('new Int32Array')};}));});
 await page.route('**/api/tracelogs',async r=>{if(r.request().method()!=='POST')return r.continue();payloads.push(r.request().postDataJSON());await r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"noise-cache-smoke"}'});});await page.routeWebSocket('**/*',()=>{});
 await page.goto(`${process.env.GAME||'https://ark-whachat.fural.space'}/?offline=1&hero=ember-warden&time=0.5&quality=low`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setMaxHp(100000);if(!c.teleport(18,18))throw Error('Combat teleport failed');c.spawnAoE({kind:'flame-cone',skill:'flame-fan',duration:0});});
 await page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);await window.__FPS_TRACELOG__.captureNow();});await Promise.all(responses);
 const entry=payloads.at(-1),details=[...new Set(entry?.frames?.flatMap(f=>Object.keys(f.details||{}))||[])],snapshot=await page.evaluate(()=>({fx:window.__STRONGHOLD_COMBAT__.snapshot().vfx.fx,build:[...document.scripts].map(s=>s.src).find(s=>s.includes('/assets/index-'))}));
 assert.ok(cacheProof?.boundedCache,'Production cache code missing');for(const key of ['flameFanFrame','fxUpdate','fxEngine','fxOcclusion'])assert.ok(details.includes(key),`Missing ${key}`);assert.equal(errors.length,0,errors.join('\n'));assert.equal(snapshot.fx.failed,'');
 const report={checkedAt:new Date().toISOString(),cacheProof,details,snapshot,errors,syntheticPostsIntercepted:payloads.length};await fs.writeFile('docs/android-stutter/noise-cache-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
