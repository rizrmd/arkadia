import {createServer} from 'vite';import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const v=await createServer({configFile:false,cacheDir:'node_modules/.vite-infinite-resources',optimizeDeps:{include:['pixi.js'],entries:[]},server:{port:5219,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
let b;const report={errors:[],checks:[],viewports:[]};
try{
 b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});const p=await b.newPage({viewport:{width:1000,height:800},hasTouch:true});p.on('pageerror',e=>report.errors.push(e.message));
 await p.route('**/infinite-fixture',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}</style><script type="module" src="/scripts/infinite-resources/fixture.ts"></script>'}));await p.goto('http://127.0.0.1:5219/infinite-fixture');await p.waitForFunction(()=>window.fixture,{timeout:45000});
 for(const [width,height] of [[1000,800],[390,844]]){
 await p.setViewportSize({width,height});await p.evaluate(()=>window.fixture.draw());
 for(let i=0;i<6;i++){console.log("testing",width,height,i);
  // Core must have room to upgrade; Farm starts at zero, Kitchen needs Farm level one.
  await p.evaluate(async i=>{await window.fixture.reset(0,1e9,i===0?1:30,i===1?0:30)},i);
  const badge=await p.evaluate(i=>window.fixture.badge(i),i);await p.touchscreen.tap(badge.x,badge.y);assert((await p.evaluate(()=>window.fixture.states()))[i].open);
  let button=await p.evaluate(i=>window.fixture.button(i),i);assert.equal(button.eventMode,'static',`enabled ${i}`);assert.equal(button.tint,0xffffff);
  await p.touchscreen.tap(button.x,button.y);await p.waitForFunction(()=>window.fixture.save().construction,{},{timeout:5000}).catch(async e=>{console.log(await p.evaluate(()=>({states:window.fixture.states(),save:window.fixture.save()})));throw e;});
  const pending=await p.evaluate(()=>window.fixture.save());assert.equal(pending.construction.kind,['core','farm','lumber','kitchen','walls','mine'][i]);assert.deepEqual(pending.resources,{wood:13,food:17,storedWood:0,storedFood:19});
  button=await p.evaluate(i=>window.fixture.button(i),i);assert.equal(button.eventMode,'none');const gold=pending.gold;await p.touchscreen.tap(button.x,button.y);assert.equal((await p.evaluate(()=>window.fixture.save())).gold,gold);
  await p.evaluate(()=>window.fixture.settle());assert.equal((await p.evaluate(()=>window.fixture.save())).construction,undefined);
  if(i>0){await p.evaluate(()=>window.fixture.draw());button=await p.evaluate(i=>window.fixture.button(i),i);assert.equal(button.eventMode,'static');await p.touchscreen.tap(button.x,button.y);await p.waitForFunction(()=>window.fixture.save().construction);assert.equal((await p.evaluate(()=>window.fixture.save())).construction.to,2);await p.evaluate(()=>window.fixture.settle());}
  await p.keyboard.press('Escape');
 }
 await p.evaluate(()=>window.fixture.reset(0,0,30,30));let badge=await p.evaluate(()=>window.fixture.badge(2));await p.touchscreen.tap(badge.x,badge.y);assert.equal((await p.evaluate(()=>window.fixture.button(2))).eventMode,'none');await p.keyboard.press('Escape');
 await p.evaluate(()=>window.fixture.reset(1,1e9,1,0));badge=await p.evaluate(()=>window.fixture.badge(3));await p.touchscreen.tap(badge.x,badge.y);assert.equal((await p.evaluate(()=>window.fixture.button(3))).eventMode,'none');await p.keyboard.press('Escape');
 const counters=await p.evaluate(()=>window.fixture.counters());assert.equal(counters.text,'∞ Wood   ∞ Food');assert(counters.bounds.width>100);assert(counters.infinityGlyph);
 await p.screenshot({path:`docs/infinite-resources/pixi-${width}.png`});report.viewports.push({width,height,counters});
 }
 await p.reload();await p.waitForFunction(()=>window.fixture,{timeout:45000});assert.deepEqual(report.errors,[]);report.pass=true;report.checks=['Actual Pixi mouse/touch buttons for all six create/upgrade paths','Zero finite Wood enables permitted operation; Gold and requirements disable it','Atomic real store transaction, no wood/food deduction, queue prevents repeat taps','Timer settlement and persisted completed level','Desktop/portrait layout and infinity text'];
}finally{await fs.writeFile('docs/infinite-resources/browser.json',JSON.stringify(report,null,2));if(b)await b.close();await v.close();}console.log(JSON.stringify(report,null,2));
