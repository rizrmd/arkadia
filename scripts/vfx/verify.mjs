// Plays every FX cue of every hero in the FX Lab (/fx-lab) and checks each one: it resolves to effects, they emit
// particles, NixieFX reports no missing textures or unsupported features, and the page logs no errors.
// Writes docs/nixie-fx/verify.json.   LAB=http://127.0.0.1:5173 node scripts/vfx/verify.mjs
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launch} from './browser.mjs';
const LAB=process.env.LAB??'http://127.0.0.1:5173',browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(LAB+'/fx-lab');await page.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:180000});
 const report=await page.evaluate(async()=>{
  const L=window.__FX_LAB__,out=[];L.pause(true);L.hide();
  for(const hero of ['ember-warden','rift-runner']){L.setHero(hero);
   const keys=[...document.querySelectorAll('#fx-cues button')].map(b=>b.textContent);
   for(const key of keys){L.advance(4000);const before=L.stats().played;L.cue(key);L.advance(100);const s=L.stats();
    out.push({hero,key,effects:s.played-before,particles:s.particles,missing:s.missing,unsupported:[...new Set(s.unsupported)]});}
   for(const b of document.querySelectorAll('#fx-skills button')){L.advance(4000);b.click();let peak=0;for(let i=0;i<8;i++){L.advance(100);peak=Math.max(peak,L.stats().particles);}
    const st=L.stats();out.push({hero,key:'skill:'+b.textContent,particles:peak,effects:st.played,missing:st.missing,unsupported:[...new Set(st.unsupported)]});}
  }
  return {cues:out,stats:L.stats()};
 });
 for(const c of report.cues){assert.ok(c.particles>0,`${c.hero} ${c.key} emitted nothing`);assert.deepEqual(c.missing,[],`${c.hero} ${c.key} missing textures`);if(!c.key.startsWith('skill:'))assert.ok(c.effects>0,`${c.hero} ${c.key} played no effect`);}
 assert.deepEqual(report.stats.unsupported,[],'NixieFX unsupported features');
 assert.deepEqual(errors,[],'page errors');
 await fs.mkdir('docs/nixie-fx',{recursive:true});
 const result={checkedAt:new Date().toISOString(),lab:LAB,cues:report.cues.length,effectsInBundle:report.stats.effects,peakParticles:report.stats.peakParticles,passed:true,details:report.cues};
 await fs.writeFile('docs/nixie-fx/verify.json',JSON.stringify(result,null,1)+'\n');
 console.log(JSON.stringify({passed:true,cues:result.cues,effects:result.effectsInBundle,peakParticles:result.peakParticles}));
}finally{await browser.close();}
