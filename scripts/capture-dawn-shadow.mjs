// Captures the hero's and a revenant's sun shadows from sunrise to sunset (npm run build first). Usage:
// node scripts/capture-dawn-shadow.mjs <prefix>. Each shadow must start at the feet at every sun angle, the
// low dawn and dusk sun included, where a flat silhouette sheared along its own width collapses to a thin
// streak that starts away from the feet.
import{chromium}from'playwright';import{spawn}from'node:child_process';import fs from'node:fs/promises';import sharp from'sharp';
const prefix=process.argv[2]||'after',out='docs/dawn-shadow';await fs.mkdir(out,{recursive:true});
const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:'3066'}});const url='http://127.0.0.1:3066';
await new Promise(r=>setTimeout(r,800));
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const times=[['0.2','04-48'],['0.25','06-00'],['0.28','06-43'],['0.5','12-00'],['0.75','18-00']],tiles=[],DSF=3;
try{for(const [time,name] of times){const browser=await launch();const ctx=await browser.newContext({viewport:{width:900,height:700},deviceScaleFactor:DSF});const p=await ctx.newPage();
 await p.addInitScript(()=>localStorage.clear());
 await p.goto(url+'/?time='+time);await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-hero')?.dataset.x,null,{timeout:60000});
 const shot=async(dx,dy,width,height)=>{const b=await p.evaluate(()=>{const r=document.querySelector('#world-hero').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  return p.screenshot({clip:{x:b.x+dx,y:b.y+dy,width,height}});};
 // The hero idles at the tent on the open court; then stands safe just inside the gate, so a revenant summoned
 // on the open snow below stays idle.
 await p.waitForTimeout(800);const hero=await shot(-120,-60,240,150);
 const placed=await p.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;return c.teleport(13.2,13)&&c.snapshot().hero.safe&&c.summon(16.4,16.2)>=0;});
 if(!placed)throw Error('hero or revenant could not be placed');await p.waitForTimeout(1500);
 const foe=await shot(-30,85,240,150);
 const png=await sharp({create:{width:480*DSF,height:150*DSF,channels:3,background:'#000'}}).composite([{input:hero,left:0,top:0},{input:foe,left:240*DSF,top:0}]).png().toBuffer();tiles.push(png);
 await fs.writeFile(`${out}/${prefix}-${name}.webp`,await sharp(png).webp({quality:90}).toBuffer());console.log(prefix,name,'saved');
 await browser.close();}
 // One strip of every sun angle for the knowledge page.
 const w=480*DSF,h=150*DSF;
 await sharp({create:{width:w,height:h*tiles.length,channels:3,background:'#000'}}).composite(tiles.map((t,i)=>({input:t,top:i*h,left:0}))).png().toBuffer().then(b=>sharp(b).resize(Math.round(w/2)).webp({quality:88}).toFile(`${out}/${prefix}-strip.webp`));}
finally{server.kill();}
