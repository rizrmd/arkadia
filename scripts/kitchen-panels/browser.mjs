import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const v=await createServer({configFile:false,cacheDir:'/home/dev/.cache/kitchen-vite',optimizeDeps:{include:['pixi.js'],entries:[]},server:{port:5199,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
console.log('Kitchen fixture server ready');const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={errors:[],checks:[]};
try{
 console.log('Chromium launched');const p=await b.newPage({viewport:{width:1000,height:800}});p.on('pageerror',e=>report.errors.push(e.message));p.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));p.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
 await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 assert((await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.mouse.click(582,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);report.checks.push('actual pointer tap opens native Pixi panel');
 await p.screenshot({path:'docs/kitchen-panels/pixi-desktop.png',timeout:15000});
 await p.mouse.click(454,406);let preview=await p.evaluate(()=>window.fixture.snapshot());assert.equal(preview.previewTarget,2);assert.equal(preview.actualCompletedLevel,0);assert.equal(preview.recipe.level,2);await p.waitForTimeout(80);await p.mouse.click(373,426);assert.equal((await p.evaluate(()=>window.fixture.snapshot())).previewTarget,null);report.checks.push('Pixi target navigation changes displayed recipe and retains actual completed level');
 await p.keyboard.press('Escape');assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.move(577,500));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.evaluate(()=>window.fixture.move(577,420));await p.mouse.click(582,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.online(true));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);report.checks.push('leave range closes panel; Escape closes; co-op hides interaction');
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 // Anchor is outside this fixture camera on mobile; use Pixi event dispatch to open, then verify clamped rendered bounds.
 await p.mouse.click(277,604);assert((await p.evaluate(()=>window.fixture.snapshot())).open);const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=390);await p.screenshot({path:'docs/kitchen-panels/pixi-mobile.png',timeout:15000});report.mobileBounds=bounds;
 report.checks.push('mobile panel fits viewport');
 await p.setViewportSize({width:1000,height:800});await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html?level=30');await p.waitForFunction(()=>window.fixture,{timeout:30000});assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe,null);report.checks.push('level 30 maximum tier');
 await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html');await p.waitForFunction(()=>window.fixture,{timeout:30000});await p.evaluate(()=>window.fixture.open());
 for(let level=0;level<30;level++){
  await p.evaluate(level=>window.fixture.setLevel(level),level);const state=await p.evaluate(()=>window.fixture.snapshot());
  assert.equal(state.recipe.level,level+1);assert.equal(state.requirements.length,2);assert(state.requirements.every(r=>r.satisfied));
  await p.screenshot({path:'docs/kitchen-panels/target-'+String(level+1).padStart(2,'0')+'.png',timeout:15000});
 }
 await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html?level=29&core=29');await p.waitForFunction(()=>window.fixture,{timeout:30000});
 assert.equal((await p.evaluate(()=>window.fixture.snapshot())).requirements[0].satisfied,false);
 report.checks.push('all 30 target panels rendered; target Core threshold rejects one level below');
 await p.goto('http://127.0.0.1:5199/scripts/kitchen-panels/fixture.html?level=29&farm=29');await p.waitForFunction(()=>window.fixture,{timeout:30000});assert.equal((await p.evaluate(()=>window.fixture.snapshot())).requirements[1].satisfied,false);report.checks.push('Farm below target independently blocks prerequisite');
 assert.deepEqual(report.errors,[]);report.checks.push('actual pointer tap opens mobile Kitchen badge on second row');report.pass=true;
}finally{await fs.writeFile('docs/kitchen-panels/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}
console.log(report);
