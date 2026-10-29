import {createServer} from 'vite';import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const v=await createServer({configFile:false,cacheDir:'node_modules/.vite-building-interactions',optimizeDeps:{include:['pixi.js'],entries:[]},server:{port:5207,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});const report={errors:[],checks:[],panels:[]};
try{
 const p=await b.newPage({viewport:{width:1000,height:800},deviceScaleFactor:2,hasTouch:true});p.on('pageerror',e=>report.errors.push(e.message));await p.route('**/interaction-fixture',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}</style><script type="module" src="/scripts/building-interactions/fixture.ts"></script>'}));await p.goto('http://127.0.0.1:5207/interaction-fixture');await p.waitForFunction(()=>window.fixture,{timeout:45000});
 const badges=()=>p.evaluate(()=>window.fixture.badges());
 const names=['core','farm','lumber','kitchen','walls','mine'];
 const padding=async(i,viewport)=>{
  const parts=await p.evaluate(i=>window.fixture.layout(i),i),s=parts.scale;
  assert(parts.title.top-parts.origin.y>=45*s,`title inset ${i}`);
  assert(parts.portrait.top-parts.origin.y>=45*s,`portrait inset ${i}`);
  assert(parts.title.bottom+4*s<=parts.level.top,`title/level spacing ${i}: ${JSON.stringify(parts)}`);
  assert(parts.level.bottom+6*s<=parts.divider.top,`level/divider spacing ${i}`);
  assert(parts.portrait.bottom+6*s<=parts.divider.top,`portrait/divider spacing ${i}`);
  report.checks.push(`${viewport} ${names[i]} header clearances`);
  await p.screenshot({path:`docs/building-interactions/padding-${names[i]}-${viewport}.png`});
  const close=await p.evaluate(i=>window.fixture.control(i,'close'),i);await p.mouse.click(close.x,close.y);assert(!(await p.evaluate(()=>window.fixture.states()))[i].open);
  const badge=(await badges())[i];await p.mouse.click(badge.x,badge.y);assert((await p.evaluate(()=>window.fixture.states()))[i].open);
  if(i>0){const next=await p.evaluate(i=>window.fixture.control(i,'Next target level'),i);await p.mouse.click(next.x,next.y);assert.equal((await p.evaluate(()=>window.fixture.states()))[i].previewTarget,3);const reset=await p.evaluate(i=>window.fixture.control(i,'Show current operation'),i);await p.mouse.click(reset.x,reset.y);assert.equal((await p.evaluate(()=>window.fixture.states()))[i].previewTarget,null,`reset ${i} ${viewport}`);}
 };
 for(let i=0;i<6;i++){
  const badge=(await badges())[i];assert(badge.visible&&badge.enabled);await p.mouse.click(badge.x,badge.y);
  assert((await p.evaluate(()=>window.fixture.states())).find((s,j)=>j===i).open,`physical badge ${i}: ${JSON.stringify(await p.evaluate(()=>({states:window.fixture.states(),badges:window.fixture.badges()})))}`);
  assert((await badges()).every(b=>!b.visible&&!b.enabled));
  const panel=await p.evaluate(i=>window.fixture.panel(i),i);assert.equal(panel.scale,.75);await padding(i,'desktop');
  const button=await p.evaluate(i=>window.fixture.button(i),i);assert.equal(button.eventMode,'none');assert.equal(button.tint,0x999999);
  await p.mouse.click(button.x,button.y);assert((await p.evaluate(()=>window.fixture.states()))[i].open);
  await p.keyboard.press('Escape');assert((await badges()).every(b=>b.visible&&b.enabled));
  await p.mouse.click(badge.x,badge.y);const before=await p.evaluate(()=>window.fixture.worldActions());await p.mouse.click(980,780);assert.equal(await p.evaluate(()=>window.fixture.worldActions()),before);assert((await badges()).every(b=>b.visible&&b.enabled));
  report.panels.push({i,panel,button});
 }
 // Threshold boundaries in the original metric; previous threshold was 240.
 for(const [distance,near] of [[159,true],[160,true],[161,false],[239,false]]){await p.evaluate(d=>window.fixture.set({pos:{x:577+d,y:320}}),distance);assert((await p.evaluate(()=>window.fixture.states())).every(s=>s.near===near));}
 await p.evaluate(()=>window.fixture.set({pos:{x:577,y:390},core:30,farm:30,funds:{gold:0,wood:0}}));
 const badge=(await badges())[0];await p.mouse.click(badge.x,badge.y);assert((await p.evaluate(()=>window.fixture.texts(0))).includes('Not Enough Gold'));
 await p.evaluate(()=>window.fixture.set({funds:{gold:1000000,wood:0}}));assert((await p.evaluate(()=>window.fixture.texts(0))).includes('Not Enough Wood (Log)'));
 await p.evaluate(()=>window.fixture.set({funds:{gold:1000000,wood:1000000}}));assert((await p.evaluate(()=>window.fixture.states())).every(s=>s.eligibility.affordable&&s.eligibility.requirementsMet&&!s.eligibility.operationAvailable));
 await p.screenshot({path:'docs/building-interactions/desktop.png'});await p.keyboard.press('Escape');
 await p.evaluate(()=>window.fixture.set({core:1,farm:0}));assert((await p.evaluate(()=>window.fixture.states())).slice(1).every(s=>!s.eligibility.requirementsMet));
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>window.fixture.draw());
 for(let i=0;i<6;i++){
  const badge=(await badges())[i];await p.mouse.click(badge.x,badge.y);assert((await p.evaluate(()=>window.fixture.states()))[i].open);
  const bounds=await p.evaluate(i=>window.fixture.panel(i),i);assert(bounds.x-bounds.width/2>=0&&bounds.x+bounds.width/2<=390&&bounds.y-bounds.height/2>=0&&bounds.y+bounds.height/2<=844);
  assert.equal(bounds.scale,.75*Math.min(1,366/540,754/(i===0||i>=4?478:422)));
  await padding(i,'mobile');
  if(i===0)await p.screenshot({path:'docs/building-interactions/mobile.png'});
  const before=await p.evaluate(()=>window.fixture.worldActions());await p.mouse.click(380,830);assert.equal(await p.evaluate(()=>window.fixture.worldActions()),before);assert((await badges()).every(b=>b.visible&&b.enabled));
 }
 const touchBadge=(await badges())[0];await p.touchscreen.tap(touchBadge.x,touchBadge.y);assert((await p.evaluate(()=>window.fixture.states()))[0].open);const touchBefore=await p.evaluate(()=>window.fixture.worldActions());await p.touchscreen.tap(380,830);assert.equal(await p.evaluate(()=>window.fixture.worldActions()),touchBefore);assert((await badges()).every(b=>b.visible&&b.enabled));
 await p.evaluate(()=>window.fixture.set({online:true}));assert((await badges()).every(b=>!b.visible&&!b.enabled));
 assert.deepEqual(report.errors,[]);report.pass=true;report.checks.push('All six physical Pixi badge/button hit tests','Disabled artwork and noninteractive actions','Escape and outside pointer sequence restore badges without world actions','160 distance inclusive boundary; 161 and former 239 excluded','Live Gold/Wood/prerequisite changes','0.75 previous desktop/mobile fit and proportional hit areas','Co-op suppression','Header clearances, relocated close hit areas and target/reset hit tests across desktop/mobile');
}finally{await fs.writeFile('docs/building-interactions/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}console.log(report);
