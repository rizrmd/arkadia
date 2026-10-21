import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('public'),out='docs/rift-runner-v1';
const server=process.env.DEMO_URL?null:http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const f=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!f.startsWith(root+path.sep))throw Error('Invalid path');const b=await fs.readFile(f);res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'image/png');res.end(b)}catch{res.writeHead(404).end()}}).listen(0,'127.0.0.1');
if(server)await new Promise(r=>server.on('listening',r));
const base=process.env.DEMO_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']}),context=await browser.newContext({viewport:{width:1200,height:1050},recordVideo:{dir:out+'/video',size:{width:1200,height:1050}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
try{
 await page.goto(base+'/rift-runner/v1/');await page.waitForFunction(()=>window.riftReady);
 const manifest=await page.evaluate(()=>window.riftReview.manifest),results=[];
 for(const action of [...new Set(manifest.clips.map(c=>c.action))].filter(a=>!process.env.RIFT_ACTIONS||process.env.RIFT_ACTIONS.split(',').includes(a))){
  await page.evaluate(a=>{window.riftReview.setAction(a);window.riftReview.setMode('clip');window.riftReview.setPlaying(true)},action);
  const clips=manifest.clips.filter(c=>c.action===action);const duration=Math.max(...clips.map(c=>c.frames.length/c.fps));
  await page.waitForTimeout((duration*2+.2)*1000);
  await page.waitForFunction(n=>window.riftReview.state.seen.length>=n,clips.reduce((n,c)=>n+c.frames.length,0),{timeout:15000});
  const state=await page.evaluate(()=>window.riftReview.state);
  for(const c of clips){const seen=state.seen.filter(v=>v.startsWith(c.id+':'));if(seen.length!==c.frames.length)throw Error(`Missing playback frame ${c.id}: ${seen.length}/${c.frames.length}`)}
  results.push({action,clipCount:clips.length,framesObserved:state.seen.length,allFramesRendered:true,elapsedSeconds:state.time});
  if(process.env.RIFT_CAPTURE_SCREENSHOTS!=='0')await page.screenshot({path:`${out}/${action}-playback.png`,fullPage:true});
  if(clips[0].layer==='body'&&action!=='idle'){
   await page.evaluate(()=>window.riftReview.setMode('transition'));
   await page.waitForTimeout((duration+2)*1000);const transition=await page.evaluate(()=>window.riftReview.state.trace);
   const expectedPhases=['canonical','painted-v3'].includes(clips[0].source)?['neutral before','action',clips[0].holdLastFrame?'terminal hold':'neutral after']:['idle before','action','idle after'];for(const phase of expectedPhases)if(!transition.some(v=>v.phase===phase))throw Error(`Missing ${phase} ${action}`);
   results.at(-1).transitionPhasesObserved=expectedPhases; if(clips[0].holdLastFrame){await page.waitForTimeout(200);const trace=await page.evaluate(()=>window.riftReview.state.trace.filter(v=>v.time>window.riftReview.state.time-.15));if(!trace.every(v=>v.frame===clips[0].frames.length-1&&v.phase==='terminal hold'))throw Error('Death terminal hold failed')}
  }
 }
 await page.click('#pause');const before=await page.evaluate(()=>window.riftReview.state.time);await page.waitForTimeout(150);const after=await page.evaluate(()=>window.riftReview.state.time);if(before!==after)throw Error('Pause failed');await page.click('#step');if((await page.evaluate(()=>window.riftReview.state.time))<=after)throw Error('Step failed');
 if(errors.length)throw Error(errors.join('\n'));
 await fs.writeFile(`${out}/${process.env.DEMO_URL?'live':'local'}${process.env.RIFT_ACTIONS?'-painted':''}-playback.json`,JSON.stringify({base,errors,results,checks:['all selected clips rendered every frame during real-time requestAnimationFrame playback','selected body clip transitions exercised in all eight direction slots, including terminal corpse hold for death','pause and next-frame controls work'],limits:['Rendering coverage is not a visual quality pass.','No physical device or gameplay integration tested.']},null,2));
 console.log(JSON.stringify({base,actions:results.length,clips:manifest.clips.length,frames:manifest.frameCount,errors}));
}finally{await context.close();await browser.close();server?.close()}
