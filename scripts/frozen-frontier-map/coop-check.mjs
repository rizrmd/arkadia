import {chromium} from 'playwright';import fs from 'node:fs/promises';import sharp from 'sharp';import {launchOptions} from '../typography/browser.mjs';
// Co-op smoke for the Frozen Frontier: joins a room on BASE_URL (default the live site), checks the scenery loads, then
// walks the server-driven hero out of the gate and down the frontier road toward the ruined gate with the real
// keyboard, and records the server position, prediction corrections, a screenshot and page errors.
//   node scripts/frozen-frontier-map/coop-check.mjs [out-dir]
const base=process.env.BASE_URL||'https://ark-whachat.fural.space',OUT=process.argv[2]||'docs/frozen-frontier-map';
const report={base,errors:[],console:[]};const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.console.push(m.text());});
 await page.addInitScript(()=>{try{localStorage.removeItem('arkodia.stronghold.hero');localStorage.setItem('arkodia.hero','ember-warden');}catch{}});
 // Co-op is opt-in (?coop, src/stronghold/main.ts); the game plays solo by default.
 await page.goto(`${base}/?coop&time=.5`);
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__COOP__?.stats().status==='online'&&window.__FROZEN_FRONTIER__,null,{timeout:300000});
 await page.evaluate(()=>window.__FROZEN_FRONTIER__.ready);
 report.frontier=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());
 const pos=()=>page.evaluate(()=>{const p=window.__COOP__.net.position();return {x:+p.x.toFixed(1),y:+p.y.toFixed(1)};});
 report.start=await pos();
 // Out of the gate (down), then down-left along the road toward the ruined gate.
 report.path=[];for(const [keys,ms] of [[['KeyS'],16000],[['KeyS','KeyA'],8000],[['KeyS'],8000]]){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);report.path.push({keys:keys.join('+'),at:await pos(),tile:await page.evaluate(()=>{const h=window.__STRONGHOLD_COMBAT__?.snapshot().hero;return h?[+h.u.toFixed(2),+h.v.toFixed(2)]:null;})});}
 await page.waitForTimeout(1500);report.end=await pos();
 const s=await page.evaluate(()=>window.__COOP__.stats());report.coop={status:s.status,room:s.room,snapshots:s.snapshots,corrections:s.corrections,maxCorrection:s.maxCorrection,rtt:s.rtt};
 report.moved=Math.hypot(report.end.x-report.start.x,report.end.y-report.start.y);
 await page.screenshot({path:`${OUT}/coop-live.png`});await sharp(`${OUT}/coop-live.png`).webp({quality:80}).toFile(`${OUT}/coop-live.webp`);await fs.unlink(`${OUT}/coop-live.png`);
}finally{await browser.close();}
report.ok=!report.errors.length&&report.frontier?.loaded&&report.moved>100;
await fs.writeFile(`${OUT}/coop-live.json`,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report,null,1));
if(!report.ok)process.exit(1);
