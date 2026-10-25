// CPU profile of solo combat (Ember Warden + N revenants, auto-cast) in headless Chromium. Prints self time per
// function and per-frame cost of the GL readback / ImageData calls so a mobile tracelog's "encounters-render" bucket
// can be split into its real parts.
//   node scripts/fps-profile/profile-combat.mjs [foes=8] [seconds=6] [cpuThrottle=1]
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import {launch} from '../vfx/browser.mjs';

const [FOES=8,SECONDS=6,THROTTLE=1]=process.argv.slice(2).map(Number);
const OUT=process.env.OUT||'';
let vite=null,GAME=process.env.GAME||'';
if(!GAME){
 vite=await createServer({cacheDir:`/tmp/combat-profile-${process.pid}`,server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
 await vite.listen();GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
}
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734},deviceScaleFactor:1});
 // Profiling must not displace real device evidence in the production trace ring.
 await page.route('**/api/tracelogs',r=>r.request().method()==='POST'?r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"cpu-profile"}'}):r.continue());
 await page.routeWebSocket('**/*',()=>{});
 await page.addInitScript(()=>{
  const W=window;W.__PROF__={};
  const wrap=(proto,name,key)=>{const f=proto[name];proto[name]=function(...a){const t=performance.now();try{return f.apply(this,a);}finally{const s=W.__PROF__[key]??={ms:0,n:0};s.ms+=performance.now()-t;s.n++;}};};
  wrap(WebGLRenderingContext.prototype,'readPixels','gl.readPixels');
  wrap(WebGL2RenderingContext.prototype,'readPixels','gl.readPixels');
  wrap(CanvasRenderingContext2D.prototype,'putImageData','2d.putImageData');
  wrap(CanvasRenderingContext2D.prototype,'getImageData','2d.getImageData');
  wrap(CanvasRenderingContext2D.prototype,'drawImage','2d.drawImage');
  wrap(WebGL2RenderingContext.prototype,'texImage2D','gl2.texImage2D');
  wrap(WebGL2RenderingContext.prototype,'getBufferSubData','gl2.getBufferSubData');
  wrap(WebGL2RenderingContext.prototype,'clientWaitSync','gl2.clientWaitSync');
  wrap(WebGL2RenderingContext.prototype,'texSubImage2D','gl2.texSubImage2D');
  wrap(WebGL2RenderingContext.prototype,'getProgramParameter','gl2.getProgramParameter');
  wrap(WebGLRenderingContext.prototype,'texImage2D','gl1.texImage2D');
  let n=0;const tick=()=>{n++;W.__FRAMES__=n;requestAnimationFrame(tick);};requestAnimationFrame(tick);
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const glWarnings=new Set();page.on('console',m=>{const t=m.text();if(/stall|fence|performance warning/i.test(t))glWarnings.add(t.slice(0,220));});
 await page.goto(`${GAME}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 await page.waitForFunction(()=>window.__WORLD_HERO__?.dataset.mode==='3d-60fps',null,{timeout:180000}).catch(()=>console.log('3D hero never became ready'));
 const spot=await page.evaluate(n=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let u=18;u<34;u+=.5)for(let v=18;v<34;v+=.5){
   if(c.clear(u,v)&&c.clear(u+2,v)&&c.clear(u-2,v)&&c.clear(u,v+2)&&c.clear(u,v-2)&&c.teleport(u,v)){
    c.clearFoes();
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.summon(u+Math.cos(a)*1.6,v+Math.sin(a)*1.6,1);}
    return {u,v};
   }
  }
  return null;
 },FOES);
 console.log('spot',spot);
 await page.waitForTimeout(1500);
 const cdp=await page.context().newCDPSession(page);
 if(THROTTLE>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:THROTTLE});
 await page.evaluate(()=>{for(const k in window.__PROF__)delete window.__PROF__[k];window.__F0__=window.__FRAMES__;window.__T0__=performance.now();});
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');
 await page.waitForTimeout(SECONDS*1000);
 const {profile}=await cdp.send('Profiler.stop');
 const stats=await page.evaluate(()=>({frames:window.__FRAMES__-window.__F0__,ms:performance.now()-window.__T0__,prof:window.__PROF__,snap:(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return {foes:s.foes.length,alive:s.foes.filter(f=>f.hp>0).length,particles:window.__STRONGHOLD_COMBAT__.liveCounts().particles,hero:s.hero.state,heroMode:window.__WORLD_HERO__?.dataset.mode};})()}));
 // self time per function
 const byId=new Map(profile.nodes.map(n=>[n.id,n]));const self=new Map();
 const dts=profile.timeDeltas;let total=0;
 profile.samples.forEach((id,i)=>{const n=byId.get(id),f=n.callFrame;const key=`${f.functionName||'(anon)'} ${(f.url||'').split('/').slice(-1)[0].split('?')[0]}:${f.lineNumber+1}`;const d=(dts[i+1]??0)/1000;self.set(key,(self.get(key)||0)+d);total+=d;});
 // inclusive time for selected functions
 const parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const incl=new Map();
 profile.samples.forEach((id,i)=>{const d=(dts[i+1]??0)/1000;const seen=new Set();let cur=id;while(cur){const f=byId.get(cur).callFrame;const key=`${f.functionName||'(anon)'} ${(f.url||'').split('/').slice(-1)[0].split('?')[0]}:${f.lineNumber+1}`;if(!seen.has(key)){seen.add(key);incl.set(key,(incl.get(key)||0)+d);}cur=parent.get(cur);}});
 const frames=stats.frames;
 console.log(`frames ${frames} in ${stats.ms.toFixed(0)}ms → ${(frames/stats.ms*1000).toFixed(1)} fps; scene`,stats.snap);
 console.log('\nper-frame API cost (ms/frame, calls/frame):');
 for(const [k,v] of Object.entries(stats.prof).sort((a,b)=>b[1].ms-a[1].ms))console.log(` ${k.padEnd(18)} ${(v.ms/frames).toFixed(2).padStart(7)} ${(v.n/frames).toFixed(1).padStart(6)}`);
 const top=(m,n)=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>` ${(v/frames).toFixed(2).padStart(7)} ms/f ${(v/total*100).toFixed(1).padStart(5)}%  ${k}`).join('\n');
 console.log('\nself time top 30:\n'+top(self,30));
 console.log('\ninclusive top 45:\n'+top(incl,45));
 if(OUT)await fs.writeFile(OUT,JSON.stringify({frames,ms:stats.ms,prof:stats.prof,snap:stats.snap,self:[...self].sort((a,b)=>b[1]-a[1]).slice(0,60),incl:[...incl].sort((a,b)=>b[1]-a[1]).slice(0,80)},null,1));
 if(errors.length)console.log('page errors',errors.slice(0,5));
 if(glWarnings.size)console.log('GL warnings',[...glWarnings]);
}finally{await browser.close();await vite?.close();}
