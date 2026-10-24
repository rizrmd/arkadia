import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Frozen Frontier map QA (Knowledge: Frozen Frontier > Map Placement). Opens the game offline (or BASE_URL, e.g. the
// live site), checks every kit sprite is placed and loaded, exports the browser's collision columns for the Go
// parity test, teleports the hero around each landmark for screenshots, walks into solid props and along the paths
// with the real keyboard, and records page errors.
//   node scripts/frozen-frontier-map/verify.mjs            ONLY=desktop|portrait|landscape  SHOTS=a,b  OUT=dir
const OUT=process.env.OUT||'docs/frozen-frontier-map',PARITY=process.env.PARITY||'docs/frozen-frontier-map/columns-parity.json',port=String(5200+process.pid%700);
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: peers editing the shared clone must not reload the page mid-capture.
const vite=process.env.BASE_URL?null:await createServer({server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=process.env.BASE_URL||`http://127.0.0.1:${port}`;
const report={base,shots:{},errors:[],console:[],frontier:null,traversal:[],ok:true};let browser;
const SPOTS={
 'gate-road':[18.6,19.9],'frontier-road':[21.0,21.6],'ruined-gate':[21.0,23.6],'through-ruined-gate':[21.0,27.0],'pillar-courtyard':[20.6,31.6],'settlement':[17.6,31.0],
 'settlement-east':[24.4,30.4],'shrine-trail':[8.0,21.6],
 'watchtower':[28.4,18.9],'behind-watchtower':[28.9,13.4],'snowy-shrine':[0.9,28.0],'north-west-grove':[-9.5,6.0],'north-east-grove':[6.5,-9.5],'frozen-steppe':[29.5,29.0],
};
// Every ruin area and a stretch of each path, on desktop and both phone orientations (before/after comparisons).
const RUINS=['frontier-road','ruined-gate','pillar-courtyard','settlement','settlement-east','watchtower','snowy-shrine','shrine-trail'];
const VIEWS=[['desktop',1440,900,false,[...RUINS,'gate-road','through-ruined-gate','behind-watchtower','north-west-grove','north-east-grove','frozen-steppe']],
 ['portrait',390,844,true,RUINS],['landscape',844,390,true,RUINS]];
try{
 for(const [name,w,h,mobile,spots] of VIEWS.filter(v=>!process.env.ONLY||process.env.ONLY.split(',').includes(v[0]))){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  page.on('console',m=>{if(m.type()==='error')report.console.push(name+': '+m.text());});
  // Count WebGL draw calls, to measure what the scenery adds at each spot (shown vs hidden, same frame state).
  await page.addInitScript(()=>{window.__DRAWS__=0;for(const C of [WebGL2RenderingContext,WebGLRenderingContext])for(const m of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=C.prototype[m];if(f)C.prototype[m]=function(...a){window.__DRAWS__++;return f.apply(this,a);};}});
  await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');localStorage.setItem('arkodia.hero','ember-warden');}catch{}});
  await page.goto(`${base}/?offline=1&time=.5`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__&&window.__FROZEN_FRONTIER__,null,{timeout:300000});
  await page.evaluate(()=>window.__FROZEN_FRONTIER__.ready);await page.waitForTimeout(1500);
  const stats=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());console.log(name,JSON.stringify(stats));
  if(!report.frontier){report.frontier=stats;
   if(!vite)report.live=true;else{const columns=await page.evaluate(()=>window.__FROZEN_FRONTIER__.columns());await fs.writeFile(PARITY,JSON.stringify({version:1,columns})+'\n');}}
  await page.waitForFunction(()=>{const s=window.__FROZEN_FRONTIER__.stats();return s.occlusionImages===s.sprites;},null,{timeout:60000}).catch(()=>{});
  const art=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());
  if(!art.loaded||art.failed||art.assets.length!==art.kit||art.occlusionImages!==art.sprites){report.ok=false;report.errors.push(`${name}: frontier atlas loaded=${art.loaded}, ${art.occlusionImages}/${art.sprites} occlusion images, ${art.assets.length}/${art.kit} sprites placed`);}
  await page.evaluate(()=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(true);a.clearFoes();});
  for(const shot of spots.filter(s=>!process.env.SHOTS||process.env.SHOTS.split(',').includes(s))){
   // The first free foot position at or around the spot (a plant may stand on it).
   const at=await page.evaluate(([u,v])=>{for(let r=0;r<=1.5;r+=.25)for(let a=0;a<6.28;a+=r?.7:7){const p=[+(u+Math.cos(a)*r).toFixed(2),+(v+Math.sin(a)*r).toFixed(2)];if(window.__STRONGHOLD_COMBAT__.teleport(...p))return p;}return null;},SPOTS[shot]),ok=!!at;
   if(!ok){report.ok=false;report.errors.push(`${name}: teleport to ${shot} (${SPOTS[shot]}) blocked`);continue;}
   await page.waitForTimeout(2500);
   const file=`${OUT}/${name}-${shot}.png`;await page.screenshot({path:file});
   await sharp(file).webp({quality:80}).toFile(file.replace(/\.png$/,'.webp'));await fs.unlink(file);
   const draws=await page.evaluate(async()=>{const f=window.__FROZEN_FRONTIER__,frames=n=>new Promise(r=>{let k=0;const d0=window.__DRAWS__;const t=()=>{if(++k>n)r((window.__DRAWS__-d0)/n);else requestAnimationFrame(t);};requestAnimationFrame(t);});
    const shown=await frames(6);f.setVisible(false);await frames(1);const hidden=await frames(6);f.setVisible(true);await frames(1);return {shown:+shown.toFixed(1),hidden:+hidden.toFixed(1),added:+(shown-hidden).toFixed(1)};});
   report.shots[`${name}-${shot}`]={teleport:at,visible:(await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats().visible)),drawCalls:draws};console.log('captured',name,shot);
  }
  if(name==='desktop'&&!process.env.SHOTS){
   // Walkability, independent of how fast headless frames run: every step of these lines must be a free foot position
   // (teleport refuses blocked ones): the road through the ruined gate, and up to the temple and watchtower stairs.
   for(const [label,a,b] of [['road-through-ruined-gate',[21.0,24.4],[21.0,27.4]],['road-to-temple-stairs',[21.1,29.2],[20.6,32.0]],['road-to-watchtower-stairs',[27.6,17.4],[29.0,17.0]]]){
    const free=await page.evaluate(([a,b])=>{const c=window.__STRONGHOLD_COMBAT__,bad=[];for(let i=0;i<=20;i++){const u=a[0]+(b[0]-a[0])*i/20,v=a[1]+(b[1]-a[1])*i/20;if(!c.teleport(u,v))bad.push([+u.toFixed(2),+v.toFixed(2)]);}return bad;},[a,b]);
    report.traversal.push({label,from:a,to:b,blocked:free,pass:!free.length});console.log(label,free.length?'blocked at '+JSON.stringify(free):'clear');if(free.length)report.ok=false;
   }
   // Real keyboard walks: into the watchtower (stops at its wall), and through the ruined gate along the road.
   for(const [label,from,keys,ms,check] of [
    ['into-watchtower',[30.0,17.4],['KeyW'],9000,h=>h.v>15.4&&h.v<17],
    ['into-pine-wall',[-9.5,6.0],['KeyA'],5000,null],
    ['through-ruined-gate',[21.0,23.4],['KeyS','KeyA'],9000,h=>h.v>26.6],
   ]){
    await page.evaluate(([u,v])=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(false);a.clearFoes();a.teleport(u,v);},from);await page.waitForTimeout(800);
    for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);await page.waitForTimeout(400);
    const hero=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero),pass=check?check(hero):true;
    report.traversal.push({label,from,to:[+hero.u.toFixed(2),+hero.v.toFixed(2)],pass});console.log(label,hero.u.toFixed(2),hero.v.toFixed(2),pass);
    if(!pass)report.ok=false;
   }
  }
  await browser.close();browser=null;
 }
}finally{await browser?.close();await vite?.close();}
if(report.errors.length)report.ok=false;
await fs.writeFile(`${OUT}/${process.env.REPORT||'verification'}.json`,JSON.stringify(report,null,1)+'\n');
console.log(JSON.stringify({ok:report.ok,errors:report.errors,console:report.console.slice(0,10),traversal:report.traversal},null,1));
if(!report.ok)process.exit(1);
