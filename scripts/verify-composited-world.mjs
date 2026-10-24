import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3039';
const out=process.env.OUTPUT_DIR||'/home/dev/fullscreen-snow-release/composited';
await fs.mkdir(out,{recursive:true});
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3039'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__DRAW_ORDER__=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(['world-surface','world-uprights'].includes(this.canvas.id)&&source instanceof HTMLImageElement)window.__DRAW_ORDER__.push({file:new URL(source.src).pathname,x:args[0],y:args[1],width:args[2]});return draw.call(this,source,...args);};});
 await page.goto(base+'/stronghold.html');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.renderer==='composited-world');
 const order=await page.evaluate(()=>window.__DRAW_ORDER__);
 const lastGround=Math.max(...order.flatMap((p,i)=>/snowdrift|weeds|paving-worn/.test(p.file)?[i]:[]));
 const walls=order.flatMap((p,i)=>/rampart|bastion/.test(p.file)?[i]:[]);
 assert(lastGround<Math.min(...walls),'Every snow/ground decal must be below every wall');
 const mine=order.findIndex(p=>p.file==='/assets/stronghold/mine.png');assert(mine>=0);
 assert(walls.some(i=>i<mine)&&walls.some(i=>i>mine),'Mine must sit between the back and front enclosure');
 // Mine remains at the original location: verify camera focus, not a spacing workaround.
 await page.locator('[data-building=mine]').click();await page.locator('#close-panel').click();
 const paints=await page.locator('#world-surface').getAttribute('data-paints');
 await page.screenshot({path:out+'/mine-wall.png'});
 const transform=await page.locator('#world-surface').evaluate(c=>c.style.transform);
 assert(transform.includes('translate3d'));
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:330},{x:270,y:330}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:90,y:330},{x:300,y:330}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
 assert.notEqual(await page.locator('#world-surface').evaluate(c=>c.style.transform),transform,'Pinch must change camera');
 for(let n=0;n<12;n++){await page.mouse.move(100,320);await page.mouse.down();await page.mouse.move(310,520,{steps:4});await page.mouse.up();}
 await page.waitForTimeout(150);
 assert.equal(await page.locator('#world-surface').getAttribute('data-paints'),paints,'Pinch and extended pan must not rasterize new sections');
 await page.screenshot({path:out+'/far-snow.png'});
 await page.locator('#fit-world').click();await page.screenshot({path:out+'/fit-world.png'});
 await page.locator('[data-building=mine]').click();await page.locator('#upgrade').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).levels.mine===2);await page.locator('[data-building=forge]').click();await page.waitForTimeout(100);const beforeUpgrade=await page.locator('#world-surface').getAttribute('data-paints');await page.locator('#upgrade').click();await page.waitForFunction(previous=>Number(document.querySelector('#world-surface').dataset.paints)>Number(previous),beforeUpgrade);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).levels.forge),2);
 const dimensions=await page.locator('#world-surface').evaluate(c=>({width:c.width,height:c.height,bytes:c.width*c.height*4}));assert(dimensions.bytes<=32*1024*1024);assert(Math.max(dimensions.width,dimensions.height)<=4096);
 if(!process.env.QUICK)for(const [width,height] of [[1536,1024],[2560,1080],[390,844],[844,390]]){await page.setViewportSize({width,height});if(await page.locator('.sidebar').isVisible())await page.locator('#close-panel').click();await page.locator('#fit-world').click();assert.equal((await page.locator('#world-canvas').boundingBox()).width,width);assert(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight));for(const id of ['mine','altar','barracks','forge','mage','expedition','gate']){await page.locator(`[data-building=${id}]`).click();assert(await page.locator('.sidebar').isVisible());await page.locator('#close-panel').click();}await page.locator('#fit-world').click();await page.screenshot({path:out+`/viewport-${width}.png`});}
 assert.deepEqual(errors,[]);console.log('PASS ground/wall/Mine draw order, touch pinch, long pan without rasterization, infinite snow, Forge upgrade invalidation and bounded surface; '+JSON.stringify(dimensions));
}finally{await browser?.close();server?.kill();}
