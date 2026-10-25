import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';

const baseline=process.env.BASELINE==='1';
const baselineRef=process.env.BASELINE_REF||'2150b3e0';
const vite=await createServer({cacheDir:`/tmp/android-stutter-vite-${process.pid}`,optimizeDeps:{include:['pixi.js','nixie-fx','nixie-fx/pixi','nixie-fx/export','nixie-fx/materials','@pixi/sound']},plugins:baseline?[{name:'baseline-pause-and-gate',enforce:'pre',load(id){
 for(const rel of ['src/app/frame-scheduler.ts','src/stronghold/tracelog.ts','src/stronghold/gate-doors.ts'])if(id.endsWith('/'+rel))return execFileSync('git',['show',baselineRef+':'+rel],{encoding:'utf8'});
}}]:[],server:{host:'127.0.0.1',port:18147,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:392,height:735}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tracelogs',r=>r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"verification"}'}));
 await page.clock.install();
 await page.goto('http://127.0.0.1:18147/?offline=1&hero=ember-warden&quality=low&shadowField=0');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.fxStage.ready()&&!document.querySelector('#loading-screen'),null,{timeout:240000});
 await page.clock.runFor(2500);
 await page.evaluate(async()=>{window.__PAUSE_TEST__=await import('/src/app/frame-scheduler.ts');window.__PAUSE_TEST__.setGamePaused(true);});
 await page.clock.runFor(2300);
 await page.evaluate(()=>window.__PAUSE_TEST__.setGamePaused(false));
 await page.clock.runFor(66);
 const resume=await page.evaluate(()=>window.__FPS_TRACELOG__.stats());
 // Resetting the measurement window excludes the intentional 2300 ms pause.
 // Independent GPU/main-thread stalls after resume must remain in the sample.
 if(!baseline){assert.ok(resume.sampleCount<10,'resume must start a fresh measurement window');assert.ok(resume.maxFrameMs<2000,`intentional pause leaked into frame timing: ${resume.maxFrameMs}`);}
 await page.clock.runFor(2000);await page.clock.fastForward(500);
 const realGap=await page.evaluate(()=>window.__FPS_TRACELOG__.stats());
 assert.ok(realGap.maxFrameMs>=400,`unpaused stalls must remain visible: ${JSON.stringify(realGap)}`);
 await page.clock.runFor(1500);
 await page.evaluate(()=>window.__PAUSE_TEST__.setGamePaused(true));
 await page.clock.runFor(2300);
 await page.evaluate(()=>window.__PAUSE_TEST__.setGamePaused(false));
 await page.clock.fastForward(500);
 const firstResumeGap=await page.evaluate(()=>window.__FPS_TRACELOG__.stats());
 if(!baseline)assert.ok(firstResumeGap.maxFrameMs>=400&&firstResumeGap.maxFrameMs<1500,`first resumed frame must retain real stalls: ${JSON.stringify(firstResumeGap)}`);
 await page.clock.resume();
 const gate=await page.evaluate(async()=>{
  const {createGateDoors}=await import('/src/stronghold/gate-doors.ts');
  const meta=await (await fetch('/modular-stronghold/v2/full-gateway-v7-sheet.json')).json();
  const load=async(src)=>{const i=new Image();i.src=src;await i.decode();return i;};
  const [image,sheet]=await Promise.all([load('/modular-stronghold/v2/full-gateway-v7-closed.webp'),load('/modular-stronghold/v2/'+meta.image)]);
  const original=window.createImageBitmap;let release,preparedBitmap;
  window.createImageBitmap=(...args)=>new Promise(resolve=>{release=async()=>{preparedBitmap=await original(...args);resolve(preparedBitmap);};});
  const start=performance.now();
  const door=createGateDoors({addChild(){}},image,sheet,meta,()=>{},{raster:1.5,revision:()=>0,torches:()=>false,shade:(src,dst)=>dst.getContext('2d').drawImage(src,0,0)});
  const constructionMs=performance.now()-start,asynchronous=Boolean(release);
  await release?.();window.createImageBitmap=original;
  let resizeMeanError=null;
  if(preparedBitmap){
   const reference=document.createElement('canvas'),actual=document.createElement('canvas');
   reference.width=actual.width=preparedBitmap.width;reference.height=actual.height=preparedBitmap.height;
   const a=reference.getContext('2d'),b=actual.getContext('2d');
   a.drawImage(sheet,0,0,reference.width,reference.height);b.drawImage(preparedBitmap,0,0);
   const x=a.getImageData(0,0,reference.width,reference.height).data,y=b.getImageData(0,0,actual.width,actual.height).data;
   let error=0;for(let i=0;i<x.length;i++)error+=Math.abs(x[i]-y[i]);resizeMeanError=error/x.length;
  }
  for(let i=0;i<100&&asynchronous&&door.canvas.dataset.sheetState!=='ready';i++)await new Promise(r=>setTimeout(r,10));
  door.setOpen(true);
  for(let i=0;i<200&&door.canvas.dataset.state!=='open';i++)await new Promise(r=>setTimeout(r,10));
  const pixels=door.canvas.getContext('2d').getImageData(0,0,door.canvas.width,door.canvas.height).data;
  let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])visible++;
  return {constructionMs,asynchronous,resizeMeanError,sheetState:door.canvas.dataset.sheetState,state:door.canvas.dataset.state,progress:door.canvas.dataset.progress,visible};
 });
 if(!baseline){assert.equal(gate.asynchronous,true);assert.equal(gate.sheetState,'ready');assert.ok(gate.resizeMeanError<1,'bitmap resize must preserve the old sheet appearance');}
 assert.equal(gate.state,'open');assert.ok(gate.visible>1000,'gateway must still render');assert.deepEqual(errors,[]);
 const result={baseline,baselineRef:baseline?baselineRef:undefined,resume,realGap,firstResumeGap,gate,errors};
 await fs.writeFile(process.env.REPORT||`docs/android-stutter/pause-gate-${baseline?'before':'after'}.json`,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({baseline,resumeMaxMs:resume.maxFrameMs,unpausedGapMs:realGap.maxFrameMs,firstResumeGapMs:firstResumeGap.maxFrameMs,gate,errors}));
}finally{await browser.close();await vite.close();}
