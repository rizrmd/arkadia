import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const v=await createServer({configFile:false,cacheDir:'node_modules/.vite-walls',optimizeDeps:{include:['pixi.js'],entries:[]},server:{port:5199,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
console.log('Walls fixture server ready');const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={errors:[],checks:[]};
try{
 console.log('Chromium launched');const p=await b.newPage({viewport:{width:1000,height:800}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>console.log('BROWSER',m.type(),m.text()));p.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));p.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
 await p.route('**/walls-panel-test*',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/scripts/walls-panels/fixture.ts"></script></body></html>'}));
 await p.goto('http://127.0.0.1:5199/walls-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 const click=async name=>{const q=await p.evaluate(n=>window.fixture.point(n),name);await p.mouse.click(q.x,q.y);};
 assert((await p.evaluate(()=>window.fixture.snapshot())).near);
 await click('badge');assert((await p.evaluate(()=>window.fixture.snapshot())).open);report.checks.push('actual pointer tap opens native Pixi panel');assert((await p.evaluate(()=>window.fixture.badges())).every(b=>!b.visible&&!b.enabled));await p.evaluate(()=>window.fixture.openPeer());assert((await p.evaluate(()=>window.fixture.peerStates())).every(s=>!s.open));report.checks.push('Walls open hides and disables Core/Farm/Lumber/Kitchen/Mine badges and ignores blocked events');await click('Next target level');assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe.level,2);await click('Previous target level');assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe.level,1);await click('Show current operation');assert.equal((await p.evaluate(()=>window.fixture.snapshot())).previewTarget,null);report.checks.push('Pixi previous/next target preview and current-operation reset');
 if(!process.argv.includes('--skip-captures'))await p.screenshot({path:'docs/walls-panels/pixi-desktop.png',timeout:15000});
 await p.keyboard.press('Escape');assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));await click('badge');await click('Close Walls panel');assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));await p.evaluate(()=>window.fixture.openPeer());assert((await p.evaluate(()=>window.fixture.peerStates()))[1].open);assert(!(await p.evaluate(()=>window.fixture.snapshot())).interaction.badgeEnabled);await p.keyboard.press('Escape');report.checks.push('Close and Escape restore badges; Core opening also suppresses Walls');
 await p.evaluate(()=>window.fixture.move(577,500));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.evaluate(()=>window.fixture.move(577,420));await click('badge');assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.online(true));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);report.checks.push('leave range closes panel; Escape closes; co-op hides interaction');
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5199/walls-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 // Use the actual Pixi hit area to validate pointer interaction and clamped bounds.
 await click('badge');assert((await p.evaluate(()=>window.fixture.snapshot())).open);const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844);if(!process.argv.includes('--skip-captures'))await p.screenshot({path:'docs/walls-panels/pixi-mobile.png',timeout:15000});report.mobileBounds=bounds;
 report.checks.push('mobile panel fits viewport');
 await p.setViewportSize({width:1000,height:800});await p.evaluate(()=>window.fixture.set(30));assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe,null);report.checks.push('level 30 maximum tier');
 for(let level=0;level<30;level++){
  await p.evaluate(l=>window.fixture.set(l),level);if(!(await p.evaluate(()=>window.fixture.snapshot())).open)await p.evaluate(()=>window.fixture.open());const state=await p.evaluate(()=>window.fixture.snapshot());
  assert.equal(state.recipe.level,level+1);assert.equal(state.requirements.length,1);assert(state.requirements[0].satisfied);const texts=await p.evaluate(()=>window.fixture.texts());assert(texts.includes(`Stronghold Core level ${level+1}`));assert(texts.includes(Math.ceil(25*1.25**level).toLocaleString('en-US')));assert(texts.includes(Math.ceil(30*1.25**level).toLocaleString('en-US')));assert(texts.includes(Math.ceil(1.2**level).toLocaleString('en-US')+' min'));assert.deepEqual(await p.evaluate(()=>window.fixture.alignment()),[190,231,305.5]);
  if(!process.argv.includes('--skip-captures'))await p.screenshot({path:'docs/walls-panels/target-'+String(level+1).padStart(2,'0')+'.png',timeout:15000});
 }
 await p.evaluate(()=>window.fixture.set(29,29));
 assert.equal((await p.evaluate(()=>window.fixture.snapshot())).requirements[0].satisfied,false);
 report.checks.push('all 30 target panels rendered; target Core threshold rejects one level below');
 await p.evaluate(()=>window.fixture.destroyWalls());assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));report.checks.push('destroying an open Walls panel restores external badges');assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile('docs/walls-panels/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}
console.log(report);
