import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const live=process.env.VERIFY_URL,server=live?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3071'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.clear());
 await page.goto((live||'http://127.0.0.1:3071')+'/?time=0');
 await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.torchCount==='16',{},{timeout:60000});
 await fs.mkdir('docs/night-torches',{recursive:true});
 const results=[];
 for(const [name,minutes,expected] of [['night',0,'lit'],['before-dawn',225,'lit'],['dawn',240,'off'],['noon',720,'off'],['dusk',1185,'off'],['night-start',1200,'lit'],['next-dawn',240,'off']]){
  await page.locator('.clock-chip').click();
  await page.locator('#clock-slider').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},minutes);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#world-surface').getAttribute('data-torches'),expected,`${name} preview`);
  await page.locator('#clock-slider').dispatchEvent('change');await page.waitForTimeout(650);
  await page.locator('.clock-chip').click();
  const state=await page.locator('#world-surface').getAttribute('data-torches');assert.equal(state,expected,name);results.push({name,minutes,state});
  if(['night','dawn','noon'].includes(name))await page.screenshot({path:`docs/night-torches/${name}.webp`,type:'webp'});
 }
 assert.deepEqual(errors,[]);await fs.writeFile('docs/night-torches/results.json',JSON.stringify({url:live||'local',results,errors},null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
