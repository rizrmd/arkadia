import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const dir=process.env.SITE_DIR;
const server=dir?http.createServer(async(req,res)=>{try{const file=path.join(dir,req.url.split('?')[0]);const p=(await fs.stat(file).catch(()=>null))?.isFile()?file:path.join(dir,'index.html');res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1'):null;
if(server)await new Promise(r=>server.once('listening',r));
const base=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:process.env.HOME+'/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const [route,viewport] of [['/dev',{width:1440,height:900}],['/dev/',{width:390,height:844}]]){
  const page=await browser.newPage({viewport});const requests=[],errors=[];
  page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>/\/typography\/|\/asset-sizes.json|\/assets\/loader-/.test(r.request().url())?r.abort():r.continue());
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ARKADIA_DEV__?.entries.length===12);
  await page.waitForFunction(()=>!document.querySelector('#loading-screen'));
  assert.equal(await page.locator('canvas').count(),1);assert.deepEqual(errors,[]);
  assert(!requests.some(p=>/\/assets\/loader-|\/assets\/main-|\/asset-sizes.json/.test(p)),JSON.stringify(requests));
  assert(!requests.some(p=>/\/typography\/v2\/(fonts|hud)/.test(p)));
  results.push({route,viewport,entries:12,canvases:1,gameRuntimeRequested:false,errors});
  await page.route('**/rift-dash/player/',r=>r.fulfill({contentType:'text/html',body:'Player destination'}));
  await page.mouse.click(70,125);await page.waitForURL('**/rift-dash/player/');
  await page.close();
 }
 console.log(JSON.stringify({base,results},null,2));
}finally{await browser.close();server?.close();}
