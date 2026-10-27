import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {launch} from '../vfx/browser.mjs';
const base=process.env.GAME||'http://127.0.0.1:18843';
const server=process.env.GAME?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','18843'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
 if(server)await new Promise(r=>server.stdout.on('data',d=>{if(String(d).includes('18843'))r();}));

 await fs.mkdir('/home/dev/gate-health-evidence',{recursive:true});
 for(const width of (process.env.WIDTH?[Number(process.env.WIDTH)]:[1440,390])){
 browser=await launch();
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 await page.addInitScript(()=>localStorage.setItem('arkodia.desktop-movement-hint.v1','1'));
 await page.routeWebSocket('**/*',()=>{});
 await page.goto(base+'/?offline=1&hero=rift-runner&time=0.5');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 const result=await page.evaluate(()=>{
 const hud=window.__STRONGHOLD_COMBAT__.hud,bar=hud.worldGateBar;
 const check=()=>{const rows=hud.playerConsole.rows;return {labels:rows.map(r=>r.label.text),values:rows.map(r=>r.value.text),ratio:rows[1].ratio,world:bar.caption.text,x:bar.x,y:bar.y,visible:bar.visible,filters:bar.filters?.length||0};};
 hud.setGateHp(37,100);const damaged=check();hud.setGateHp(100,100);return {damaged,full:check()};
 });
 assert.deepEqual(result.damaged.labels,['HP','GATE','XP']);assert.equal(result.damaged.ratio,.37);assert.equal(result.damaged.world,'GATE  37 / 100');assert.equal(result.full.world,'GATE  100 / 100');assert.ok(Number.isFinite(result.full.y));assert.equal(result.full.visible,true);assert.equal(result.full.filters,0);
 await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(14.3,14.3));
 await page.waitForTimeout(2000);
 await page.screenshot({path:`/home/dev/gate-health-evidence/${process.env.GAME?'live':'local'}-${width}.png`});console.log(JSON.stringify({width,...result}));await browser.close();browser=null;
 }
}finally{await browser?.close();server?.kill();}
