import {chromium} from 'playwright';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {launchOptions} from '../typography/browser.mjs';
const OUT=process.env.OUT||'docs/temple-grounding',baseUrl=process.env.BASE_URL;
await fs.mkdir(OUT,{recursive:true});
const vite=baseUrl?null:await createServer({server:{host:'127.0.0.1',port:5983,strictPort:true,hmr:false,watch:null},logLevel:'error',plugins:[{name:'temple-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/temple-check'){res.setHeader('Content-Type','text/html');res.end('<body>Temple geometry check</body>');}else next();});}}]});
await vite?.listen();const base=baseUrl||'http://127.0.0.1:5983',report={base,time:Number(process.env.TIME||.565),errors:[],shots:{}};let browser;
try{
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 if(!baseUrl){
  await page.goto(base+'/temple-check');
  report.geometry=await page.evaluate(async()=>{
   const {heightAtTile,liftAtTile,cliffTile}=await import('/src/world/relief.ts');
   const {FRONTIER_COLUMNS}=await import('/src/world/frontier.ts');
   const {tilePoint}=await import('/src/stronghold/terrain.ts');
   const {unproject}=await import('/src/isometric.ts');
   const {walkStep,navBlocker}=await import('/src/stronghold/net/movement.ts');
   const blocked=navBlocker(FRONTIER_COLUMNS),checks=[];
   const check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name);};
   check('podium top is 25.3 px',Math.abs(liftAtTile(18.4,32)-25.3)<1e-8);
   check('stair midpoint is half height',Math.abs(liftAtTile(19.679,32)-12.65)<1e-8);
   check('snow outside is zero height',heightAtTile(20.1,32)===0);
   check('side edge is a cliff',cliffTile(19.37,31.4,19.4,31.4));
   const walk=(u,v,du,dv,steps)=>{let p=tilePoint(u,v);const q=tilePoint(u+du,v+dv),len=Math.hypot(q.x-p.x,q.y-p.y),d={x:(q.x-p.x)/len,y:(q.y-p.y)/len};for(let i=0;i<steps;i++)p=walkStep((x,y)=>blocked(x,y,true),p.x,p.y,d,25);const O=tilePoint(0,0);return unproject(p.x-O.x,p.y-O.y);};
   const up=walk(20.15,32,-1,0,45),down=walk(19,32,1,0,40),side=walk(20.15,31.4,-1,0,50);
   check('walk up stairs onto altar',up.x<19.379&&heightAtTile(up.x,up.y)>1);
   check('walk down stairs onto snow',down.x>19.979&&heightAtTile(down.x,down.y)===0);
   check('cannot walk through altar side',side.x>=19.379);
   return {checks,up,down,side,columns:FRONTIER_COLUMNS};
  });
  await fs.writeFile('docs/frozen-frontier-map/columns-parity.json',JSON.stringify({columns:report.geometry.columns})+'\n');delete report.geometry.columns;
 }
 await page.addInitScript(()=>{localStorage.removeItem('arkodia.stronghold.hero');localStorage.setItem('arkodia.hero','rift-runner');});
 await page.goto(base+'/?offline=1&time='+report.time);
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__&&window.__FROZEN_FRONTIER__,null,{timeout:240000});
 await page.evaluate(()=>{window.__STRONGHOLD_COMBAT__.setPreviewMode(true);window.__STRONGHOLD_COMBAT__.clearFoes();});
 for(const [name,width,height,spots] of [['portrait',390,844,[['approach',20.6,32],['stairs',19.68,32],['on-altar',18.8,32],['behind',16.8,32]]],['desktop',1440,900,[['approach',20.6,32]]]]){
  if(process.env.ONLY&&process.env.ONLY!==name)continue;
  await page.setViewportSize({width,height});
  for(const [spot,u,v] of spots){
   if(process.env.SHOTS&&!process.env.SHOTS.split(',').includes(spot))continue;
   const ok=await page.evaluate(([u,v])=>window.__STRONGHOLD_COMBAT__.teleport(u,v),[u,v]);if(!ok)throw Error('Teleport blocked: '+spot);
   await page.waitForTimeout(2200);const file=`${OUT}/${name}-${spot}.webp`;
   await sharp(await page.screenshot({timeout:120000})).webp({quality:85}).toFile(file);
   report.shots[`${name}-${spot}`]=await page.evaluate(()=>({hero:window.__STRONGHOLD_COMBAT__.snapshot().hero,scenery:window.__FROZEN_FRONTIER__.stats()}));
  }
 }
 report.ok=report.errors.length===0;
 await fs.writeFile(`${OUT}/verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:report.ok,geometry:report.geometry,errors:report.errors}));if(!report.ok)process.exitCode=1;
}finally{await browser?.close();await vite?.close();}
