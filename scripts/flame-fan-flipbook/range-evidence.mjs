import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const before=process.argv.includes('--before'),url='https://ark-whachat.fural.space/ember-warden-review/flame-fan-flipbook/';
const browser=await chromium.launch({headless:true,executablePath:process.env.HOME+'/.local/bin/arkadia-chromium',args:['--no-sandbox']});
const context=await browser.newContext();const page=await context.newPage();
try{for(const width of [1440,390]){
 await page.setViewportSize({width,height:width===1440?900:844});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__FLIPBOOK_FAN__);
 await page.evaluate(()=>window.__FLIPBOOK_FAN__.seek(.32));await page.waitForTimeout(100);
 await page.screenshot({path:`docs/flame-fan-flipbook/range-${before?'before':'after'}-${width}.png`});
 const state=await page.evaluate(()=>window.__FLIPBOOK_FAN__.state());
 await fs.writeFile(`docs/flame-fan-flipbook/range-${before?'before':'after'}-${width}.json`,JSON.stringify({url,capturedAt:new Date().toISOString(),state},null,2));
}}finally{await context.close();await browser.close();}
