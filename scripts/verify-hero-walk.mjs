import{chromium}from'playwright';import{spawn}from'node:child_process';import assert from'node:assert/strict';import fs from'node:fs/promises';import sharp from'sharp';
// Walks the Stronghold hero with WASD, the arrow keys and the touch thumbstick; checks collision, court bounds,
// camera follow, facing art, night tint, saved position and that the clock slider keeps its own arrow keys.
// Local build by default (npm run build first); DEMO_URL=https://… tests a deployed host instead.
const out='docs/hero-walk';await fs.mkdir(out,{recursive:true});
const shot=async(page,name,opts={})=>fs.writeFile(`${out}/${name}.webp`,await sharp(await page.screenshot(opts)).webp({quality:80}).toBuffer());
const base=process.env.DEMO_URL?.replace(/\/$/,'');const server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3062'}});const url=base||'http://127.0.0.1:3062';let browser;
try{await new Promise(r=>setTimeout(r,600));const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});browser=await launch();
const errors=[],open=async(context,query)=>{const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror',e.message);});await page.goto(url+'/stronghold.html'+query);await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await page.waitForTimeout(500);return page;};
const hero=page=>page.evaluate(()=>{const d=document.querySelector('#world-hero').dataset;return {x:+d.x,y:+d.y,state:d.state,clip:d.clip,facing:+d.facing,behind:+d.behind,tint:d.tint};});
const camera=page=>page.evaluate(()=>document.querySelector('#world-surface').style.transform);
// A world re-raster can stall headless frames for a second, so wait on state rather than fixed sleeps.
const idle=page=>page.waitForFunction(()=>document.querySelector('#world-hero').dataset.state==='idle',null,{timeout:10000});
const hold=async(page,key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);const during=await hero(page);await page.keyboard.up(key);await idle(page);return during;};
const stickShown=page=>page.evaluate(()=>{const el=document.querySelector('#move-stick'),r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,visible:getComputedStyle(el).visibility==='visible'};});
const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
let page=await open(desktop,'?time=0.5');await page.evaluate(()=>localStorage.removeItem('arkadia.stronghold.hero'));await page.reload();await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await page.waitForTimeout(500);
const start=await hero(page);console.log('spawn',start);assert.equal(start.state,'idle');
assert(!(await stickShown(page)).visible,'no thumbstick on a mouse-only screen');
await shot(page,'1-spawn-noon');
// W walks straight up the screen with the rear view; release keeps that facing.
let during=await hold(page,'KeyW',700),after=await hero(page);console.log('W',during,after);
assert.equal(during.state,'move');assert.equal(during.clip,'moveUp');assert(Math.abs(during.x-start.x)<.5&&start.y-during.y>15,'W walks straight up');assert.equal(after.clip,'idleUp');
// S (arrow) walks down with the front view.
during=await hold(page,'ArrowDown',400);console.log('Down',during);assert.equal(during.clip,'moveDown');
// D and the left arrow mirror the diagonal art.
let before=await hero(page);during=await hold(page,'KeyD',500);console.log('D',during);assert(during.x>before.x+30&&Math.abs(during.y-before.y)<.5,'D walks straight right');assert.equal(during.facing,1);assert(/^move(Back)?$/.test(during.clip));
before=await hero(page);during=await hold(page,'ArrowLeft',500);assert(during.x<before.x-30);assert.equal(during.facing,-1);
// W+D walks along the 2:1 tile edge.
await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');await page.waitForTimeout(150);before=await hero(page);await page.waitForTimeout(400);during=await hero(page);await page.keyboard.up('KeyW');await page.keyboard.up('KeyD');await idle(page);
const slope=(during.y-before.y)/(during.x-before.x);console.log('W+D slope',slope.toFixed(3));assert(Math.abs(slope+.5)<.02,'W+D follows the iso grid');
await page.waitForTimeout(150);
// Collision: the expedition tent in the centre of the court blocks the way north; the hero stops at its front edge.
await page.keyboard.down('KeyW');await page.waitForTimeout(4000);const a=await hero(page);await page.waitForTimeout(500);const b=await hero(page);await page.keyboard.up('KeyW');
console.log('blocked',a,b);assert(Math.abs(a.y-b.y)<1,'the table footprint stops the hero');assert(b.y>290&&b.y<400,'stopped at the tent front, not inside it');
await shot(page,'2-blocked-by-table');
// Court bound: holding right ends at the east wall, inside the court.
await hold(page,'KeyS',900);
await page.keyboard.down('KeyD');await page.waitForTimeout(6000);const e1=await hero(page);await page.waitForTimeout(400);const e2=await hero(page);await page.keyboard.up('KeyD');
const tile=p=>({u:((p.x-577)/64+(p.y+160)/32)/2,v:((p.y+160)/32-(p.x-577)/64)/2});console.log('east wall',e2,tile(e2));assert(Math.abs(e1.x-e2.x)<1);const t=tile(e2);assert(t.u<=14.51&&t.v>=.49);
await shot(page,'3-at-east-wall');
// Camera: drag the map away, then a step brings the camera back after the hero.
await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(250,350,{steps:8});await page.mouse.up();await page.waitForTimeout(300);
const cam0=await camera(page);await hold(page,'KeyA',600);await page.waitForFunction(c=>document.querySelector('#world-surface').style.transform!==c,cam0,{timeout:10000});console.log('camera',cam0,'->',await camera(page));
// The clock slider keeps its arrow keys.
before=await hero(page);await page.click('.clock-chip');await page.focus('#clock-slider');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
assert.deepEqual([(await hero(page)).x,(await hero(page)).y],[before.x,before.y],'slider arrows must not walk');await page.keyboard.press('Escape');
// Position survives a reload (saved once the hero has rested 400 ms).
const rest=await hero(page);await page.waitForTimeout(800);await page.goto(url+'/stronghold.html?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await page.waitForTimeout(300);const reloaded=await hero(page);console.log('reloaded',reloaded);assert(Math.hypot(reloaded.x-rest.x,reloaded.y-rest.y)<2,'saved position');
// Walk back to the court centre for the lighting shots.
await page.evaluate(()=>localStorage.removeItem('arkadia.stronghold.hero'));
// Ground speed: up/down, across and along a tile edge all cross the court at the same pace (screen speed differs
// on the 2:1 map: a vertical screen pixel is twice the ground of a horizontal one).
await page.goto(url+'/stronghold.html?time=0.5');await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await page.waitForTimeout(800);
const rate=async keys=>{for(const k of keys)await page.keyboard.down(k);await page.waitForFunction(()=>document.querySelector('#world-hero').dataset.state==='move');await page.waitForTimeout(100);
 const r=await page.evaluate(async()=>{const d=document.querySelector('#world-hero').dataset,at=()=>({x:+d.x,y:+d.y,t:performance.now()}),a=at();await new Promise(r=>setTimeout(r,450));return [a,at()];});
 for(const k of keys)await page.keyboard.up(k);await idle(page);const [a,b]=r.map(tile),screen=Math.hypot(r[1].x-r[0].x,r[1].y-r[0].y)/(r[1].t-r[0].t)*1000;
 return {keys:keys.join('+'),tiles:Math.hypot(b.u-a.u,b.v-a.v)/(r[1].t-r[0].t)*1000,screen};};
// Best of three: a stalled headless frame (over 120 ms) drops ground, as it does in the game.
const rates=[];for(const keys of [['KeyD'],['KeyA'],['KeyW'],['KeyS'],['KeyW','KeyD'],['KeyS','KeyA'],['ArrowUp'],['ArrowRight']]){let best;for(let i=0;i<3;i++){const r=await rate(keys);if(!best||r.tiles>best.tiles)best=r;}rates.push(best);}
console.table(rates.map(r=>({keys:r.keys,'tiles/s':r.tiles.toFixed(3),'screen px/s':r.screen.toFixed(1)})));
const mean=rates.reduce((s,r)=>s+r.tiles,0)/rates.length;for(const r of rates)assert(Math.abs(r.tiles/mean-1)<.1,`${r.keys} walks ${r.tiles.toFixed(3)} tiles/s, mean ${mean.toFixed(3)}`);
const up=rates.find(r=>r.keys==='KeyW'),right=rates.find(r=>r.keys==='KeyD');assert(Math.abs(up.screen/right.screen-.5)<.06,'straight up moves half the screen speed of straight across');
await page.evaluate(()=>localStorage.removeItem('arkadia.stronghold.hero'));
for(const [time,name] of [['0.31','4-morning-shadow'],['0','5-night-tint']]){const p=page;await p.goto(url+'/stronghold.html?time='+time);await p.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);await p.waitForTimeout(1200);await hold(p,'KeyA',700);const h=await hero(p);console.log(name,h);
 if(time==='0'){const [r,g,bl]=h.tint.split(',').map(Number);assert(bl>r&&r<200,'night tints the hero blue-dark, got '+h.tint);}
 const box=await p.evaluate(()=>{const r=document.querySelector('#world-hero').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
 await shot(p,name,{clip:{x:Math.max(0,box.x-160),y:Math.max(0,box.y-120),width:box.width+320,height:box.height+240}});}
// Mobile, in a fresh browser (one single-process headless browser runs out of memory on a second world):
// the thumbstick stays hidden until a touch lands in the bottom-left quarter, appears under that thumb, walks the hero
// with a real touch drag and hides on release; a drag anywhere else still pans the map without showing it.
await browser.close();browser=await launch();
const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
page=await open(phone,'?time=0.5');assert(!(await stickShown(page)).visible,'thumbstick hidden until touched');await shot(page,'6-phone-idle');
const cdp=await phone.newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id:id+1}))});
// A drag in the top-right quarter pans the camera, walks nobody and never shows the stick.
before=await hero(page);const cam1=await camera(page);await touch('touchStart',[[300,250]]);
for(let i=1;i<=6;i++){await touch('touchMove',[[300-i*15,250+i*10]]);await page.waitForTimeout(16);}
assert(!(await stickShown(page)).visible,'no thumbstick outside the bottom-left quarter');await touch('touchEnd',[]);await page.waitForTimeout(200);
assert.notEqual(await camera(page),cam1,'a drag outside the quarter pans');after=await hero(page);assert.deepEqual([after.x,after.y],[before.x,before.y],'panning does not walk');
// A touch in the bottom-left quarter brings the stick up centred under the thumb, and dragging right walks right without panning.
const at=[110,700];await touch('touchStart',[at]);let stick=await stickShown(page);console.log('stick shown at',stick);
assert(stick.visible,'thumbstick appears under a touch in the bottom-left quarter');assert(Math.abs(stick.x-at[0])<1&&Math.abs(stick.y-at[1])<1,'centred on the thumb');
before=await hero(page);for(let i=1;i<=6;i++){await touch('touchMove',[[at[0]+i*7,at[1]]]);await page.waitForTimeout(16);}
await page.waitForTimeout(900);during=await hero(page);await shot(page,'7-phone-thumbstick');
await touch('touchEnd',[]);await idle(page);after=await hero(page);
console.log('stick',before,during,after);assert(during.x>before.x+30&&Math.abs(during.y-before.y)<1,'thumbstick right walks right');assert.equal(during.state,'move');assert.equal(after.state,'idle');
assert.equal(await page.evaluate(()=>document.querySelector('#move-stick').dataset.active),'false');await page.waitForTimeout(300);assert(!(await stickShown(page)).visible,'thumbstick hides on release');
assert.deepEqual(errors,[]);console.log('PASS hero walks with WASD, arrows and the bottom-left touch thumbstick; blocked by buildings and walls; camera follows');
}finally{await browser?.close();server?.kill();}
