import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Full map + tap-to-walk evidence (Knowledge: Gameplay > World Map): node scripts/world-map/verify.mjs
// Desktop: click the minimap, drag the map, scroll out to the whole map, click a spot in the snow beyond the gateway and
// watch the hero walk the route out through the arch; a key press drops a route. Phone: tap the minimap, tap to walk.
const OUT=process.env.OUT||'docs/world-map',port=String(5200+process.pid%700);
await fs.mkdir(OUT,{recursive:true});
const vite=await createServer({server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();
const report={checks:{},errors:[]},check=(k,ok,detail)=>{report.checks[k]={ok:!!ok,...detail};console.log((ok?'PASS ':'FAIL ')+k,JSON.stringify(detail));};
const shot=async(page,name)=>{const file=`${OUT}/${name}.png`;await page.screenshot({path:file,timeout:180000});await sharp(file).webp({quality:82}).toFile(file.replace(/\.png$/,'.webp'));await fs.rm(file);};
const hero=page=>page.evaluate(()=>({x:+window.__WORLD_HERO__.dataset.x,y:+window.__WORLD_HERO__.dataset.y}));
// Waits until the route is gone (arrived or dropped), returning the hero's distance to the target.
async function walk(page,target,ms){
 const t0=Date.now();let route;
 while(Date.now()-t0<ms){route=await page.evaluate(()=>window.__WORLD_MAP__.route());if(!route)break;await page.waitForTimeout(1000);}
 const h=await hero(page);return {done:!route,left:Math.hypot(h.x-target.x,h.y-target.y),hero:h,seconds:(Date.now()-t0)/1000};
}
let browser;
try{
 for(const [name,w,h,mobile] of [['desktop',1440,900,false],['phone',390,844,true]].filter(v=>!process.env.ONLY||process.env.ONLY===v[0])){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');}catch{}});
  await page.goto(`http://127.0.0.1:${port}/?offline=1&time=.5`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__WORLD_MAP__&&window.__STRONGHOLD_COMBAT__,null,{timeout:300000});
  await page.waitForTimeout(2500);
  const mm=(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap)).bounds,mc={x:mm.x+mm.width/2,y:mm.y+mm.height/2};
  if(mobile)await page.touchscreen.tap(mc.x,mc.y);else await page.mouse.click(mc.x,mc.y);
  await page.waitForTimeout(800);
  const opened=await page.evaluate(()=>window.__WORLD_MAP__.snapshot());
  check(`${name}: tapping the minimap opens the full map`,opened.open,{minimap:mm,view:opened.view});
  await shot(page,`${name}-open`);
  const v=opened.view,vc={x:v.x+v.width/2,y:v.y+v.height/2};
  if(!mobile){
   await page.mouse.move(vc.x,vc.y);await page.mouse.down();
   for(let i=1;i<=8;i++)await page.mouse.move(vc.x-i*30,vc.y-i*18);
   await page.mouse.up();await page.waitForTimeout(600);
   const dragged=await page.evaluate(()=>window.__WORLD_MAP__.snapshot());
   const moved=Math.hypot(dragged.camera.x-opened.camera.x,dragged.camera.y-opened.camera.y);
   check(`${name}: dragging pans the map`,moved>100&&!dragged.follow&&!(await page.evaluate(()=>window.__WORLD_MAP__.route())),{cameraMovedPx:+moved.toFixed(1),follow:dragged.follow});
   await shot(page,`${name}-dragged`);
   for(let i=0;i<12;i++){await page.mouse.wheel(0,600);await page.waitForTimeout(80);}
   await page.waitForTimeout(600);
   const out=await page.evaluate(()=>window.__WORLD_MAP__.snapshot());
   check(`${name}: scrolling out shows the whole map`,Math.abs(out.zoom-out.minZoom)<1e-6,{zoom:out.zoom,minZoom:out.minZoom});
   await shot(page,`${name}-whole-map`);
   await page.keyboard.press('Escape');await page.waitForTimeout(300);
   await page.keyboard.press('KeyM');await page.waitForTimeout(800);
   check(`${name}: M reopens the map on the hero`,(await page.evaluate(()=>window.__WORLD_MAP__.snapshot())).follow,{});
  }
  // A spot in the snow straight out of the gateway: from inside the court the route has to pass the arch.
  const start=await hero(page),target={x:577+(mobile?-60:90),y:start.y+(mobile?380:520)};
  const at=await page.evaluate(([x,y])=>window.__WORLD_MAP__.screenOf(x,y),[target.x,target.y]);
  if(mobile)await page.touchscreen.tap(at.x,at.y);else await page.mouse.click(at.x,at.y);
  await page.waitForTimeout(500);
  const route=await page.evaluate(()=>window.__WORLD_MAP__.route());
  const throughArch=route&&route.points.some((p,i,a)=>i&&Math.abs(p.x-577)<40&&(a[i-1].y<778)!==(p.y<778)||i&&Math.abs((a[i-1].x+p.x)/2-577)<40&&a[i-1].y<760&&p.y>790);
  check(`${name}: tapping the map plans a route through the gateway`,route&&!route.partial&&throughArch,{start,target,tapped:route?.target,legs:route?.points.length,points:route?.points.map(p=>[Math.round(p.x),Math.round(p.y)])});
  await page.waitForTimeout(4000);
  await shot(page,`${name}-walking`);
  const first=await walk(page,route?.target??target,mobile?150000:200000);
  check(`${name}: the hero walks there`,first.done&&first.left<14,first);
  await page.keyboard.press('Escape');await page.waitForTimeout(600);
  await shot(page,`${name}-arrived`);
  if(!mobile){
   // A far route (about 120 tiles) plans within a frame budget or two, and a key press takes over at once.
   const far=await page.evaluate(()=>{const h=window.__WORLD_HERO__.dataset,t0=performance.now(),ok=window.__WORLD_MAP__.walkTo(+h.x+120*64,+h.y+40*32),r=window.__WORLD_MAP__.route();return {ok,ms:+(performance.now()-t0).toFixed(1),route:r&&{legs:r.points.length,partial:r.partial,expanded:r.expanded,planMs:r.ms}};});
   check(`${name}: a far (120 tile) route plans in one short step`,far.ok&&far.route.expanded<=20000,far);
   await page.waitForTimeout(1500);
   // Headless frames here are slow (~2 fps): hold the key across several frames.
   await page.keyboard.down('KeyA');await page.waitForTimeout(2500);await page.keyboard.up('KeyA');
   check(`${name}: a key press drops the route`,!(await page.evaluate(()=>window.__WORLD_MAP__.route())),{});
   // The minimap draws a live route too.
   await page.evaluate(()=>{const h=window.__WORLD_HERO__.dataset;window.__WORLD_MAP__.walkTo(+h.x-300,+h.y+260);});
   await page.waitForTimeout(2500);
   check(`${name}: the minimap shows the route`,!!(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap.route)),{});
   await shot(page,`${name}-minimap-route`);
  }
  await browser.close();browser=null;
 }
 report.errors=report.errors.filter(Boolean);
 await fs.writeFile(`${OUT}/verification.json`,JSON.stringify(report,null,1)+'\n');
 const failed=Object.entries(report.checks).filter(([,c])=>!c.ok).map(([k])=>k);
 console.log(failed.length?'FAILED: '+failed.join('; '):'ALL PASS',report.errors);
 if(failed.length||report.errors.length)process.exitCode=1;
}finally{await browser?.close();await vite.close();}
