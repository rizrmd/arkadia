import {chromium} from 'playwright';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3074'}}),base=process.env.DEMO_URL||'http://127.0.0.1:3074';let browser;
try{await new Promise(r=>setTimeout(r,500));await fs.mkdir('docs/gateway-lighting',{recursive:true});const result={};
 for(const [phase,time] of [['day',.5],['night',.02],['dusk',.78]]){browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});const page=await browser.newPage({viewport:{width:1000,height:900}});await page.addInitScript(()=>localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:700})));await page.goto(base+'/?time='+time+'&solo=1');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000});await page.waitForTimeout(500);
  result[phase]=await page.locator('#world-gate-doors').evaluate(g=>{const c=g.getContext('2d'),sx=g.width/384,sy=g.height/256,pixel=(x,y)=>[...c.getImageData(Math.round(x*sx),Math.round(y*sy),1,1).data],luma=p=>.299*p[0]+.587*p[1]+.114*p[2];let fire=0;for(let y=Math.floor(124*sy);y<=Math.ceil(152*sy);y++)for(let x=Math.floor(106*sx);x<=Math.ceil(130*sx);x++){const p=[...c.getImageData(x,y,1,1).data];fire=Math.max(fire,luma(p));}return {renderer:g.dataset.renderer,torches:g.dataset.torches,frame:{w:g.width,h:g.height},stone:pixel(60,80),nearTorch:pixel(130,160),door:pixel(194,170),fireLuma:fire};});
  assert.equal(result[phase].renderer,'gateway-lightmap-v3','verified renderer and versioned assets');
  const clip=await page.locator('#world-gate-doors').evaluate(g=>{const r=g.getBoundingClientRect();return {x:r.x-20,y:r.y-20,width:r.width+40,height:Math.min(r.height+40,innerHeight-r.y+20)};});await page.screenshot({path:`docs/gateway-lighting/${phase}.png`,clip});
  if(phase==='night'){
   await page.locator('.clock-presets [data-t="0.5"]').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#world-layers').dataset.phase==='Day');await page.waitForTimeout(350);
   const noon=await page.locator('#world-gate-doors').evaluate(g=>[...g.getContext('2d').getImageData(Math.round(60*g.width/384),Math.round(80*g.height/256),1,1).data]);assert(noon.slice(0,3).every((v,i)=>Math.abs(v-result.day.stone[i])<=1),'switching night to noon restores a white shared lightmap');
   await page.locator('.clock-presets [data-t="0"]').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#world-layers').dataset.phase==='Night');await page.waitForTimeout(350);
   const back=await page.locator('#world-gate-doors').evaluate(g=>[...g.getContext('2d').getImageData(Math.round(60*g.width/384),Math.round(80*g.height/256),1,1).data]);assert(back.slice(0,3).every((v,i)=>Math.abs(v-result.night.stone[i])<=1),'switching back restores night lighting');result.clockTransitionsPassed=true;
  }
  await browser.close();browser=null;
 }
 const luma=p=>.299*p[0]+.587*p[1]+.114*p[2],far=luma(result.night.stone)/luma(result.day.stone),near=luma(result.night.nearTorch)/luma(result.day.nearTorch);
 assert(far<.6,'unlit masonry follows night ambient');assert(near>far*1.5,'torch pools illuminate gateway masonry');assert(result.night.fireLuma>180,'torch emission remains bright at night');
 result.ratios={nightAmbient:far,nightTorch:near};await fs.writeFile('docs/gateway-lighting/lighting.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server?.kill();}
