import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL;
const server=remote?null:await createServer({server:{host:'127.0.0.1',port:5598,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await server?.listen();
let browser;
const report={base:remote||'http://127.0.0.1:5598',views:[],errors:[]};
await fs.mkdir('docs/settings-icons',{recursive:true});
try {
 for(const [name,width,height,mobile] of [['desktop',1440,900,false],['mobile',390,844,true],['landscape',844,390,true]]){
  if(process.env.ONLY&&process.env.ONLY!==name)continue;
  console.log('START',name);
  const options=launchOptions();options.args=options.args.filter(x=>x!=='--single-process');browser=await chromium.launch(options);
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>{report.errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)console.log('HTTP ERROR',r.status(),r.url());});
  await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','rift-runner');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30,music:70,soundEffects:80,screenShake:true,showFps:false}));});
  await page.goto(report.base+'/?offline=1&hero=rift-runner&time=.45&3d=0',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen')&&window.__SETTINGS__,null,{timeout:300000,polling:500});
  const gear=page.getByRole('button',{name:'Open Settings',exact:true});
  const b=await gear.boundingBox();assert(b.width>=44&&b.height>=44);
  await page.screenshot({timeout:90000,animations:'disabled',path:`docs/settings-icons/${remote?'live':'local'}-${name}-hud.png`});
  await gear.click();await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.settings-icon')].every(i=>i.complete&&i.naturalWidth===128));
  const icons=await page.locator('.settings-icon').evaluateAll(els=>els.map(i=>({src:new URL(i.src).pathname,width:i.width,height:i.height,alt:i.alt,hidden:i.getAttribute('aria-hidden'),naturalWidth:i.naturalWidth})));
  assert.deepEqual(icons.map(i=>i.src),['/ui/settings/gear.webp','/ui/settings/music.webp','/ui/settings/sound-effects.webp']);assert(icons.every(i=>i.alt===''&&i.hidden==='true'));
  for(const i of icons){const r=await context.request.get(report.base+i.src);assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/image/);}
  const panel=await page.getByRole('dialog',{name:'Settings',exact:true}).boundingBox();assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);
  await page.screenshot({timeout:90000,animations:'disabled',path:`docs/settings-icons/${remote?'live':'local'}-${name}.png`});
  const saved=await page.evaluate(()=>localStorage.getItem('arkodia-stronghold-v1'));
  await page.getByRole('button',{name:'Reset Progression',exact:true}).click();
  const confirm=page.getByRole('alertdialog');await confirm.waitFor();assert.equal(await confirm.getByRole('button',{name:'Cancel'}).evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Escape');assert.equal(await confirm.count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('arkodia-stronghold-v1')),saved);
  await page.getByRole('button',{name:'Resume Game'}).click();assert.equal(await page.getByRole('dialog',{name:'Settings',exact:true}).count(),0);
  await gear.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();await page.keyboard.press('Escape');
  report.views.push({name,viewport:[width,height],gear:b,panel,icons,checks:['images decoded and HTTP 200','touch target >=44px','panel inside viewport','reset confirmation focused Cancel','Escape preserved progression','resume and keyboard reopen']});
  await context.close();await browser.close();console.log('PASS',name);
 }
 assert.deepEqual(report.errors,[]);
}finally{await fs.writeFile(`docs/settings-icons/${remote?'live':'local'}${process.env.ONLY?'-'+process.env.ONLY:''}-results.json`,JSON.stringify(report,null,2));await browser?.close();await server?.close();}
