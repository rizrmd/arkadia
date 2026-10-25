import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193'],{stdio:'ignore'});
let browser;
try{
 for(let n=0;n<60;n++){try{if((await fetch('http://127.0.0.1:5193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const desktop=await browser.newContext({viewport:{width:1366,height:900}});
 await desktop.addInitScript(()=>localStorage.setItem('arkodia.hero','rift-runner'));
 const page=await desktop.newPage();
 await page.goto('http://127.0.0.1:5193');
 const visible=()=>page.evaluate(()=>!!window.__PIXI_UI__?.app.stage.children.some(s=>s.children?.some(c=>c.label==='desktop-movement-hint')));
 await page.waitForFunction(()=>window.__PIXI_UI__?.app.stage.children.some(s=>s.children?.some(c=>c.label==='desktop-movement-hint')),{},{timeout:120000});
 assert(await visible(),'desktop first visit shows hint');
 await page.keyboard.down('w');await page.keyboard.up('w');
 await page.waitForTimeout(7500);assert.equal(await visible(),false,'hint disappears');
 await page.reload();await page.waitForFunction(()=>!!window.__PIXI_UI__,{},{timeout:120000});assert.equal(await visible(),false,'return visit does not repeat');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.addInitScript(()=>localStorage.setItem('arkodia.hero','ember-warden'));
 const phone=await mobile.newPage();await phone.goto('http://127.0.0.1:5193');await phone.waitForFunction(()=>!!window.__PIXI_UI__,{},{timeout:120000});
 assert.equal(await phone.evaluate(()=>localStorage.getItem('arkodia.desktop-movement-hint.v1')),null,'mobile does not consume desktop hint');
 console.log('PASS: desktop first entry, key input, timed dismissal, no repeat, mobile exclusion.');
}finally{await browser?.close();server.kill();}
