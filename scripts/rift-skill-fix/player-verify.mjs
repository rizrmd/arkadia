import {chromium} from 'playwright';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,tag=remote?'live':'local',out='docs/rift-skill-fix';await fs.mkdir(out,{recursive:true});
let home,gateway,browser;
const base=remote||'http://127.0.0.1:5290';
const report={tag,url:base+'/rift-dash/player/',checkedAt:new Date().toISOString(),views:{},errors:[]};
try{
 if(!remote){
  home=await fs.mkdtemp(path.join(os.tmpdir(),'rift-player-'));
  await fs.mkdir(home+'/www/rift-dash',{recursive:true});
  await fs.cp('dist-rift-dash',home+'/www/rift-dash/player',{recursive:true});
  await fs.writeFile(home+'/www/index.html','<title>Main game sentinel</title>');
  await fs.copyFile('scripts/arkodia/gateway.mjs',home+'/gateway.mjs');
  await fs.copyFile('scripts/arkodia/apply-json-layer.mjs',home+'/apply-json-layer.mjs');
  gateway=spawn(process.execPath,['gateway.mjs'],{cwd:home,env:{...process.env,PORT:'5290',COOP_PORT:'5291'},stdio:'ignore'});
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 }
 assert.equal((await fetch(base+'/rift-dash/missing/')).status,404,'missing review never returns main game');
 assert.match(await (await fetch(base+'/rift-dash/player/')).text(),/Rift Dash · VFX Player/);
 for(const [name,width,height,touch]of [['desktop',1440,900,false],['portrait',390,844,true],['landscape',844,390,true],['embed',760,560,false]]){
  browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(report.url);await page.waitForFunction(()=>window.__RIFT_DASH_PLAYER__?.snapshot().ready,null,{timeout:60000});
  const snap=()=>page.evaluate(()=>window.__RIFT_DASH_PLAYER__.snapshot());
  const click=async label=>{const b=(await snap()).buttons[label];assert(b,`${label} exists`);assert(b.y>=0&&b.y+b.h<=height&&b.x>=0&&b.x+b.w<=width,`${label} fits`);if(touch)await page.touchscreen.tap(b.x+b.w/2,b.y+b.h/2);else await page.mouse.click(b.x+b.w/2,b.y+b.h/2);await page.waitForTimeout(60);};
  await click('Pause');const paused=(await snap()).time;await page.waitForTimeout(100);assert.equal((await snap()).time,paused);
  const poses={};
  for(const [phase,ms] of [['Departure',80],['Travel',220],['Arrival',420],['Dissipate',820]]){await click(phase);const s=await snap();assert.equal(s.time,ms);assert.equal(s.art.ghosts,ms===80?4:5);assert(s.art.active);poses[phase]=s.actorPosition;}
  assert(Math.hypot(poses.Arrival.x-poses.Departure.x,poses.Arrival.y-poses.Departure.y)>20,'actor actually displaces');
  for(const dir of ['N','NE','E','SE','S','SW','W','NW']){await click(dir);assert.equal((await snap()).direction,dir);}
  await click('NE');await click('Travel');await page.screenshot({path:`${out}/${tag}-player-${name}.png`});
  await click('Slow ×0.35');assert.equal((await snap()).speed,.35);await click('Replay');assert((await snap()).playing);
  const {from}= (await snap()).geometry;
  if(touch){
   const cdp=await page.context().newCDPSession(page);
   const point={x:Math.round(from.x),y:Math.round(from.y)};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+55,y:point.y}]});
   await page.waitForTimeout(60);assert((await snap()).aimDragging);assert.equal((await snap()).playing,false);assert.equal((await snap()).direction,'E');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(from.x+55,from.y);await page.waitForTimeout(60);assert((await snap()).aimDragging);assert.equal((await snap()).playing,false);await page.mouse.up();}
  await page.waitForTimeout(80);assert.equal((await snap()).aimDragging,false);assert((await snap()).playing);assert.equal((await snap()).direction,'E');
  if(!touch){await click('Arrival');await page.keyboard.press('Space');assert((await snap()).playing);}
  assert.equal(await page.locator('button,input,select').count(),0);assert.equal(await page.locator('canvas').count(),1);
  report.views[name]={pass:true,input:touch?'CDP touch drag and tap (emulated)':'mouse drag, clicks and Space',poses,snapshot:await snap()};
  await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();gateway?.kill('SIGTERM');if(home)await fs.rm(home,{recursive:true,force:true});await fs.writeFile(`${out}/${tag}-player-verification.json`,JSON.stringify(report,null,2));}
