import {chromium} from 'playwright';import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const url='https://ark-whachat.fural.space/rift-dash/player/';
const browser=await chromium.launch(launchOptions(['--disable-quic']));
try{
 const page=await browser.newPage({viewport:{width:900,height:700}});
 await page.setContent(`<iframe src="${url}" title="Rift Dash VFX Player" height="560" width="760"></iframe>`);
 const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
 await frame.waitForFunction(()=>window.__RIFT_DASH_PLAYER__?.snapshot().ready,null,{timeout:60000});
 const buttons=await frame.evaluate(()=>window.__RIFT_DASH_PLAYER__.snapshot().buttons);
 const b=buttons.Arrival,box=await page.locator('iframe').boundingBox();
 await page.mouse.click(box.x+2+b.x+b.w/2,box.y+2+b.y+b.h/2);
 await frame.waitForFunction(()=>window.__RIFT_DASH_PLAYER__.snapshot().time===420);
 const snapshot=await frame.evaluate(()=>window.__RIFT_DASH_PLAYER__.snapshot());
 assert.equal(snapshot.playing,false);assert(snapshot.art.active);
 const report={url,checkedAt:new Date().toISOString(),pass:true,parent:'Cross-origin browser iframe at 760×560',interaction:'Clicked the Pixi Arrival phase inside the real iframe',snapshot};
 await fs.writeFile('docs/rift-skill-fix/live-iframe-verification.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:true,url}));
}finally{await browser.close();}
