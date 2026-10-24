// Screenshots of skill FX in the FX Lab (/fx-lab) at fixed moments of each skill, for review and Knowledge.
//   LAB=http://127.0.0.1:5173 node scripts/vfx/capture.mjs [hero:skill@ms,ms …]   → docs/nixie-fx/<hero>-<skill>-<ms>.png
import fs from 'node:fs/promises';
import {launch} from './browser.mjs';
const LAB=process.env.LAB??'http://127.0.0.1:5173',OUT=process.env.OUT??'docs/nixie-fx';
const shots=(process.argv.slice(2).length?process.argv.slice(2):['ember-warden:flame-fan@120,300']).map(s=>{const [hs,ms]=s.split('@'),[hero,skill]=hs.split(':');return {hero,skill,at:(ms??'200').split(',').map(Number)};});
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:Number(process.env.W??1280),height:Number(process.env.H??760)},deviceScaleFactor:1});
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('[page]',m.text());});
 await page.goto(LAB+'/fx-lab?aim='+(process.env.AIM??'20')+(process.env.BG?'&bg='+process.env.BG:''));
 await page.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:120000});
 if(!process.env.PANEL)await page.evaluate(()=>window.__FX_LAB__.hide());
 await fs.mkdir(OUT,{recursive:true});
 const out=[];
 for(const s of shots){
  await page.evaluate(h=>window.__FX_LAB__.setHero(h),s.hero);await page.waitForTimeout(400);
  // Restart per moment so each shot is the same seedless replay at a known delay.
  for(const ms of s.at){
   // The lab is paused and stepped at 60 fps, so a shot shows exactly that moment however slow the renderer is.
   await page.evaluate(([skill,ms])=>{const L=window.__FX_LAB__;L.pause(true);L.play(skill);L.advance(ms);},[s.skill,ms]);
   await page.waitForTimeout(60);
   const file=`${OUT}/${s.hero}-${s.skill}-${ms}.png`;await page.screenshot({path:file});
   out.push({file,stats:await page.evaluate(()=>window.__FX_LAB__.stats())});
   await page.evaluate(()=>window.__FX_LAB__.advance(3000));
  }
 }
 console.log(JSON.stringify(out.map(o=>({file:o.file,particles:o.stats.particles,live:o.stats.live,missing:o.stats.missing,unsupported:[...new Set(o.stats.unsupported)]}))));
}finally{await browser.close();}
