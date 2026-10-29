import {chromium} from 'playwright';import {build} from 'vite';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import sharp from 'sharp';
import http from 'node:http';import path from 'node:path';import {createReadStream} from 'node:fs';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,OUT=process.env.OUT||'docs/ember-tree',tag=remote?'live':'local',port=5731;
await fs.mkdir(OUT,{recursive:true});
let server;
if(!remote){
 if(!process.env.SKIP_BUILD)await build({logLevel:'error',build:{copyPublicDir:false,outDir:'/tmp/ember-tree-bundle',emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 server=http.createServer(async(req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://local').pathname),rel=p==='/'?'index.html':p.replace(/^\//,'');
  let file=path.join('/tmp/ember-tree-bundle',rel);
  try{await fs.access(file);}catch{file=path.resolve('public',rel);}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  const stream=createReadStream(file);stream.on('error',()=>{res.statusCode=404;res.end();});stream.pipe(res);
 });await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
}
const report={base:remote||`http://127.0.0.1:${port}`,views:{},errors:[]};if(process.env.ONLY){try{report.views=JSON.parse(await fs.readFile(`${OUT}/results-${tag}.json`)).views;}catch{}}
const t=p=>p.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
const settle=p=>p.waitForTimeout(1000);
const n=(s,id)=>s.nodes.find(x=>x.id===id);
try{
 for(const mobile of [false,true]){
  const view=mobile?'mobile':'desktop';if(process.env.ONLY&&process.env.ONLY!==view)continue;const r=report.views[view]={viewport:mobile?[390,844]:[1440,900],checks:[],screenshots:[]};
  const browser=await chromium.launch(launchOptions());
  try{
   const page=await browser.newPage({viewport:{width:r.viewport[0],height:r.viewport[1]},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
   page.on('pageerror',e=>report.errors.push(`${view}: ${e.message}`));
   await page.goto(`${report.base}/?offline=1&hero=ember-warden&time=.45&quality=low`,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:300000,polling:500});
   await page.waitForTimeout(2500);console.log(view,'world ready');
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.preload());
   const shot=async(name)=>{const path=`${OUT}/${tag}-${view}-${name}.webp`;await sharp(await page.screenshot({timeout:120000})).webp({quality:85}).toFile(path);r.screenshots.push(path);};
   await page.keyboard.press('k');await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open,null,{timeout:30000});await settle(page);let s=await t(page);
   assert(s.open);assert.equal(s.vertical,mobile);assert.equal(s.highlighted,'flame-fan');assert(n(s,'flame-fan').inView);
   assert.deepEqual(s.nodes.filter(x=>x.learned).map(x=>x.id),['flame-fan']);assert.equal(n(s,'flame-fan').pips,1);assert.equal(n(s,'flame-fan').slot,1);
   assert.equal(s.nodes.length,15);assert.equal(s.nodes.filter(x=>x.placeholder).length,3);
   for(const node of s.nodes){assert.equal(node.pipCount,node.kind==='passive'?0:5);assert.equal(node.ring,node.kind!=='passive');}
   r.checks.push('Fresh run: Flame Fan Lv.1 only; 15 nodes, 3 concepts; five active pips, borderless passives');
   const sockets=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets);
   if(mobile)assert(s.panel.y+s.panel.height<=Math.min(...sockets.map(x=>x.y-x.radius)));else assert(s.panel.x+s.panel.width<Math.min(...sockets.map(x=>x.x-x.radius)));
   assert(s.maxScroll>0);await shot('fresh');
   await page.mouse.click(s.close.x,s.close.y);await settle(page);assert.equal((await t(page)).open,false);
   await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(const id of ['cinder-step','ember-snare','flame-fan','flame-fan','heal','might','cleave']){c.offer([id,'might','heal']);c.choose(id);}c.resetCooldowns();});
   const cdp=mobile?await page.context().newCDPSession(page):null;
   const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
   if(mobile){await touch('touchStart',sockets[2].x,sockets[2].y);await page.waitForTimeout(550);await touch('touchEnd');}
   else await page.mouse.click(sockets[2].x,sockets[2].y,{button:'right'});
   await settle(page);s=await t(page);assert(s.open);assert.equal(s.highlighted,'ember-snare');assert(n(s,'ember-snare').inView);
   assert.equal(n(s,'flame-fan').pips,3);assert.deepEqual(['flame-fan','cinder-step','ember-snare'].map(id=>n(s,id).slot),[1,2,3]);assert(n(s,'second-wind').learned);assert(n(s,'molten-cleave').learned);assert.equal(n(s,'molten-cleave').slot,0);
   assert.deepEqual(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.slots.map(x=>x.cooldownMs)),[0,0,0]);
   r.checks.push('Inspect gesture focuses and scrolls without casting; real ranks, passive count, 1/2/3 badges and learned unequipped node');await shot('inspect');
   // Move toward the capstone using the actual scroll input, then focus the concept for its explicit explanation.
   await page.mouse.move(s.view.x+s.view.width/2,s.view.y+s.view.height/2);
   if(mobile){const x=s.view.x+s.view.width*.8,y=s.view.y+50;await touch('touchStart',x,y);for(let i=1;i<=10;i++)await touch('touchMove',x,y+i*25);await touch('touchEnd');}
   else await page.mouse.wheel(0,900);
   await settle(page);assert.notEqual((await t(page)).scroll,s.scroll);r.checks.push('Drag/wheel scroll works');
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('solar-fan',0));await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().nodes.find(n=>n.id==='solar-fan').inView,null,{timeout:60000});await settle(page);s=await t(page);const concept=n(s,'solar-fan');assert(concept.inView);assert(!concept.learned);
   await page.mouse.click(concept.screen.x,concept.screen.y);await settle(page);assert.match((await t(page)).hint,/Concept only/);await shot('concept');
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('ascendant-star'));await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().nodes.find(n=>n.id==='ascendant-star').inView,null,{timeout:60000});await settle(page);s=await t(page);assert(n(s,'ascendant-star').inView);
   await page.keyboard.press('Escape');await settle(page);assert(!(await t(page)).open);
   await page.keyboard.press('k');await settle(page);assert((await t(page)).open);await page.keyboard.press('k');await settle(page);assert(!(await t(page)).open);
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.open());await settle(page);s=await t(page);await page.mouse.click(20,s.panel.y+s.panel.height+15);await settle(page);assert(!(await t(page)).open);
   r.checks.push('X, Esc, K and outside close; concept remains unlearned; capstone reachable');
   // Quick tap opens the loadout tree; equipped skills cast automatically in gameplay.
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.resetCooldowns());
   if(mobile){await touch('touchStart',sockets[0].x,sockets[0].y);await page.waitForTimeout(100);await touch('touchEnd');}else await page.mouse.click(sockets[0].x,sockets[0].y,{delay:100});await settle(page);
   assert((await t(page)).open);assert.equal((await t(page)).slot,0);assert.equal((await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.slots[0].cooldownMs)),0);r.checks.push('Tap opens Ember skill tree without casting');r.pass=true;
  }finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[]);
}finally{await new Promise(resolve=>server?server.close(resolve):resolve());await fs.writeFile(`${OUT}/results-${tag}.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
