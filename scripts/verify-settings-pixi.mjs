import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL,tag=remote?'live':'local',dir='docs/settings-pixi';await fs.mkdir(dir,{recursive:true});
const server=remote?null:await createServer({server:{host:'127.0.0.1',port:5599,strictPort:true,hmr:false,watch:null},logLevel:'error'});await server?.listen();
const report={base:remote||'http://127.0.0.1:5599',views:{},errors:[]};
const opts=launchOptions();opts.args=opts.args.filter(a=>a!=='--single-process');const browser=await chromium.launch(opts);
const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});let page=await context.newPage();
const attach=()=>{page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(90000);};attach();
const save=()=>fs.writeFile(`${dir}/${tag}-results.json`,JSON.stringify(report,null,2));
const note=async s=>{console.log(s);await save();};
const ready=()=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen')&&window.__SETTINGS__?.renderer==='pixi',null,{timeout:300000,polling:300});
const snapshot=()=>page.evaluate(()=>window.__SETTINGS__.snapshot());
async function bounds(id){return page.evaluate(id=>{const s=window.__SETTINGS__,find=c=>c.label===id?c:c.children?.map(find).find(Boolean);const c=id==='Open Settings'?s.gear:find(s.overlay);if(!c)throw Error('Missing '+id);const b=c.getBounds(),p=c.toGlobal({x:0,y:0});return c.hitArea?{x:p.x,y:p.y,width:c.hitArea.width,height:c.hitArea.height}:{x:b.x,y:b.y,width:b.width,height:b.height};},id);}
async function reveal(id){for(let i=0;i<5;i++){const b=await bounds(id),s=await snapshot(),top=s.panel.y+68,bottom=s.panel.y+s.panel.height-96;if(['close','resume','cancel','confirm-reset','Open Settings'].includes(id)||b.y>=top-1&&b.y+b.height<=bottom+1)return b;await page.mouse.wheel(0,b.y<top?b.y-top:b.y+b.height-bottom);await page.waitForTimeout(60);}throw Error('Cannot reveal '+id);}
async function click(id,touch=false){const b=await reveal(id);await (touch?page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2):page.mouse.click(b.x+b.width/2,b.y+b.height/2));}
async function screenshot(name){await page.screenshot({path:`${dir}/${tag}-${name}.png`,timeout:90000});}
try{
 await page.addInitScript(()=>{if(!localStorage.getItem('settings-test-seeded')){localStorage.setItem('settings-test-seeded','yes');localStorage.setItem('arkodia.hero','rift-runner');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30,music:0,soundEffects:0,screenShake:true,showFps:true}));localStorage.setItem('settings-unrelated','keep');}});
 await page.goto(report.base+'/?offline=1&hero=rift-runner&time=.45&3d=0',{waitUntil:'domcontentloaded',timeout:180000});await ready();await note('World ready');
 await page.keyboard.press('Escape');assert((await snapshot()).open);assert.equal(await page.locator('.settings-overlay,.settings-panel,input[type=range]').count(),0);
 const hero=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);await page.keyboard.press('w');await page.keyboard.press('1');await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero),hero);
 await page.keyboard.press('i');assert(!(await page.evaluate(()=>window.__INVENTORY__.isOpen())));
 await page.keyboard.press('Tab');assert.equal((await snapshot()).focus,'quality-auto');await page.keyboard.press('Shift+Tab');assert.equal((await snapshot()).focus,'close');
 for(const q of ['high','auto','low']){await click('quality-'+q);assert.equal((await snapshot()).quality,q);}
 for(const fps of [60,30]){await click('fps-'+fps);assert.equal((await snapshot()).frameRate,fps);assert.equal(await page.evaluate(()=>Number(document.querySelector('#world-canvas').dataset.targetFps)),fps);}
 for(const key of ['music','soundEffects']){const b=await reveal('volume-'+key);await page.mouse.move(b.x+5,b.y+22);await page.mouse.down();await page.mouse.move(b.x+b.width*.4,b.y+22,{steps:3});await page.mouse.up();assert(Math.abs((await snapshot())[key]-40)<3);}
 assert(Math.abs((await page.evaluate(()=>window.__SETTINGS__.audio())).soundEffects-.4)<.03);
 await click('showFps');assert.equal((await snapshot()).showFps,false);await click('screenShake');assert.equal((await snapshot()).screenShake,false);
 await click('binding-0');await page.keyboard.press('q');assert.equal((await snapshot()).bindings[0],'KeyQ');assert.equal(await page.evaluate(()=>window.__PIXI_UI__.hud.state.skills[0].hotkey),'Q','HUD updates while paused');
 await click('binding-1');await page.keyboard.press('q');assert.match((await snapshot()).message,/already/);assert.equal((await snapshot()).capture,1);
 await page.keyboard.press('w');assert.match((await snapshot()).message,/Reserved/);await page.keyboard.press('Escape');assert.equal((await snapshot()).capture,-1);assert((await snapshot()).open);
 await click('binding-1');await page.keyboard.press('Control+r');assert.match((await snapshot()).message,/single key/);await page.keyboard.press('e');assert.equal((await snapshot()).bindings[1],'KeyE');
 assert(!(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open)),'capture must not open skill tree');
 await click('resume');await page.keyboard.press('2');assert(!(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open)),'old binding inactive');await page.keyboard.press('e');await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open);await page.keyboard.press('Escape');
 await click('Open Settings');await click('binding-2');await page.evaluate(()=>dispatchEvent(new Event('blur')));assert.equal((await snapshot()).capture,-1);await click('resume');
 const beforeReload=await snapshot();await page.reload({waitUntil:'domcontentloaded',timeout:180000});await ready();assert.deepEqual((await snapshot()).bindings,beforeReload.bindings);assert.equal((await snapshot()).screenShake,false);assert.equal((await snapshot()).showFps,false);
 // Close and reopen a real page with retained origin storage, without re-seeding preferences.
 await page.close();page=await context.newPage();attach();await page.goto(report.base+'/?offline=1&hero=rift-runner&time=.45&3d=0',{waitUntil:'domcontentloaded',timeout:180000});await ready();assert.deepEqual((await snapshot()).bindings,beforeReload.bindings);report.persistence=true;
 for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390],['small-portrait',320,568]]){
  await page.setViewportSize({width,height});await page.waitForFunction(()=>window.__PIXI_UI__.app.screen.width===innerWidth&&window.__PIXI_UI__.app.screen.height===innerHeight);await page.waitForTimeout(1000);await click('Open Settings',true);const s=await snapshot();assert(s.panel.x>=0&&s.panel.y>=0&&s.panel.x+s.panel.width<=width&&s.panel.y+s.panel.height<=height);
  await screenshot(name+'-menu');await click('binding-2',true);await page.keyboard.press('r');assert.equal((await snapshot()).bindings[2],'KeyR');await screenshot(name+'-shortcuts');
  await click('reset-bindings',true);assert.deepEqual((await snapshot()).bindings,['Digit1','Digit2','Digit3']);
  const stored=await page.evaluate(()=>({...localStorage}));
  await click('reset-progression',true);assert((await snapshot()).confirm);assert.equal((await snapshot()).focus,'cancel');await screenshot(name+'-confirmation');
  await page.keyboard.press('Escape');assert(!(await snapshot()).confirm);assert.deepEqual(await page.evaluate(()=>({...localStorage})),stored);
  await click('reset-progression',true);await click('cancel',true);assert(!(await snapshot()).confirm);
  await click('reset-progression',true);await page.touchscreen.tap(2,2);assert(!(await snapshot()).confirm);assert.deepEqual(await page.evaluate(()=>({...localStorage})),stored);
  await click('resume',true);assert(!(await snapshot()).open);if(name==='portrait'||name==='landscape'){const socket=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hudGeometry.sockets[1]);await page.touchscreen.tap(socket.x,socket.y);await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open);await page.keyboard.press('Escape');}report.views[name]={viewport:[width,height],panel:s.panel,resetCancellation:true,touchBindings:true};await note(name+' passed');
 }
 // Confirmed reset only in this isolated test browser. Preserve preferences, bindings and unrelated storage.
 await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>window.__PIXI_UI__.app.screen.width===innerWidth&&window.__PIXI_UI__.app.screen.height===innerHeight);await page.waitForTimeout(1000);await click('Open Settings');await click('binding-0');await page.keyboard.press('q');
 const preserved=await page.evaluate(()=>({settings:localStorage.getItem('arkodia.settings.v1'),bindings:localStorage.getItem('arkodia.skill-bindings.v1')}));await click('reset-progression');await Promise.all([page.waitForEvent('domcontentloaded',{timeout:90000}),click('confirm-reset')]);await ready();
 assert.deepEqual(await page.evaluate(()=>({settings:localStorage.getItem('arkodia.settings.v1'),bindings:localStorage.getItem('arkodia.skill-bindings.v1')})),preserved);assert.equal(await page.evaluate(()=>localStorage.getItem('settings-unrelated')),'keep');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).gold),600);
 report.resetConfirmed=true;assert.deepEqual(report.errors,[]);report.passed=true;await note('PASS Pixi Settings, controls, input isolation, persistence, responsive touch and reset safety');
}catch(e){report.failure={message:e.message,state:await snapshot().catch(()=>null)};await screenshot('failure').catch(()=>{});throw e;}finally{await save();await browser.close();await server?.close();}
