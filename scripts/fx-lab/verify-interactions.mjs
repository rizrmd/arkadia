import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:5188';
const out=process.env.OUT_DIR||'docs/fx-lab/interaction';await fs.mkdir(out,{recursive:true});
const server=process.env.BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188'],{stdio:'ignore'});
if(server)await new Promise(r=>setTimeout(r,2200));
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>window.__FX_LAB__.state());
const bounds=name=>page.evaluate(n=>window.__FX_LAB__.controlBounds(n),name);
async function click(name){const b=await bounds(name);assert.ok(b,'Missing control '+name);await page.mouse.click(b.cx,b.cy);}
try{
 await page.goto(base+'/fx-lab/?loop=0&quality=low');await page.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:120000});
 let before=await state();await page.keyboard.down('d');await page.waitForFunction(p=>{const s=window.__FX_LAB__.state();return Math.hypot(s.position.u-p.u,s.position.v-p.v)>.2;},before.position,{timeout:10000});await page.keyboard.up('d');let after=await state();assert.ok(Math.hypot(after.position.u-before.position.u,after.position.v-before.position.v)>.15);checks.push('WASD changes hero world position');
 before=after;await page.waitForTimeout(250);after=await state();assert.ok(Math.hypot(after.position.u-before.position.u,after.position.v-before.position.v)<.02);checks.push('Releasing movement key stops travel');
 await page.keyboard.down('w');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));before=await state();await page.waitForTimeout(200);await page.keyboard.up('w');after=await state();assert.ok(Math.hypot(after.position.u-before.position.u,after.position.v-before.position.v)<.02);checks.push('Blur releases held movement keys');
 before=await state();await page.mouse.move(450,450);await page.mouse.wheel(0,-200);await page.waitForTimeout(150);after=await state();assert.ok(after.zoom>before.zoom);checks.push('Wheel zooms scene');
 const handle=await bounds('sidebar-resize');before=after;await page.mouse.move(handle.cx,400);await page.mouse.down();await page.mouse.move(handle.cx-110,400,{steps:8});await page.mouse.up();after=await state();assert.ok(after.sidebar.width>before.sidebar.width+80);await page.waitForTimeout(300);checks.push('Sidebar resizes by dragging left edge');
 await click('skill-dropdown');await click('skill-cinder-step');await page.waitForFunction(()=>window.__FX_LAB__.state().combat.lastSkill==='cinder-step'&&window.__FX_LAB__.state().playback==='playing');assert.equal((await state()).paused,false);checks.push('Actual dropdown click immediately casts selected active');
 await click('pause');assert.equal((await state()).paused,true);await click('skill-dropdown');await click('skill-ember-snare');await page.waitForFunction(()=>window.__FX_LAB__.state().combat.lastSkill==='ember-snare'&&!window.__FX_LAB__.state().paused);checks.push('Selecting a skill resumes paused preview');
 await click('skill-dropdown');await click('skill-second-wind');assert.equal((await state()).playback,'passive');checks.push('Passive selection explains no cast animation');
 // Force a genuinely cold hero/model so loading feedback must precede playback.
 await page.route('**/assets/characters/3d/rift-runner.glb*',async route=>{await new Promise(r=>setTimeout(r,900));await route.continue();});
 await click('hero-rift');await page.waitForFunction(()=>window.__FX_LAB__.state().playback==='loading');await page.screenshot({path:out+'/loading.png'});await page.waitForFunction(()=>window.__FX_LAB__.state().hero==='rift-runner'&&window.__FX_LAB__.state().playback==='playing',null,{timeout:90000});checks.push('Cold hero switch visibly loads then automatically plays');
 await click('skill-dropdown');await click('skill-rift-dash');await page.waitForFunction(()=>window.__FX_LAB__.state().combat.lastSkill==='rift-dash');checks.push('Rift Dash plays from actual dropdown click');
 await click('full-tree');await page.waitForFunction(()=>!!window.__FX_LAB__.controlBounds('skill-node-rift-trap'),null,{timeout:60000});await page.waitForTimeout(200);await click('skill-node-rift-trap');await page.waitForFunction(()=>window.__FX_LAB__.state().skill==='rift-trap'&&window.__FX_LAB__.state().playback==='playing');checks.push('Clicking full tree node closes tree and plays its preview');
 await page.screenshot({path:out+'/desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__FX_LAB__.controlBounds('sidebar-close')?.cx<innerWidth);await click('sidebar-close');await page.waitForFunction(()=>window.__FX_LAB__.state().sidebar.collapsed);
 const cdp=await context.newCDPSession(page);before=await state();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:400,id:1},{x:260,y:400,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:400,id:1},{x:300,y:400,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);after=await state();assert.ok(after.zoom>before.zoom*1.3);checks.push('Two-finger pinch zooms mobile scene');
 await page.screenshot({path:out+'/mobile-stage.png'});await page.waitForTimeout(300);await click('sidebar-open');await page.screenshot({path:out+'/mobile-sidebar.png'});
 assert.equal(await page.locator('#app button,#app input,#app select').count(),0);assert.equal(errors.length,0,errors.join('\n'));
 const report={pass:true,base,checks,errors,state:await state()};await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,checks,errors}));
}catch(e){const s=await state().catch(()=>null);console.log(JSON.stringify({checks,errors,state:s?{hero:s.hero,skill:s.skill,sidebar:s.sidebar,lastInput:s.lastInput,playback:s.playback}:null}));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();server?.kill();}
