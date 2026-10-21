// Captures the Stronghold hero at night, morning, noon and evening (npm run build first): the only shadow
// under the hero is the sun-cast silhouette, so night shows none and each daytime shot follows the sun.
import{chromium}from'playwright';import{spawn}from'node:child_process';import fs from'node:fs/promises';import sharp from'sharp';
const out='docs/hero-shadow';const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:'3063'}});const url='http://127.0.0.1:3063';
await new Promise(r=>setTimeout(r,800));
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
try{for(const [time,name] of [['0','night'],['0.31','morning'],['0.5','noon'],['0.7','evening']]){const browser=await launch();const ctx=await browser.newContext({viewport:{width:1000,height:800},deviceScaleFactor:2});const p=await ctx.newPage();
 await p.goto(url+'/stronghold.html?time='+time);await p.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await p.waitForTimeout(2000);
 // Pixels of the hero canvas below the foot row that are not covered by the sprite: the old ellipse painted these at every hour.
 const info=await p.evaluate(()=>{const c=document.querySelector('#world-hero');const r=c.getBoundingClientRect();const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return {box:{x:r.x,y:r.y,width:r.width,height:r.height},opaque:n,total:d.length/4};});
 console.log(name,info.opaque,'/',info.total);
 const b=info.box;await fs.writeFile(`${out}/${name}.webp`,await sharp(await p.screenshot({clip:{x:b.x-20,y:b.y-20,width:b.width+40,height:b.height+40}})).webp({quality:85}).toBuffer());
 await browser.close();}}
finally{server.kill();}
