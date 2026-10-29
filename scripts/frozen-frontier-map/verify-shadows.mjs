import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Frozen Frontier sun shadows QA (frontier-view.ts setSun): opens the game offline at fixed times of day (or
// BASE_URL, e.g. the live site), checks every upright casts a shadow by day and none at night, and screenshots the
// cemetery and other scenery on a phone and on desktop.
//   node scripts/frozen-frontier-map/verify-shadows.mjs   ROOT=<worktree> (serve another checkout)  PREFIX=before-  OUT=dir
//   ONLY=desktop|portrait  TIMES=.52,.3  SHOTS=a,b (subsets)
const OUT=process.env.OUT||'docs/frontier-shadows',PREFIX=process.env.PREFIX||'',port=String(5200+process.pid%700);
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: peers editing the shared clone must not reload the page mid-capture.
const vite=process.env.BASE_URL?null:await createServer({root:process.env.ROOT||process.cwd(),server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=process.env.BASE_URL||`http://127.0.0.1:${port}`;
const SPOTS={'cemetery-gardens':[34,44],'cemetery-memorial':[34,54.5],'pillar-courtyard':[20.6,31.6],'watchtower':[28.4,18.9],'north-west-grove':[-9.5,6.0],'ruined-gate':[21.0,23.6],'settlement':[17.6,31.0]};
// [view, width, height, phone, time of day (0 = midnight, .5 = noon), spots]
const RUNS=[['portrait',390,844,true,.52,['cemetery-gardens']],['desktop',1440,900,false,.52,Object.keys(SPOTS)],['desktop',1440,900,false,.3,['pillar-courtyard','ruined-gate','settlement']],
 ['desktop',1440,900,false,.3,['cemetery-gardens','north-west-grove']],['desktop',1440,900,false,.72,['cemetery-gardens']],['desktop',1440,900,false,0,['cemetery-gardens']]];
const report={base,runs:[],errors:[],console:[],ok:true};let browser;
try{
 for(const [name,w,h,mobile,time,spots] of RUNS.filter(r=>(!process.env.ONLY||process.env.ONLY.split(',').includes(r[0]))&&(!process.env.TIMES||process.env.TIMES.split(',').map(Number).includes(r[4])))){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  page.on('console',m=>{if(m.type()==='error')report.console.push(name+': '+m.text());});
  await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');localStorage.setItem('arkodia.hero','ember-warden');}catch{}});
  await page.goto(`${base}/?offline=1&time=${time}`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__&&window.__FROZEN_FRONTIER__,null,{timeout:300000});
  await page.evaluate(()=>window.__FROZEN_FRONTIER__.ready);await page.waitForTimeout(1500);
  await page.evaluate(()=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(true);a.clearFoes();});
  const run={view:name,time,shots:{}};report.runs.push(run);
  for(const shot of spots.filter(s=>!process.env.SHOTS||process.env.SHOTS.split(',').includes(s))){
   const at=await page.evaluate(([u,v])=>{for(let r=0;r<=1.5;r+=.25)for(let a=0;a<6.28;a+=r?.7:7){const p=[+(u+Math.cos(a)*r).toFixed(2),+(v+Math.sin(a)*r).toFixed(2)];if(window.__STRONGHOLD_COMBAT__.teleport(...p))return p;}return null;},SPOTS[shot]);
   if(!at){report.ok=false;report.errors.push(`${name}: teleport to ${shot} blocked`);continue;}
   await page.waitForTimeout(2500);
   const file=`${OUT}/${PREFIX}${name}-${shot}-t${String(time).replace('.','')}.png`;await page.screenshot({path:file,timeout:120000});
   await sharp(file).webp({quality:80}).toFile(file.replace(/\.png$/,'.webp'));await fs.unlink(file);
   const stats=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());
   run.shots[shot]={teleport:at,visible:stats.visible,shadows:stats.shadows??null};
   // Before the change there is no shadow layer; after it, every upright (and each raised floor) casts one by day and
   // none shows at night.
   if(!PREFIX&&stats.shadows){const s=stats.shadows,day=time>.17&&time<.83;
    if(s.casters<stats.uprights||s.strips<s.casters)report.errors.push(`${name} ${shot}: ${s.casters} casters, ${s.strips} strips for ${stats.uprights} uprights`);
    if(day&&!(s.alpha>0&&s.shown>0))report.errors.push(`${name} ${shot} t=${time}: no shadows shown by day`);
    if(!day&&s.shown)report.errors.push(`${name} ${shot} t=${time}: shadows shown at night`);}
   console.log('captured',name,time,shot,JSON.stringify(run.shots[shot]));
  }
  await browser.close();browser=null;
 }
}finally{await browser?.close();await vite?.close();}
if(report.errors.length)report.ok=false;
await fs.writeFile(`${OUT}/${PREFIX}verification.json`,JSON.stringify(report,null,1)+'\n');
console.log(JSON.stringify({ok:report.ok,errors:report.errors,console:report.console.slice(0,10)},null,1));
if(!report.ok)process.exit(1);
