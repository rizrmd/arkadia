import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {launch} from '../vfx/browser.mjs';
import {build} from 'vite';
import http from 'node:http';
import path from 'node:path';
import {createReadStream} from 'node:fs';
let server;
const external=process.env.GAME;
if(!external){
 console.log('Building production test client');
 if(!process.env.SKIP_BUILD)await build({logLevel:'error',plugins:process.env.BASELINE?[{name:'baseline-combat',enforce:'pre',load(id){if(id.endsWith('/src/stronghold/combat-vfx.ts'))return execFileSync('git',['show','edaf903:src/stronghold/combat-vfx.ts'],{encoding:'utf8'});}}]:[],build:{copyPublicDir:false,outDir:'/tmp/flame-fan-game',emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
 server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';let file=path.join('/tmp/flame-fan-game',rel);try{await fs.access(file);}catch{file=path.resolve('public',rel);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>{res.statusCode=404;res.end();});stream.pipe(res);});
 await new Promise(r=>server.listen(3949,'127.0.0.1',r));
}
const mode=external?'live':'local',width=Number(process.env.WIDTH||1440),height=width===1440?900:844;
const browser=await launch(),page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()}`);});
await page.routeWebSocket('**/*',()=>{});
const snapshot=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
const tree=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
const cdp=await page.context().newCDPSession(page);
const tap=async(x,y)=>{if(width<600){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:3,radiusY:3,force:1,id:1}]});await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.mouse.click(x,y,{delay:100});await page.waitForTimeout(150);};
const openSlot=async slot=>{const s=await snapshot(),p=s.hudGeometry.sockets[slot];await tap(p.x,p.y);await page.waitForFunction(slot=>{const t=window.__STRONGHOLD_COMBAT__.skillTree.snapshot();return t.open&&t.slot===slot;},slot,{timeout:15000});await page.waitForTimeout(200);};
const close=async()=>{await page.waitForTimeout(200);const t=await tree();if(t.open){await tap(t.close.x,t.close.y);await page.waitForFunction(()=>!window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open);}};
try{
 await page.goto((external||'http://127.0.0.1:3949')+'/?offline=1&hero=ember-warden&quality=low&time=.45',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000,polling:500});
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();});
 await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.preload());await page.waitForTimeout(1000);
 const start=await snapshot();
 for(let slot=0;slot<3;slot++){
  await openSlot(slot);assert.equal((await snapshot()).vfx.totals.aoes,start.vfx.totals.aoes,'HUD tap must not cast');await close();
  await page.keyboard.press(String(slot+1));await page.waitForFunction(slot=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().slot===slot&&window.__STRONGHOLD_COMBAT__.skillTree.snapshot().open,slot);assert.equal((await snapshot()).vfx.totals.aoes,start.vfx.totals.aoes,'Number key must not cast');await close();
 }
 console.log('HUD tap/touch and keys 1–3 open skill tree without casting',width);
 const at=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=18;u<42;u+=2)for(let v=18;v<42;v+=2){let ok=true;for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4])for(const [x,y] of [[0,0],[2,-.8],[2,0],[2,.8],[-4,0],[9,0]])if(c.summon(u+x*Math.cos(a)-y*Math.sin(a),v+x*Math.sin(a)+y*Math.cos(a),25)<0)ok=false;c.clearFoes();if(ok&&c.teleport(u,v))return {u,v};}throw Error('No open test position');});
 for(let rank=1;rank<=5;rank++){
  if(rank>1){await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.offer(['flame-fan','might','heal']));await page.keyboard.press('1');await page.waitForFunction(rank=>window.__STRONGHOLD_COMBAT__.snapshot().run.skills['flame-fan']===rank,rank);}
  await openSlot(0);const t=await tree(),fan=t.nodes.find(n=>n.id==='flame-fan');assert.equal(fan.level,rank);assert(fan.inView);const count=(await snapshot()).vfx.totals.aoes;await tap(fan.screen.x,fan.screen.y);assert.equal((await snapshot()).vfx.totals.aoes,count,'Tree node must not cast');
  if(rank===1||rank===5)await page.screenshot({path:`docs/flame-fan-gameplay/${mode}-tree-${width}-lv${rank}.png`,timeout:30000});await close();
  const yaw=[0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4][rank-1];
  await page.evaluate(({at,yaw})=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();c.teleport(at.u,at.v);c.resetCooldowns();for(const [x,y] of [[2,-.8],[2,0],[2,.8],[-4,0],[9,0]])if(c.summon(at.u+x*Math.cos(yaw)-y*Math.sin(yaw),at.v+x*Math.sin(yaw)+y*Math.cos(yaw),25)<0)throw Error('Blocked target');},{at,yaw});
  await page.waitForTimeout(950);const before=await snapshot();
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.setPreviewMode(false));
  await page.waitForFunction(n=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return s.run.autoCasts>n&&s.vfx.flameSheets.length>0;},before.run.autoCasts||0,{timeout:20000,polling:10});
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.setPreviewMode(true));await page.waitForTimeout(140);const after=await snapshot(),sheet=after.vfx.flameSheets.at(-1);
  assert(after.run.autoCasts>(before.run.autoCasts||0));assert.equal(after.vfx.totals.projectiles,before.vfx.totals.projectiles);assert.equal(sheet.rank,rank);assert.equal(sheet.layers,rank);assert.equal(sheet.height,0);assert.equal(sheet.bloom,0);assert(Math.abs(sheet.radius-4.4*(1+(rank-1)*.18))<1e-6);assert(Math.abs(Math.atan2(Math.sin(sheet.yaw-yaw),Math.cos(sheet.yaw-yaw)))<.15,'Automatic aim follows nearest forward foe');
  for(let i=0;i<3;i++)assert(after.foes[i].hp<before.foes[i].hp,`Automatic rank ${rank} missed foe ${i}`);assert.equal(after.foes[3].hp,before.foes[3].hp,'Rear excluded');assert.equal(after.foes[4].hp,before.foes[4].hp,'Out of range excluded');
  await page.screenshot({path:`docs/flame-fan-gameplay/${mode}-auto-${width}-lv${rank}.png`,timeout:30000});
  results.push({rank,autoCasts:after.run.autoCasts-(before.run.autoCasts||0),damaged:3,rearExcluded:true,outsideExcluded:true,projectiles:0,sheet});console.log('Automatic cast verified',width,rank);
 }
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.clearFoes();c.offer(['cinder-step','might','heal']);});await page.keyboard.press('1');await openSlot(0);
 // Scroll using the same gesture as a player until Cinder Step is visible.
 for(let i=0;i<12&&!(await tree()).nodes.find(n=>n.id==='cinder-step').inView;i++){const t=await tree();await page.mouse.move(t.view.x+t.view.width/2,t.view.y+t.view.height/2);await page.mouse.wheel(width<600?0:240,width<600?-240:0);await page.waitForTimeout(180);}
 const t=await tree(),cinder=t.nodes.find(n=>n.id==='cinder-step');assert(cinder.learned&&cinder.inView);const beforeEquip=(await snapshot()).vfx.totals.aoes;await tap(cinder.screen.x,cinder.screen.y);await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().run.slots[0]==='cinder-step');assert.equal((await snapshot()).vfx.totals.aoes,beforeEquip,'Equip must not cast');assert((await snapshot()).run.slots.includes('flame-fan'));
 await page.screenshot({path:`docs/flame-fan-gameplay/${mode}-tree-equipped-${width}.png`,timeout:30000});
 assert.deepEqual(errors,[]);await fs.writeFile(`docs/flame-fan-gameplay/automatic-${mode}-${width}.json`,JSON.stringify({passed:true,width,height,inputs:'HUD touch/click and 1–3 open tree; tree equips learned skills; no manual cast API called',progression:'Controlled eligible level-up offers; actual keyboard choice and skill-tree pointer equip',results,errors},null,2));console.log('PASS',mode,width);
}catch(e){console.error('FAIL',e);await fs.writeFile(`/home/dev/flame-fan-failure-${width}.json`,JSON.stringify(await snapshot(),null,2));console.error(await page.evaluate(()=>{const t=window.__STRONGHOLD_COMBAT__.skillTree.snapshot(),e=document.elementFromPoint(t.close?.x||0,t.close?.y||0);return {atClose:e?.outerHTML.slice(0,300)};}));console.error(JSON.stringify(await tree()));await page.screenshot({path:`/home/dev/flame-fan-failure-${width}.png`,timeout:15000});throw e;}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
