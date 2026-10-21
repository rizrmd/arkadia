import {chromium} from 'playwright';import {spawn} from 'node:child_process';
// Print (one per line) the dist/ files the Stronghold actually loads, so a release stages those and not the
// 370 MB of documentation renders in public/. Serves dist/ with the built server/bin/arkadia, opens the game in
// co-op and offline, walks the hero out through the gate, and records every same-origin file fetched.
const server=spawn('server/bin/arkadia',[],{env:{...process.env,PORT:'8793',SITE_DIR:'dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
// Single-process Chromium survives only one context, so each visit gets its own browser.
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const files=new Set(['index.html']);let browser=null;
try{
 for(const path of ['/?time=0.5','/?offline=1&time=0.9']){
  await browser?.close();browser=await launch();
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  page.on('response',r=>{const u=new URL(r.url());if(u.host==='127.0.0.1:8793'&&r.status()===200&&!u.pathname.startsWith('/api/')&&u.pathname!=='/ws')files.add(u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1)));});
  await page.goto('http://127.0.0.1:8793'+path);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
  await page.keyboard.down('KeyS');await page.waitForTimeout(6000);await page.keyboard.up('KeyS');await page.waitForTimeout(1500);
  await page.context().close();
 }
}finally{await browser?.close();server.kill();}
if(files.size<20)throw Error('Only '+files.size+' files loaded');
console.log([...files].sort().join('\n'));
