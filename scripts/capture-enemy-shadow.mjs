// Captures revenants around the hero in the wilds at morning, noon and night (npm run build first). Usage:
// node scripts/capture-enemy-shadow.mjs <prefix>. Enemies should cast the same sun silhouette as the hero, none at night.
import{chromium}from'playwright';import{spawn}from'node:child_process';import fs from'node:fs/promises';import sharp from'sharp';
const prefix=process.argv[2]||'after',out='docs/enemy-bounds';const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:'3064'}});const url='http://127.0.0.1:3064';
await new Promise(r=>setTimeout(r,800));
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
try{for(const [time,name] of [['0.31','morning'],['0.5','noon'],['0','night']]){const browser=await launch();const ctx=await browser.newContext({viewport:{width:900,height:700},deviceScaleFactor:2});const p=await ctx.newPage();
 await p.addInitScript(()=>localStorage.clear());
 await p.goto(url+'/?time='+time);await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-hero')?.dataset.x,null,{timeout:60000});
 await p.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(17.2,16.2));
 await p.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().foes.length>=2,null,{timeout:30000});await p.waitForTimeout(2600);
 const b=await p.evaluate(()=>{const r=document.querySelector('#world-hero').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 const clip={x:Math.max(0,b.x-220),y:Math.max(0,b.y-170),width:440,height:300};
 await fs.writeFile(`${out}/${prefix}-${name}.webp`,await sharp(await p.screenshot({clip})).webp({quality:88}).toBuffer());console.log(prefix,name,'saved');
 await browser.close();}}
finally{server.kill();}
