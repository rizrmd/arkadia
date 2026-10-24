import {createServer} from 'vite';import path from 'node:path';import {launch} from '../vfx/browser.mjs';
// Frame cost while walking through the Frozen Frontier: a fake clock steps one rAF per 16.7 ms (identical game time
// however slow headless rendering is) while the hero walks a loop around the ruined gate, and a CDP CPU profile
// reports busy main-thread ms per frame inside the game loop, plus the Pixi render share. Headless Chromium renders
// with SwiftShader, whose GPU waits land in renderer.render, so jsMsPerFrame (busy minus that) is the comparable number. Run it on a checkout without
// the scenery (root, e.g. a `git worktree` of the previous commit) and with it for before/after numbers.
//   node scripts/frozen-frontier-map/bench.mjs [frames=300] [root=.]     VIEW=desktop|phone (phone: 390x844 at DPR 3)
const FRAMES=Number(process.argv[2]||300),ROOT=path.resolve(process.argv[3]||'.'),VIEW=process.env.VIEW||'desktop';
const vite=await createServer({root:ROOT,configFile:path.join(ROOT,'vite.config.ts'),server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
const key=f=>`${f.functionName||'(anon)'} ${(f.url||'').split('/').slice(-1)[0].split('?')[0]}`;
try{
 const page=await browser.newPage(VIEW==='phone'?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.routeWebSocket('**/*',()=>{});
 page.on('console',m=>{if(m.type()==='error')console.error('page:',m.text().slice(0,300));});page.on('pageerror',e=>console.error('pageerror:',e.message));
 await page.clock.install();
 // Count WebGL draw calls (deterministic, unlike SwiftShader timings).
 await page.addInitScript(()=>{window.__DRAWS__=0;for(const C of [WebGL2RenderingContext,WebGLRenderingContext])for(const m of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=C.prototype[m];if(f)C.prototype[m]=function(...a){window.__DRAWS__++;return f.apply(this,a);};}});
 const t0=Date.now();
 await page.goto(`${GAME}/?offline=1&hero=ember-warden&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 const readyMs=Date.now()-t0;
 for(let i=0;i<300&&!(await page.evaluate(()=>window.__WORLD_HERO__?.dataset.mode==='3d-60fps'));i++)await page.clock.runFor(100);
 await page.evaluate(()=>window.__FROZEN_FRONTIER__?.ready);
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(false);c.setMaxHp(1e6);c.clearFoes();c.teleport(21,23.4);});
 await page.clock.runFor(1500);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});
 await cdp.send('Profiler.start');
 // Walk a loop: down-left through the gate, right, up, left.
 const legs=[['KeyS','KeyA'],['KeyD'],['KeyW','KeyD'],['KeyA']];const per=Math.floor(FRAMES/legs.length);const visible=[],draws=[];
 const w0=Date.now();
 for(const keys of legs){await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.clearFoes());for(const k of keys)await page.keyboard.down(k);
  for(let i=0;i<per;i++){await page.clock.runFor(16.7);if(i%15===0){visible.push(await page.evaluate(()=>window.__FROZEN_FRONTIER__?.stats().visible??0));const d0=await page.evaluate(()=>window.__DRAWS__);await page.clock.runFor(16.7);draws.push(await page.evaluate(()=>window.__DRAWS__)-d0);}}
  for(const k of keys)await page.keyboard.up(k);}
 const wall=Date.now()-w0;
 const {profile}=await cdp.send('Profiler.stop');
 const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const incl=new Map();let busy=0;
 profile.samples.forEach((id,i)=>{const d=(profile.timeDeltas[i+1]??0)/1000;const f=byId.get(id).callFrame;
  if(f.functionName==='(idle)'||f.functionName==='(program)')return;
  const seen=new Set();let cur=id,inFrame=false;const chain=[];while(cur){const k=key(byId.get(cur).callFrame);chain.push(k);if(/^(loop|tick|update|_tick) /.test(k)||k.startsWith('measureTracelogPhase'))inFrame=true;cur=parent.get(cur);}
  if(!inFrame&&f.functionName!=='(garbage collector)')return;
  busy+=d;for(const k of chain)if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+d);}
 });
 const pick=re=>[...incl].filter(([k])=>re.test(k)).sort((a,b)=>b[1]-a[1])[0]?.[1]??0,n=per*legs.length;
 const hero=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);
 console.log(JSON.stringify({view:VIEW,root:ROOT,frames:n,readyMs,wallMsPerFrame:+(wall/n).toFixed(1),busyMsPerFrame:+(busy/n).toFixed(2),jsMsPerFrame:+((busy-pick(/^renderer\.render tracelog/))/n).toFixed(2),
  pixiMs:+(pick(/^renderer\.render tracelog/)/n).toFixed(2),heroRenderMs:+(pick(/^render hero\.ts/)/n).toFixed(2),worldDrawMs:+(pick(/^draw world-view/)/n).toFixed(2),
  frontierPlaceMs:+(pick(/^place frontier-view/)/n).toFixed(3),blockedMs:+(pick(/^blocked hero\.ts/)/n).toFixed(3),occludersMs:+(pick(/^occluders hero\.ts/)/n).toFixed(3),
  gcMs:+(pick(/^\(garbage collector\)/)/n).toFixed(2),drawCallsPerFrame:draws.length?+(draws.reduce((a,b)=>a+b,0)/draws.length).toFixed(1):0,visibleProps:visible.length?Math.round(visible.reduce((a,b)=>a+b,0)/visible.length):0,heroEnd:[+hero.u.toFixed(2),+hero.v.toFixed(2)]}));
}finally{await browser.close();await vite.close();}
