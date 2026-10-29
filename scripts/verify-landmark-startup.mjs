import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const atlas=JSON.parse(readFileSync('src/world/maps/frozen-frontier-sprites.json','utf8')).atlas;
const url=process.env.VERIFY_URL||'http://127.0.0.1:3097';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3097',SITE_DIR:process.env.SITE_DIR||'dist'}});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const scenario of [{width:1440,height:900,saved:true},{width:390,height:844,saved:false},{width:390,height:844,saved:true,fail:true}]){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height}});
  if(scenario.saved)await context.addInitScript(()=>localStorage.setItem('arkodia.hero','rift-runner'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let release,requested;const held=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
  await page.route('**'+atlas,async route=>{requested();await held;if(scenario.fail)await route.fulfill({status:503,body:'Test failure'});else await route.continue();});
  await page.goto(url+'/?offline=1');
  await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('Atlas never requested')),60000))]);
  await page.waitForTimeout(1500);
  assert.ok(await page.evaluate(()=>{const el=document.querySelector('#loading-screen');return el&&el.dataset.state!=='done';}),'loading must cover the world while landmark download is held');
  assert.equal(await page.evaluate(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'),false,'world must not be ready without landmarks');
  release();
  if(scenario.fail){
   await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.state==='error',null,{timeout:60000});
   assert.equal(await page.evaluate(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'),false);
  }else{
   await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.state==='done'||!document.querySelector('#loading-screen'),null,{timeout:120000});
   const stats=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());
   assert.ok(stats.loaded&&!stats.failed,'landmark sprites must be ready at the reveal');
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({scenario,loaded:stats.loaded,visible:stats.visible}));
  }
  console.log('PASS',JSON.stringify(scenario));await context.close();
 }
}finally{await browser?.close();server?.kill();}
