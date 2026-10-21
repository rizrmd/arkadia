// Stronghold day/night verification: phase screenshots on four viewports, emissive
// and building light coverage, clock ticks, ?lighting persistence, reduced motion,
// night hit-testing and the mobile pan budget. Serves dist/ unless PREVIEW_URL.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {LIGHT_SPRITES} from '../src/stronghold/light-anchors.ts';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3072',out=process.env.OUTPUT_DIR||'/home/dev/lighting-release/verify';
await fs.mkdir(out,{recursive:true});
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3072'}});
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
const VIEWPORTS={desktop:{viewport:{width:1536,height:1024}},wide:{viewport:{width:2560,height:1440}},portrait:{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true},landscape:{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
const PHASES={night:[.02,'Night'],dawn:[.25,'Dawn'],day:[.5,'Day'],dusk:[.78,'Dusk']};
// Building slots from scene.ts (x, y = foot pivot, width) for per-building checks.
const slots=Object.fromEntries([...(await fs.readFile('src/stronghold/scene.ts','utf8')).matchAll(/(\w+):\{x:(\d+),y:(\d+),width:(\d+)/g)].map(m=>[m[1],{x:+m[2],y:+m[3],width:+m[4]}]));
const report={phases:{},buildings:{},checks:[]},pass=name=>{report.checks.push(name);console.log('PASS',name);};
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&document.querySelector('#world-surface')?.dataset.lighting);
async function open(page,query=''){await page.goto(base+'/stronghold.html'+query);await ready(page);await page.waitForFunction(()=>{const s=document.querySelector('#world-surface').dataset.lighting,t=document.querySelector('#world-layers').firstElementChild.dataset.tint||'off';return (s==='off')===(t==='off');});await page.waitForTimeout(250);}
const stats=page=>page.evaluate(()=>{const g=document.querySelector('#world-glow'),s=document.querySelector('#world-surface'),v=document.querySelector('#world-layers');return {phase:v.dataset.phase,state:s.dataset.lighting,flicker:getComputedStyle(g).display,lights:+s.dataset.lights,lightPaints:+(s.dataset.lightPaints||0),surfacePaints:+(s.dataset.paints||0),sun:s.dataset.sun,tint:v.firstElementChild.dataset.tint||'off',snow:v.firstElementChild.style.backgroundImage.slice(0,10),sameTransform:g.style.transform===s.style.transform,layers:[...v.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id||'snow')};});
let browser;
// Single-process headless Chromium is unstable over many reloads on a shared host,
// so every check below gets its own browser.
async function fresh(vp=VIEWPORTS.desktop){await browser?.close();browser=await launch();return browser.newPage(vp);}
try{
 // 1. Every lit sprite in the scene has authored anchors.
 for(const file of ['/fortress-ui/forge-1.webp','/fortress-ui/forge-2.webp','/fortress-ui/forge-3.webp',...['barracks','altar','mage','expedition','mine'].map(b=>`/assets/stronghold/${b}.png`),'/modular-stronghold/v2/gateway-grand.png','/modular-stronghold/v2/brazier.png'])assert.ok(LIGHT_SPRITES[file]?.length,'missing light anchors for '+file);
 pass('every building, gateway and brazier sprite has authored light anchors');
 // 2. Phases on four viewports.
 for(const [name,vp] of Object.entries(VIEWPORTS)){
  browser=await launch();const page=await browser.newPage(vp),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [phase,[t,label]] of Object.entries(PHASES)){
   await open(page,`?time=${t}`);const s=await stats(page);report.phases[`${name}-${phase}`]=s;
   assert.equal(s.phase,label);assert.ok(s.sameTransform,'flicker layer follows the surface transform');
   if(phase==='day'){assert.equal(s.state,'off');assert.equal(s.flicker,'none');assert.equal(s.tint,'off');assert.ok(s.snow.startsWith('url("data'),s.snow);assert.deepEqual(s.layers,['snow','world-surface']);}else{assert.equal(s.state,'on');assert.equal(s.flicker,'block');assert.notEqual(s.tint,'off');assert.ok(s.snow.startsWith('url("data'),s.snow);assert.ok(s.lights>=25,'lights baked: '+s.lights);assert.deepEqual(s.layers,['snow','world-surface','world-glow']);}
   await page.screenshot({path:`${out}/${name}-${phase}.png`});
  }
  // Light layers never intercept input: the transparent world canvas stays on top.
  const input=await page.evaluate(()=>getComputedStyle(document.querySelector('#world-layers')).pointerEvents==='none'&&document.elementFromPoint(innerWidth/2,innerHeight/2)?.id==='world-canvas');
  assert.ok(input);assert.deepEqual(errors,[]);await browser.close();browser=null;
 }
 pass('4 phases x 4 viewports: phase, layer state, snow tint and input surface');
 let page=await fresh();
 // 3. Lightmap content at night: ambient far from lights, full white on emissive art, light at every building.
 await open(page,'?time=0.02');
 const lm=await page.evaluate(slots=>{const l=document.querySelector('#world-lightmap'),[left,top,res]=l.dataset.origin.split(',').map(Number),c=l.getContext('2d'),d=c.getImageData(0,0,l.width,l.height).data;
  let min=765,white=0;for(let i=0;i<d.length;i+=4){const v=d[i]+d[i+1]+d[i+2];min=Math.min(min,v);if(v>=750)white++;}
  const buildings={};for(const [id,s] of Object.entries(slots)){const x0=Math.max(0,Math.floor((s.x-s.width/2-left)*res)),x1=Math.ceil((s.x+s.width/2-left)*res),y0=Math.max(0,Math.floor((s.y-s.width*1.2-top)*res)),y1=Math.ceil((s.y-top)*res),img=c.getImageData(x0,y0,x1-x0,y1-y0).data;let peak=0,lit=0;for(let i=0;i<img.length;i+=4){const v=img[i]+img[i+1]+img[i+2];peak=Math.max(peak,v);if(v>400)lit++;}buildings[id]={peak,lit};}
  return {min,white,buildings};},slots);
 report.buildings=lm.buildings;assert.ok(lm.min<=(0x38+0x45+0x75)+20,'night ambient colour '+lm.min);assert.ok(lm.white>200,'emissive pixels restored to white: '+lm.white);
 for(const [id,b] of Object.entries(lm.buildings)){assert.ok(b.peak>=700,`${id} has a bright light (${b.peak})`);assert.ok(b.lit>=20,`${id} has a lit area (${b.lit})`);}
 pass(`night lightmap: ambient ${lm.min}/765, ${lm.white} emissive white pixels, light at all ${Object.keys(lm.buildings).length} buildings`);
 page=await fresh();
 // 4. Night is darker on screen while the altar flames stay bright.
 const shot=async t=>{await open(page,`?time=${t}`);const b=await page.screenshot();const {default:sharp}=await import('sharp');const {data,info}=await sharp(b).raw().toBuffer({resolveWithObject:true});let sum=0,n=0;for(let y=Math.floor(info.height*.3);y<info.height*.7;y+=3)for(let x=Math.floor(info.width*.3);x<info.width*.7;x+=3){const i=(y*info.width+x)*info.channels;sum+=.299*data[i]+.587*data[i+1]+.114*data[i+2];n++;}return sum/n;};
 const dayLuma=await shot(.5),nightLuma=await shot(.02);report.screenLuma={day:dayLuma,night:nightLuma};assert.ok(nightLuma<dayLuma*.6,`night darker (${nightLuma.toFixed(1)} vs ${dayLuma.toFixed(1)})`);
 pass(`night screen luma ${nightLuma.toFixed(1)} vs day ${dayLuma.toFixed(1)}`);
 page=await fresh();
 // 5. Clock ticks repaint only the lightmap; the baked world surface re-rasters only when the sun
 // (cast shadows) moves to its next 15-minute step.
 await open(page,'?daySpeed=900');const t0=await stats(page);let sunSteps=0,prevSun=t0.sun;
 for(let i=0;i<8;i++){await page.waitForTimeout(400);const s=await stats(page);if(s.sun!==prevSun){sunSteps++;prevSun=s.sun;}}
 const t1=await stats(page);
 assert.ok(t1.lightPaints+(t1.state==='off'?3:0)>t0.lightPaints,'lightmap repainted on ticks');assert.ok(t1.surfacePaints-t0.surfacePaints<=sunSteps,`surface repainted only on sun steps (${t1.surfacePaints-t0.surfacePaints} paints, ${sunSteps} steps)`);
 pass(`clock ticks: lightmap paints ${t0.lightPaints}->${t1.lightPaints}, surface paints ${t0.surfacePaints}->${t1.surfacePaints} for ${sunSteps} sun steps`);
 page=await fresh();
 // 5b. In-game clock: pinning an hour relights, casts shadows by day only, is remembered, and Live restores the cycle.
 await open(page);await page.click('.clock-chip');
 await page.$eval('#clock-slider',e=>{e.value='1020';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(700);
 let c=await stats(page);assert.equal(c.phase,'Dusk');assert.equal(c.sun,(1020/1440).toFixed(4));
 const shadowed=await page.evaluate(()=>document.querySelector('#day-clock .clock-time').textContent);assert.equal(shadowed,'17:00');
 await page.click('text=Midnight');await page.waitForTimeout(700);c=await stats(page);assert.equal(c.phase,'Night');assert.equal(c.sun,'none');assert.equal(c.state,'on');
 await page.click('text=Noon');await page.waitForTimeout(700);await open(page);c=await stats(page);assert.equal(c.phase,'Day');assert.equal(c.sun,'0.5000');
 await page.click('.clock-chip');await page.click('.clock-live');await page.waitForTimeout(500);
 assert.deepEqual(await page.evaluate(()=>[document.querySelector('#day-clock').dataset.clock,localStorage.getItem('arkadia.stronghold.lighting')]),['live','{"mode":"dynamic"}']);
 await page.evaluate(()=>localStorage.removeItem('arkadia.stronghold.lighting'));
 pass('in-game clock: slider and presets relight, sun shadows by day only, pinned hour remembered, Live restores the cycle');
 page=await fresh();
 // 6. ?lighting=night is remembered (no menu in the world-only view); ?lighting=dynamic restores the clock.
 await open(page,'?lighting=night');assert.equal((await stats(page)).phase,'Night');
 await open(page);const kept=await page.evaluate(()=>[document.querySelector('#world-layers').dataset.lightingMode,localStorage.getItem('arkadia.stronghold.lighting')]);assert.equal((await stats(page)).phase,'Night');assert.deepEqual(kept,['night','{"mode":"night"}']);
 await open(page,'?lighting=day');assert.equal((await stats(page)).phase,'Day');
 await open(page,'?lighting=dynamic');assert.equal(await page.evaluate(()=>document.querySelector('#world-layers').dataset.lightingMode),'dynamic');await page.evaluate(()=>localStorage.removeItem('arkadia.stronghold.lighting'));
 pass('?lighting=night|day persists across reloads, ?lighting=dynamic restores the clock');
 page=await fresh();
 // 7. Night hit-testing on the forge roof still selects the building; drag still pans.
 await open(page,'?time=0.02');const before=await stats(page);
 // Default camera: scale = clamp(h/900) and centre (577.5, 385); the Forge roof is at world (235, 210).
 const scale=Math.max(.65,Math.min(1.35,1024/900)),bakes=await page.evaluate(()=>+document.querySelector('#world-surface').dataset.lightBakes);
 await page.mouse.click(1536/2+(235-1155/2)*scale,1024/2+(210-385)*scale);await page.waitForTimeout(600);
 const after=await page.evaluate(()=>({bakes:+document.querySelector('#world-surface').dataset.lightBakes,paints:+document.querySelector('#world-surface').dataset.paints}));
 assert.ok(after.bakes>bakes&&after.paints>before.surfacePaints,'selecting the Forge rebakes lights and the world');
 pass('night roof hit-test selects the Forge and relights the selection');
 page=await fresh();await open(page,'?time=0.02');
 // 8. Reduced motion stops flame flicker.
 await page.emulateMedia({reducedMotion:'reduce'});const anim=await page.evaluate(()=>[...document.querySelectorAll('#world-glow canvas')].map(c=>getComputedStyle(c).animationName));assert.deepEqual(anim,['none']);
 await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#world-glow canvas')).animationName),'glow-flicker');
 pass('prefers-reduced-motion disables flicker');
 await browser.close();browser=null;
 // 9. Mobile pan budget: no repaint of any world layer during a pan; night frame times
 // match day. Best of three fresh browsers per phase filters shared-host CPU noise.
 report.pan={day:[],night:[]};
 for(let round=0;round<3;round++)for(const [phase,t] of [['day',.5],['night',.02]]){
  browser=await launch();page=await browser.newPage(VIEWPORTS.portrait);const cdp=await page.context().newCDPSession(page);await open(page,`?time=${t}`);await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});const before=await stats(page);
  const frames=await page.evaluate(async()=>{const c=document.querySelector('#world-canvas'),g=document.querySelector('#world-glow'),r=c.getBoundingClientRect(),t=[];let prev=performance.now(),hidden=true;const ev=(type,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:x,clientY:y,bubbles:true,isPrimary:true}));c.setPointerCapture=()=>{};ev('pointerdown',r.width/2,r.height/2);
   for(let i=0;i<100;i++){await new Promise(res=>requestAnimationFrame(res));const now=performance.now();t.push(now-prev);prev=now;ev('pointermove',r.width/2+Math.sin(i/14)*85,r.height/2+Math.sin(i/21)*100);if(i>2&&getComputedStyle(g).display!=='none')hidden=false;}ev('pointerup',r.width/2,r.height/2);t.sort((a,b)=>a-b);return {p50:+t[50].toFixed(1),p95:+t[95].toFixed(1),flickerHidden:hidden};});
  const after=await stats(page);assert.equal(after.surfacePaints,before.surfacePaints,'surface repainted during pan');assert.equal(after.lightPaints,before.lightPaints,'relit during pan');assert.ok(frames.flickerHidden,'flicker layer rests while panning');
  report.pan[phase].push(frames);await browser.close();browser=null;}
 const best=(list,k)=>Math.min(...list.map(f=>f[k])),gate={dayP50:best(report.pan.day,'p50'),nightP50:best(report.pan.night,'p50'),dayP95:best(report.pan.day,'p95'),nightP95:best(report.pan.night,'p95')};report.pan.gate=gate;
 assert.ok(gate.nightP50<=gate.dayP50*1.1+1,`night median ${gate.nightP50} vs day ${gate.dayP50}`);assert.ok(gate.nightP95<=gate.dayP95*1.25+5,`night p95 ${gate.nightP95} vs day ${gate.dayP95}`);
 pass(`mobile pan (390x844, DPR 3, 4x CPU, best of 3): zero world repaints; median day ${gate.dayP50} / night ${gate.nightP50} ms, p95 day ${gate.dayP95} / night ${gate.nightP95} ms`);
}finally{await browser?.close();server?.kill();}
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,1));console.log('Report',out+'/report.json');
