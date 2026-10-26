import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.VERIFY_URL||'http://127.0.0.1:3097';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3097',SITE_DIR:'dist'},stdio:'ignore'});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Hold individual interface and font resources for different durations, including a late font.
 let asset=0;
 await page.route(/\/typography\/v2\/(hud\/.*\.png|fonts\/.*)/,async route=>{
  await new Promise(r=>setTimeout(r,route.request().url().endsWith('.fnt')?1700:200+(asset++%8)*250));
  await route.continue();
 });
 await page.addInitScript(()=>{
  window.__interfaceSamples=[];
  const timer=setInterval(()=>{
   const screen=document.querySelector('#loading-screen');
   if(!screen){clearInterval(timer);return;}
   window.__interfaceSamples.push({t:performance.now(),percent:Number(screen.getAttribute('aria-valuenow')),label:screen.querySelector('.loading-label')?.textContent,state:screen.dataset.state});
  },50);
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 const samples=await page.evaluate(()=>window.__interfaceSamples);
 const ui=samples.filter(s=>s.label?.startsWith('Loading interface ·'));
 assert.ok(new Set(ui.map(s=>s.percent)).size>=3,'interface progress must advance while resources are pending');
 assert.ok(ui.some(s=>{const count=s.label.match(/(\d+)\/(\d+)$/);return count&&Number(count[1])===Number(count[2])&&Number(count[2])>=3;}),'all interface and font resources reported ready');
 assert.ok(ui.some(s=>/Loading interface · \d+\/\d+/.test(s.label)),'interface count visible');
 assert.ok(samples.every((s,i)=>!i||s.percent>=samples[i-1].percent),'progress never decreases');
 const artwork=samples.filter(s=>s.label?.startsWith('Loading artwork'));
 assert.ok(artwork.length&&artwork[0].percent>=32,'artwork starts after interface range');
 assert.deepEqual(errors,[]);
 const result={url:base,interfacePercentages:[...new Set(ui.map(s=>s.percent))],interfaceLabels:[...new Set(ui.map(s=>s.label))],artworkStart:artwork[0].percent,errors,ready:true};
 await fs.mkdir('docs/interface-loading',{recursive:true});
 await fs.writeFile(process.env.REPORT||'docs/interface-loading/verification.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();server?.kill();}
