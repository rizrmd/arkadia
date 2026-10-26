import {launch} from '../vfx/browser.mjs';import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const live=process.argv.includes('--live'),mode=live?'live':'local',prefix='/ember-warden-review/flame-fan-flipbook/',url=(live?'https://ark-whachat.fural.space':'http://127.0.0.1:5191')+prefix;
const server=http.createServer(async(req,res)=>{try{if(req.url==='/iframe'){res.setHeader('content-type','text/html');res.end(`<iframe src="${url}" title="Burn Soil" width="390" height="844"></iframe>`);return;}const rel=decodeURIComponent(req.url.split('?')[0]).replace(prefix,'');const file=path.join('dist-flame-fan-flipbook',rel||'index.html');res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(5191,'127.0.0.1',r));
const browser=await launch();const reports=[];const page=await browser.newPage({hasTouch:true});page.setDefaultTimeout(15000);
try{
 for(const [width,height] of [[1440,900],[390,844],[844,390],[320,560]]){
  await page.setViewportSize({width,height});const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__FLIPBOOK_FAN__);
  const state=()=>page.evaluate(()=>window.__FLIPBOOK_FAN__.state());
  for(const level of (width===1440?[1,2,3,4,5]:[1,3,5])){
   await page.evaluate(l=>window.__FLIPBOOK_FAN__.setLevel(l),level);
   for(const offset of (width===1440?[-.001,0,.199,.2,.4,.6,.8,.999,1,1.001]:[0,.2,.999,1])){
    await page.evaluate(t=>window.__FLIPBOOK_FAN__.seek(.22+t),offset);const s=await state();
    assert.equal(s.burnSoil.active,level>=3&&offset>=0&&offset<1);assert.equal(s.burnSoil.ticks,level<3?0:Math.max(0,Math.min(5,Math.floor((offset+1e-10)*5))));assert.equal(s.burnSoil.damagePerTick,null);assert.equal(s.geometry.reachScale,2/3);
   }
  }
  await page.evaluate(()=>{window.__FLIPBOOK_FAN__.setLevel(3);window.__FLIPBOOK_FAN__.seek(.92);});
  const s=await state();for(const c of s.controls)assert(c.x>0&&c.x<width&&c.y>0&&c.y<height,'control '+c.label);
  const levelControl=s.controls.find(c=>c.label==='Level: 3');await page.mouse.click(levelControl.x,levelControl.y);assert.equal((await state()).level,4);
  const tick=(await state()).controls.find(c=>c.label==='Tick +1.0s');await page.mouse.click(tick.x,tick.y);assert.equal((await state()).burnSoil.ticks,5);assert.equal((await state()).burnSoil.active,false);
  await page.evaluate(()=>window.__FLIPBOOK_FAN__.seek(.92));await page.screenshot({path:`docs/burn-soil/${mode}-preview-${width}.png`});
  assert.equal(await page.locator('button,input,select').count(),0);assert.equal(await page.locator('canvas').count(),1);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);reports.push({width,height,pass:true,state:await state(),errors,failed});console.log('PASS preview',mode,width);
 }
 await page.goto('http://localhost:5191/iframe');const frame=page.frames().find(f=>f.url().startsWith(url));assert(frame);await frame.waitForFunction(()=>window.__FLIPBOOK_FAN__);const a=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);await page.waitForTimeout(250);const b=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);assert.notEqual(a,b);
 await fs.writeFile(`docs/burn-soil/${mode}-preview.json`,JSON.stringify({pass:true,url,reports,iframe:{pass:true,before:a,after:b}},null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
