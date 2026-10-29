import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {launch} from '../vfx/browser.mjs';
import {build} from 'vite';
import http from 'node:http';
import path from 'node:path';
import {createReadStream} from 'node:fs';
let server;
const external=process.env.GAME;
if(!external){
 console.log('Building production test client');
 await build({logLevel:'error',build:{copyPublicDir:false,outDir:'/tmp/flame-fan-game',emptyOutDir:true}});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
 server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';let file=path.join('/tmp/flame-fan-game',rel);try{await fs.access(file);}catch{file=path.resolve('public',rel);}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>{res.statusCode=404;res.end();});stream.pipe(res);});
 await new Promise(r=>server.listen(3949,'127.0.0.1',r));
}
console.log('Launching browser');
let browser;const results=[],errors=[];
try {
 for(const width of (process.env.WIDTH?[Number(process.env.WIDTH)]:[1440,390])){
 browser=await launch();console.log('Creating page',width);
 const page=await browser.newPage({viewport:{width,height:width===1440?900:844},isMobile:width===390,hasTouch:width===390});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});await page.routeWebSocket('**/*',()=>{});
 console.log('Loading game',width);
 await page.goto((external||'http://127.0.0.1:3949')+'/?offline=1&hero=ember-warden&quality=low',{waitUntil:'domcontentloaded'});
 
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:120000,polling:500});
 console.log('Game ready',width);
 
 const at=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();
 for(let u=18;u<30;u+=.5)for(let v=18;v<30;v+=.5){if(c.clear(u,v)&&c.clear(u+3,v)&&c.clear(u+2,v+1)&&c.clear(u+2,v-1)&&c.teleport(u,v))return {u,v};}throw Error('No clear test position');});
 for(let rank=1;rank<=5;rank++){
 await page.evaluate(({at,rank})=>{const c=window.__STRONGHOLD_COMBAT__;c.clearFoes();c.teleport(at.u,at.v);c.resetCooldowns();if(rank>1){c.offer(['flame-fan']);c.choose('flame-fan');}for(const [u,v] of [[2,-.8],[2,0],[2,.8],[-2,0]])c.summon(at.u+u,at.v+v,25);},{at,rank});
 await page.waitForTimeout(1800);
 const before=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
 await page.evaluate(at=>window.__STRONGHOLD_COMBAT__.castSkill('flame-fan',{targetU:at.u+3,targetV:at.v}),at);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().vfx.activeAoEs.length===0,null,{timeout:15000,polling:100});
 const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());
 assert.equal(after.vfx.totals.projectiles,before.vfx.totals.projectiles);
 assert.equal(after.vfx.totals.aoes,before.vfx.totals.aoes+1);
 assert.equal(after.run.skills['flame-fan'],rank);
 
 for(let i=0;i<3;i++)assert(after.foes[i].hp<before.foes[i].hp,`rank ${rank} target ${i} damaged`);
 assert.equal(after.foes[3].hp,before.foes[3].hp,'Behind caster excluded');
 assert(!after.vfx.fx.playing.some(k=>k.includes('flame-fan.bolt')));
 console.log('Verified game',width,rank);
 results.push({width,rank,damaged:3,behindExcluded:true,projectiles:0});
 if(rank===1||rank===5)await page.screenshot({path:`docs/flame-fan/${external?'live':'local'}-game-${width}-lv${rank}.png`});
 }
 await browser.close();browser=null;
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(`docs/flame-fan/game-${external?'live':'local'}.json`,JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
