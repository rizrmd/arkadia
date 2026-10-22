import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=path.resolve('public/ember-warden'),live=process.env.DEMO_URL;
let server,browser;
const results=[],errors=[];
try{
 if(!live){server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','json':'application/json','png':'image/png'})[f.split('.').at(-1)]||'application/octet-stream');res.end(await fs.readFile(f))}catch{res.writeHead(404).end()}}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r))}
 const base=live||`http://127.0.0.1:${server.address().port}/v2/`;
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 await fs.mkdir(root+'/v2/evidence',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 // The home-installed Chromium cannot resolve the public sandbox hostname in
 // this runtime. Execute the deployed page in Chromium using Node's working
 // HTTPS transport, and independently hash every original public response.
 if(live)await page.route('**/*',async route=>{try{const response=await fetch(route.request().url(),{signal:AbortSignal.timeout(15000)});await route.fulfill({status:response.status,contentType:response.headers.get('content-type')||'application/octet-stream',body:Buffer.from(await response.arrayBuffer())})}catch{await route.abort()}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:960});
  await page.goto(base);await page.waitForFunction(()=>window.emberArtReady);
  for(const direction of ['N','NE','E','SE','S','SW','W','NW']){await page.click(`[data-direction="${direction}"]`);await page.waitForFunction(d=>window.emberArt.state.direction===d&&document.getElementById('hero').complete,direction)}
  await page.click('[data-direction="SE"]');await page.click('#motion');await page.waitForFunction(()=>window.emberArt.state.playing);
  const seen=await page.evaluate(()=>new Promise(resolve=>{const seen=new Set,start=performance.now();function sample(){seen.add(window.emberArt.state.frame);if(seen.size===4||performance.now()-start>2000)resolve([...seen]);else requestAnimationFrame(sample)}sample()}));if(seen.length!==4)throw Error('Run playback missed frames');
  await page.click('#motion');await page.click('#surface');if(!await page.locator('#stage').evaluate(e=>e.classList.contains('snow')))throw Error('Snow toggle failed');await page.click('#surface');
  for(let i=0;i<8;i++){await page.locator('.pose-card').nth(i).click();if(!await page.locator('#detail').evaluate(e=>e.open))throw Error('Pose dialog failed');await page.click('#close-detail')}
  await page.evaluate(()=>{for(const im of document.images)im.loading='eager'});await page.waitForFunction(()=>[...document.images].every(im=>im.complete&&im.naturalWidth>0));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow at '+width);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:root+`/v2/evidence/${live?'live':'local'}-${width}.png`,fullPage:true});
  results.push({width,directions:8,keyPoseDialogs:8,runFramesObserved:seen.length,snowToggle:true,horizontalOverflow:false});
 }
 // Prove that load failure is visible and recoverable.
 let fail=true;await page.route('**/manifest.json',r=>fail?r.abort():r.continue());await page.goto(base);await page.waitForSelector('#retry:visible');fail=false;await page.click('#retry');await page.waitForFunction(()=>window.emberArtReady);results.push({manifestFailureRetryRecovered:true});
 const m=JSON.parse(await fs.readFile(root+'/v2/manifest.json')),resources={};
 for(const [file,expected]of Object.entries(m.resources)){const response=await fetch(new URL(file,base));if(!response.ok)throw Error('Missing '+file);const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(actual!==expected)throw Error('Hash mismatch '+file);resources[file]=actual}
 if(errors.length)throw Error(errors.join('\n'));
 const report={status:'painted-art-viewer-pass',base,transport:live?'Public HTTPS responses loaded through Node fetch into Chromium':'Direct local HTTP',results,resourcesVerified:Object.keys(resources).length,pageErrors:errors,scope:'Art preview and motion study; production animation/gameplay not changed.'};
 await fs.writeFile(`docs/ember-warden-v2/${live?'live':'local'}-verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve())}
