import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {launch} from '../vfx/browser.mjs';
const external=process.env.VERIFY_URL;
const out='docs/rift-bolt';await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.bin':'application/octet-stream'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/embed-test'){
   res.setHeader('Content-Type','text/html');res.end(`<iframe src="${external||'http://127.0.0.1:3938/rift-runner/rift-bolt-levels/'}" title="Rift Bolt Level 1–5 Animation Player" height="560" style="width:100%;border:0"></iframe>`);return;
  }
  const rel=decodeURIComponent(u.pathname).replace(/^\/rift-runner\/rift-bolt-levels\//,'');
  const base=u.pathname.startsWith('/rift-runner/rift-bolt-levels/')?'dist-rift-bolt':'public';
  const file=path.resolve(base,rel==='/'||rel===''?'index.html':rel.replace(/^\//,''));
  if(!file.startsWith(path.resolve(base)+path.sep))throw Error('invalid path');
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);
 }catch{res.statusCode=404;res.end('Missing');}
});
await new Promise(r=>server.listen(3938,'127.0.0.1',r));
const browser=await launch(),errors=[],failures=[],results=[];
const page=await browser.newPage();
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.status()>=400)failures.push([r.status(),r.url()]);});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:560}]){
  await page.setViewportSize(viewport);
  await page.goto(external||'http://127.0.0.1:3938/rift-runner/rift-bolt-levels/');
  await page.waitForFunction(()=>window.__RIFT_BOLT__,null,{timeout:60000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  for(let level=1;level<=5;level++){
   await page.selectOption('#level',String(level));
   for(const [time,phase] of [[.22,'Casting'],[.72,'Projectile travel'],[1.3,'Impact']]){
    await page.evaluate(t=>window.__RIFT_BOLT__.seek(t),time);
    const state=await page.evaluate(()=>window.__RIFT_BOLT__.state());
    assert.equal(state.level,level);assert.equal(state.phase,phase);assert.equal(state.spec.offsets.length,Math.min(level,3));
    assert(state.stats.particles>0,`Particles at ${level} ${phase}`);assert.deepEqual(state.stats.missing,[]);
    if(viewport.width!==320)await page.screenshot({path:`${out}/${external?'live':'local'}-${viewport.width}-lv${level}-${phase.split(' ')[0].toLowerCase()}.png`});
   }
  }
  await page.evaluate(()=>window.__RIFT_BOLT__.seek(.6));
  const before=await page.evaluate(()=>window.__RIFT_BOLT__.state().time);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__RIFT_BOLT__.state().time),before,'Pause freezes time');
  await page.click('#play');await page.waitForTimeout(180);assert((await page.evaluate(()=>window.__RIFT_BOLT__.state().time))>before,'Play resumes');
  await page.click('#play');assert((await page.evaluate(()=>window.__RIFT_BOLT__.state().paused)),'Pause button');
  await page.click('#replay');assert((await page.evaluate(()=>window.__RIFT_BOLT__.state().time))<.4,'Replay starts over');
  if((await page.evaluate(()=>window.__RIFT_BOLT__.state().loop)))await page.click('#loop');
  await page.waitForFunction(()=>window.__RIFT_BOLT__.state().phase==='Complete',null,{timeout:45000});
  assert((await page.evaluate(()=>window.__RIFT_BOLT__.state().paused)),'Once stops');
  await page.click('#loop');await page.click('#replay');
  const cycles=await page.evaluate(()=>window.__RIFT_BOLT__.state().cycles);
  await page.waitForFunction(n=>window.__RIFT_BOLT__.state().cycles>n,cycles,{timeout:45000});
  await page.selectOption('#background','day');
  for(const selector of ['#level','#play','#replay','#loop']){
   const b=await page.locator(selector).boundingBox();assert(b&&b.height>=42&&b.x>=0&&b.x+b.width<=viewport.width,'Accessible controls '+selector);
  }
  console.log('Verified',viewport.width);results.push({viewport,levels:[1,2,3,4,5],phases:['Casting','Projectile travel','Impact'],controls:'passed'});
 }
 const embed=page;
 await embed.goto('http://127.0.0.1:3938/embed-test');
 const frame=embed.frameLocator('iframe');await frame.locator('#play:not([disabled])').waitFor({timeout:60000});
 await frame.locator('#level').selectOption('5');assert.equal(await frame.locator('#level').inputValue(),'5');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passed:true,url:external||'local',results,iframe:'loaded, level selector works',pageErrors:errors,httpFailures:failures};
 await fs.writeFile(`${out}/verification-${external?'live':'local'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}
