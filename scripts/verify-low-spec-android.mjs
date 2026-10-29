// Functional checks only: no FPS/CPU benchmark and no synthetic logs sent to production.
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from './vfx/browser.mjs';
let vite=null;
const external=process.env.VERIFY_URL;
if(!external){vite=await createServer({server:{host:'127.0.0.1',port:18234,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();}
const base=external||vite.resolvedUrls.local[0];
let browser=null;
const results=[];
try{
 for(const profile of (external?['auto-low','high']:['auto-low','high','auto-adapt'])){
  console.log('Checking',profile);browser=await launch();
  const context=await browser.newContext({viewport:{width:392,height:735},deviceScaleFactor:2.75,userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36',isMobile:true,hasTouch:true});
  await context.addInitScript(memory=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>memory});try{localStorage.setItem('arkodia.hero','ember-warden');}catch{}},profile==='auto-adapt'?8:4);
  await context.route('**/api/tracelogs',r=>r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"local-functional-check"}'}));
  await context.routeWebSocket('**/*',()=>{});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?offline=1&hero=ember-warden&time=0.5'+(profile==='high'?'&quality=high':''));
  await page.waitForFunction(()=>window.__FPS_TRACELOG__&&window.__STRONGHOLD_COMBAT__&&!document.querySelector('#loading-screen')&&window.__WORLD_HERO__?.dataset.mode==='3d-60fps',null,{timeout:90000});
  if(profile==='auto-adapt'){
   // Deterministic controller input verifies reconfiguration, not device performance.
   await page.evaluate(async()=>{const {renderQuality}=await import('/src/app/render-quality.ts');let t=performance.now();for(let i=0;i<100;i++)renderQuality.noteFrame(t+i*60,60);});
   await page.waitForFunction(()=>window.__HERO_3D_SCALE__===1&&document.querySelector('#world-canvas').dataset.quality==='low',null,{timeout:10000});
  }
  await page.waitForFunction(()=>window.__FPS_TRACELOG__.recentFrames(5).length>=3);
  const info=await page.evaluate(async()=>{
   const entry=(await window.__FPS_TRACELOG__.captureNow()).entry;
   return {quality:entry.client.renderQuality,build:entry.client.build,gpu:entry.client.gpu,target:entry.metrics.targetFps,threshold:entry.metrics.thresholdFps,detailKeys:[...new Set(entry.frames.flatMap(f=>Object.keys(f.details??{})))],canvas:{...document.querySelector('#world-canvas').dataset},hero:{...window.__WORLD_HERO__.dataset}};
  });
  assert.equal(info.target,profile==='high'?60:30);
  assert.ok(info.detailKeys.includes('heroDraw'),'per-pass diagnostics retained');
  assert.equal(info.quality.tier,profile==='high'?'high':'low');
  assert.equal(info.quality.heroScale,profile==='high'?2:1);
  assert.equal(info.quality.simpleShadow,profile!=='high');
  assert.equal(info.canvas.quality,info.quality.tier);
  if(profile!=='high'){assert.equal(info.quality.resolution,1);assert.equal(info.quality.antialias,false);assert.equal(info.threshold,29);}
  const oldAt=await page.evaluate(()=>[window.__WORLD_HERO__.dataset.x,window.__WORLD_HERO__.dataset.y]);
  const at=await page.evaluate(()=>{
   const c=window.__STRONGHOLD_COMBAT__;c.setMaxHp(1e6);c.setPreviewMode(true);c.clearFoes();
   for(let u=18;u<34;u+=.5)for(let v=18;v<34;v+=.5)if(c.clear(u,v)&&c.clear(u+.5,v-.5)&&c.teleport(u,v))return c.snapshot().hero;
  });
  assert.ok(at,'found walkable start');
  await page.waitForFunction(before=>{const d=window.__WORLD_HERO__.dataset;return d.x!==before[0]||d.y!==before[1];},oldAt,{timeout:10000});
  const start=await page.evaluate(()=>[window.__WORLD_HERO__.dataset.x,window.__WORLD_HERO__.dataset.y]);
  await page.keyboard.down('KeyD');
  try{await page.waitForFunction(before=>{const d=window.__WORLD_HERO__.dataset;return Math.hypot(Number(d.x)-Number(before[0]),Number(d.y)-Number(before[1]))>1;},start,{timeout:15000});}finally{await page.keyboard.up('KeyD');}
  await page.evaluate(()=>window.__notifyHeroCast(1500));
  await page.waitForFunction(()=>window.__WORLD_HERO__.dataset.clip3d==='idle_cast'||window.__WORLD_HERO__.dataset.clip3d==='run_cast',null,{timeout:10000});
  // Inspect actual sprite pixels so shader errors/blank output fail, even if JS reports ready.
  const visible=await page.evaluate(()=>{const c=window.__WORLD_HERO__,g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>80)n++;return n;});
  assert.ok(visible>100,'3D sprite is visible');
  assert.deepEqual(errors,[]);
  results.push({profile,...info,movement:true,cast:true,visiblePixels:visible,errors});
  console.log('PASS',profile,'render target, quality, movement, casting and visible sprite');
  await browser.close();browser=null;
 }
 const report={checkedAt:new Date().toISOString(),url:base,checks:'Functional validation only; no performance benchmark',results};
 await fs.writeFile(process.env.REPORT||'docs/low-spec-android/functional.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await vite?.close();}
