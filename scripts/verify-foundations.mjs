import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3081',out='public/foundation-transitions';
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3081'}});
let browser;
try{
 await fs.mkdir(out,{recursive:true});
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Preview server exited: '+code)));});
 const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const results=[];
 for(const [name,width,height] of [['desktop',1536,1024],['mobile',390,844],['wide',2560,1080]]){
  browser=await launch();const page=await browser.newPage({viewport:{width,height}}),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  await page.goto(base+'/stronghold.html?time=.5');
  await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.foundations==='soil-moss-v1');
  await page.waitForTimeout(300);await page.screenshot({path:`${out}/${name}.png`});
  console.log(name,'ready');
  const pixels=await page.locator('#world-surface').evaluate(c=>c.toDataURL());
  await page.reload();await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.foundations==='soil-moss-v1');
  assert.equal(await page.locator('#world-surface').evaluate(c=>c.toDataURL()),pixels,'foundation placement must be deterministic after reload');
  const before=await page.locator('#world-surface').getAttribute('data-paints');
  await page.mouse.move(width*.55,height*.6);await page.mouse.down();await page.mouse.move(width*.55+90,height*.6+45,{steps:12});await page.mouse.up();
  await page.mouse.wheel(0,-180);await page.waitForTimeout(150);
  assert.equal(await page.locator('#world-surface').getAttribute('data-paints'),before,'pan/zoom must not rebake foundation details');
  await page.screenshot({path:`${out}/${name}-detail.png`});
  if(name==='desktop'){await page.reload();await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.foundations);const paints=Number(await page.locator('#world-surface').getAttribute('data-paints'));const scale=Math.max(.65,Math.min(1.35,height/900));await page.mouse.click(width/2+(600-577.5)*scale,height/2+(200-385)*scale);await page.waitForTimeout(200);assert.ok(Number(await page.locator('#world-surface').getAttribute('data-paints'))>paints,'building click updates scene');}
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  results.push({name,width,height,errors,failedResources:failures,panRebakes:0,deterministicReload:true});await browser.close();browser=null;
 }
 await fs.writeFile(`${out}/verification.json`,JSON.stringify({base,passed:true,results},null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
