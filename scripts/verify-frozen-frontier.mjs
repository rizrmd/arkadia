import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('public/frozen-frontier/v1');
const server=http.createServer(async(req,res)=>{try{const file=path.join(root,decodeURIComponent(req.url.split('?')[0])==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+'/'))throw Error();const body=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(body)}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:`${process.env.HOME}/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc`},args:['--no-sandbox','--no-zygote','--single-process']}),page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.__FROZEN_READY__);
 await page.locator('#assembly').screenshot({path:`${root}/assembled-preview.png`});
 await page.locator('#grid').screenshot({path:`${root}/kit-preview.png`});
 const state=await page.evaluate(()=>({images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),cards:document.querySelectorAll('.card').length}));
 await page.locator('#toggle').click();if(await page.locator('#toggle').textContent()!=='Show pivots and grid')throw Error('Toggle failed');
 await page.setViewportSize({width:390,height:844});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile overflow');
 if(errors.length||!state.images||state.cards!==15)throw Error(JSON.stringify({errors,state}));
 const report=JSON.parse(await fs.readFile('docs/frozen-frontier/verification.json'));Object.assign(report,{browser:{...state,errors,mobileOverflow:overflow,pivotToggle:true}});await fs.writeFile('docs/frozen-frontier/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.browser));
}finally{await browser.close();server.close()}
