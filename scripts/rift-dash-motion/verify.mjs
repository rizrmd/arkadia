import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {serve} from '../rift-skill-fix/site.mjs';import {launch} from '../rift-skill-fix/browser.mjs';
const dir=process.env.SITE_DIR||process.env.HOME+'/releases/rift-dash-timed',remote=process.env.GAME,tag=remote?'live':'local',out='docs/rift-dash-motion';
async function link(src,dst){await fs.mkdir(dst,{recursive:true});for(const e of await fs.readdir(src,{withFileTypes:true})){const d=path.join(dst,e.name),s=path.join(src,e.name);try{await fs.lstat(d);if(e.isDirectory())await link(s,d);}catch(err){if(err.code!=='ENOENT')throw err;await fs.symlink(path.resolve(s),d);}}}
if(!remote)await link('public',dir);
const site=remote?null:await serve(dir),report={base:remote||'http://127.0.0.1:5297',views:[],errors:[],at:new Date().toISOString()};let b;
try{for(const [name,width,height,touch]of [['desktop',1440,900,false],['portrait',390,844,true],['landscape',844,390,true]].filter(v=>!process.env.WIDTH||+process.env.WIDTH===v[1])){
 console.log('START',tag,name);b=await launch();const p=await b.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text())});p.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));await p.routeWebSocket('**/*',()=>{});
 await p.addInitScript(()=>{localStorage.setItem('arkodia.desktop-movement-hint.v1','1');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30,music:0,soundEffects:0}))});
 await p.clock.install();await p.goto(report.base+'/?offline=1&hero=rift-runner&quality=low&time=.45',{waitUntil:'domcontentloaded',timeout:45000});await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:90000}).catch(async e=>{console.log('STARTUP',await p.evaluate(()=>({text:document.body.innerText,loader:document.getElementById('loading-screen')?.dataset,combat:!!window.__STRONGHOLD_COMBAT__,fx:window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx,resources:performance.getEntriesByType('resource').slice(-8).map(x=>x.name)})));throw e});
 await p.clock.pauseAt((await p.evaluate(()=>Date.now()))+100);console.log('READY');
 const snap=()=>p.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
 await p.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();c.offer(['rift-dash','might','heal']);c.choose('rift-dash')});
 const spot=await p.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=18;u<60;u+=.5)for(let v=18;v<60;v+=.5){let good=true;for(let i=0;i<32;i++){const a=i*Math.PI/16;if(!c.clear(u+Math.cos(a)*2.4,v+Math.sin(a)*2.4)){good=false;break}}if(good&&c.teleport(u,v))return {u,v}}throw Error('No clearing')});
 const cases=[];
 for(const [heading,keys,sx,sy]of [['N',['KeyW'],0,-1],['NE',['KeyW','KeyD'],2,-1],['E',['KeyD'],1,0],['SE',['KeyS','KeyD'],2,1],['S',['KeyS'],0,1],['SW',['KeyS','KeyA'],-2,1],['W',['KeyA'],-1,0],['NW',['KeyW','KeyA'],-2,-1]].filter(v=>!process.env.HEADINGS||process.env.HEADINGS.split(',').includes(v[0]))){
  await p.evaluate(s=>{const c=window.__STRONGHOLD_COMBAT__;c.teleport(s.u,s.v);c.resetCooldowns()},spot);
  if(touch){const cdp=await p.context().newCDPSession(p),x=width*.2,y=height*.68,l=Math.hypot(sx,sy);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+sx/l*45,y:y+sy/l*45}]});await p.clock.runFor(180);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{for(const k of keys)await p.keyboard.down(k);await p.clock.runFor(180);for(const k of keys)await p.keyboard.up(k);}
  await p.clock.runFor(300);
  // Cursor is deliberately opposite the facing; neutral controls must retain facing.
  await p.mouse.move(sx>0?1:width-1,sy>0?1:height-1);
  if(touch){const a=await snap(),s=a.hudGeometry.sockets[1];await p.touchscreen.tap(s.x,s.y)}else await p.keyboard.press('2');
  const zero=await snap(),d=zero.manualDash.last;assert(d?.distance>.05,heading+' starts');assert(zero.manualDash.travel,heading+' has finite travel');
  const du=d.to.u-d.from.u,dv=d.to.v-d.from.v,x=(du-dv)*64,y=(du+dv)*32;
  assert((x*sx+y*sy)/(Math.hypot(x,y)*Math.hypot(sx,sy))>.98,heading+' follows hero facing despite opposite cursor '+JSON.stringify(d));
  const frames=[];for(let i=0;i<6;i++){await p.clock.runFor(50);const a=await snap();frames.push({ms:(i+1)*50,hero:a.hero,travel:a.manualDash.travel,art:a.vfx.riftDashArt});}
  const mid=frames[1].hero;const progress=Math.hypot(mid.u-d.from.u,mid.v-d.from.v)/d.distance;assert(progress>.15&&progress<.8,heading+' has intermediate position');assert(!frames.at(-1).travel,heading+' completes');assert(Math.hypot(frames.at(-1).hero.u-d.to.u,frames.at(-1).hero.v-d.to.v)<.025,heading+' reaches endpoint');
  assert(!frames[1].art.arrivalVisible,heading+' arrival waits');assert(frames.at(-1).art.arrivalVisible,heading+' arrival at completion');
  cases.push({heading,neutralInput:true,cursorOpposite:true,from:d.from,to:d.to,frames});await fs.writeFile(`${out}/${tag}-${name}-frames.json`,JSON.stringify({name,width,height,touch,cases},null,2));console.log('PASS',name,heading);
  if(process.env.CAPTURE&&heading==='W'){await p.clock.fastForward(1100);await p.evaluate(s=>{const c=window.__STRONGHOLD_COMBAT__;c.teleport(s.u,s.v);c.resetCooldowns()},spot);if(touch){const s=(await snap()).hudGeometry.sockets[1];await p.touchscreen.tap(s.x,s.y)}else await p.keyboard.press('2');await p.clock.runFor(100);const cdp=await p.context().newCDPSession(p),r=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/${tag}-${name}-travel.png`,Buffer.from(r.data,'base64'));await p.clock.fastForward(1100);}
  await p.clock.fastForward(1200);
 }
 report.views.push({name,width,height,touch,cases,passed:true});await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await b.close();b=null;
}assert.deepEqual(report.errors,[]);report.passed=true;}finally{await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await b?.close();await site?.close()}
console.log('PASS',tag,report.views.map(v=>v.name));
