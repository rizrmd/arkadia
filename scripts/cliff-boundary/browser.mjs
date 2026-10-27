import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import {launch} from '../vfx/browser.mjs';
const base=process.env.BASE_URL, out=process.env.OUT||'docs/cliff-boundary/after';await fs.mkdir(out,{recursive:true});
const vite=base?null:await createServer({server:{host:'127.0.0.1',port:5481,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
let browser;const report={base:base||'local',cases:[],errors:[]};
try{
 for(const mobile of [false,true].filter(m=>!process.env.ONLY||process.env.ONLY===(m?'mobile':'desktop'))){
  browser=await launch();
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>localStorage.clear());await page.routeWebSocket('**/*',()=>{});await page.clock.install();
  await page.goto((base||'http://127.0.0.1:5481')+'/?buildings=all&offline=1&time=.5&quality=low');
  await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen'),null,{timeout:300000});
  await page.clock.pauseAt(Date.now()+500);
  console.log('ready',mobile?'mobile':'desktop');
  for(const [name,from,dir] of [['terrace-back',[5.5,25],[0,-1]],['terrace-front',[5.5,25],[0,1]],['ridge-corner',[25.5,7.2],[1,-1]],['ridge-side',[25.5,7.2],[1,0]],['ramp-ascent',[25.5,13.5],[2,-1]],['ramp-descent',[25.5,9.5],[-2,1]]]){
   const ok=await page.evaluate(([u,v])=>{const a=window.__STRONGHOLD_COMBAT__;a.setPreviewMode(false);a.clearFoes();return a.teleport(u,v)},from);if(!ok)throw Error('teleport failed '+name);
   const before=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);
   if(mobile){const cdp=await page.context().newCDPSession(page);const x=85,y=650,l=Math.hypot(...dir);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dir[0]/l*50,y:y+dir[1]/l*50}]});await page.clock.runFor(4000);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
   else{const keys=dir[0]===0?[dir[1]<0?'KeyW':'KeyS']:dir[1]===0?[dir[0]>0?'KeyD':'KeyA']:dir[0]>0?['KeyW','KeyD']:['KeyS','KeyA'];for(const k of keys)await page.keyboard.down(k);await page.clock.runFor(4000);for(const k of keys)await page.keyboard.up(k);}
   await page.clock.runFor(250);const hero=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);report.cases.push({mobile,name,from,before:[before.u,before.v],to:[hero.u,hero.v]});
   console.log(name,hero.u,hero.v);
   if(name==='terrace-back'||name==='ridge-corner'){const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/${mobile?'mobile':'desktop'}-${name}.png`,Buffer.from(data,'base64'));}
  }
  await browser.close();browser=null;
  await fs.writeFile(`${out}/browser-${mobile?'mobile':'desktop'}.json`,JSON.stringify(report,null,2)+'\n');
 }
 await fs.writeFile(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{await browser?.close();await vite?.close()}
