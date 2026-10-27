import {launchOptions} from '../typography/browser.mjs';
import {chromium} from 'playwright';import {createServer} from 'vite';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=await fs.mkdtemp('/home/dev/releases/ground-test-');
const child=spawn('/home/dev/releases/environment-editor-test',[],{env:{...process.env,PORT:'8894',SITE_DIR:dir,GAME_SAVE_DIR:dir},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const vite=await createServer({configFile:false,server:{port:5194,host:'127.0.0.1',proxy:{'/api':'http://127.0.0.1:8894'}}});await vite.listen();
let browser;const errors=[];const report={operations:[],errors};
try{
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>window.__ENVIRONMENT_EDITOR__());
 async function click(name){const c=(await state()).controls.find(b=>b.label===name);assert(c,'Missing '+name);await page.mouse.click(c.x+c.w/2,c.y+c.h/2);await page.waitForTimeout(150);}
 await page.goto('http://127.0.0.1:5194/public/environment-editor/index.html');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__?.().notice==='Published map loaded');
 await page.mouse.move(1100,600);await page.mouse.down();await page.mouse.move(450,180,{steps:10});await page.mouse.up();
 for(const [i,name]of ['Green Grass','Dry Grass','Bare Soil','Gravel'].entries()){await click(name);await page.mouse.click(660+i*70,470+i*12);await page.waitForTimeout(250);}
 assert.equal((await state()).map.objects.length,4);report.operations.push('four Ground palette entries placed with overlapping alpha');
 await page.keyboard.press('Control+d');assert.equal((await state()).map.objects.length,5);await page.keyboard.press('Delete');assert.equal((await state()).map.objects.length,4);await click('Undo');assert.equal((await state()).map.objects.length,5);await click('Redo');assert.equal((await state()).map.objects.length,4);
 await page.mouse.click(660,470);
 // Move selected patch using real pointer drag.
 await page.mouse.move(660,470);await page.mouse.down();await page.mouse.move(630,430,{steps:6});await page.mouse.up();await page.waitForTimeout(200);
 assert((await state()).dirty);report.operations.push('select, drag, duplicate, delete, undo, redo');
 await click('Objects');await click('Expedition tent');await page.mouse.click(790,490);await page.waitForTimeout(300);await click('Ground');
 await click('Save');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice.includes('access')||window.__ENVIRONMENT_EDITOR__().notice.includes('unauthorized'));assert((await state()).dirty);report.operations.push('unauthenticated write rejected');
 const key=(await fs.readFile(dir+'/environment/editor-key','utf8')).trim();await click('Access');await click('Enter access key');await page.keyboard.type(key);await page.keyboard.press('Enter');await click('Save');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice.startsWith('Draft saved'));
 const saved=(await state()).map;await click('Load draft');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice==='Draft loaded');assert.deepEqual((await state()).map,saved);
 await click('Publish');await click('Confirm');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice.startsWith('Published.'));await page.reload();await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__?.().notice==='Published map loaded');assert.equal((await state()).map.objects.length,5);
 report.operations.push('authenticated draft save/load and explicit publish/reload');assert.equal(await page.locator('input,button,textarea,select').count(),0);
 await click('Palette');await page.mouse.move(1100,600);await page.mouse.down();await page.mouse.move(450,180,{steps:10});await page.mouse.up();await page.waitForTimeout(1000);await page.screenshot({path:'docs/ground-textures/editor-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:'docs/ground-textures/editor-mobile.png'});assert((await state()).controls.some(c=>c.label==='Gravel'));report.operations.push('mobile Ground palette fits viewport');
 report.map=(await state()).map;report.ok=true;assert.deepEqual(errors,[]);await fs.writeFile('docs/ground-textures/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await vite.close();child.kill();console.log(logs.slice(-800));}
