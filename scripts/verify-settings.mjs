import {chromium} from 'playwright';
import {createServer} from 'vite';
import {settingsTestServer} from './settings-test-server.mjs';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL,tag=process.env.FIXTURE?'fixture':remote?'live':'local',port=5587;
const server=remote?null:process.env.BUILD_DIR?await settingsTestServer(port,process.env.BUILD_DIR):await createServer({...(process.env.FIXTURE?{configFile:false}:{}),server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null},logLevel:'error'});if(!process.env.BUILD_DIR)await server?.listen();
const opts=launchOptions();if(process.env.MULTIPROCESS)opts.args=opts.args.filter(x=>x!=='--single-process');
const browser=await chromium.launch(opts);const report={base:remote||`http://127.0.0.1:${port}`,views:{},errors:[],consoleErrors:[],renderer:process.env.DEFAULT_RENDERER?'default':'2d',deployedSha:process.env.DEPLOYED_SHA||null};
await fs.mkdir('docs/settings',{recursive:true});
try{
for(const [name,width,height,mobile] of [['desktop',1440,900,false],['mobile',390,844,true],['landscape',844,390,true]]){
 if(process.env.ONLY&&process.env.ONLY!==name)continue;
 console.log('START',name);
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url());});page.on('pageerror',e=>{report.errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'){report.consoleErrors.push(m.text());console.log('CONSOLE',m.text());}});
 await page.addInitScript(()=>{if(!localStorage.getItem('settings-test-seeded')){localStorage.setItem('settings-test-seeded','yes');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30,music:70,soundEffects:80,showFps:true,screenShake:true}));localStorage.setItem('unrelated-settings-test','keep');localStorage.setItem('arkodia-stronghold-v1',JSON.stringify({version:1,at:Date.now(),revision:42,gold:1234,mana:222,souls:99,storedGold:60,storedMana:4,levels:{mine:2,altar:2,barracks:2,forge:2,mage:2,expedition:2,gate:2},hero:true,training:2,skill:2,weapon:2,affix:1,runId:'isolated-test-run',rewarded:['old-reward'],completedExpeditions:['frostpass-01'],built:['expedition','gate'],inventory:{'health-potion':8,'stronghold-scroll':6}}));localStorage.setItem('arkodia.hero','rift-runner');localStorage.setItem('arkodia-snow-expedition-v1','isolated-checkpoint');localStorage.setItem('arkodia-expedition-v1','isolated-world');}});
 await page.goto(report.base+(process.env.FIXTURE?'/scripts/settings-fixture.html':'/?offline=1&hero=rift-runner&time=.45'+(process.env.DEFAULT_RENDERER?'':'&3d=0')),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen')&&window.__SETTINGS__,null,{timeout:300000,polling:500});
 await fs.writeFile(`docs/settings/${tag}-${name}-checkpoint.txt`,'game ready');
 console.log('READY',name);
 console.log('GEAR',await page.locator('.settings-gear').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),style:el.getAttribute('style')})));
 const click=async locator=>{await locator.evaluate(el=>el.scrollIntoView({block:'nearest'}));const b=await locator.boundingBox();assert(b&&b.width>0&&b.height>0);if(mobile)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 await click(page.locator('.settings-gear'));console.log('GEAR CLICK SENT');
 const menu=page.getByRole('dialog',{name:'Settings',exact:true});await menu.waitFor();report.views[name]={checks:['game-ready','menu-open']};
 assert(await menu.isVisible());console.log('MENU OPEN',name);
 if(!process.env.FIXTURE){const frozen=await page.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return {hero:s.hero,foes:s.foes,run:s.run};});await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return {hero:s.hero,foes:s.foes,run:s.run};}),frozen,'solo simulation is frozen while Settings is open');report.views[name].checks.push('solo-paused');}
 if(!mobile){await page.locator('#settings-music').focus();await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>window.__SETTINGS__.snapshot().music),0);await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>window.__SETTINGS__.snapshot().music),1);await page.keyboard.press('End');assert.equal(await page.evaluate(()=>window.__SETTINGS__.snapshot().music),100);}

 await click(page.getByRole('button',{name:'Low',exact:true}));await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.quality==='low');
 await click(page.getByRole('button',{name:'30',exact:true}));await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.targetFps==='30');
 await page.locator('#settings-music').evaluate(el=>{el.value='23';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#settings-soundEffects').evaluate(el=>{el.value='41';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await click(page.getByRole('switch',{name:'Show FPS'}));await click(page.getByRole('switch',{name:'Screen Shake'}));
 if(!process.env.FIXTURE)assert.equal(await page.evaluate(()=>window.__PIXI_UI__.hud.trTelemetryFpsText.visible),false,'actual HUD FPS is hidden');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia.settings.v1')));assert.equal(saved.music,23);assert.equal(saved.soundEffects,41);assert.equal(saved.showFps,false);assert.equal(saved.screenShake,false);
 const audio=await page.evaluate(()=>window.__SETTINGS__.audio());assert.equal(audio.state,'running');
 console.log('CONTROLS PASS',name);report.views[name].checks.push('controls-real-rendering-and-audio');
 const before=await page.evaluate(()=>localStorage.getItem('arkodia-stronghold-v1'));
 await click(menu.getByRole('button',{name:'Reset Progression',exact:true}));const dialog=page.getByRole('alertdialog');await dialog.waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('arkodia-stronghold-v1')),before);
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Cancel');
 if(process.env.SHOTS!=='0')await page.screenshot({path:`docs/settings/${tag}-${name}-confirmation.png`,timeout:60000});console.log('CONFIRMATION SHOT',name);
 await click(dialog.getByRole('button',{name:'Cancel',exact:true}));assert.equal(await page.evaluate(()=>localStorage.getItem('arkodia-snow-expedition-v1')),'isolated-checkpoint');
 await click(menu.getByRole('button',{name:'Reset Progression',exact:true}));await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 await click(menu.getByRole('button',{name:'Reset Progression',exact:true}));await page.locator('.settings-overlay').last().click({position:{x:2,y:2},force:true});assert.equal(await dialog.count(),0);
 if(process.env.SHOTS!=='0')await page.screenshot({path:`docs/settings/${tag}-${name}-menu.png`,timeout:60000});console.log('CANCELLATIONS PASS',name);report.views[name].checks.push('reset-cancel-escape-backdrop-preserve');
 const box=await menu.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
 if(mobile){assert.equal(await menu.getByText('Progression',{exact:true}).isVisible(),false);assert.equal(await menu.getByText('Requires confirmation.',{exact:true}).isVisible(),false);}
 if(!mobile){await menu.locator('.settings-close').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Resume Game');}
 await click(menu.getByRole('button',{name:'Resume Game'}));console.log('RELOADING',name);await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen')&&window.__SETTINGS__,null,{timeout:300000,polling:500});assert.deepEqual(await page.evaluate(()=>window.__SETTINGS__.snapshot()),saved);
 await click(page.locator('.settings-gear'));console.log('GEAR CLICK SENT');await click(page.getByRole('button',{name:'High',exact:true}));await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.quality==='high');await click(page.getByRole('button',{name:'60',exact:true}));await page.waitForFunction(()=>document.querySelector('#world-canvas').dataset.targetFps==='60');await click(page.getByRole('button',{name:'Auto',exact:true}));await click(page.getByRole('button',{name:'Low',exact:true}));await click(page.getByRole('button',{name:'30',exact:true}));
 await click(page.getByRole('dialog').getByRole('button',{name:'Reset Progression',exact:true}));await Promise.all([page.waitForEvent('domcontentloaded',{timeout:120000}),click(page.getByRole('alertdialog').getByRole('button',{name:'Reset Progression',exact:true}))]);await page.waitForFunction(()=>localStorage.getItem('arkodia-snow-expedition-v1')===null&&document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen')&&window.__SETTINGS__,null,{timeout:300000,polling:500});
 assert.equal(await page.evaluate(()=>localStorage.getItem('arkodia-expedition-v1')),null);const resetSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.equal(resetSave.gold,600);assert.equal(resetSave.training,0);assert.equal(resetSave.skill,0);assert.equal(resetSave.weapon,0);assert.equal(resetSave.hero,false);assert.deepEqual(resetSave.inventory,{'health-potion':5,'stronghold-scroll':2});assert.deepEqual(resetSave.rewarded,[]);assert.deepEqual(resetSave.completedExpeditions??[],[]);assert(Object.values(resetSave.levels).every(n=>n===1));assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-settings-test')),'keep');assert.equal(await page.evaluate(()=>localStorage.getItem('arkodia.hero')),'rift-runner');assert(await page.evaluate(()=>localStorage.getItem('arkodia.settings.v1')));
 console.log('RESET AND RELOAD PASS',name);report.views[name]={...report.views[name],viewport:[width,height],saved,audio,confirmation:'Cancel, Escape, backdrop preserve; second confirmation resets allowlist',bounds:box};await context.close();
}
assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);console.log(JSON.stringify(report,null,2));
}catch(error){report.failure=String(error);console.log('FAILURE STATE',await Promise.race([Promise.resolve([...browser.contexts()].length),Promise.resolve('unknown')]));throw error;}finally{await fs.writeFile(`docs/settings/${tag}${process.env.ONLY?'-'+process.env.ONLY:''}-results.json`,JSON.stringify(report,null,2));await browser.close();await server?.close();}
