import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {launch} from './browser.mjs';
const base=process.env.VERIFY_URL||'https://arkodia.online',width=Number(process.env.WIDTH||390),out='docs/flame-fan-gameplay/ember-v2';
const browser=await launch(),page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.routeWebSocket('**/*',()=>{});
try{
 await page.clock.install();await page.goto(base+'/?offline=1&hero=ember-warden&quality=low&time=.45',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.getElementById('loading-screen'),null,{timeout:60000});
 const now=await page.evaluate(()=>Date.now());await page.clock.pauseAt(now+50);
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();c.teleport(26,26);for(let i=0;i<4;i++){c.offer(['flame-fan']);c.choose('flame-fan');}for(const [u,v]of[[28,27],[27,28],[28,28]])c.summon(u,v,25);c.castSkill('flame-fan',{targetU:29,targetV:29});});
 await page.clock.runFor(600);
 const state=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot()),burst=state.vfx.flameSheets.find(s=>s.rank===5);assert(burst&&burst.burstOpacity>0);assert.equal(burst.embers.asset,'/flame-fan-ember-candidate/v1/ember-v2.png');assert(burst.embers.visible>0);
 await fs.writeFile(out+`/live-runtime-${width}.json`,JSON.stringify({passed:true,base,rank:5,burst,errors,method:'Public unmodified production bundle, diagnostic rank/target seeding; browser clock paused at release +155 ms.'},null,2));console.log('Capturing actual public rank 5 at',burst.age);
 const cdp=await page.context().newCDPSession(page);let timer;
 try{const {data}=await Promise.race([cdp.send('Page.captureScreenshot',{format:'jpeg',quality:65}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Capture exceeded 15s')),15000)})]);await fs.writeFile(out+`/live-game-${width}-lv5-burst.jpg`,Buffer.from(data,'base64'));}finally{clearTimeout(timer);await cdp.detach();}
 assert.deepEqual(errors,[]);await fs.writeFile(out+`/live-capture-${width}.json`,JSON.stringify({passed:true,base,rank:5,burst,method:'Actual production bundle with existing diagnostic target/rank seeding. Browser clock advances normal game frames then pauses only to capture; no testStep hook or game-code transform.',errors},null,2));
}finally{await browser.close();}
