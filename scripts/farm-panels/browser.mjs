import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const v=await createServer({configFile:false,cacheDir:'node_modules/.vite-farm',optimizeDeps:{include:['pixi.js'],entries:[]},server:{port:5198,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
console.log('Farm fixture server ready');const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={errors:[],checks:[]};
try{
 console.log('Chromium launched');const p=await b.newPage({viewport:{width:1000,height:800}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>console.log('BROWSER',m.type(),m.text()));p.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));p.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
 await p.route('**/farm-panel-test*',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/scripts/farm-panels/fixture.ts"></script></body></html>'}));
 await p.goto('http://127.0.0.1:5198/farm-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 assert((await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.mouse.click(500,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);report.checks.push('actual pointer tap opens native Pixi panel');await p.mouse.click(450,403);assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe.level,2);await p.mouse.click(277,403);assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe.level,1);await p.mouse.click(375,430);assert.equal((await p.evaluate(()=>window.fixture.snapshot())).previewTarget,null);report.checks.push('Pixi previous/next target preview and current-operation reset');
 await p.screenshot({path:'docs/farm-panels/pixi-desktop.png',timeout:15000});
 await p.keyboard.press('Escape');assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.move(577,500));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.evaluate(()=>window.fixture.move(577,420));await p.mouse.click(500,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.online(true));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);report.checks.push('leave range closes panel; Escape closes; co-op hides interaction');
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5198/farm-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 // Anchor is outside this fixture camera on mobile; use Pixi event dispatch to open, then verify clamped rendered bounds.
 await p.mouse.click(195,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=390);await p.screenshot({path:'docs/farm-panels/pixi-mobile.png',timeout:15000});report.mobileBounds=bounds;
 report.checks.push('mobile panel fits viewport');
 await p.setViewportSize({width:1000,height:800});await p.evaluate(()=>window.fixture.set(30));assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe,null);report.checks.push('level 30 maximum tier');
 for(let level=0;level<30;level++){
  await p.evaluate(l=>window.fixture.set(l),level);if(!(await p.evaluate(()=>window.fixture.snapshot())).open)await p.evaluate(()=>window.fixture.open());const state=await p.evaluate(()=>window.fixture.snapshot());
  assert.equal(state.recipe.level,level+1);assert.equal(state.requirements.length,1);assert(state.requirements[0].satisfied);
  await p.screenshot({path:'docs/farm-panels/target-'+String(level+1).padStart(2,'0')+'.png',timeout:15000});
 }
 await p.evaluate(()=>window.fixture.set(29,29));
 assert.equal((await p.evaluate(()=>window.fixture.snapshot())).requirements[0].satisfied,false);
 report.checks.push('all 30 target panels rendered; target Core threshold rejects one level below');
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile('docs/farm-panels/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}
console.log(report);
