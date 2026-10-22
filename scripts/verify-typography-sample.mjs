import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote']});
const results=[];
try{
 for(const [name,width,height,dpr] of [['desktop',1440,1000,1],['mobile',390,1100,3]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // A temporary local HTTP server is supplied by the caller; module scripts require HTTP.
  await page.goto('http://127.0.0.1:3047/typography/');
  await page.waitForFunction(()=>document.querySelector('canvas').width>300 || devicePixelRatio===1);
  await page.locator('input').fill('42');await page.locator('input').dispatchEvent('input');
  assert.equal(await page.locator('#hp').textContent(),'42 / 100 HP');
  await page.locator('input').fill('96');await page.locator('input').dispatchEvent('input');
  for(const light of ['day','night']){
   await page.locator(`[data-mode=${light}]`).click();
   assert.equal(await page.locator('body').getAttribute('data-light'),light);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const metrics=await page.locator('.skill b').evaluateAll(els=>els.map(el=>({font:parseFloat(getComputedStyle(el).fontSize),fits:el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight+1})));
   assert(metrics.every(x=>x.font>=16&&x.fits));assert.equal(errors.length,0,errors.join('\n'));
   await page.screenshot({path:`public/typography/${name}-${light}.png`,fullPage:true});
   results.push({name,width,height,dpr,light,metrics,errors});
  }
  await page.close();
 }
 fs.writeFileSync('docs/typography/sample-verification.json',JSON.stringify(results,null,2)+'\n');
 console.log('PASS desktop/mobile daylight/night, interactive values, minimum label size, no clipping/overflow or JS errors');
}finally{await browser.close();}
