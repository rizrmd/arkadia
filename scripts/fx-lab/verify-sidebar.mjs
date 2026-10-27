import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:5194',out=process.env.OUT_DIR||'docs/fx-lab/sidebar';await fs.mkdir(out,{recursive:true});
let api,vite,temp,key;
if(!process.env.BASE_URL){temp=await fs.mkdtemp(os.homedir()+'/.tmp/fx-sidebar-');api=spawn(os.homedir()+'/.tmp/arkodia-fx-editor-test',[],{env:{...process.env,PORT:'18994',SITE_DIR:path.resolve('public'),GAME_SAVE_DIR:temp,GOMAXPROCS:'2',GOMEMLIMIT:'256MiB'},stdio:'inherit'});for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:18994/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}key=(await fs.readFile(temp+'/environment/editor-key','utf8')).trim();vite=await createServer({server:{host:'127.0.0.1',port:5194,hmr:false,proxy:{'/api':{target:'http://127.0.0.1:18994'}}},logLevel:'error'});await vite.listen();}
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>window.__FX_LAB__.state()),bounds=name=>page.evaluate(n=>window.__FX_LAB__.controlBounds(n),name);
async function click(name){const b=await bounds(name);assert.ok(b,'Missing '+name);await page.mouse.click(b.cx,b.cy);}
async function idle(){await page.waitForFunction(()=>!window.__FX_LAB__.state().editor.busy&&!window.__FX_LAB__.state().editor.seeking,null,{timeout:90000});}
try{
 await page.goto(base+'/fx-lab/?loop=0&quality=low');await page.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:120000});await idle();
 const hero=await bounds('hero-dropdown'),skill=await bounds('skill-dropdown');assert.equal(hero.y,skill.y);assert.equal(hero.width,skill.width);
 for(const id of ['editor-access','input-import-open','tab-preview','tab-editor'])assert.equal(await bounds(id),null);
 const toolbar=await bounds('editor-solo'),row=await bounds('layer-select-0');assert.ok(toolbar.y<row.y);checks.push('Equal Hero/Skill row; removed lower controls and tabs; layer toolbar above list');
 await page.screenshot({path:out+'/desktop.png'});
 const original=await state();await click('layer-select-1');assert.notEqual((await state()).editor.current.id+':'+(await state()).editor.current.effect,original.editor.current.id+':'+original.editor.current.effect);
 await click('layer-visible-1');await idle();assert.equal((await state()).editor.patch.enabled,false);await click('editor-undo');await idle();assert.notEqual((await state()).editor.patch.enabled,false);await click('editor-redo');await idle();assert.equal((await state()).editor.patch.enabled,false);await click('editor-undo');await idle();checks.push('Layer selection, visibility, undo and redo update actual draft');
 await click('editor-solo');assert.equal((await state()).editor.solo,true);await click('editor-solo');
 await click('editor-pause');assert.equal((await state()).paused,true);await click('editor-pause');await click('editor-speed');assert.equal((await state()).editor.speed,2);await click('editor-speed');
 const timeline=await bounds('editor-timeline');await page.mouse.click(timeline.x+timeline.width*.4,timeline.cy);await idle();assert.ok(Math.abs((await state()).editor.timeline-2)<.1);checks.push('Solo, pause, playback speed and timeline scrub remain functional');
 await click('editor-properties');await click('field-color');await page.keyboard.type('#ee7722');await page.keyboard.press('Enter');await idle();assert.equal((await state()).editor.patch.color,'#ee7722');checks.push('Expandable properties preserve keyboard editing');
 if(key){const unauthorized=await fetch('http://127.0.0.1:18994/api/vfx/save',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify((await state()).editor.draft)});assert.equal(unauthorized.status,401);
 await click('editor-apply');assert.match((await state()).editor.notice,/access key/);await page.keyboard.type(key);await page.keyboard.press('Enter');await click('editor-apply');assert.match((await state()).editor.notice,/Save draft/);
 await click('editor-save');await idle();assert.equal((await state()).editor.dirty,false);assert.equal((await state()).editor.pendingApply,true);await click('editor-apply');await idle();assert.equal((await state()).editor.pendingApply,false);checks.push('Unauthorized writes rejected; existing credential dialog works; Save and Apply remain separate');
 }
 await click('hero-dropdown');await click('hero-rift');await idle();await page.waitForFunction(()=>window.__FX_LAB__.state().hero==='rift-runner'&&window.__FX_LAB__.state().modelReady);await page.waitForFunction(()=>window.__FX_LAB__.state().playback!=='loading');if(await bounds('field-color'))await click('editor-properties');await page.screenshot({path:out+'/rift-desktop.png'});checks.push('Hero selector changes hero and skill catalog');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);if((await state()).sidebar.collapsed)await click('sidebar-open');await page.waitForFunction(()=>window.__FX_LAB__.state().playback!=='loading');await page.screenshot({path:out+'/mobile.png'});
 assert.equal(await page.locator('#app button,#app input,#app select,#app aside').count(),0);assert.deepEqual(errors,[]);checks.push('Mobile renders; game controls are Pixi; no JavaScript errors');
 await fs.writeFile(out+'/verification.json',JSON.stringify({pass:true,base,checks,errors},null,2));console.log(JSON.stringify({pass:true,checks}));
}catch(e){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),checks,errors,state:await state().catch(()=>null)},null,2));throw e;}finally{await browser.close();await vite?.close();api?.kill();}
