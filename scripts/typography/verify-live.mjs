// Render the deployed sample (https://ark-whachat.fural.space/typography/) and save live captures for the Knowledge page.
//   node scripts/typography/verify-live.mjs   → docs/typography/v2/live-*.webp, docs/typography/v2/live.json
import fs from 'node:fs';import sharp from 'sharp';import {chromium} from 'playwright';import {launchOptions} from './browser.mjs';
const URL_BASE='https://ark-whachat.fural.space/typography/',OUT='docs/typography/v2',results=[];
for(const [name,query,w,h,dpr] of [['live-hud','screen=hud',1672,941,1],['live-hero','screen=hero',1672,941,1],['live-hero-mobile','screen=hero&hero=rift-runner',432,912,2]]){
 const browser=await chromium.launch(launchOptions());
 try{
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push('failed '+r.url()));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${URL_BASE}?capture=1&${query}`);
  await page.waitForFunction(()=>window.typography?.ready,null,{timeout:120000});await page.waitForTimeout(800);
  const info=await page.evaluate(()=>({texts:window.typography.texts().length,frameScale:window.typography.frameScale,resolution:window.typography.resolution}));
  await sharp(await page.screenshot({timeout:180000})).webp({quality:90}).toFile(`${OUT}/${name}.webp`);
  results.push({name,url:`${URL_BASE}?${query}`,viewport:[w,h],dpr,...info,errors});console.log(name,JSON.stringify(info),errors.length?errors:'no errors');
 }finally{await browser.close();}
}
fs.writeFileSync(`${OUT}/live.json`,JSON.stringify({checked:new Date().toISOString(),results},null,1)+'\n');
if(results.some(r=>r.errors.length))process.exit(1);
