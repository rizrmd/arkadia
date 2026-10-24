// Deterministic main-thread cost of a solo level-8 fight: a fake clock steps one rAF per 16.7ms (so game time and
// spawns are identical between runs however slow headless rendering is), the hero is made unkillable, 8 sturdy
// revenants surround it, and a CDP CPU profile reports busy (non-idle) main-thread ms per frame with a breakdown.
//   node scripts/fps-profile/bench-combat.mjs [frames=360] [query=''] [root=.]
// root lets the same benchmark run another checkout (e.g. a `git worktree` of the previous commit).
import {createServer} from 'vite';
import path from 'node:path';
import {launch} from '../vfx/browser.mjs';

const FRAMES=Number(process.argv[2]||360),QUERY=process.argv[3]||'',ROOT=path.resolve(process.argv[4]||'.');
const vite=await createServer({root:ROOT,configFile:path.join(ROOT,'vite.config.ts'),server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
const key=f=>`${f.functionName||'(anon)'} ${(f.url||'').split('/').slice(-1)[0].split('?')[0]}`;
try{
 const page=await browser.newPage({viewport:{width:394,height:734}});
 await page.routeWebSocket('**/*',()=>{});
 await page.clock.install();
 await page.goto(`${GAME}/?offline=1&hero=ember-warden&time=0.5${QUERY?'&'+QUERY:''}`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 for(let i=0;i<300&&!(await page.evaluate(()=>window.__WORLD_HERO__?.dataset.mode==='3d-60fps'));i++)await page.clock.runFor(100);
 const setup=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let i=1;i<8;i++){const r=c.offer();if(r.offers?.length)c.choose(r.offers[0]);}
  c.setMaxHp(1e6);
  for(let u=18;u<34;u+=.5)for(let v=18;v<34;v+=.5){
   if(c.clear(u,v)&&c.clear(u+2,v)&&c.clear(u-2,v)&&c.clear(u,v+2)&&c.clear(u,v-2)&&c.teleport(u,v)){
    c.clearFoes();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;c.summon(u+Math.cos(a)*1.4,v+Math.sin(a)*1.4,8);}
    return {u,v,heroMode:window.__WORLD_HERO__?.dataset.mode};
   }
  }
 });
 await page.clock.runFor(1000);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});
 const particles=[];
 await cdp.send('Profiler.start');
 for(let i=0;i<FRAMES;i++){
  await page.clock.runFor(16.7);
  if(i%10===0)particles.push(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.liveCounts().particles));
 }
 const {profile}=await cdp.send('Profiler.stop');
 const fx=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.fxStage.stats());
 const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const incl=new Map();let busy=0,idle=0;
 // Only samples inside a requestAnimationFrame tick count (between steps the harness itself runs page.evaluate).
 profile.samples.forEach((id,i)=>{const d=(profile.timeDeltas[i+1]??0)/1000;const f=byId.get(id).callFrame;
  if(f.functionName==='(idle)'||f.functionName==='(program)'){idle+=d;return;}
  const seen=new Set();let cur=id,inFrame=false;const chain=[];while(cur){const k=key(byId.get(cur).callFrame);chain.push(k);if(/^(loop|tick|update|_tick) /.test(k)||k.startsWith('measureTracelogPhase'))inFrame=true;cur=parent.get(cur);}
  if(!inFrame&&f.functionName!=='(garbage collector)')return;
  busy+=d;for(const k of chain)if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+d);}
 });
 const pick=(re)=>[...incl].filter(([k])=>re.test(k)).sort((a,b)=>b[1]-a[1])[0]?.[1]??0;
 const out={frames:FRAMES,query:QUERY,root:ROOT,setup,busyMsPerFrame:+(busy/FRAMES).toFixed(2),
  heroRenderMs:+(pick(/^render hero\.ts/)/FRAMES).toFixed(2),
  hero3dMs:+(pick(/^updateAndRender hero-3d/)/FRAMES).toFixed(2),
  vfxMs:+(pick(/^render combat-vfx/)/FRAMES).toFixed(2),
  encountersRenderMs:+(pick(/^render encounters\.ts/)/FRAMES).toFixed(2),
  pixiMs:+(pick(/^renderer\.render tracelog/)/FRAMES).toFixed(2),
  gcMs:+(pick(/^\(garbage collector\)/)/FRAMES).toFixed(2),
  particlesAvg:Math.round(particles.reduce((a,b)=>a+b,0)/particles.length),particlesMax:Math.max(...particles),
  fx:{budget:fx.particleBudget,skipped:fx.budgetSkipped,peak:fx.peakParticles}};
 console.log(JSON.stringify(out));
}finally{await browser.close();await vite.close();}
