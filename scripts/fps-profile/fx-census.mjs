// Which NixieFX effects carry the particle load in a long solo fight: levels the hero (picking offered blessings),
// summons sturdy revenants around it, lets auto-cast run and samples fxStage.stats().playing every 250ms.
//   node scripts/fps-profile/fx-census.mjs [level=8] [foes=8] [seconds=12] [hero=ember-warden]
// REALTIME=1 runs on the real clock (headless SwiftShader renders slowly, which exercises the adaptive particle budget
// the way a struggling phone would); otherwise a fake clock drives 60 fps game time.
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';
const [LEVEL=8,FOES=8,SECONDS=12]=process.argv.slice(2,5).map(Number);const HERO=process.argv[5]||'ember-warden';
const vite=await createServer({server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734}});
 await page.routeWebSocket('**/*',()=>{});
 const REALTIME=Boolean(process.env.REALTIME);
 if(!REALTIME)await page.clock.install();
 await page.goto(`${GAME}/?offline=1&hero=${HERO}&time=0.5`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 const setup=await page.evaluate(([lv,n])=>{
  const c=window.__STRONGHOLD_COMBAT__;
  for(let i=1;i<lv;i++){const r=c.offer();if(r.offers?.length)c.choose(r.offers[0]);}
  const s=c.snapshot();
  for(let u=18;u<34;u+=.5)for(let v=18;v<34;v+=.5){
   if(c.clear(u,v)&&c.clear(u+2,v)&&c.clear(u-2,v)&&c.clear(u,v+2)&&c.clear(u,v-2)&&c.teleport(u,v)){
    c.clearFoes();for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.summon(u+Math.cos(a)*1.4,v+Math.sin(a)*1.4,lv);}
    return {u,v,level:s.run.level,slots:s.run.slots,skills:s.run.skills};
   }
  }
 },[LEVEL,FOES]);
 console.log('setup',JSON.stringify(setup));
 // Fake clock: advance game time in 16ms steps so the sim runs at 60 fps game-time regardless of render speed.
 const per=new Map();let samples=0,totalSum=0,totalMax=0,liveSum=0;
 for(let t=0;t<SECONDS*1000;t+=250){
  if(REALTIME)await page.waitForTimeout(250);else await page.clock.runFor(250);
  const st=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;const s=c.fxStage.stats();const snap=c.snapshot();return {s,alive:snap.foes.filter(f=>f.hp>0).length,heroHp:snap.hero.hp};});
  samples++;totalSum+=st.s.particles;totalMax=Math.max(totalMax,st.s.particles);liveSum+=st.s.live;
  const seen=new Map();
  for(const p of st.s.playing){const i=p.lastIndexOf(':');const k=p.slice(0,i),n=+p.slice(i+1);const e=seen.get(k)??{n:0,c:0};e.n+=n;e.c++;seen.set(k,e);}
  for(const [k,e] of seen){const a=per.get(k)??{sum:0,max:0,inst:0,instMax:0};a.sum+=e.n;a.max=Math.max(a.max,e.n);a.inst+=e.c;a.instMax=Math.max(a.instMax,e.c);per.set(k,a);}
  if(t%2000===0)console.log(`t=${t} particles=${st.s.particles} live=${st.s.live} budget=${st.s.particleBudget} skipped=${st.s.budgetSkipped} frameMs=${st.s.frameMs} foesAlive=${st.alive} heroHp=${Math.round(st.heroHp)}`);
 }
 console.log(`\navg particles ${(totalSum/samples).toFixed(0)} max ${totalMax} avg live effects ${(liveSum/samples).toFixed(1)}`);
 console.log('effect'.padEnd(44),'avgPart','maxPart','avgInst','maxInst');
 for(const [k,a] of [...per].sort((x,y)=>y[1].sum-x[1].sum))console.log(k.padEnd(44),(a.sum/samples).toFixed(1).padStart(7),String(a.max).padStart(7),(a.inst/samples).toFixed(2).padStart(7),String(a.instMax).padStart(7));
}finally{await browser.close();await vite.close();}
