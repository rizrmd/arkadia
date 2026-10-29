import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire('/home/dev/kitchen-tools/package.json');const {chromium}=require('playwright');
const root=path.resolve('public/buildings/mine/painted'),manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));
let server;let base=process.env.MINE_PAINTED_URL;
if(!base){server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://local').pathname);if(name.endsWith('/'))name+='index.html';let file=path.join(root,name);let b=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html':'image/png');res.end(b);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const viewer=process.env.MINE_VIEWER_URL||base+'/index.html';
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let errors=[];let levels=[];let resources=[];let page;
try{
 page=await browser.newPage({viewport:{width:1100,height:950},extraHTTPHeaders:{Accept:'image/png'}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('Browser:',m.text());});page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
 await page.goto(viewer+'?level=1',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.__mineReview?.ready,{timeout:60000});
 for(let level=1;level<=30;level++){
  const got=await page.evaluate(()=>window.__mineReview),row=manifest.levels[level-1];if(got.level!==level||got.milestone!==row.milestone||got.decals!==row.incrementalRepairPairs)throw Error('Level mismatch '+JSON.stringify(got));levels.push(got);
  if(level<30){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.mouse.click(195,906);await page.waitForFunction(want=>window.__mineReview?.level===want,level+1);}
 }
 await page.screenshot({path:root+'/pixi-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.goto(viewer+'?level=15',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__mineReview?.ready);await page.screenshot({path:root+'/pixi-mobile.png'});
 if(process.env.MINE_PAINTED_URL){
  for(const file of ['manifest.json','source-kit.zip','viewer.mjs','pixi.min.mjs']){
   const resp=await page.request.get(base+'/'+file);if(!resp.ok())throw Error(file+' '+resp.status());const live=await resp.body(),local=await fs.readFile(root+'/'+file);if(!live.equals(local))throw Error(file+' byte mismatch');resources.push({file,byteMatch:true});
  }
  for(const file of [...manifest.milestones.map(m=>m.file),'repair-strap.png','milestones.png']){
   const local='data:image/png;base64,'+(await fs.readFile(root+'/'+file)).toString('base64');
   const decode=async url=>page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const b=ctx.getImageData(0,0,c.width,c.height).data;return {width:c.width,height:c.height,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('')};},url);
   const got=await decode(base+'/'+file),expected=await decode(local);if(JSON.stringify(got)!==JSON.stringify(expected))throw Error('Pixel mismatch '+file);resources.push({file,pixelMatch:true,...got});
  }
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 const result={pass:true,url:base,browser:'Chromium / SwiftShader',levelCount:levels.length,levels,errors,resources,checkedAt:new Date().toISOString()};await fs.writeFile(root+(process.env.MINE_PAINTED_URL?'/public-verification.json':'/local-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({pass:true,levels:levels.length,resources:resources.length,errors}));
}catch(e){console.error(JSON.stringify({errors,failedLevel:levels.at(-1),body:page?await page.locator('body').innerText():''}));throw e;}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
