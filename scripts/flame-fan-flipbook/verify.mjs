import {chromium} from 'playwright';import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const live=process.argv.includes('--live'),iframeOnly=process.argv.includes('--iframe'),width=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1]||1440),prefix='/ember-warden-review/flame-fan-flipbook/',mode=live?'live':'local';
const url=(live?'https://ark-whachat.fural.space':'http://127.0.0.1:5189')+prefix;
const server=http.createServer(async(req,res)=>{try{if(req.url==='/iframe'){res.setHeader('content-type','text/html');res.end(`<iframe src="${url}" title="Flame Fan" width="390" height="700"></iframe>`);return;}const rel=decodeURIComponent(req.url.split('?')[0]).replace(prefix,'');const file=path.join('dist-flame-fan-flipbook',rel||'index.html');const bytes=await fs.readFile(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(5189,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.HOME+'/.local/bin/arkadia-chromium',args:['--no-sandbox','--disable-site-isolation-trials']});const context=await browser.newContext({hasTouch:true,viewport:{width:iframeOnly?1000:width,height:width===320?560:width===390?844:900}});const page=await context.newPage(),errors=[],failed=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
try{
 if(iframeOnly){
  await page.goto('http://localhost:5189/iframe',{waitUntil:'domcontentloaded'});let frame;for(let i=0;i<30&&!frame;i++){frame=page.frames().find(f=>f.url().startsWith(url));if(!frame)await page.waitForTimeout(100);}
  assert.ok(frame,'cross-origin iframe exists');await frame.waitForFunction(()=>window.__FLIPBOOK_FAN__,null,{polling:100});const reports=[];
  for(const w of [390,900]){await page.locator('iframe').evaluate((e,w)=>e.width=String(w),w);const before=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);await page.waitForTimeout(250);const after=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);assert.notEqual(after,before);reports.push({width:w,before,after,animated:true});}
  await fs.writeFile(`docs/flame-fan-flipbook/verification-${mode}-iframe-range-v3.json`,JSON.stringify({url,pass:true,reports,errors,failed},null,2));console.log('PASS iframe',reports);
 }else{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__FLIPBOOK_FAN__,null,{polling:100});
  const api=()=>page.evaluate(()=>window.__FLIPBOOK_FAN__.state());const seek=t=>page.evaluate(t=>window.__FLIPBOOK_FAN__.seek(t),t);
  await seek(.32);const state=await api();assert.equal(state.geometry.reachScale,2/3);
  for(const target of state.geometry.targets)assert.ok(Math.abs((target.current[0]-171)/(target.old[0]-171)-2/3)<1e-10);
  for(const [i,layer] of state.geometry.layers.entries()){assert.equal(layer.scaleX,i===0?1:2/3);if(i!==0)assert.ok(Math.abs((layer.currentForwardEdge-171)-(layer.oldForwardEdge-171)*2/3)<1e-8);}
  assert.equal(state.frames,16);assert.equal(state.targets,3);assert.equal(state.actors,4);assert.equal(state.nixieEmitters,5);assert.equal(await page.locator('button,input,select').count(),0);assert.equal(await page.locator('canvas').count(),1);
  for(const c of state.controls){assert.ok(c.x>0&&c.x<width&&c.y>0&&c.y<(width===320?560:width===390?844:900),'control in viewport: '+c.label);}
  await page.screenshot({path:`docs/flame-fan-flipbook/${mode}-${width}-range-v3.png`});
  async function click(label){const c=(await api()).controls.find(c=>c.label===label);assert.ok(c,label);await page.mouse.click(c.x,c.y);}
  await click('Play');assert.equal((await api()).paused,false);await click('Pause');assert.equal((await api()).paused,true);await click('Loop: On');assert.equal((await api()).loop,false);await click('Speed: 1×');assert.equal((await api()).speed,.5);await click('Day');assert.equal((await api()).day,false);await click('Night');
  await click('Reference: '+(state.compare?'On':'Off'));await seek(.32);assert.equal((await api()).compare,!state.compare);await page.screenshot({path:`docs/flame-fan-flipbook/${mode}-${width}-alternate-range-v3.png`});await click('Reference: '+(!state.compare?'On':'Off'));
  await seek(.02);const early=await api();await seek(.2);const peak=await api();assert.notEqual(early.handFrame,peak.handFrame);
  const isolated=[];for(let i=0;i<8;i++){await click(`${i+1} ${state.layers[i].name}`);await seek(i===7?.60:.32);const s=await api();assert.equal(s.layers.filter(l=>l.visible).length,1);assert.equal(s.solo,i);assert.ok(s.layers[i].children>0);if(width===1440)await page.screenshot({path:`docs/flame-fan-flipbook/${mode}-1440-layer-${i}-range-v3.png`});isolated.push({layer:i,visible:s.layers[i].visible,children:s.layers[i].children});}
  await click('All layers');await seek(.42);const a=await api();await seek(.60);const b=await api();await seek(.87);const c=await api();
  assert.ok(a.particleDetails.embers.length>0);assert.ok(b.particleDetails.smoke.length>0);
  const smokeEmitter=b.particleDefinitions[1].emitters[0];assert.equal(smokeEmitter.advanced.noise.mode,'curl');assert.equal(smokeEmitter.render.blend,'alpha');assert.ok(smokeEmitter.color.gradient.colorStops.every(s=>s.color[0]<.3&&s.color[1]<.3));
  const smokeA=a.particleDetails.smoke[0],smokeB=b.particleDetails.smoke[0];console.log('Particle samples',JSON.stringify({a:smokeA,b:smokeB,c:c.particleDetails.smoke[0]}));assert.notDeepEqual(smokeA,smokeB);assert.ok(smokeB.y<smokeA.y,'smoke rises');assert.ok(smokeB.width>smokeA.width,'smoke expands');assert.ok(c.particleDetails.smoke[0].alpha<smokeB.alpha,'smoke fades');assert.equal(b.particleDetails.sheet.length,3);assert.ok(b.particleDefinitions[2].emitters.every(e=>e.modules.textureSheetAnimation&&e.advanced.textureSheetAnimation.tiles[0]===4));
  for(const t of width===1440?[.04,.15,.32,.60]:[.32]){await seek(t);await page.screenshot({path:`docs/flame-fan-flipbook/${mode}-${width}-phase-${Math.round(t*1000)}-range-v3.png`});}
  await click('Replay');assert.equal((await api()).paused,false);
  assert.equal(errors.length,0,errors.join('\n'));assert.equal(failed.length,0,failed.join('\n'));
  const report={url,pass:true,viewport:{width,height:width===320?560:width===390?844:900},state,isolated,particles:{at420:a.particleDetails,at600:b.particleDetails,at870:c.particleDetails},errors,failed};
  await fs.writeFile(`docs/flame-fan-flipbook/verification-${mode}-${width}-range-v3.json`,JSON.stringify(report,null,2));await fs.writeFile('docs/flame-fan-flipbook/particle-definitions-range-v3.json',JSON.stringify(b.particleDefinitions,null,2));console.log('PASS',mode,width);
 }
}finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
