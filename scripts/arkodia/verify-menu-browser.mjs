import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 for(const path of ['/dev','/rift-dash/player/']){
  const errors=[],failed=[];const onError=e=>errors.push(e.message),onResponse=r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});};page.on('pageerror',onError);page.on('response',onResponse);
  const response=await page.goto('https://arkodia.online'+path,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForSelector('canvas',{timeout:60000});await page.waitForTimeout(2500);
  results.push({path,status:response.status(),state:await page.evaluate(()=>({title:document.title,canvases:document.querySelectorAll('canvas').length,entries:window.__ARKADIA_DEV__?.entries?.map(e=>({label:e.label,path:e.path}))})),errors,failed});
  page.off('pageerror',onError);page.off('response',onResponse);
 }
}finally{await browser.close();}
const pass=results.every(r=>r.status===200&&r.state.canvases>0&&r.errors.length===0&&r.failed.length===0);
await fs.writeFile('docs/dev-menu-availability/browser-verification.json',JSON.stringify({pass,results},null,2)+'\n');console.log(JSON.stringify({pass,results},null,2));if(!pass)process.exitCode=1;
