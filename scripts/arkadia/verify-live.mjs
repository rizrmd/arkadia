import fs from 'node:fs/promises';import {chromium} from 'playwright';import sharp from 'sharp';
// Open the Arkadia sandbox in Chromium: the game in a co-op room and offline (solo), and the review folders.
// node scripts/arkadia/verify-live.mjs → docs/arkadia-sandbox/*.webp + results.json
const base=process.env.BASE||'https://arkadia-custom-whachat.fural.space',out='docs/arkadia-sandbox',results=[];
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
// Chromium runs single-process in the sandbox, so every visit reuses one page.
const page=await (await browser.newContext({viewport:{width:1280,height:720}})).newPage();let errors,sockets;
page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>sockets.push(ws.url()));
async function visit(name,url,ready,wait=9000){
 errors=[];sockets=[];
 const res=await page.goto(base+url,{waitUntil:'load',timeout:60000});await page.waitForTimeout(wait);
 const state=await page.evaluate(ready);await sharp(await page.screenshot()).webp({quality:82}).toFile(`${out}/${name}.webp`);
 results.push({name,url:base+url,status:res.status(),script:await page.evaluate(()=>document.querySelector('script[type=module][src*="/assets/"]')?.getAttribute('src')??null),sockets,errors,state});
}
const canvas=()=>({canvas:!!document.querySelector('canvas'),title:document.title});
await visit('1-game-coop','/',canvas,15000);
await visit('2-game-offline','/?offline=1',canvas,15000);
await visit('3-ember-warden-review','/ember-warden-review/',()=>({title:document.title,info:document.getElementById('info')?.textContent?.slice(0,120)??null}));
await visit('4-rift-runner-v1','/rift-runner/v1/',()=>({title:document.title}),4000);
await visit('5-enemies','/enemies/v1/',()=>({title:document.title}),4000);
await browser.close();
await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,1));
