// Screenshots of skill FX in the real game (offline mode): stands the hero in the wilds with sturdy revenants
// ahead, casts a skill through window.__STRONGHOLD_COMBAT__ and captures it at given milliseconds. The page clock is
// paused (Playwright fake timers drive requestAnimationFrame), so each shot is that exact moment of game time
// however slow the renderer is.
//   GAME=http://127.0.0.1:5173 node scripts/vfx/capture-game.mjs ember-warden flame-fan 120,300 [0.9 = night]
//   node scripts/vfx/capture-game.mjs --all-ember
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
import {launch} from './browser.mjs';

const args=process.argv.slice(2);
const isAllEmber=args.includes('--all-ember');

let serverProc=null;
let GAME=process.env.GAME||'';
if(!GAME){
 const port=18950+(process.pid%400);
 serverProc=spawn('npx',['vite','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','inherit']});
 await new Promise((ok,no)=>{
  const timer=setTimeout(()=>no(new Error('Vite dev server timeout')),30000);
  serverProc.stdout.on('data',d=>{if(String(d).includes(String(port))){clearTimeout(timer);ok();}});
  serverProc.on('exit',c=>{clearTimeout(timer);no(new Error('Vite exited '+c));});
 });
 GAME=`http://127.0.0.1:${port}`;
}

const OUT=process.env.OUT??'docs/nixie-fx';
await fs.mkdir(OUT,{recursive:true});
await fs.mkdir('public/docs/nixie-fx',{recursive:true});

const EMBER_SKILLS=[
 {id:'flame-fan',label:'Flame Fan',ms:240,targetOffset:[2.45,0.0],foes:[[2.35,-0.55],[2.45,0.05],[2.25,0.65]]},
 {id:'cinder-step',label:'Cinder Step',ms:300,targetOffset:[1.45,0.0],foes:[[1.38,-0.22],[1.48,0.22]]},
 {id:'ember-snare',label:'Ember Snare',ms:720,targetOffset:[2.25,0.0],foes:[[2.20,-0.12],[2.35,0.22]]},
 {id:'cleave',label:'Astral Cleave',ms:360,targetOffset:[1.45,0.0],foes:[[1.38,-0.25],[1.48,0.22]]},
 {id:'shockwave',label:'Seismic Slam (Molten)',ms:520,targetOffset:[1.35,0.0],foes:[[-1.35,-0.15],[1.45,0.18]]},
];

const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:760}});
 await page.routeWebSocket('**/*',()=>{});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.clock.install();

 if(isAllEmber){
  for(const mode of [{tag:'day',time:'0.5'},{tag:'night',time:'0.9'}]){
   await page.clock.resume();
   await page.goto(`${GAME}/?offline=1&hero=ember-warden&time=${mode.time}`);
   await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
   await page.clock.pauseAt(Date.now()+200);

   const baseSpot=await page.evaluate(()=>{
    const c=window.__STRONGHOLD_COMBAT__;
    c.setPreviewMode?.(true);
    c.setHudVisible?.(false);
    c.clearFoes?.();
    document.querySelectorAll('button').forEach(b=>{b.style.display='none';});
    for(let u=18;u<30;u+=.25)for(let v=18;v<30;v+=.25){
     if(c.clear(u,v)&&c.clear(u-1.5,v)&&c.clear(u+2.6,v-.6)&&c.clear(u+2.5,v+.7)&&c.teleport(u,v)){
      return {u,v};
     }
    }
    throw Error('no clear tile');
   });

   for(const sk of EMBER_SKILLS){
    await page.evaluate(([u,v])=>{
     const c=window.__STRONGHOLD_COMBAT__;
     while(c.isModalOpen()&&c.snapshot().run.offers[0])c.choose(c.snapshot().run.offers[0]);
     c.setPreviewMode?.(true);
     c.clearFoes?.();
     c.setHudVisible?.(false);
     c.teleport(u,v);
     c.resetCooldowns();
    },[baseSpot.u,baseSpot.v]);
    // Wait for previous skill particles to finish with no foes walking around
    await page.clock.runFor(2200);
    await page.evaluate(([u,v,foeList])=>{
     const c=window.__STRONGHOLD_COMBAT__;
     c.setPreviewMode?.(true);
     c.clearFoes?.();
     c.teleport(u,v);
     for(const [du,dv] of foeList)c.summon(u+du,v+dv,25);
     c.setHudVisible?.(false);
     c.resetCooldowns();
    },[baseSpot.u,baseSpot.v,sk.foes]);
    await page.clock.runFor(16);
    await page.evaluate(([s,u,v,du,dv])=>{
     const c=window.__STRONGHOLD_COMBAT__;
     c.setHudVisible?.(false);
     c.castSkill(s,{targetU:u+du,targetV:v+dv});
    },[sk.id,baseSpot.u,baseSpot.v,sk.targetOffset[0],sk.targetOffset[1]]);

    let peakParticles=0;
    const stepMs=16;
    const steps=Math.max(1,Math.round(sk.ms/stepMs));
    for(let i=0;i<steps;i++){
     await page.clock.runFor(stepMs);
     const p=await page.evaluate(()=>{
      const c=window.__STRONGHOLD_COMBAT__;
      c.setHudVisible?.(false);
      return c.snapshot().vfx.fx.particles;
     });
     peakParticles=Math.max(peakParticles,p);
    }

    const buf=await page.screenshot({type:'png'});
    const meta=await sharp(buf).metadata();
    const cropW=760,cropH=520;
    const left=Math.max(0,Math.round((meta.width-cropW)/2)+24);
    const top=Math.max(0,Math.round((meta.height-cropH)/2)-12);
    const cropped=await sharp(buf).extract({left,top,width:cropW,height:cropH}).webp({quality:90}).toBuffer();

    const outName=`game-ember-warden-${sk.id}-${mode.tag}.webp`;
    await fs.writeFile(`${OUT}/${outName}`,cropped);
    await fs.writeFile(`public/docs/nixie-fx/${outName}`,cropped);
    if(sk.id==='flame-fan'){
     const legacyName=mode.tag==='day'?'game-flame-fan-day.webp':'game-flame-fan.webp';
     await fs.writeFile(`${OUT}/${legacyName}`,cropped);
     await fs.writeFile(`public/docs/nixie-fx/${legacyName}`,cropped);
    }
    const stats=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.fx);
    console.log(JSON.stringify({mode:mode.tag,skill:sk.id,outName,particles:stats.particles,peakParticles,live:stats.live,missing:stats.missing}));
   }
  }

  // Build 5-panel daytime composite matching the approved concept layout (3 top, 2 bottom)
  const panelW=440,panelH=320,gap=16,pad=20;
  const compW=pad*2+panelW*3+gap*2,compH=pad*2+panelH*2+gap;
  const composites=[];
  const positions=[
   [pad,pad],
   [pad+panelW+gap,pad],
   [pad+(panelW+gap)*2,pad],
   [pad+Math.round((panelW+gap)*0.5),pad+panelH+gap],
   [pad+Math.round((panelW+gap)*1.5),pad+panelH+gap],
  ];
  for(let i=0;i<EMBER_SKILLS.length;i++){
   const sk=EMBER_SKILLS[i];
   const [x,y]=positions[i];
   const imgBuf=await sharp(`${OUT}/game-ember-warden-${sk.id}-day.webp`).resize(panelW,panelH,{fit:'cover'}).toBuffer();
   const svgLabel=Buffer.from(`<svg width="${panelW}" height="${panelH}">
    <rect x="0" y="0" width="${panelW}" height="34" fill="rgba(14,20,26,0.78)"/>
    <rect x="0" y="0" width="${panelW}" height="${panelH}" fill="none" stroke="rgba(201,168,106,0.65)" stroke-width="2"/>
    <text x="${panelW/2}" y="23" font-family="Georgia,serif" font-size="17" font-weight="bold" fill="#fff4d8" text-anchor="middle">${sk.label}</text>
   </svg>`);
   const labeled=await sharp(imgBuf).composite([{input:svgLabel,top:0,left:0}]).toBuffer();
   composites.push({input:labeled,left:x,top:y});
  }
  const compBuf=await sharp({create:{width:compW,height:compH,channels:4,background:{r:18,g:24,b:30,alpha:1}}})
   .composite(composites)
   .webp({quality:90})
   .toBuffer();
  await fs.writeFile(`${OUT}/ember-warden-skills-day-result.webp`,compBuf);
  await fs.writeFile(`public/docs/nixie-fx/ember-warden-skills-day-result.webp`,compBuf);
  console.log('Saved 5-panel daytime composite: docs/nixie-fx/ember-warden-skills-day-result.webp');
 }else{
  const [hero='ember-warden',skill='flame-fan',msArg='120,300',timeArg='0.9']=args;
  const time=timeArg.replace('time=','');
  await page.goto(`${GAME}/?offline=1&hero=${hero}&time=${time}`);
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
  const spot=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;
   c.setHudVisible?.(false);
   document.querySelectorAll('button').forEach(b=>{b.style.display='none';});
   for(let u=18;u<30;u+=.25)for(let v=18;v<30;v+=.25)if(c.clear(u,v)&&c.clear(u+2.6,v-.4)&&c.clear(u+2.4,v+.6)&&c.teleport(u,v)){
    const a=c.summon(u+2.6,v-.5,12),b=c.summon(u+2.3,v+.7,12),d=c.summon(u+3.2,v+.1,12);return {u,v,a,b,d};}
   throw Error('no clear tile');});
  const moments=msArg.split(',').map(Number),shots=[];
  await page.clock.pauseAt(Date.now()+200);
  await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;while(c.isModalOpen()&&c.snapshot().run.offers[0])c.choose(c.snapshot().run.offers[0]);c.setHudVisible?.(false);c.resetCooldowns();});
  await page.clock.runFor(32);
  await page.evaluate(([s,u,v])=>{const c=window.__STRONGHOLD_COMBAT__;c.setHudVisible?.(false);c.castSkill(s,{targetU:u+2.6,targetV:v});},[skill,spot.u,spot.v]);
  let at=0;
  for(const ms of moments){
   await page.clock.runFor(ms-at);at=ms;
   await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;while(c.isModalOpen()&&c.snapshot().run.offers[0])c.choose(c.snapshot().run.offers[0]);c.setHudVisible?.(false);});
   const file=`${OUT}/game-${hero}-${skill}-${time.replace('.','')}-${ms}.png`;await page.screenshot({path:file});
   shots.push({file,fx:await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.fx)});
  }
  console.log(JSON.stringify({spot,errors,shots:shots.map(s=>({file:s.file,particles:s.fx.particles,live:s.fx.live,missing:s.fx.missing}))}));
 }
}finally{
 await browser.close();
 if(serverProc)serverProc.kill('SIGTERM');
}
