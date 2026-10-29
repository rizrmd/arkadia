import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL;
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5893,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite?.listen();
let browser;
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844]]){
  browser=await chromium.launch(launchOptions());
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  let release;const gate=new Promise(r=>release=r);let fail=true;
  await page.route('**/skill-tree/**',async route=>{await gate;if(fail)await route.abort();else await route.continue();});
  await page.goto(`${remote||'http://127.0.0.1:5893'}/?offline=1&hero=rift-runner&time=.45`);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:300000});
  const snapshot=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
  const click=async()=>{const s=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets[0]);await page.mouse.click(s.x,s.y);};
  await click();
  let s=await snapshot();assert(s.open&&s.loadingVisible);assert.equal(s.loadState,'loading');assert.equal(s.loadingMessage,'Loading skills…');
  await page.keyboard.press('Escape');assert.equal((await snapshot()).open,false);
  release();await page.waitForTimeout(500);assert.equal((await snapshot()).open,false,'late failure must not reopen');
  await click();await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot().loadState==='error');
  s=await snapshot();assert(s.loadingVisible);assert.match(s.loadingMessage,/retry/);
  fail=false;
  // Retry by tapping the visible message.
  await page.mouse.click(s.panel.x+s.panel.width/2,s.panel.y+s.panel.height/2-5);
  await page.waitForFunction(()=>{const s=window.__STRONGHOLD_COMBAT__.skillTree.snapshot();return s.open&&s.loadState==='idle'&&s.nodes.length>0;},null,{timeout:120000});
  assert.equal((await snapshot()).loadingVisible,false);
  await page.keyboard.press('Escape');await click();s=await snapshot();assert(s.open&&!s.loadingVisible&&s.nodes.length>0,'warm open should be immediate');
  console.log(`${name}: delayed first open, cancel, failure, tap retry, ready and cached reopen passed`);
  await browser.close();
 }
}finally{await browser?.close();await vite?.close();}
