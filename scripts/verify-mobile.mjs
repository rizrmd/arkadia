import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {strict as assert} from 'node:assert';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3016';
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3016'},stdio:'inherit'});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:393,height:800},deviceScaleFactor:2.75,isMobile:true,hasTouch:true});
 page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/wall-b.png',r=>r.fulfill({status:404,body:'Missing optional wall'}));
 let ashAttempts=0;await page.route('**/assets/ash.png*',r=>{ashAttempts++;return ashAttempts===1?r.fulfill({status:404,body:'Transient asset failure'}):r.continue();});
 await page.goto(base);await page.waitForFunction(()=>window.__ARKADIA_APP__);
 const results=[];
 for(const [width,height] of [[320,640],[393,800],[430,932],[844,390],[1440,1000]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const dimensions=await page.evaluate(()=>{const view=document.querySelector('#viewport').getBoundingClientRect(),app=window.__ARKADIA_APP__,world=app.stage.children[0],bounds=world.getBounds();return {width:innerWidth,scroll:document.documentElement.scrollWidth,view:{width:view.width,height:view.height},canvas:app.canvas.getBoundingClientRect().width,world:{width:bounds.width,height:bounds.height,x:bounds.x,y:bounds.y},zoom:world.scale.x};});
  assert.equal(dimensions.scroll,width);assert.ok(dimensions.view.height>200);assert.ok(dimensions.world.width>Math.min(dimensions.view.width*.6,dimensions.world.height));assert.ok(dimensions.zoom>0);assert.ok(dimensions.world.x>=-1&&dimensions.world.y>=-1);assert.ok(dimensions.world.x+dimensions.world.width<=dimensions.view.width+1);assert.ok(Math.abs(dimensions.canvas-dimensions.view.width)<1);
  if(width<=700)assert.equal(Math.round(dimensions.view.width),width);
  results.push({viewport:{width,height},...dimensions});
 }
 await page.setViewportSize({width:393,height:800});await page.waitForTimeout(300);
 const pixelProof=await page.evaluate(()=>{const app=window.__ARKADIA_APP__;app.render();const data=app.renderer.extract.pixels(app.stage).pixels;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)opaque++;return {renderer:app.renderer.type,opaque};});assert.equal(pixelProof.renderer,1);assert.ok(ashAttempts>=2);assert.ok(pixelProof.opaque>10000);
 await page.screenshot({path:'docs/mobile/after.png'});
 await page.getByRole('button',{name:'Settings',exact:true}).tap();await assert.doesNotReject(()=>page.locator('#seed').waitFor({state:'visible'}));await page.locator('#source').tap();await page.locator('dialog').waitFor({state:'visible'});await page.locator('#close').tap();await page.getByRole('button',{name:'Close settings',exact:true}).tap();
 const scale=()=>page.evaluate(()=>window.__ARKADIA_APP__.stage.children[0].scale.x);
 const initial=await scale();await page.getByRole('button',{name:'Zoom in',exact:true}).tap();assert.ok(await scale()>initial);await page.getByRole('button',{name:'Fit arena',exact:true}).tap();assert.ok(Math.abs(await scale()-initial)<.001);
 const cdp=await page.context().newCDPSession(page);const position=()=>page.evaluate(()=>window.__ARKADIA_APP__.stage.children[0].x);const before=await position();
 for(const [type,x,y] of [['touchStart',180,330],['touchMove',230,360],['touchEnd',230,360]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 assert.ok(Math.abs(await position()-before)>20);await page.getByRole('button',{name:'Fit arena',exact:true}).tap();
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
 assert.deepEqual(errors,[]);
 await page.route('**/assets/manifest.json',r=>r.abort());await page.reload();await page.locator('#error').waitFor({state:'visible'});assert.match(await page.locator('#error').innerText(),/Unable to load/);const errorBox=await page.locator('#error').boundingBox();assert.ok(errorBox.x>=0&&errorBox.x+errorBox.width<=1440);
 await page.unroute('**/assets/manifest.json');await page.unroute('**/assets/ash.png*');await page.unroute('**/assets/wall-b.png');const desktop=page;await page.setViewportSize({width:1440,height:1000});desktop.setDefaultTimeout(10000);await desktop.goto(base+'/?renderer=webgl');await desktop.waitForFunction(()=>window.__ARKADIA_APP__);const desktopPixels=await desktop.evaluate(()=>{const app=window.__ARKADIA_APP__;app.render();const data=app.renderer.extract.pixels(app.stage).pixels;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)opaque++;return {renderer:app.renderer.type,opaque};});assert.equal(desktopPixels.renderer,1);assert.ok(desktopPixels.opaque>10000);
 const fallback=page;await page.setViewportSize({width:393,height:800});fallback.setDefaultTimeout(10000);await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});await fallback.goto(base+'/?renderer=webgl');await fallback.waitForFunction(()=>window.__ARKADIA_APP__);const fallbackPixels=await fallback.evaluate(()=>{const app=window.__ARKADIA_APP__;app.render();const data=app.canvas.getContext('2d').getImageData(0,0,app.canvas.width,app.canvas.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)opaque++;return {renderer:app.renderer.type,opaque};});assert.equal(fallbackPixels.renderer,4);assert.ok(fallbackPixels.opaque>10000);
 const result={passed:true,base,pixelProof,desktopPixels,fallbackPixels,checks:['full-width phone arena','portrait and landscape resize','desktop rendering','world fits visible canvas','settings and source dialog accessible by touch','zoom and fit','real touch drag pans','loading failure visible','no runtime errors','optional wall-b 404 does not block arena','required texture retried after 404','Canvas2D nontransparent pixels','WebGL nontransparent pixels','WebGL unavailable falls back to Canvas2D'],results};
 await fs.writeFile('docs/mobile/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server?.kill();}
