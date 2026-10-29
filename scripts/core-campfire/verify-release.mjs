import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';
const base='https://arkodia.online',report={at:new Date().toISOString(),files:[],errors:[],browser:{}};
const receipt=await (await fetch(base+'/core-campfire/release.json')).json();report.commit=receipt.commit;
report.health=await (await fetch(base+'/healthz')).json();assert.equal(report.health.build,receipt.commit);
for(const [file,hash] of Object.entries(receipt.files)){const r=await fetch(base+file+(file.endsWith('.png')?'?format=png':''));assert.equal(r.status,200,file);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),hash,file);report.files.push(file);}
const options=launchOptions();options.args=options.args.filter(a=>a!=='--single-process');const browser=await chromium.launch(options);
try{
 const page=await browser.newPage({viewport:{width:1024,height:768}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'/sprite-player/stronghold-core/');await page.waitForFunction(()=>window.__coreReview?.ready,null,{timeout:30000});
 const first=await page.evaluate(()=>window.__coreReview);assert.equal(first.sprite,'/buildings/starting-campfire/campfire-v1.png');assert.deepEqual(first.pivot,[887,545]);
 await page.keyboard.press('ArrowRight');const second=await page.evaluate(()=>window.__coreReview);assert.equal(second.level,2);assert.equal(second.sprite,'level-01.png');assert.equal(second.repairs,1);
 for(let i=0;i<28;i++)await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>window.__coreReview.level),30);report.browser.review={first,second,level30:true};
 await page.goto(base+'/environment-editor/');await page.waitForFunction(()=>!!document.querySelector('canvas'),null,{timeout:30000});await page.waitForTimeout(3000);report.browser.editor={canvas:true};
 const loaded=[];page.on('response',r=>{if(r.status()===200&&/starting-campfire|stronghold-core/.test(r.url()))loaded.push(new URL(r.url()).pathname);});
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('arkodia.desktop-movement-hint.v1','1');});
 await page.goto(base+'/?offline=1&time=.5&quality=low');
 try{await page.waitForFunction(()=>window.__STRONGHOLD_NAV__&&window.__STRONGHOLD_COMBAT__&&!document.getElementById('loading-screen'),null,{timeout:45000});report.browser.gameplayLoaded=true;}catch(e){report.browser.gameplayLoaded=false;report.browser.gameplayLimit=String(e).slice(0,150);}
 report.browser.game=await page.evaluate(()=>({loading:document.getElementById('loading-screen')?.textContent?.trim(),nav:window.__STRONGHOLD_NAV__?.(),saved:JSON.parse(localStorage.getItem('arkodia-stronghold-v1')||'null')}));
 report.browser.loaded=loaded;assert(loaded.includes('/buildings/starting-campfire/campfire-v1.png'));assert(!loaded.some(p=>p.includes('stronghold-core')));
 if(report.browser.game.nav){assert.deepEqual(report.browser.game.nav.layout.sort(),['expedition','gate']);report.browser.singleCore=true;}
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await browser.close();await fs.writeFile('docs/core-campfire/production.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({pass:report.pass,commit:report.commit,files:report.files.length,browser:report.browser.gameplayLoaded,review:!!report.browser.review}));
