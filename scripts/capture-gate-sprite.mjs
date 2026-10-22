import{chromium}from'playwright';import{spawn}from'node:child_process';import fs from'node:fs/promises';import sharp from'sharp';
// Screenshots of the sprite-sheet gate in the running game: mid-opening (leaves swinging, dust at their feet) and the
// closing thud (dust cloud at the threshold). Local build by default; DEMO_URL=https://… captures a deployed host.
const out='docs/gate-sprite';await fs.mkdir(out,{recursive:true});
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3069'}});let browser;
try{await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:577,y:640})));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3069')+'/?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(1200);
 const shot=async(name,frames)=>{await page.waitForFunction(f=>f.includes(+document.querySelector('#world-gate-doors').dataset.frame),frames,{polling:16,timeout:15000});
  const r=await page.evaluate(()=>{const b=document.querySelector('#world-gate-doors').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};});
  const clip={x:Math.max(0,r.x-r.w*.9),y:Math.max(0,r.y-r.h*.35),width:r.w*2.8,height:r.h*1.9};await fs.writeFile(`${out}/${name}.webp`,await sharp(await page.screenshot({clip})).webp({quality:85}).toBuffer());};
 await page.keyboard.down('s');await shot('opening',[6,7,8]);await page.waitForFunction(()=>+document.querySelector('#world-hero').dataset.y>720);await page.keyboard.up('s');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='open');await shot('open',[19]);
 await page.keyboard.down('w');await shot('closing-thud',[32,33]);await page.keyboard.up('w');
 await page.waitForFunction(()=>document.querySelector('#world-gate-doors').dataset.state==='closed');await shot('closed',[39]);
 console.log('captured',out);
}finally{await browser?.close();server?.kill();}
