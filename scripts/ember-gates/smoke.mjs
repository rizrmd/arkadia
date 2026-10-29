// Production bundle or live browser smoke. The diagnostic offer() advances a real level and calls the real roll;
// no offer contents or skill ranks are injected. Every displayed card is selected through choose().
import {chromium} from 'playwright';import {build} from 'vite';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import sharp from 'sharp';import http from 'node:http';import path from 'node:path';import {createReadStream} from 'node:fs';import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,OUT=process.env.OUT||'docs/ember-gates',tag=remote?'live':'local',port=5789,dist='/tmp/ember-gates-bundle';await fs.mkdir(OUT,{recursive:true});let server,browser;
if(!remote){
 await build({logLevel:'error',build:{copyPublicDir:false,outDir:dist,emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';let file=path.join(dist,rel);try{await fs.access(file);}catch{file=path.resolve('public',rel);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');const s=createReadStream(file);s.on('error',()=>{res.statusCode=404;res.end();});s.pipe(res);});await new Promise(r=>server.listen(port,'127.0.0.1',r));
}
const report={base:remote||`http://127.0.0.1:${port}`,views:{},errors:[],method:'Diagnostic offer() advances level and calls actual roll; actual choose() consumes cards. No injected offer contents.'};
const gates={'flame-fan':0,'cinder-step':0,'ember-snare':0,heal:0,might:0,cleave:4,shockwave:4,nova:4,leech:4,haste:8,vitality:8};
try{
 for(const mobile of [false,true]){
  const name=mobile?'mobile':'desktop',r=report.views[name]={viewport:mobile?[390,844]:[1440,900],offers:[],screenshots:[]};
  browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:r.viewport[0],height:r.viewport[1]},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  await page.goto(`${report.base}/?offline=1&hero=ember-warden&quality=low&time=.45`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:240000,polling:500});console.log(name,'ready');
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.preload());
  const shot=async what=>{const file=`${OUT}/${tag}-${name}-${what}.webp`;await sharp(await page.screenshot({timeout:120000})).webp({quality:85}).toFile(file);r.screenshots.push(file);};
  for(let picks=0;picks<19;picks++){
   const run=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.offer());
   assert.equal(run.level,picks+2);assert.equal(run.offers.length,3);assert.equal(new Set(run.offers).size,3);
   for(const id of run.offers){if(id==='star')assert(run.level>=20);else {assert(id in gates);assert((run.skills[id]??0)>0||picks>=gates[id]);if(['flame-fan','cinder-step','ember-snare','cleave','shockwave'].includes(id))assert((run.skills[id]??0)<5);}}
   if(picks===0){assert(run.offers.every(id=>['flame-fan','cinder-step','ember-snare','might','heal'].includes(id)));await page.waitForTimeout(1000);assert(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().blessingUi.active));await shot('first-levelup');}
   if(run.level===20)assert.equal(run.offers[0],'star');r.offers.push({level:run.level,points:picks,offers:run.offers});
   const pick=run.offers.includes('flame-fan')?'flame-fan':run.offers[0];await page.evaluate(id=>window.__STRONGHOLD_COMBAT__.choose(id),pick);
   const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().run);assert.equal(after.pending,0);
   if(picks===0){
    await page.keyboard.press('k');await page.waitForTimeout(1200);const tree=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());assert(tree.open);
    const by=id=>tree.nodes.find(n=>n.id===id);
    for(const id of ['molten-cleave','molten-slam','arc-nova','soul-feast'])assert.equal(by(id)?.locked,'4 pts',id);
    for(const id of ['chrono-surge','furnace-heart'])assert.equal(by(id)?.locked,'8 pts',id);
    assert.equal(by('ascendant-star')?.locked,'Lv. 20');assert.equal(tree.nodes.filter(n=>n.placeholder).length,3);
    if(!mobile){await page.mouse.move(tree.view.x+tree.view.width/2,tree.view.y+tree.view.height/2);await page.mouse.wheel(0,tree.maxScroll*.45);await page.waitForTimeout(1500);}
    await shot('locked-tree');await page.keyboard.press('Escape');
   }
  }
  console.log(name,'19 offers passed');await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=String(e.stack||e);throw e;}
finally{await fs.writeFile(`${OUT}/browser-${tag}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server?server.close(r):r());}
