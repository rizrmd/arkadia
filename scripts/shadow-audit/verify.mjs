import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
const out=process.env.OUT||'docs/shadow-audit/local';await fs.mkdir(out,{recursive:true});
const vite=process.env.BASE_URL?null:await createServer({server:{host:'127.0.0.1',port:5631,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=process.env.BASE_URL||'http://127.0.0.1:5631',report={base,scope:'Software SwiftShader, emulated viewports; not hardware mobile GPU measurements. Counts and screenshots do not prove receiver correctness.',runs:[],errors:[]};
let browser;
try{for(const mobile of (process.env.VIEW?[process.env.VIEW==='mobile']:[false,true])){
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','ember-warden');localStorage.removeItem('arkodia.stronghold.hero');window.__shadowDraws=0;for(const C of [WebGLRenderingContext,WebGL2RenderingContext])for(const m of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=C.prototype[m];if(f)C.prototype[m]=function(...args){window.__shadowDraws++;return f.apply(this,args)}}});
 for(const time of (process.env.TIMES?process.env.TIMES.split(',').map(Number):[.3,.52,.72,0])){
  await page.goto(`${base}/?offline=1&time=${time}`,{timeout:120000});await page.waitForFunction(()=>window.__FROZEN_FRONTIER__&&window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
  await page.evaluate(()=>window.__FROZEN_FRONTIER__.ready);await page.waitForFunction(()=>!window.__SCENE_SHADOWS__||window.__SCENE_SHADOWS__.stats().ready,null,{timeout:60000});const spot=process.env.SPOT||'cemetery',spots={cemetery:[34,44],'pillar-courtyard':[20.6,31.6],'ruined-gate':[21,23.6],settlement:[17.6,31.0]},target=spots[spot];if(!target)throw Error('Unknown QA spot '+spot);
  const teleported=await page.evaluate(([u,v])=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();for(let r=0;r<=1.5;r+=.25)for(let a=0;a<6.28;a+=r?.7:7){const p=[u+Math.cos(a)*r,v+Math.sin(a)*r];if(c.teleport(...p))return p;}return null;},target);if(!teleported)throw Error('QA spot blocked: '+spot);await page.waitForFunction(()=>!window.__SCENE_SHADOWS__||window.__SCENE_SHADOWS__.stats().ready,null,{timeout:60000});await page.waitForTimeout(800);
  const measurement=await page.evaluate(async()=>{const times=[],a=window.__shadowDraws,start=performance.now();let last=start;await new Promise(resolve=>{const tick=now=>{times.push(now-last);last=now;if(times.length<8)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});times.sort((a,b)=>a-b);return {durationMs:performance.now()-start,rafMedianMs:times[4],rafP95Ms:times[7],drawCalls:window.__shadowDraws-a,frames:8}});
  if(process.env.FIXTURE){const fixture=await page.evaluate(()=>window.__SCENE_SHADOWS__.runFixture());await fs.writeFile(out+'/gpu-fixture.json',JSON.stringify(fixture,null,2)+'\n');}
  const stats=await page.evaluate(()=>({...window.__FROZEN_FRONTIER__.stats(),sceneShadows:window.__SCENE_SHADOWS__?.stats()}));if(stats.companions?.families!==46)report.errors.push('Companions missing');if(time===0&&stats.shadows.shown)report.errors.push('night shadows visible');if(time!==0&&stats.shadows.shown===0)report.errors.push('day shadows missing');
  const name=`${mobile?'mobile':'desktop'}-${spot}-${time}.png`;await page.screenshot({path:out+'/'+name,timeout:120000});report.runs.push({mobile,time,spot,teleported,stats,measurement,image:name});await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mobile,time,shadows:stats.shadows,measurement}));
 }
 await browser.close();browser=null;
}}finally{await browser?.close();await vite?.close();await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n')}
if(report.errors.length)throw Error(JSON.stringify(report.errors));
