import { chromium } from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const live=process.env.VERIFY_URL,base=live||'https://ember-stage1.local';
const results=[];
for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
 const browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!live)await page.route('**/*',async route=>{let p=new URL(route.request().url()).pathname;if(p.endsWith('/'))p+='index.html';try{await route.fulfill({path:path.join(process.cwd(),'public',p),contentType:p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'text/plain'})}catch{await route.fulfill({status:404,body:'Missing '+p})}});
 await page.goto(base+'/ember-tree-stage1/');await page.waitForSelector('.node');
 const assert=(v,m)=>{if(!v)throw Error(name+': '+m)};
 const state=()=>page.evaluate(()=>({nodes:document.querySelectorAll('.node').length,pips:[...document.querySelectorAll('.active')].map(x=>x.querySelectorAll('.pip').length),passivePips:document.querySelectorAll('.passive .pip').length,learned:[...document.querySelectorAll('.learned')].map(x=>x.dataset.id),badges:[...document.querySelectorAll('.badge')].map(x=>x.textContent),left:document.querySelector('.scroll').scrollLeft,top:document.querySelector('.scroll').scrollTop,scrollH:document.querySelector('.scroll').scrollHeight,clientH:document.querySelector('.scroll').clientHeight}));
 let fresh=await state();assert(fresh.nodes===15,'15 nodes');assert(fresh.pips.every(x=>x===5),'five pips on every active');assert(fresh.passivePips===0,'no passive pips');assert(fresh.learned.join()==='flame-fan','fresh root only');assert(fresh.badges.join()==='1','fresh slot 1');assert(name==='desktop'?fresh.left===0:fresh.top===fresh.scrollH-fresh.clientH,'root scroll');
 await page.screenshot({path:`public/ember-tree-stage1/${name}-fresh.png`,fullPage:true});
 await page.click('#state');let demo=await state();assert(demo.learned.length===3&&demo.badges.join()==='1,2,3','three real slots');await page.screenshot({path:`public/ember-tree-stage1/${name}-slots.png`,fullPage:true});
 await page.locator('.scroll').evaluate((e,m)=>{if(m)e.scrollTop=0;else e.scrollLeft=e.scrollWidth},name==='mobile');
 assert(await page.locator('[data-id="star"]').isVisible(),'capstone exists');await page.screenshot({path:`public/ember-tree-stage1/${name}-capstone.png`,fullPage:true});
 await page.click('#close');assert(await page.locator('.panel').isHidden(),'close');await page.click('#open');assert(await page.locator('.panel').isVisible(),'reopen');await page.keyboard.press('Escape');assert(await page.locator('.panel').isHidden(),'escape');assert(!errors.length,'no page errors');results.push({viewport:{width,height},fresh,demo,pageErrors:errors,checks:'15 nodes; five active pips; zero passive pips; fresh root; slot demo 1/2/3; correct initial scroll; capstone scroll; close/reopen/Escape'});await browser.close();
}
await fs.writeFile('public/ember-tree-stage1/verification.json',JSON.stringify({url:base,mode:live?'live':'local routed static assets',results},null,2)+'\n');console.log(JSON.stringify(results.map(x=>({viewport:x.viewport,pageErrors:x.pageErrors,checks:x.checks})),null,2));
