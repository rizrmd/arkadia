// Tracelogs must be sent for any drop below the 60 fps target: feeds synthetic windows through the real trigger
// (window.__FPS_TRACELOG__.simulateDrop) and checks which ones POST /api/tracelogs.
//   node scripts/fps-profile/verify-tracelog-60.mjs
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {launch} from '../vfx/browser.mjs';
const vite=await createServer({server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734}});
 await page.routeWebSocket('**/*',()=>{});
 const posts=[];
 await page.route('**/api/tracelogs',async r=>{if(r.request().method()==='POST'){posts.push(r.request().postDataJSON());await r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'x'})});}else await r.continue();});
 await page.goto(`${GAME}/?offline=1&hero=ember-warden&tracelog=1`);
 await page.waitForFunction(()=>window.__FPS_TRACELOG__&&window.__STRONGHOLD_COMBAT__,null,{timeout:300000});
 const threshold=await page.evaluate(()=>window.__FPS_TRACELOG__.stats().config.thresholdFps);
 // simulateDrop({force:false}) returns the entry only when the real trigger fired on that synthetic window. The
 // headless page's own slow frames also send logs, so the return value is checked, not the POST count.
 const run=async(label,frames,dtMs)=>{
  const r=await page.evaluate(([f,d])=>window.__FPS_TRACELOG__.simulateDrop({frames:f,dtMs:d,phase:'encountersRender',phaseMs:d*.6,force:false}),[frames,dtMs]);
  const sent=Boolean(r?.entry);
  console.log(label.padEnd(34),'sent:',sent,sent?`fps=${r.entry.metrics.fps} reason=${r.entry.reason} bottleneck=${r.entry.metrics.bottleneck}`:'');
  return sent;
 };
 console.log('thresholdFps',threshold);
 assert.equal(threshold,59);
 assert.equal(await run('steady 60 fps (16.67 ms x30)',30,16.67),false,'steady 60 fps must not send');
 assert.equal(await run('one missed frame in window',1,33.4),true,'a single dropped frame (window avg < 59) must send');
 assert.equal(await run('~54 fps (18.5 ms x30)',30,18.5),true,'54 fps must send');
 assert.equal(await run('~45 fps (22 ms x30)',30,22),true,'45 fps must send');
 const posted=posts.filter(p=>p.metrics?.fps>30&&p.metrics?.fps<59).length;
 console.log('POSTed logs between 30 and 59 fps:',posted);
 assert.ok(posted>=3,'logs between 30 and 59 fps must reach /api/tracelogs');
 console.log('PASS');
}finally{await browser.close();await vite.close();}
