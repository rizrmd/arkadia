import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {launch} from '../vfx/browser.mjs';
const base=process.env.GAME||'http://127.0.0.1:18842',tag=process.env.GAME?'live':'local',out='docs/rift-bolt-no-cleave';
await fs.mkdir(out,{recursive:true});
const server=process.env.GAME?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','18842','--strictPort'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('18842'))resolve();});server.on('exit',c=>reject(Error('Vite exited '+c)));});
 const results=[];
 for(const viewport of [{width:1440,height:900},{width:390,height:844}].filter(v=>!process.env.WIDTH||v.width===Number(process.env.WIDTH))){
  console.log('Checking',tag,viewport.width);browser=await launch();
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.routeWebSocket('**/*',()=>{});await page.addInitScript(()=>localStorage.setItem('arkodia.desktop-movement-hint.v1','1'));await page.clock.install();
  await page.goto(base+'/?offline=1&hero=rift-runner&time=0.5');
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
  await page.clock.pauseAt(Date.now()+1000);
  const spot=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();
   for(let u=18;u<30;u+=.25)for(let v=18;v<30;v+=.25)if(c.clear(u,v)&&c.clear(u+2.6,v)&&c.teleport(u,v))return {u,v};throw Error('No clear tile');});
  await page.clock.runFor(500);
  const cast=await page.evaluate(({u,v})=>{const c=window.__STRONGHOLD_COMBAT__;c.summon(u+2.6,v,12);c.resetCooldowns();const before=c.snapshot();const fired=c.castSkill('rift-bolt',{targetU:u+2.6,targetV:v});return {before,after:c.snapshot(),fired};},spot);
  assert.equal(cast.fired,true);assert.equal(cast.after.vfx.activeSlashes,0);assert.equal(cast.after.vfx.activeProjectiles.length,1);
  assert.equal(cast.after.vfx.activeProjectiles[0].kind,'rift-bolt');
  const p=cast.after.vfx.activeProjectiles[0];assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-7.5)<.02);
  const frames=[];
  for(const ms of [80,160,240,400,600]){await page.clock.runFor(ms-(frames.at(-1)?.ms||0));const s=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());assert.equal(s.vfx.activeSlashes,0);frames.push({ms,snapshot:s});
   if([160,400].includes(ms)){const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/${tag}-${viewport.width}-${ms}.png`,Buffer.from(data,'base64'));}}
  assert.ok(frames.some(f=>f.snapshot.foes[0].hp<cast.after.foes[0].hp),'Projectile damages its target');
  await page.clock.fastForward(1000);
  const other=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.resetCooldowns();c.castSkill('cleave');return c.snapshot();});
  assert.ok(other.vfx.activeSlashes>0,'Astral Cleave keeps its slash');assert.equal(errors.length,0,errors.join('\n'));
  results.push({viewport,cast,frames,otherSkillSlashes:other.vfx.activeSlashes,errors});console.log('Passed',viewport.width);await fs.writeFile(`${out}/${tag}.json`,JSON.stringify({base,results},null,2));await browser.close();browser=null;
 }
 await fs.writeFile(`${out}/${tag}.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({base,viewports:results.map(r=>r.viewport),checks:'No bolt slash; projectile speed/count; target damage; Astral Cleave preserved; no page errors'}));
}finally{await browser?.close();server?.kill('SIGTERM');}
