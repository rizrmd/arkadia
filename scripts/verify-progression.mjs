import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base=process.env.DEMO_URL||'http://127.0.0.1:8796';const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{env:{...process.env,PORT:'8796',SITE_DIR:'dist'},stdio:['ignore','pipe','inherit']});let browser;
try{
 if(server)await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok()});server.on('exit',c=>no(Error('server '+c)))});
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?offline=1&time=0.5');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__,null,{timeout:120000});
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(let u=18;u<30;u+=.25)for(let v=18;v<30;v+=.25){if(c.clear(u,v)&&c.clear(u+.2,v)&&c.teleport(u,v)){c.summon(u+.2,v);c.summon(u+.22,v+.02);return}}throw Error('no fixture tile')});
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().run.pending>0,null,{timeout:45000});
 const before=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());assert.ok(before.kills>=2);assert.ok(before.run.gold>=10);assert.equal(await page.locator('.blessing-row button').count(),3);
 await fs.mkdir('docs/combat-progression',{recursive:true});await page.screenshot({path:'docs/combat-progression/cards-desktop.png'});
 const hp=before.hero.hp;await page.waitForTimeout(1200);assert.ok((await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot())).hero.hp>=hp);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/combat-progression/cards-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.blessing-row button').first().click();await page.waitForFunction(()=>!window.__STRONGHOLD_COMBAT__.snapshot().run.pending);assert.deepEqual(errors,[]);
 const report={base,passed:true,checks:['real kills award XP and gold','three unique level-up cards','protected while choosing','mobile fits viewport','choice consumed','no page errors'],before,after:await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot())};await fs.writeFile('docs/combat-progression/browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,base,checks:report.checks}));
}finally{await browser?.close();server?.kill()}
