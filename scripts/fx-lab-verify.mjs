import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const server=process.env.BASE_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188'],{stdio:'ignore'});
if(server)await new Promise(r=>setTimeout(r,2500));
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const base=process.env.BASE_URL||'http://127.0.0.1:5188';
try{
 await page.goto(base+'/fx-lab/');await page.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:120000});
 const results=[];
 for(const hero of ['ember-warden','rift-runner']){
  await page.evaluate(async h=>await window.__FX_LAB__.setHero(h),hero);
  for(const node of await page.evaluate(()=>window.__FX_LAB__.state().nodes)){
   await page.evaluate(id=>window.__FX_LAB__.select(id),node.id);await page.waitForTimeout(120);
   const s=await page.evaluate(()=>window.__FX_LAB__.state());
   if(s.nodes.length!==15||!s.modelReady||s.terrain!=='/modular-stronghold/v2/snow-soft-texture.png')throw Error('Invalid lab state');
   results.push({hero,node:node.id,implemented:node.implemented,lastSkill:s.combat.lastSkill});
  }
  await page.evaluate(()=>window.__FX_LAB__.select(window.__FX_LAB__.state().nodes[0].id));
  for(const rank of [1,3,5]){await page.evaluate(r=>window.__FX_LAB__.rank(r),rank);await page.waitForTimeout(300);}
  for(let d=0;d<8;d++)await page.evaluate(n=>window.__FX_LAB__.direction(n),d);
  await page.screenshot({path:`docs/fx-lab/${hero}-desktop.png`});
  await page.evaluate(async()=>await window.__FX_LAB__.tree());await page.waitForTimeout(300);await page.screenshot({path:`docs/fx-lab/${hero}-tree.png`});await page.evaluate(()=>window.__FX_LAB__.closeTree());
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'docs/fx-lab/mobile.png'});
 await page.evaluate(async()=>await window.__FX_LAB__.tree());await page.waitForTimeout(250);await page.screenshot({path:'docs/fx-lab/mobile-tree.png'});await page.evaluate(()=>window.__FX_LAB__.closeTree());
 for(const path of ['/skill-player/','/rift-dash/player/','/ember-warden-review/flame-fan-preview/','/flame-burst.html']){const r=await page.request.get(base+path,{maxRedirects:0});if(r.status()!==302||!r.headers().location.startsWith('/fx-lab/'))throw Error('Legacy VFX route remains: '+path);}
 const controls=await page.locator('#app button,#app input,#app select,#app aside').count();if(controls)throw Error('HTML controls found');
 const report={pass:errors.length===0,errors,controls,results};await fs.writeFile('docs/fx-lab/verification.json',JSON.stringify(report,null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify(report));
}finally{await browser.close();server?.kill();}
