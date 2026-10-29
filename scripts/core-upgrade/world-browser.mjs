import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{port:5198,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={pass:false,errors:[],checks:[],limit:'One bounded 60-second world initialization attempt; no production save mutation.'};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 const map=await(await fetch('https://arkodia.online/api/environment/published',{signal:AbortSignal.timeout(15000)})).text();
 await page.route('**/api/environment/published*',r=>r.fulfill({contentType:'application/json',body:map}));await page.route('**/api/vfx/visuals',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('arkodia.desktop-movement-hint.v1','1');localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:420}));});
 await page.goto('http://127.0.0.1:5198/?offline=1&time=.5&quality=low');
 await page.waitForFunction(()=>window.__CORE_UPGRADE__?.().near&&!document.getElementById('loading-screen'),null,{timeout:60000});
 const point=await page.evaluate(()=>{const find=c=>c.label==='View Core upgrade'?c:(c.children||[]).map(find).find(Boolean);const badge=find(window.__PIXI_UI__.app.stage);return badge.toGlobal({x:0,y:0});});
 await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>window.__CORE_UPGRADE__().open,{timeout:5000});
 const badges=await page.evaluate(()=>{const out=[];const walk=c=>{if(/^View (Core upgrade|Farm|Lumber Mill|Kitchen)$/.test(c.label||''))out.push({label:c.label,visible:c.visible,eventMode:c.eventMode});for(const child of c.children||[])walk(child)};walk(window.__PIXI_UI__.app.stage);return out;});
 assert.equal(badges.length,4);assert(badges.every(b=>!b.visible&&b.eventMode==='none'));report.badges=badges;
 await page.screenshot({path:'docs/core-upgrade/full-world-desktop.png',timeout:15000});
 await page.keyboard.press('Escape');assert(!(await page.evaluate(()=>window.__CORE_UPGRADE__())).open);report.checks.push('actual world-view integration: Core pointer tap, four badges hidden/disabled and Escape');assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=String(error);report.loading=await browser.contexts()[0]?.pages()[0]?.evaluate(()=>document.getElementById('loading-screen')?.textContent).catch(()=>null);}
finally{await fs.writeFile('docs/core-upgrade/world-browser.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report));
