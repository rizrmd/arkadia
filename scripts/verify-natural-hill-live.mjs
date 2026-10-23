import {chromium} from 'playwright';
import {launchOptions} from './typography/browser.mjs';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const base=process.env.BASE_URL||'https://arkodia.online',out='docs/terrain-height/live-overlap-fixed';
const release=process.env.RELEASE_SHA||'f8c3ddd',archive=process.env.RELEASE_ARCHIVE||`/home/dev/releases/arkodia-game-${release}.tgz`;
await fs.mkdir(out,{recursive:true});
const files=execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:8e6}).split('\n');
const main=files.find(p=>/site\/assets\/main-[\w-]+\.js$/.test(p));if(!main)throw Error('Release main bundle missing');
const expected=execFileSync('tar',['-xOf',archive,main],{maxBuffer:10e6}),sha=b=>createHash('sha256').update(b).digest('hex');
const bundlePath=main.slice(main.indexOf('site/')+5),response=await fetch(base+'/'+bundlePath+'?terrain-verify='+release);
if(!response.ok)throw Error('Live main response '+response.status);
const observed=Buffer.from(await response.arrayBuffer());if(sha(expected)!==sha(observed))throw Error('Canonical live bundle differs from release');
const report={base,release,bundle:{path:bundlePath,sha256:sha(expected),liveMatches:true},errors:[],shots:[],traversal:[]};
let browser;
try{
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','ember-warden');localStorage.removeItem('arkodia.stronghold.hero');});
 await page.goto(base+'/?buildings=all&offline=1&hero=ember-warden&time=.5');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__,null,{timeout:180000});
 console.log('Live phone ready');
 for(const [name,u,v] of [['phone-ramp-middle',25.5,11.5],['phone-ramp-shoulder',24.5,10.2],['phone-on-ridge',25.5,7.2]]){
  const ok=await page.evaluate(([u,v])=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(true);a.clearFoes();return a.teleport(u,v);},[u,v]);if(!ok)throw Error('Teleport rejected '+name);
  await page.waitForTimeout(2500);const file=out+'/'+name+'.png';await page.screenshot({path:file});await sharp(file).webp({quality:86}).toFile(file.replace('.png','.webp'));report.shots.push({name,court:[u,v],viewport:[390,844],dpr:2});console.log('Captured '+name);
 }
 for(const [name,from,keys] of [['ascent',[25.5,13.5],['KeyW','KeyD']],['descent',[25.5,9.5],['KeyA','KeyS']],['cliff-block',[29,7.5],['KeyW','KeyA']]]){
  await page.evaluate(([u,v])=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(false);a.clearFoes();a.teleport(u,v);},from);
  for(const key of keys)await page.keyboard.down(key);
  if(name==='cliff-block')await page.waitForTimeout(6000);else await page.waitForFunction(name=>{const h=window.__STRONGHOLD_COMBAT__.snapshot().hero;return name==='ascent'?h.v<9.5:h.v>13.3;},name,{timeout:60000});
  for(const key of keys)await page.keyboard.up(key);await page.waitForTimeout(300);
  const h=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);report.traversal.push({name,from,to:[h.u,h.v]});
  if(name==='ascent'&&!(h.v<10&&h.v>5))throw Error('Live ascent failed');if(name==='descent'&&h.v<13)throw Error('Live descent failed');if(name==='cliff-block'&&(h.u<27.7||h.u>28.05))throw Error('Live cliff failed');console.log(name,h.u,h.v);
 }
 report.loadedBundle=await page.evaluate(path=>performance.getEntriesByType('resource').some(r=>r.name.includes(path)),bundlePath);if(!report.loadedBundle)throw Error('Browser loaded a different main bundle');
 if(report.errors.length)throw Error(report.errors.join('\n'));
 await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser?.close();}
