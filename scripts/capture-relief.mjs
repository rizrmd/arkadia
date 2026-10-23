import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from './typography/browser.mjs';
// Terrain height evidence (Knowledge: Environment > Terrain Height): node scripts/capture-relief.mjs
// Captures the court at the default camera (must match the pre-terrain build), then teleports the hero to the foot
// of the east ridge's ramp, onto the ridge, behind it (hidden by the cliff), and onto the west terrace.
const OUT=process.env.OUT||'docs/terrain-height',port=String(5200+process.pid%700);
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: other sessions editing the shared clone must not reload the page mid-capture.
const vite=await createServer({server:{host:'127.0.0.1',port:+port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite.listen();
const report={shots:{},errors:[]};let browser;
try{
 for(const [name,w,h,mobile,time] of [['desktop',1536,1024,false,'.5'],['phone',390,844,true,'.5'],['dusk',1536,1024,false,'.79']].filter(v=>!process.env.ONLY||process.env.ONLY===v[0])){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');}catch{}});
  await page.goto(`http://127.0.0.1:${port}/?buildings=all&offline=1&time=${time}`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__,null,{timeout:300000});
  await page.waitForTimeout(3000);
  const shots=name==='desktop'?[['court',null],['ridge-ramp',[25.5,14.2]],['on-ridge',[25.5,7.2]],['behind-ridge',[25.5,4.5]],['on-terrace',[5.5,25]]]:name==='phone'?[['court',null],['on-ridge',[25.5,7.2]]]:[['on-ridge',[25.5,7.2]]];
  for(const [shot,at] of shots){
   if(at){const ok=await page.evaluate(([u,v])=>window.__STRONGHOLD_COMBAT__.teleport(u,v),at);if(!ok)throw Error('teleport failed for '+shot);await page.waitForTimeout(2500);}
   const file=`${OUT}/${name}-${shot}.png`;await page.screenshot({path:file});
   await sharp(file).webp({quality:82}).toFile(file.replace(/\.png$/,'.webp'));
   report.shots[`${name}-${shot}`]={teleport:at};
  }
  await browser.close();browser=null;
 }
 await fs.writeFile(`${OUT}/capture.json`,JSON.stringify(report,null,1)+'\n');
 console.log(JSON.stringify(report,null,1));
 if(report.errors.length)throw Error('page errors');
}finally{await browser?.close();await vite.close();}
