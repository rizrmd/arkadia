// Throwaway lighting spike: injects a world-space multiply lightmap + screen glow
// layer into the running Stronghold, captures phases and measures pan frames.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
// Usage: npx vite build --outDir /tmp/site && SITE_DIR=/tmp/site OUTPUT_DIR=/tmp/shots node scripts/spike-stronghold-lighting.mjs
// Not a production renderer: auto-detected emissive pixels are a rough stand-in for authored light anchors.
const site=process.env.SITE_DIR||'dist',out=process.env.OUTPUT_DIR||'/home/dev/lighting-spike';
await fs.mkdir(out,{recursive:true});
const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:'3071',SITE_DIR:site}});
await new Promise(r=>setTimeout(r,600));
const PHASES={
 day:{ambient:[1,1,1],lights:0,glow:0},
 golden:{ambient:[1,.84,.68],lights:.3,glow:.2},
 dusk:{ambient:[.56,.46,.62],lights:.75,glow:.55},
 night:{ambient:[.22,.27,.46],lights:1,glow:.9}
};
function install(){
 const surface=document.querySelector('#world-surface'),viewport=document.querySelector('#world-layers'),snow=viewport.firstElementChild;
 const W=parseFloat(surface.style.width),H=parseFloat(surface.style.height);
 // 1. Emissive mask derived from the baked albedo (warm flames + blue rune).
 const ms=.5,mask=document.createElement('canvas');mask.width=Math.ceil(W*ms);mask.height=Math.ceil(H*ms);
 const mc=mask.getContext('2d',{willReadFrequently:true});mc.drawImage(surface,0,0,mask.width,mask.height);
 const img=mc.getImageData(0,0,mask.width,mask.height),d=img.data,bins=new Map(),bin=30;
 let emissive=0;
 for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];
  const warm=r>225&&g>120&&b<125&&r-g>38,rune=b>210&&g>140&&r<140;
  if(warm||rune){emissive++;const k=i/4,x=k%mask.width,y=(k/mask.width)|0,key=((x/bin)|0)+','+((y/bin)|0);const e=bins.get(key)||{n:0,x:0,y:0,rune:0};e.n++;e.x+=x;e.y+=y;e.rune+=rune?1:0;bins.set(key,e);
   d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;}else d[i+3]=0;}
 mc.putImageData(img,0,0);
 const lights=[...bins.values()].filter(e=>e.n>=6).map(e=>({x:e.x/e.n/ms,y:e.y/e.n/ms,n:e.n,rune:e.rune>e.n/2}));
 // 2. Lightmap (multiply) and glow (screen), world space, low resolution.
 const lr=.35,mk=()=>{const c=document.createElement('canvas');c.width=Math.ceil(W*lr);c.height=Math.ceil(H*lr);c.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;will-change:transform;pointer-events:none`;return c;};
 const lightmap=mk(),glow=mk();lightmap.id='world-lightmap';glow.id='world-glow';lightmap.style.mixBlendMode='multiply';glow.style.mixBlendMode='screen';
 surface.after(lightmap,glow);
 const sync=()=>{lightmap.style.transform=glow.style.transform=surface.style.transform;};new MutationObserver(sync).observe(surface,{attributes:true,attributeFilter:['style']});sync();
 const origBg=snow.style.backgroundImage,origSize=snow.style.backgroundSize;
 window.__applyPhase=({ambient,lights:li,glow:gl})=>{
  const t0=performance.now(),rgb=ambient.map(v=>Math.round(v*255)),css=`rgb(${rgb})`;
  snow.style.backgroundImage=`linear-gradient(${css},${css}),${origBg}`;snow.style.backgroundSize=`auto,${origSize}`;snow.style.backgroundBlendMode='multiply,normal';
  const c=lightmap.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.fillStyle=css;c.fillRect(0,0,lightmap.width,lightmap.height);
  c.setTransform(lr,0,0,lr,0,0);c.globalCompositeOperation='lighter';
  for(const p of lights){const r=Math.min(125,32+Math.sqrt(p.n)*9),col=p.rune?[90,140,255]:[255,170,90],a=li*Math.min(.7,.22+p.n/140);
   c.save();c.translate(p.x,p.y+14);c.scale(1,.55);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();}
  // Emissive pixels stay at full brightness: lightmap=white there.
  c.globalAlpha=li;c.filter='blur(1px) brightness(3)';c.drawImage(mask,0,0,W,H);c.filter='none';c.globalAlpha=1;
  const g2=glow.getContext('2d');g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,glow.width,glow.height);g2.setTransform(lr,0,0,lr,0,0);g2.globalAlpha=gl*.75;g2.filter='blur(6px)';g2.drawImage(mask,0,0,W,H);g2.filter='blur(2px)';g2.globalAlpha=gl*.5;g2.drawImage(mask,0,0,W,H);g2.filter='none';g2.globalAlpha=1;
  const show=li>0||ambient.some(v=>v<1);lightmap.style.display=glow.style.display=show?'':'none';
  return performance.now()-t0;};
 return {W,H,emissive,lights:lights.length,maskSize:[mask.width,mask.height],lightmapSize:[lightmap.width,lightmap.height]};
}
async function pan(page,frames=90){
 return page.evaluate(async frames=>{const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),id=1,t=[];let prev=performance.now();
  const ev=(type,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:y,bubbles:true,isPrimary:true}));
  c.setPointerCapture=()=>{};ev('pointerdown',r.width/2,r.height/2);
  for(let i=0;i<frames;i++){await new Promise(res=>requestAnimationFrame(res));const now=performance.now();t.push(now-prev);prev=now;ev('pointermove',r.width/2+Math.sin(i/14)*85,r.height/2+Math.sin(i/21)*100);}
  ev('pointerup',r.width/2,r.height/2);t.sort((a,b)=>a-b);return {p50:+t[t.length>>1].toFixed(1),p95:+t[Math.floor(t.length*.95)].toFixed(1)};},frames);
}
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const report={};
try{
 for(const [name,vp] of [['desktop',{viewport:{width:1536,height:1024},deviceScaleFactor:1}],['mobile',{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}]]){
  const browser=await launch();const page=await browser.newPage(vp),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3071/stronghold.html');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(400);
  const info=await page.evaluate(install);report[name]={info,phaseMs:{},errors};
  for(const [phase,cfg] of Object.entries(PHASES)){report[name].phaseMs[phase]=+(await page.evaluate(c=>window.__applyPhase(c),cfg)).toFixed(1);await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}-${phase}.png`});}
  if(name==='mobile'){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.evaluate(c=>window.__applyPhase(c),PHASES.day);report.mobile.panDay=await pan(page);
   await page.evaluate(c=>window.__applyPhase(c),PHASES.night);report.mobile.panNight=await pan(page);
   report.mobile.paintsAfterPan=await page.evaluate(()=>document.querySelector('#world-surface').dataset.paints);}
  await browser.close();
 }
}finally{server.kill();}
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,1));console.log(JSON.stringify(report,null,1));
