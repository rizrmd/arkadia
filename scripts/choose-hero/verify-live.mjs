// Live check of Choose Your Hero after a release: the deployed game in Chromium on desktop and a phone, with the picker
// forced open, recording the layout, frame scale and console errors.
//   node scripts/choose-hero/verify-live.mjs [url]      → docs/choose-hero/live-*.webp, docs/choose-hero/live.json
import fs from 'node:fs';import sharp from 'sharp';import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
const URL=(process.argv[2]||'https://ark-whachat.fural.space/').replace(/\/?$/,'/'),OUT='docs/choose-hero';
const CASES=[
 {name:'desktop',width:1440,height:900,dpr:2,hero:'ember-warden'},
 {name:'phone',width:390,height:844,dpr:3,touch:true,hero:'rift-runner'},
];
const results=[];
for(const c of CASES){
 const browser=await chromium.launch(launchOptions());
 try{
  const page=await (await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:c.dpr,isMobile:!!c.touch,hasTouch:!!c.touch})).newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${URL}?offline=1&pick=1&time=0.35`);
  await page.waitForFunction(()=>window.__PIXI_UI__?.picker?.isOpen(),null,{timeout:240000});
  const state=await page.evaluate(async h=>{const v=await window.__PIXI_UI__.picker.view();v.select(h);await v.layout(innerWidth,innerHeight);return {layout:v.layoutName,frameScale:v.frameScale,highlights:v.highlights.length,texts:v.textBounds().length};},c.hero);
  await page.waitForTimeout(1200);
  const file=`live-${c.name}.webp`;await sharp(await page.screenshot({timeout:180000})).webp({quality:88}).toFile(`${OUT}/${file}`);
  results.push({name:c.name,viewport:[c.width,c.height],dpr:c.dpr,...state,errors:errors.length,errorText:errors,file});
  console.log(c.name,JSON.stringify(results.at(-1)));
 }finally{await browser.close();}
}
fs.writeFileSync(`${OUT}/live.json`,JSON.stringify({url:URL,checked:new Date().toISOString(),results},null,1)+'\n');
if(results.some(r=>r.errors))process.exitCode=1;
