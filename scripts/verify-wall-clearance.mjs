import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// Perimeter rocks and trees must stand clear of the enclosure: no opaque pixel of
// a cliff, boulder or tree may coincide with an opaque wall, bastion or gate pixel.
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3041';
const out=process.env.OUTPUT_DIR||'/home/dev/fullscreen-snow-release/wall-clearance';
await fs.mkdir(out,{recursive:true});
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3041'}});
let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__DRAWS__=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(['world-surface','world-uprights'].includes(this.canvas.id)&&source instanceof HTMLImageElement){const m=this.getTransform();window.__DRAWS__.push({source,file:new URL(source.src).pathname,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],args});}return draw.call(this,source,...args);};const set=CanvasRenderingContext2D.prototype.setTransform;CanvasRenderingContext2D.prototype.setTransform=function(...args){if(this.canvas.id==='world-surface'&&args.length===6)window.__SURFACE__=args;return set.apply(this,args);};});
 await page.goto(base+'/stronghold.html');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.renderer==='composited-world');
 const overlaps=await page.evaluate(()=>{
  const surface=document.querySelector('#world-surface'),k=.5,W=Math.ceil(surface.width*k),H=Math.ceil(surface.height*k);
  const mask=d=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.scale(k,k);x.setTransform(...d.matrix.map((v,i)=>v*(i<6?k:1)));x.drawImage(d.source,...d.args);return x.getImageData(0,0,W,H).data;};
  const walls=window.__DRAWS__.filter(d=>/rampart|bastion|\/gate/.test(d.file)),props=window.__DRAWS__.filter(d=>/cliff|boulders|spruce|fir-young/.test(d.file));
  const wall=new Uint8Array(W*H);for(const d of walls){const a=mask(d);for(let i=0;i<W*H;i++)if(a[i*4+3]>40)wall[i]=1;}
  return props.map(d=>{const a=mask(d);let n=0;for(let i=0;i<W*H;i++)if(wall[i]&&a[i*4+3]>40)n++;return {file:d.file,x:d.matrix[4],y:d.matrix[5],pixels:n};}).filter(p=>p.pixels>0);
 });
 // Snow must not show between the court paving and the inner foot of the rear
 // walls: every point just behind the rear wall line is wall or paving.
 const snow=await page.evaluate(()=>{const [r,,,,e,f]=window.__SURFACE__,c=document.querySelector('#world-surface'),x=c.getContext('2d'),hits=[];
  for(let n=.5;n<14.5;n+=.25)for(const d of [.05,.15,.3])for(const [u,v] of [[n,-d],[-d,n]]){const px=Math.round((u-v)*64+577),py=Math.round((u+v)*32-160),[R,G,B]=x.getImageData(Math.round(px*r+e),Math.round(py*r+f),1,1).data;if(B>R+12&&R+G+B>420)hits.push({u,v,rgb:[R,G,B]});}
  return hits;});
 for(const id of ['altar','mine','mage','barracks','forge']){await page.locator(`[data-building=${id}]`).click();await page.locator('#close-panel').click();await page.waitForTimeout(100);await page.screenshot({path:`${out}/${id}.png`});}
 // Reported phone framing of the rear wall behind Altar.
 await page.locator('[data-building=altar]').click();await page.locator('#close-panel').click();await page.mouse.move(200,250);await page.mouse.down();await page.mouse.move(150,520,{steps:4});await page.mouse.up();await page.waitForTimeout(100);await page.screenshot({path:out+'/rear-wall.png'});
 await page.setViewportSize({width:1536,height:1024});await page.locator('#fit-world').click();await page.waitForTimeout(150);await page.screenshot({path:out+'/fit-1536.png'});
 assert.deepEqual(overlaps,[],'Perimeter rocks/trees overlap enclosure walls: '+JSON.stringify(overlaps));
 assert.deepEqual(snow,[],'Snow visible at the inner foot of a rear wall: '+JSON.stringify(snow));
 assert.deepEqual(errors,[]);console.log('PASS no perimeter rock or tree pixel overlaps a wall, bastion or gate pixel; no snow at the inner foot of the rear walls');
}finally{await browser?.close();server?.kill();}
