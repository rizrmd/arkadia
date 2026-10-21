import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
const root=path.resolve('public/ember-warden/v1'),local=!process.env.DEMO_URL;let server,browser;const label=local?'local':'live',results=[],errors=[];
if(local){server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p==='/')p='/index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');const b=await fs.readFile(f);res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':f.endsWith('.md')?'text/markdown':'image/png');res.end(b)}catch{res.writeHead(404).end()}}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r))}
const base=process.env.DEMO_URL||`http://127.0.0.1:${server.address().port}`;
try{
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});const page=await browser.newPage({viewport:{width:1400,height:1080}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto(base+'/');await page.waitForFunction(()=>window.emberReady,undefined,{timeout:90000});const m=await page.evaluate(()=>window.ember.manifest);
 await fs.mkdir(root+'/evidence',{recursive:true});
 for(const action of m.actions){
  const expected=m.clips.filter(c=>c.action===action).reduce((n,c)=>n+c.frames.length,0),expectedFx=m.vfx.filter(c=>c.action===action).reduce((n,c)=>n+c.frames.length,0),c=m.clips.find(c=>c.action===action);
  for(const speed of ['1','0.25']){
   await page.selectOption('#mode','clip');await page.selectOption('#speed',speed);await page.evaluate(a=>window.ember.setAction(a),action);
   await page.waitForFunction(({expected,expectedFx})=>window.ember.state.seen.length===expected&&window.ember.state.vfxSeen.length===expectedFx,{expected,expectedFx},{timeout:20000});
   if(c.holdLastFrame){await page.waitForFunction(()=>window.ember.state.phase==='death hold');const before=await page.evaluate(()=>window.ember.state.frame);await page.waitForTimeout(200);const after=await page.evaluate(()=>window.ember.state.frame);if(before!==c.frames.length-1||after!==before)throw Error('Death terminal hold failed')}
   results.push({action,speed:Number(speed),observedBodyFrames:expected,observedVfxFrames:expectedFx,allEightDirections:true});
  }
  for(const entry of ['idle','run']){
   await page.selectOption('#entry',entry);await page.selectOption('#speed','1');await page.selectOption('#mode','transition');await page.evaluate(a=>window.ember.setAction(a),action);const end=c.holdLastFrame?'death hold':c.loop?'run after':entry+' after';
   await page.waitForFunction(({entry,end})=>[entry+' before','action',end].every(x=>window.ember.state.phases.includes(x)),{entry,end},{timeout:15000});
   results.push({action,transitionFrom:entry,transitionPhases:await page.evaluate(()=>window.ember.state.phases)});
  }
  await page.selectOption('#mode','clip');await page.evaluate(a=>window.ember.setAction(a),action);
  for(let f=0;f<c.frames.length;f++){const serial=await page.evaluate(()=>window.ember.state.drawSerial);await page.locator('#scrub').evaluate((el,f)=>{el.value=f;el.dispatchEvent(new Event('input'))},f);await page.waitForFunction(({f,serial})=>!window.ember.state.playing&&window.ember.state.frame===f&&window.ember.state.drawSerial>serial,{f,serial})}
  await page.locator('#scrub').evaluate(el=>{el.value=Math.floor(Number(el.max)/2);el.dispatchEvent(new Event('input'))});await page.waitForTimeout(80);await page.screenshot({path:root+`/evidence/${label}-${action}.png`,fullPage:true});results.push({action,scrubbedAllFrames:c.frames.length,paused:true});
 }
 if(errors.length)throw Error(errors.join('\n'));
 const hashes={};if(!local){for(const [p,expected]of Object.entries(m.resources)){const response=await fetch(base+'/'+p+'?v='+expected.slice(0,12));if(!response.ok)throw Error('Resource '+p);const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(actual!==expected)throw Error('Version mismatch '+p);hashes[p]=actual}}
 const result={status:'playback-and-resource-verification-pass-not-final-art-acceptance',base,sourceHash:m.sourceHash,results,resourcesVerified:hashes,errors};await fs.writeFile(`docs/ember-warden/${label}-playback.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,actions:m.actions.length,checks:results.length,resources:Object.keys(hashes).length}));
}finally{await browser?.close();server?.close()}
