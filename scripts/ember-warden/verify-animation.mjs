import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {chromium} from 'playwright';
const root=path.resolve('public/ember-warden/v3'),docs='docs/ember-warden-v3',live=process.env.DEMO_URL,hash=b=>createHash('sha256').update(b).digest('hex');
let server,browser;const errors=[],results=[];
try{
 const m=JSON.parse(await fs.readFile(root+'/manifest.json')),atlas=JSON.parse(await fs.readFile(root+'/atlas.json'));
 if(Object.keys(atlas.frames).length!==64||m.clips.length!==8)throw Error('Incomplete export');
 for(const [id,names]of Object.entries(atlas.animations))if(!Array.isArray(names)||names.length!==8||names.some(name=>!atlas.frames[name])||!atlas.animationSettings[id])throw Error('Invalid animation frame-name array '+id);
 for(const clip of m.clips)for(const f of clip.frames){const [left,top,width,height]=f.rect,ar=f.atlasRect,a=await sharp(root+'/'+clip.image).extract({left,top,width,height}).raw().toBuffer(),b=await sharp(root+'/'+m.atlas).extract({left:ar[0],top:ar[1],width:ar[2],height:ar[3]}).raw().toBuffer();if(hash(a)!==hash(b))throw Error('Combined atlas pixels mismatch '+clip.id+' '+f.index)}
 if(!live){server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',png:'image/png',webp:'image/webp'})[f.split('.').at(-1)]||'application/octet-stream');res.end(await fs.readFile(f))}catch{res.writeHead(404).end()}}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r))}
 const base=live||`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 if(live)await page.route('**/*',async route=>{try{const r=await fetch(route.request().url(),{signal:AbortSignal.timeout(20000)});await route.fulfill({status:r.status,contentType:r.headers.get('content-type')||'application/octet-stream',body:Buffer.from(await r.arrayBuffer())})}catch{await route.abort()}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto(base);await page.waitForFunction(()=>window.emberAnimationReady);await fs.mkdir(root+'/evidence',{recursive:true});
 for(const c of m.clips){
  for(const speed of ['1','0.25']){
   await page.selectOption('#speed',speed);await page.evaluate(action=>window.emberAnimation.select(action),c.action);await page.waitForFunction(()=>window.emberAnimationReady&&window.emberAnimation.state.seen.length===8,undefined,{timeout:15000});
   results.push({action:c.action,speed:Number(speed),observedFrames:8});
  }
  await page.selectOption('#speed','1');
  for(let n=0;n<8;n++){await page.locator('.frame').nth(n).click();await page.waitForFunction(frame=>!window.emberAnimation.state.playing&&window.emberAnimation.state.frame===frame,n)}
  if(!c.loop){await page.check('#transition');await page.evaluate(a=>window.emberAnimation.select(a),c.action);await page.waitForFunction(phase=>window.emberAnimation.state.phase===phase,c.holdLastFrame?'death hold':'idle after');if(c.holdLastFrame){await page.waitForTimeout(500);if(await page.evaluate(()=>window.emberAnimation.state.frame)!==7)throw Error('Death recovered unexpectedly')}await page.uncheck('#transition')}
  results.push({action:c.action,scrubbedFrames:8,transition:c.loop?'loop':c.holdLastFrame?'terminal hold':'idle recovery'});
  await page.locator('.frame').nth(c.action==='death'?7:4).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:root+`/evidence/${live?'live':'local'}-${c.action}.png`,fullPage:false});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.emberAnimation.select('flame-fan'));await page.waitForFunction(()=>window.emberAnimationReady&&window.emberAnimation.state.seen.length===8);await page.click('#background');if(!await page.locator('#stage').evaluate(e=>e.classList.contains('snow')))throw Error('Snow toggle failed');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Phone horizontal overflow');await page.screenshot({path:root+`/evidence/${live?'live':'local'}-phone.png`,fullPage:true});results.push({width:390,playback:true,background:true,horizontalOverflow:false});
 let fail=true;await page.route('**/sheets/hurt-SE.png*',route=>fail?route.abort():route.fallback());await page.selectOption('#action','hurt');await page.waitForSelector('#retry:visible');fail=false;await page.click('#retry');await page.waitForFunction(()=>window.emberAnimationReady&&window.emberAnimation.state.action==='hurt');results.push({failedSheetRetryRecovered:true});
 for(const [file,expected]of Object.entries(m.resources)){const r=await fetch(new URL(file,base),{signal:AbortSignal.timeout(20000)});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==expected)throw Error('Deployed resource mismatch '+file)}
 if(errors.length)throw Error(errors.join('\n'));
 const report={status:'animation-export-and-playback-pass',base,transport:live?'Public HTTPS fetched by Node into Chromium':'Direct local HTTP',clips:8,frames:64,atlasPixelComparisons:64,resourcesVerified:Object.keys(m.resources).length,results,pageErrors:errors,limitation:'Playback and pixel checks do not validate source anatomy, gait contacts, or production art approval.'};
 await fs.writeFile(docs+`/${live?'live':'local'}-verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,clips:8,frames:64,checks:results.length,resources:report.resourcesVerified}));
}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve())}
