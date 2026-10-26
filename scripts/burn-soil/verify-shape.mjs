import {launch} from '../vfx/browser.mjs';
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const mode=process.argv[2]||'local',live=mode!=='local',dir='docs/burn-soil/fan-shape',prefix='/ember-warden-review/flame-fan-flipbook/';
const url=(live?'https://ark-whachat.fural.space':'http://127.0.0.1:5192')+prefix;
const server=http.createServer(async(req,res)=>{try{if(req.url==='/iframe'){res.setHeader('content-type','text/html');res.end(`<iframe src="${url}" width="390" height="844" title="Flame Fan"></iframe>`);return;}const rel=decodeURIComponent(req.url.split('?')[0]).replace(prefix,'');const file=path.join('dist-flame-fan-flipbook',rel||'index.html');res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(5192,'127.0.0.1',r));
const browser=await launch(),reports=[];const page=await browser.newPage({hasTouch:true});
try{for(const [width,height] of [[1440,900],[390,844]]){
 await page.setViewportSize({width,height});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__FLIPBOOK_FAN__,null,{timeout:60000});
 await page.evaluate(()=>{window.__FLIPBOOK_FAN__.setLevel(3);window.__FLIPBOOK_FAN__.seek(.32);});
 await page.screenshot({path:`${dir}/${mode}-${width}-flame.png`});
 await page.evaluate(()=>window.__FLIPBOOK_FAN__.isolate(8));await page.screenshot({path:`${dir}/${mode}-${width}-ground.png`});
 const states=[];for(const t of [.22,.42,.62,.82,1.02,1.219,1.22]){await page.evaluate(t=>window.__FLIPBOOK_FAN__.seek(t),t);const s=await page.evaluate(()=>window.__FLIPBOOK_FAN__.state());if(mode!=='before'){
 assert.equal(s.geometry.reachScale,2/3);const b=s.geometry.burnSoil;assert.equal(b.yaw,.30);assert.equal(b.halfAngle,Math.PI*.3);assert.deepEqual(b.outline.slice(0,2),b.origin);assert(Math.abs(b.opacity-Math.max(0,1-(t-.22)))<1e-8);assert.equal(s.burnSoil.damagePerTick,null);
 if(states.length)assert(b.opacity<states.at(-1).opacity);
 states.push({time:t,opacity:b.opacity,ticks:s.burnSoil.ticks,active:s.burnSoil.active});}}
 await page.evaluate(()=>{window.__FLIPBOOK_FAN__.isolate(-1);window.__FLIPBOOK_FAN__.seek(.82);});await page.screenshot({path:`${dir}/${mode}-${width}-burn.png`});
 const s=await page.evaluate(()=>window.__FLIPBOOK_FAN__.state());assert.deepEqual(errors,[]);reports.push({width,height,states,geometry:s.geometry.burnSoil,errors});console.log('PASS shape',mode,width);
 }
 await page.goto('http://localhost:5192/iframe');const frame=page.frames().find(f=>f.url().startsWith(url));assert(frame);await frame.waitForFunction(()=>window.__FLIPBOOK_FAN__,null,{timeout:60000});const a=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);await page.waitForTimeout(250);const b=await frame.evaluate(()=>window.__FLIPBOOK_FAN__.state().time);assert.notEqual(a,b);
 await fs.writeFile(`${dir}/${mode}.json`,JSON.stringify({pass:true,url,reports,iframe:{pass:true,before:a,after:b}},null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
