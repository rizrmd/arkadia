// Screenshots of skill FX in the real game (offline mode): stands the hero in the wilds with sturdy revenants
// ahead, casts a skill through window.__STRONGHOLD_COMBAT__ and captures it at given milliseconds. The page clock is
// paused (Playwright fake timers drive requestAnimationFrame), so each shot is that exact moment of game time
// however slow the renderer is.
//   GAME=http://127.0.0.1:5173 node scripts/vfx/capture-game.mjs ember-warden flame-fan 120,300 [0.9 = night]
import fs from 'node:fs/promises';
import {launch} from './browser.mjs';
const [hero='ember-warden',skill='flame-fan',msArg='120,300',timeArg='0.9']=process.argv.slice(2);
const GAME=process.env.GAME??'http://127.0.0.1:5173',OUT=process.env.OUT??'docs/nixie-fx',time=timeArg.replace('time=','');
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:Number(process.env.W??1280),height:Number(process.env.H??760)}});
 await page.routeWebSocket('**/*',()=>{});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.clock.install();
 await page.goto(`${GAME}/?offline=1&hero=${hero}&time=${time}`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 const spot=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;
  for(let u=18;u<30;u+=.25)for(let v=18;v<30;v+=.25)if(c.clear(u,v)&&c.clear(u+2.6,v-.4)&&c.clear(u+2.4,v+.6)&&c.teleport(u,v)){
   const a=c.summon(u+2.6,v-.5,12),b=c.summon(u+2.3,v+.7,12),d=c.summon(u+3.2,v+.1,12);return {u,v,a,b,d};}
  throw Error('no clear tile');});
 await fs.mkdir(OUT,{recursive:true});
 const moments=msArg.split(',').map(Number),shots=[];
 await page.clock.pauseAt(Date.now()+200);
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;while(c.isModalOpen()&&c.snapshot().run.offers[0])c.choose(c.snapshot().run.offers[0]);c.resetCooldowns();});
 await page.clock.runFor(32);
 await page.evaluate(([s,u,v])=>window.__STRONGHOLD_COMBAT__.castSkill(s,{targetU:u+2.6,targetV:v}),[skill,spot.u,spot.v]);
 let at=0;
 for(const ms of moments){
  await page.clock.runFor(ms-at);at=ms;
  await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;while(c.isModalOpen()&&c.snapshot().run.offers[0])c.choose(c.snapshot().run.offers[0]);});
  const file=`${OUT}/game-${hero}-${skill}-${time.replace('.','')}-${ms}.png`;await page.screenshot({path:file});
  shots.push({file,fx:await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.fx)});
 }
 console.log(JSON.stringify({spot,errors,shots:shots.map(s=>({file:s.file,particles:s.fx.particles,live:s.fx.live,missing:s.fx.missing}))}));
}finally{await browser.close();}
