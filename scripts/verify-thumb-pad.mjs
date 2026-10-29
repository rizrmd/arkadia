import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

// Real touch and mobile portrait regression for the Stronghold floating thumb pad:
// 1. Hidden by default on mobile (never permanently shown when idle).
// 2. Appears centered under a touch/drag starting in the bottom third (outside HUD buttons).
// 3. Moves its cap smoothly with drag while base stays anchored, walking the hero.
// 4. Hides again immediately on release or cancel.
// 5. Dragging in the upper two-thirds pans the camera without showing the thumb pad.
// 6. Tapping a Crescent Arc skill button does not spawn the thumb pad or kill an active walk.
const server=process.env.DEMO_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3069'}});
let browser;
const out=process.env.OUT||'docs/thumb-pad',prefix=process.env.DEMO_URL?'live-':'';

try{
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({
  headless:true,
  env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
  args:['--no-sandbox','--no-zygote','--single-process']
 });
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));

 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:3069')+'/?offline=1&time=0.5');
 await page.waitForFunction(
  ()=>Boolean(window.__PIXI_UI__&&window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true'),
  null,
  {timeout:60000}
 );
 if(await page.evaluate(()=>Boolean(window.__PIXI_UI__?.picker?.isOpen()))){
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!window.__PIXI_UI__?.picker?.isOpen(),null,{timeout:10000});
 }
 await page.waitForTimeout(400);
 await fs.mkdir(out,{recursive:true});

 const readState=()=>page.evaluate(()=>{
  const uiStage=window.__PIXI_UI__.app.stage.children[1];
  const stick=window.__PIXI_UI__.stick||uiStage.children.find(c=>c.zIndex===15);
  const ring=stick.children[0],knob=stick.children[1];
  const snap=window.__STRONGHOLD_COMBAT__.snapshot();
  const worldStage=window.__PIXI_UI__.app.stage.children[0];
  const surface=worldStage.children.find(c=>c.zIndex===10);
  return {
   visible:Boolean(stick.visible),
   alpha:stick.alpha,
   x:stick.x,
   y:stick.y,
   ringX:ring.x,
   ringY:ring.y,
   knobX:+knob.x.toFixed(2),
   knobY:+knob.y.toFixed(2),
   hero:{u:snap.hero.u,v:snap.hero.v},
   cam:{x:surface?.x??0,y:surface?.y??0},
   sockets:snap.hudGeometry?.sockets??[]
  };
 });

 const shot=async name=>{
  const png=await page.screenshot();
  await sharp(png).webp({quality:86}).toFile(`${out}/${prefix}${name}.webp`);
 };

 const cdp=await context.newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{
  type,
  touchPoints:points.map(([x,y],id)=>({x,y,id:id+1}))
 });

 // 1. Default state on mobile: thumb pad MUST be hidden (visible === false).
 const initial=await readState();
 assert.equal(initial.visible,false,'thumb pad must be hidden by default on mobile');
 await shot('mobile-idle-hidden');

 // 2. Dragging in the upper two-thirds (y = 320 < 844 * 2/3) pans the camera and never shows the thumb pad.
 await touch('touchStart',[[195,320]]);
 for(let i=1;i<=8;i++){
  await touch('touchMove',[[195-i*12,320+i*8]]);
  await page.waitForTimeout(16);
 }
 const duringPan=await readState();
 assert.equal(duringPan.visible,false,'upper two-thirds drag must not show thumb pad');
 assert.notEqual(duringPan.cam.x,initial.cam.x,'upper two-thirds drag must pan the camera');
 await touch('touchEnd',[]);
 await page.waitForTimeout(100);

 // 3. Touching in the bottom third (110, 720) shows the thumb pad centered at (110, 720); dragging moves knob and hero.
 await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(9.2,9.0));
 await page.waitForTimeout(100);
 const beforeWalk=await readState();

 await touch('touchStart',[[110,720]]);
 const atStart=await readState();
 assert.equal(atStart.visible,true,'touch in bottom third must show thumb pad');
 assert.equal(atStart.x,110,'thumb pad base X centered at touch start');
 assert.equal(atStart.y,720,'thumb pad base Y centered at touch start');
 assert.equal(atStart.knobX,-27,'knob starts centered at -27');
 assert.equal(atStart.knobY,-27,'knob starts centered at -27');

 for(let i=1;i<=12;i++){
  await touch('touchMove',[[110+i*4,720-i*2]]);
  await page.waitForTimeout(25);
 }
 const duringWalk=await readState();
 assert.equal(duringWalk.visible,true,'thumb pad stays visible while dragging');
 assert.equal(duringWalk.x,110,'thumb pad base X stays anchored while dragging');
 assert.equal(duringWalk.y,720,'thumb pad base Y stays anchored while dragging');
 assert(duringWalk.knobX>-27+15,'thumb pad knob X moves right with drag');
 assert(duringWalk.knobY<-27-5,'thumb pad knob Y moves up with drag');
 const walkedDist=Math.hypot(duringWalk.hero.u-beforeWalk.hero.u,duringWalk.hero.v-beforeWalk.hero.v);
 assert(walkedDist>0.25,`hero must walk when dragging thumb pad (walkedDist=${walkedDist})`);
 await shot('mobile-touch-active-move');

 // 4. Releasing touch hides the thumb pad and resets knob to center.
 await touch('touchEnd',[]);
 await page.waitForTimeout(100);
 const afterRelease=await readState();
 assert.equal(afterRelease.visible,false,'thumb pad must hide on touch release');
 assert.equal(afterRelease.knobX,-27,'knob X resets on release');
 assert.equal(afterRelease.knobY,-27,'knob Y resets on release');
 await shot('mobile-release-hidden');

 // 5. Touching a HUD skill socket in the bottom-right Crescent Arc must NOT trigger the thumb pad.
 const sock0=afterRelease.sockets[0];
 if(sock0){
  await touch('touchStart',[[Math.round(sock0.x),Math.round(sock0.y)]]);
  const onSkill=await readState();
  assert.equal(onSkill.visible,false,'touching Crescent Arc skill socket must not show thumb pad');
  await touch('touchEnd',[]);
 }

 // 6. Adding a second world touch while walking cancels the thumb pad cleanly.
 await touch('touchStart',[[110,720]]);
 await touch('touchMove',[[145,720]]);
 assert.equal((await readState()).visible,true);
 await touch('touchStart',[[145,720],[195,350]]);
 assert.equal((await readState()).visible,false,'joining world finger cancels active thumb pad');
 await touch('touchCancel',[]);

 // 7. Mobile portrait pointer drag (mouse/pen preview mode) in bottom third also moves thumb pad and hides on release.
 await page.mouse.move(120,730);
 await page.mouse.down();
 const mouseDownState=await readState();
 assert.equal(mouseDownState.visible,true,'mobile portrait pointer down in bottom third shows thumb pad');
 await page.mouse.move(165,710,{steps:6});
 await page.waitForTimeout(120);
 const mouseDragState=await readState();
 assert(mouseDragState.knobX>-27+15,'mobile portrait pointer drag moves knob');
 await page.mouse.up();
 const mouseUpState=await readState();
 assert.equal(mouseUpState.visible,false,'mobile portrait pointer up hides thumb pad');

 assert.deepEqual(errors,[],'no runtime page errors');

 const report={
  viewport:'390x844',
  url:process.env.DEMO_URL||'local dist',
  defaultHidden:initial.visible===false,
  upperPanKeepsHidden:duringPan.visible===false,
  touchStartPosition:{x:atStart.x,y:atStart.y},
  knobMovedTo:{x:duringWalk.knobX,y:duringWalk.knobY},
  walkedTiles:+walkedDist.toFixed(3),
  releaseHidden:afterRelease.visible===false,
  mobilePreviewPointerSupported:true,
  screenshots:[
   `${out}/${prefix}mobile-idle-hidden.webp`,
   `${out}/${prefix}mobile-touch-active-move.webp`,
   `${out}/${prefix}mobile-release-hidden.webp`
  ],
  errors
 };
 await fs.writeFile(`${out}/${prefix}results.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();
 server?.kill();
}
