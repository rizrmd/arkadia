// Verifies the interactive Embedded Skill Player (/skill-player/?hero=...&skill=...&controls=simple)
// across all 10 hero skills (5 Ember Warden + 5 Rift Runner), testing the Cue/Stage Switcher,
// 8-Direction Switcher (N, NE, E, SE, S, SW, W, NW), Play/Replay button, Loop/Once toggle,
// and Night/Day Background Switcher, and captures inline .webp preview images for Knowledge.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
import {launch} from './browser.mjs';

const SKILLS_BY_HERO={
 'ember-warden':[
  {id:'flame-fan',ms:220,dir:'SE'},
  {id:'cinder-step',ms:300,dir:'SE'},
  {id:'ember-snare',ms:720,dir:'SE'},
  {id:'cleave',ms:360,dir:'SE'},
  {id:'shockwave',ms:520,dir:'SE'},
 ],
 'rift-runner':[
  {id:'rift-bolt',ms:220,dir:'SE',bg:'day'},
  {id:'rift-dash',ms:300,dir:'SE'},
  {id:'rift-trap',ms:720,dir:'SE'},
  {id:'cleave',ms:360,dir:'SE'},
  {id:'shockwave',ms:520,dir:'SE'},
 ],
};

let serverProc=null;
let baseUrl=process.env.LAB||'';
if(!baseUrl){
 const port=18920+(process.pid%500);
 serverProc=spawn('npx',['vite','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','inherit']});
 await new Promise((ok,no)=>{
  const timer=setTimeout(()=>no(new Error('Vite dev server timeout')),30000);
  serverProc.stdout.on('data',d=>{
   if(String(d).includes(String(port))){clearTimeout(timer);ok();}
  });
  serverProc.on('exit',c=>{clearTimeout(timer);no(new Error('Vite exited '+c));});
 });
 baseUrl=`http://127.0.0.1:${port}`;
}

await fs.mkdir('docs/nixie-fx',{recursive:true});
await fs.mkdir('public/docs/nixie-fx',{recursive:true});

const results=[];
let browser=null;
try{
 browser=await launch();
 const page=await (await browser.newContext({viewport:{width:960,height:520},deviceScaleFactor:1})).newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

 for(const [hero,skills] of Object.entries(SKILLS_BY_HERO)){
  for(const item of skills){
   const url=`${baseUrl}/skill-player/?hero=${hero}&skill=${item.id}&dir=${item.dir}${item.bg?`&bg=${item.bg}`:''}&controls=simple`;
   await page.goto(url);
   await page.waitForFunction(()=>document.body.dataset.fxLab==='ready'&&window.skillPlayer?.stats()?.ready===true,null,{timeout:120000});

   // Verify simple embed mode controls exist and are in English
   const uiCheck=await page.evaluate(()=>{
    const lab=document.querySelector('#fx-lab');
    const dirs=[...document.querySelectorAll('#sp-headings button')].map(b=>b.textContent.trim());
    const cues=[...document.querySelectorAll('#sp-cues button')].map(b=>b.textContent.trim());
    const playText=document.querySelector('#sp-play')?.textContent?.trim();
    const loopText=document.querySelector('#sp-loop')?.textContent?.trim();
    const onceText=document.querySelector('#sp-once')?.textContent?.trim();
    const nightText=document.querySelector('#sp-bg-night')?.textContent?.trim();
    const dayText=document.querySelector('#sp-bg-day')?.textContent?.trim();
    return {
     controlsMode:lab?.dataset.controls,
     dirs,
     cues,
     playText,
     loopText,
     onceText,
     nightText,
     dayText,
     state:window.skillPlayer.state(),
    };
   });

   assert.equal(uiCheck.controlsMode,'simple','Expected simple controls mode');
   assert.deepEqual(uiCheck.dirs,['N','NE','E','SE','S','SW','W','NW'],'Expected 8 directions');
   assert.ok(uiCheck.cues.includes('Full Sequence'),'Expected Full Sequence cue button');
   assert.ok(uiCheck.cues.length>=3,`Expected at least 3 cue buttons for ${hero} ${item.id}, got ${uiCheck.cues.join(',')}`);
   assert.equal(uiCheck.playText,'Play / Replay');
   assert.equal(uiCheck.loopText,'Loop');
   assert.equal(uiCheck.onceText,'Once');
   assert.equal(uiCheck.nightText,'Night');
   assert.equal(uiCheck.dayText,'Day');

   // Step to the peak moment and capture the inline preview screenshot
   const shotStats=await page.evaluate(([skillId,ms])=>{
    const P=window.skillPlayer;
    P.pause(true);
    P.advance(3500);
    P.play(skillId);
    let peak=0;
    const steps=Math.max(1,Math.round(ms/16.67));
    for(let i=0;i<steps;i++){
     P.advance(16.67);
     peak=Math.max(peak,P.stats().particles);
    }
    return {particles:P.stats().particles,peak,live:P.stats().live,missing:P.stats().missing, badge:document.querySelector('#sp-badge')?.textContent};
   },[item.id,item.ms]);

   assert.ok(shotStats.peak>0,`${hero} ${item.id} emitted 0 particles`);
   assert.deepEqual(shotStats.missing,[],`${hero} ${item.id} missing textures`);

   const pngBuf=await page.screenshot({type:'png'});
   const webpName=`skill-${hero}-${item.id}.webp`;
   await sharp(pngBuf).webp({quality:90}).toFile(`docs/nixie-fx/${webpName}`);
   await sharp(pngBuf).webp({quality:90}).toFile(`public/docs/nixie-fx/${webpName}`);

   // Test interactive controls: 8-direction switcher, Cue switcher, Loop/Once, Night/Day, Play/Replay
   const interactionCheck=await page.evaluate(()=>{
    const P=window.skillPlayer;
    const dirClips={};
    for(const d of ['N','NE','E','SE','S','SW','W','NW']){
     document.querySelector(`#dir-${d}`).click();
     P.pause(true);
     P.advance(250);
     const st=P.state();
     dirClips[d]={clip:st.heroClip,frame:st.heroFrame,flip:st.heroFlip};
    }
    document.querySelector('#dir-NW').click();
    const afterDir=P.state().dir;
    const cueBtns=[...document.querySelectorAll('#sp-cues button')];
    cueBtns[1].click();
    const afterCue=P.state().cue;
    document.querySelector('#sp-once').click();
    const afterOnce=P.state().repeat;
    document.querySelector('#sp-loop').click();
    const afterLoop=P.state().repeat;
    document.querySelector('#sp-bg-day').click();
    const afterDay=P.state().bg;
    document.querySelector('#sp-bg-night').click();
    const afterNight=P.state().bg;
    document.querySelector('#sp-play').click();
    P.advance(120);
    return {dirClips,afterDir,afterCue,afterOnce,afterLoop,afterDay,afterNight,particlesAfterReplay:P.stats().particles};
   });

   for(const d of ['N','NE','E','SE','S','SW','W','NW']){
    assert.equal(interactionCheck.dirClips[d].clip,`attack-${d}`,`Expected attack-${d} in ${hero} ${item.id}`);
    assert.equal(interactionCheck.dirClips[d].flip,d==='SW'||d==='W'||d==='NW',`Expected flip=${d==='SW'||d==='W'||d==='NW'} for ${d}`);
   }
   assert.equal(interactionCheck.afterDir,'NW');
   assert.notEqual(interactionCheck.afterCue,'full');
   assert.equal(interactionCheck.afterOnce,false);
   assert.equal(interactionCheck.afterLoop,true);
   assert.equal(interactionCheck.afterDay,'day');
   assert.equal(interactionCheck.afterNight,'night');
   assert.ok(interactionCheck.particlesAfterReplay>0);

   results.push({
    hero,
    skill:item.id,
    cues:uiCheck.cues,
    dirs:uiCheck.dirs,
    peakParticles:shotStats.peak,
    particlesAtShot:shotStats.particles,
    badge:shotStats.badge,
    preview:`docs/nixie-fx/${webpName}`,
   });
  }
 }
 assert.deepEqual(errors,[],`Unexpected page/console errors: ${errors.join('; ')}`);
 const summary={checkedAt:new Date().toISOString(),totalSkills:results.length,passed:true,results};
 await fs.writeFile('docs/nixie-fx/skill-player-verify.json',JSON.stringify(summary,null,2)+'\n');
 await fs.writeFile('public/docs/nixie-fx/skill-player-verify.json',JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({passed:true,totalSkills:results.length,previews:results.map(r=>r.preview)}));
}finally{
 await browser?.close();
 serverProc?.kill();
}
