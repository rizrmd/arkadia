import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import sharp from 'sharp';import {launchOptions} from './typography/browser.mjs';
// Touch regression for the move stick and camera pan: a touch in the bottom half opens the stick, one in the top half only pans,
// and while the stick is held a second finger pans from anywhere (top or bottom half), in both landing orders.
// node scripts/verify-stick-pan.mjs (local Vite, no HMR) or DEMO_URL=https://… for a deployed build.
const OUT=process.env.OUT||'docs/stick-pan',port=String(5200+process.pid%700),prefix=process.env.DEMO_URL?'live-':'';
const vite=process.env.DEMO_URL?null:await createServer({server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
let browser;
try{
 await fs.mkdir(OUT,{recursive:true});
 browser=await chromium.launch(launchOptions());
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // ?hero= skips Choose Your Hero for this visit.
 await page.goto((process.env.DEMO_URL||`http://127.0.0.1:${port}`)+'/?offline=1&time=.5&hero=ember-warden');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__&&window.__PIXI_UI__,null,{timeout:300000});
 await page.waitForTimeout(3000);
 const cdp=await context.newCDPSession(page);
 // Each call lists every finger still on the glass (CDP diffs against the last call, so leaving one out lifts it); touchEnd lifts all.
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
 const state=()=>page.evaluate(()=>{
  const ui=window.__PIXI_UI__,surface=window.__WORLD_SURFACE__,d=window.__WORLD_HERO__.dataset;
  let sprite=null;const walk=n=>{if(sprite)return;if(n.texture?.source?.resource===surface){sprite=n;return;}for(const c of n.children||[])walk(c);};walk(ui.app.stage);
  return {stick:ui.stick.visible,hero:{x:+d.x,y:+d.y},camera:sprite?{x:sprite.x,y:sprite.y}:null};
 });
 const ticks=async(n=12)=>{for(let i=0;i<n;i++)await page.waitForTimeout(120);};
 const moved=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 const report={viewport:'390x844',cases:{},errors};
 const thumb=[1,195,690];
 const run=async(name,thumbFirst,push,pan)=>{
  const t0=await state();
  // Thumb lands in the bottom half and pushes sideways; the pan finger lands at `pan`.
  const thumbAt=[[...thumb]],both=()=>[thumbAt[0],panAt[0]],panAt=[[...pan]];
  if(thumbFirst){await touch('touchStart',[thumbAt[0]]);await touch('touchMove',[thumbAt[0]=[1,thumb[1]+push,690]]);await ticks(6);await touch('touchStart',both());}
  else{await touch('touchStart',[panAt[0]]);await ticks(2);await touch('touchStart',both());await touch('touchMove',[thumbAt[0]=[1,thumb[1]+push,690],panAt[0]]);await ticks(6);}
  const t1=await state();
  assert(t1.stick,`${name}: stick must be active with two fingers down`);
  // Drag the pan finger 120px down-left in small steps while the thumb stays pushed.
  for(let i=1;i<=12;i++){panAt[0]=[2,pan[1]-i*10,pan[2]+i*10];await touch('touchMove',both());await page.waitForTimeout(60);}
  await ticks(4);
  const t2=await state();
  assert(t2.stick,`${name}: stick must stay active while the other finger pans`);
  const heroWalk=moved(t1.hero,t2.hero),cameraPan=t1.camera&&t2.camera?{x:t2.camera.x-t1.camera.x,y:t2.camera.y-t1.camera.y}:null;
  assert(heroWalk>2,`${name}: hero must keep walking during the pan (moved ${heroWalk.toFixed(2)})`);
  assert(cameraPan&&cameraPan.x<-40&&cameraPan.y>40,`${name}: camera must follow the pan finger (${JSON.stringify(cameraPan)})`);
  await page.screenshot({path:`${OUT}/${prefix}${name}.png`});await sharp(`${OUT}/${prefix}${name}.png`).webp({quality:80}).toFile(`${OUT}/${prefix}${name}.webp`);await fs.rm(`${OUT}/${prefix}${name}.png`);
  // Lifting the pan finger leaves the stick in control; lifting the thumb stops it.
  await touch('touchMove',[thumbAt[0]]);await ticks(3);
  const t3=await state();assert(t3.stick,`${name}: stick survives the pan finger lifting`);
  await touch('touchEnd',[]);await ticks(2);
  const t4=await state();assert(!t4.stick,`${name}: stick hides when the thumb lifts`);
  report.cases[name]={thumbFirst,panFingerAt:pan.slice(1),heroWalkDuringPan:+heroWalk.toFixed(2),cameraPanPx:{x:+cameraPan.x.toFixed(1),y:+cameraPan.y.toFixed(1)},stickDuringPan:t2.stick,stickAfterPanLift:t3.stick,stickAfterThumbLift:t4.stick,start:t0.hero,end:t4.hero};
 };
 // One finger in the top half pans without opening the stick.
 {const t0=await state();await touch('touchStart',[[1,200,250]]);for(let i=1;i<=12;i++){await touch('touchMove',[[1,200-i*10,250+i*10]]);await page.waitForTimeout(60);}
  await ticks(3);const t1=await state();assert(!t1.stick,'top-half touch must not open the stick');
  const cameraPan={x:t1.camera.x-t0.camera.x,y:t1.camera.y-t0.camera.y};assert(cameraPan.x<-40&&cameraPan.y>40,`top-half drag must pan (${JSON.stringify(cameraPan)})`);
  await touch('touchEnd',[]);await ticks(2);report.cases['top-half-pan']={stick:t1.stick,cameraPanPx:{x:+cameraPan.x.toFixed(1),y:+cameraPan.y.toFixed(1)}};}
 {await touch('touchStart',[[1,195,470]]);await ticks(1);const s=await state();assert(s.stick,'a touch just below the middle opens the stick');await touch('touchEnd',[]);await ticks(1);
  await touch('touchStart',[[1,195,380]]);await ticks(1);const t=await state();assert(!t.stick,'a touch just above the middle does not');await touch('touchEnd',[]);await ticks(2);report.cases['half-split']={below:s.stick,above:t.stick};}
 // Alternate walking direction so a wall reached in one case cannot stall the next.
 await run('thumb-then-pan-top',true,50,[2,200,300]);
 await ticks(10);
 await run('thumb-then-pan-bottom',true,-50,[2,300,560]);
 await ticks(10);
 await run('pan-then-thumb',false,50,[2,200,300]);
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${OUT}/${prefix}results.json`,JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify(report,null,1));console.log('PASS bottom-half stick, top-half pan, and second-finger pan anywhere while walking');
}finally{await browser?.close();await vite?.close();}
