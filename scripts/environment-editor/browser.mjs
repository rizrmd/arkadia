import {launchOptions} from '../typography/browser.mjs';
import {chromium} from 'playwright';import {createServer} from 'vite';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const dir=await fs.mkdtemp('/home/dev/releases/editor-test-');const server=spawn('/home/dev/releases/environment-editor-test',[],{env:{...process.env,PORT:'8893',SITE_DIR:dir,GAME_SAVE_DIR:dir},stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
const vite=await createServer({configFile:false,server:{port:5193,host:'127.0.0.1',proxy:{'/api':'http://127.0.0.1:8893'}}});await vite.listen();
const browser=await chromium.launch(launchOptions());const errors=[];const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto('http://127.0.0.1:5193/public/environment-editor/index.html');await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__?.().notice==='Published map loaded',{timeout:60000});
 await page.waitForTimeout(1500);
 console.log('loaded',await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__()));
 await page.screenshot({timeout:60000,path:'docs/environment-editor/desktop-initial.png'});
 // Native access field; no DOM form controls.
 const key=(await fs.readFile(dir+'/environment/editor-key','utf8')).trim();await page.waitForTimeout(120);await page.mouse.click(220,122);await page.waitForTimeout(120);await page.mouse.click(100,202);await page.waitForTimeout(120);await page.keyboard.type(key);await page.keyboard.press('Enter');await page.waitForTimeout(200);
 // Small pond from palette. Move camera by actual map drag onto empty ground.
 await page.waitForTimeout(120);await page.mouse.click(45,122);await page.mouse.move(1100,600);await page.mouse.down();await page.mouse.move(450,180,{steps:10});await page.mouse.up();
 await page.waitForTimeout(120);await page.mouse.click(100,174);await page.waitForTimeout(120);await page.mouse.click(980,600);await page.waitForTimeout(800);
 let state=await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__());console.log('placed',state);assert.equal(state.map.objects.length,1);
 await page.keyboard.press('Control+d');await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__())).map.objects.length,2);
 await page.keyboard.press('Control+z');assert.equal((await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__())).map.objects.length,1);await page.keyboard.press('Control+Shift+z');assert.equal((await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__())).map.objects.length,2);
 await page.waitForTimeout(120);await page.mouse.click(980,600);await page.keyboard.press('Delete');assert.equal((await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__())).map.objects.length,1);
 console.log('pre-save',await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__()));await page.waitForTimeout(120);await page.mouse.click(450,68);await page.waitForTimeout(300);console.log('after-save',await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__()));await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice.includes('Draft saved'));state=await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__());assert.equal(state.dirty,false);
 await page.waitForTimeout(120);await page.mouse.click(542,68);console.log('confirming publish');await page.waitForTimeout(120);await page.mouse.click(470,480);await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__().notice.startsWith('Published.'));const published=await page.request.get('http://127.0.0.1:8893/api/environment/published');assert.equal((await published.json()).objects.length,1);
 await page.screenshot({timeout:60000,path:'docs/environment-editor/desktop-published.png'});
 await page.reload();await page.waitForFunction(()=>window.__ENVIRONMENT_EDITOR__?.().notice==='Published map loaded');assert.equal((await page.evaluate(()=>window.__ENVIRONMENT_EDITOR__())).map.objects.length,1);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({timeout:60000,path:'docs/environment-editor/mobile.png'});
 console.log('errors',errors);assert.deepEqual(errors,[]);await fs.writeFile('docs/environment-editor/browser.json',JSON.stringify({ok:true,operations:['access','pan','place','duplicate','undo','redo','delete','save','publish','reload','mobile-layout'],errors},null,2));
}finally{await browser.close();await vite.close();server.kill();console.log(logs.slice(-1000));}
