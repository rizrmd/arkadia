import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from './typography/browser.mjs';
// Terrain height evidence (Knowledge: Environment > Terrain Height): node scripts/capture-relief.mjs
// Captures the court at the default camera (must match the pre-terrain build), then teleports the hero to the foot
// of the east ridge's ramp, onto the ridge, behind it (hidden by the cliff), and onto the west terrace.
const OUT=process.env.OUT||'docs/terrain-height/after-natural',port=String(5200+process.pid%700);
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: other sessions editing the shared clone must not reload the page mid-capture.
const vite=await createServer({server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();
const report={shots:{},errors:[],traversal:[],performance:[]};let browser;
try{
 for(const [name,w,h,mobile,time] of [['desktop',1536,1024,false,'.5'],['phone',390,844,true,'.5'],['dusk',1536,1024,false,'.79']].filter(v=>!process.env.ONLY||process.env.ONLY===v[0])){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');}catch{}});
  await page.goto(`${process.env.BASE_URL||`http://127.0.0.1:${port}`}/?buildings=all&offline=1&time=${time}`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__,null,{timeout:300000});
  await page.waitForTimeout(3000);console.log(`Camera ready: ${name}`);
  const initial=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.setPreviewMode(true));
  await page.evaluate(initial=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(true);a.clearFoes();a.teleport(initial.u,initial.v);},initial);await page.waitForTimeout(2000);
  const shots=name==='desktop'?[['court',null],['ridge-ramp',[25.5,14.2]],['on-ridge',[25.5,7.2]],['ramp-middle',[25.5,11.5]],['ramp-shoulder',[24.5,10.2]],['behind-ridge',[25.5,4.5]],['on-terrace',[5.5,25]]]:name==='phone'?[['court',null],['on-ridge',[25.5,7.2]],['ramp-middle',[25.5,11.5]]]:[['on-ridge',[25.5,7.2]]];
  for(const [shot,at] of shots.filter(s=>(!process.env.COURT_ONLY||s[0]==='court')&&(!process.env.SHOTS||process.env.SHOTS.split(',').includes(s[0])))){
   if(at){const ok=await page.evaluate(([u,v])=>window.__STRONGHOLD_COMBAT__.teleport(u,v),at);if(!ok)throw Error('teleport failed for '+shot);await page.waitForTimeout(2500);}
   const file=`${OUT}/${name}-${shot}.png`;await page.screenshot({path:file});
   await sharp(file).webp({quality:82}).toFile(file.replace(/\.png$/,'.webp'));
   report.shots[`${name}-${shot}`]={teleport:at};console.log(`Captured ${name}-${shot}`);
  }
  if(name==='desktop'&&!process.env.COURT_ONLY){
   for(const [label,from,keys,seconds] of [['ascent',[25.5,13.5],['KeyW','KeyD'],4.2],['descent',[25.5,9.5],['KeyA','KeyS'],4],['cliff-block',[29,7.5],['KeyW','KeyA'],6]]){
    await page.evaluate(([u,v])=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(false);a.clearFoes();a.teleport(u,v);},from);
    for(const key of keys)await page.keyboard.down(key);
    if(label==='cliff-block')await page.waitForTimeout(seconds*1000);else await page.waitForFunction(label=>{const h=window.__STRONGHOLD_COMBAT__.snapshot().hero;return label==='ascent'?h.v<9.5:h.v>13.3;},label,{timeout:45000});
    for(const key of keys)await page.keyboard.up(key);
    await page.waitForTimeout(300);
    const hero=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);
    report.traversal.push({label,from,to:[hero.u,hero.v]});console.log(label,hero.u,hero.v);
    if(label==='ascent'&&!(hero.v<10&&hero.v>5))throw Error('actual keyboard ascent failed '+JSON.stringify(hero));
    if(label==='descent'&&hero.v<13)throw Error('actual keyboard descent failed '+JSON.stringify(hero));
    if(label==='cliff-block'&&(hero.u<27.7||hero.u>28.05))throw Error('actual keyboard cliff blocking failed '+JSON.stringify(hero));
   }
  }
  const perf=await page.evaluate(async()=>{
   const samples=[];let last=performance.now();await new Promise(resolve=>{const next=t=>{samples.push(t-last);last=t;if(samples.length<15)requestAnimationFrame(next);else resolve();};requestAnimationFrame(next);});
   samples.sort((a,b)=>a-b);return {frameIntervalMs:{p50:samples[7],p95:samples[14]},resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('cliff-strip')).map(x=>({name:x.name,transferSize:x.transferSize,decodedBodySize:x.decodedBodySize}))};
  });report.performance.push({camera:name,...perf});
  await browser.close();browser=null;
 }
 await fs.writeFile(`${OUT}/${process.env.COURT_ONLY?'court-capture':'capture'}.json`,JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify(report,null,1));
 if(report.errors.length)throw Error('page errors');
}finally{await browser?.close();await vite.close();}
