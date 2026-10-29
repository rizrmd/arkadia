// Revenants respect the same ground footprints as the hero and are hidden by the uprights in front of them. Local build
// by default (npm run build first); DEMO_URL=https://… tests a deployed host and writes results-live.json instead.
// The hero stands south of the front spruce at tile (13, 20), beyond its 2-tile engage range; a revenant summoned north of it must walk around
// the trunk to reach the hero. Every revenant is sampled every 100 ms and must never stand inside a footprint.
import{chromium}from'playwright';import{spawn}from'node:child_process';import fs from'node:fs/promises';import sharp from'sharp';
const out='docs/enemy-bounds';await fs.mkdir(out,{recursive:true});const base=process.env.DEMO_URL?.replace(/\/$/,''),server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3065'}}),url=base||'http://127.0.0.1:3065';
await new Promise(r=>setTimeout(r,800));
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const results={};
try{
 const p=await (await browser.newContext({viewport:{width:900,height:700},deviceScaleFactor:2})).newPage();
 await p.addInitScript(()=>localStorage.clear());
 await p.goto(url+'/?time=0.4');await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-hero')?.dataset.x,null,{timeout:60000});
 const api='window.__STRONGHOLD_COMBAT__';
 if(!await p.evaluate(`${api}.teleport(13,23)`))throw Error('Hero could not stand south of the spruce');
 const index=await p.evaluate(`${api}.summon(13,18.4)`);if(index<0)throw Error('Revenant could not be summoned north of the spruce');
 const path=[],blocked=[];
 for(let i=0;i<130;i++){
  const s=await p.evaluate(`${api}.snapshot()`),f=s.foes[index];path.push({t:i*100,u:f.u,v:f.v,state:f.state,hero:[s.hero.u,s.hero.v,s.hero.state]});
  for(const [n,g] of s.foes.entries())if(!g.clear)blocked.push({t:i*100,foe:n,u:g.u,v:g.v});
  await p.waitForTimeout(100);
 }
 const end=path.at(-1),reached=Math.hypot(end.u-13,end.v-23),maxSide=Math.max(...path.map(q=>Math.abs((q.u-q.v)-(13-18.4)))),crossed=path.some(q=>q.v>20.3);
 results.collision={hero:{u:13,v:23},summoned:{u:13,v:18.4},samples:path.length,blockedSamples:blocked.length,blocked:blocked.slice(0,20),crossedTree:crossed,endDistanceTiles:+reached.toFixed(2),maxDetourTiles:+maxSide.toFixed(2),path:path.filter((_,i)=>i%5===0)};
 console.log(JSON.stringify({...results.collision,path:undefined}));
 if(blocked.length)throw Error(`${blocked.length} samples had a revenant inside a footprint`);
 if(!crossed)throw Error('The summoned revenant never got past the spruce');

 // Occlusion: with the hero back in the court revenants lose interest, so one summoned just north of the spruce
 // stands behind it; the trunk and lower boughs must cut it out (leaving the faint ghost the hero also gets).
 const q=p;
 await q.goto(url+'/?time=0.5');await q.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-hero')?.dataset.x,null,{timeout:60000});
 await q.evaluate(`${api}.teleport(12,13)`);const behindIndex=await q.evaluate(`${api}.summon(13.05,19.2)`);if(behindIndex<0)throw Error('No room behind the spruce');await q.waitForTimeout(400);
 // Screen position of the revenant from the hero's foot (the health bar is translated to it) and the camera scale.
 const at=await q.evaluate(i=>{const f=window.__STRONGHOLD_COMBAT__.snapshot().foes[i],m=document.querySelector('#hero-health').style.transform.match(/translate3d\(([-\d.]+)px, ?([-\d.]+)px/),k=Math.max(.65,Math.min(1.35,innerHeight/900));
  return {x:+m[1]+((f.u-12)-(f.v-13))*64*k,y:+m[2]+64*k+((f.u-12)+(f.v-13))*32*k,foe:f};},behindIndex);
 results.occlusion={summoned:at.foe,state:at.foe.state};
 if(!base)await fs.writeFile(out+'/after-behind-tree.webp',await sharp(await q.screenshot({clip:{x:Math.round(at.x-150),y:Math.round(at.y-170),width:300,height:230}})).webp({quality:90}).toBuffer());
}finally{await fs.writeFile(out+(base?'/results-live.json':'/results.json'),JSON.stringify(results,null,1));await browser.close();server?.kill();}
