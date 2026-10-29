import {chromium} from 'playwright';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import {launchOptions} from '../typography/browser.mjs';
const out=process.env.OUT||'docs/frontier-rendering';await fs.mkdir(out,{recursive:true});
const server=process.env.BASE_URL?null:await createServer({server:{host:'127.0.0.1',port:5467,strictPort:true,hmr:false,watch:null},logLevel:'error'});await server?.listen();
const browser=await chromium.launch(launchOptions());const errors=[];
try{
const width=+(process.env.WIDTH||1440),height=+(process.env.HEIGHT||1000),requests=[];
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:width<900?2:1,isMobile:width<900,hasTouch:width<900});page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().includes('/frozen-frontier/game/'))requests.push({url:r.url(),status:r.status()});});
await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','ember-warden');localStorage.removeItem('arkodia.stronghold.hero');});
await page.goto((process.env.BASE_URL||'http://127.0.0.1:5467')+'/?offline=1&time=.5');
await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__FROZEN_FRONTIER__&&window.__STRONGHOLD_COMBAT__,null,{timeout:180000});
await page.evaluate(()=>window.__FROZEN_FRONTIER__.ready);
await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.clearFoes();window.__PIXI_UI__.app.ticker.maxFPS=12;});
const shots={};
for(const [name,u,v] of [['settlement',17.6,31],['settlement-east',24.4,30.4],['ruined-gate',21,23.6],['pillar-courtyard',20.6,31.6],['west-doorway',15.6,31.5],['east-doorway',26,32.45],['east-doorway-front',26,33.05],['east-doorway-back',26,31.85],['cemetery',26,43]].filter(([name])=>!process.env.SHOTS||process.env.SHOTS.split(',').includes(name))){
shots[name]=await page.evaluate(([u,v])=>{window.__PIXI_UI__.app.ticker.start();for(let r=0;r<=1;r+=.2)for(let a=0;a<6.28;a+=r?.7:7){const p=[u+Math.cos(a)*r,v+Math.sin(a)*r];if(window.__STRONGHOLD_COMBAT__.teleport(...p))return p;}return null;},[u,v]);await page.waitForTimeout(1800);
// Pause only the capture's animation loop: software WebGL otherwise spends the
// entire screenshot operation rendering new frames, especially at phone DPR 2.
await page.evaluate(()=>{window.__PIXI_UI__.app.ticker.stop();window.__PIXI_UI__.app.render();});
await page.screenshot({path:`${out}/${name}.png`});console.log('captured',name,shots[name]);}
const stats=await page.evaluate(()=>window.__FROZEN_FRONTIER__.stats());const props=await page.evaluate(()=>window.__FROZEN_FRONTIER__.props());
if(Object.values(shots).some(p=>!p))errors.push('A screenshot destination could not be reached');
if(!stats.loaded||stats.failed||stats.occlusionImages!==stats.sprites)errors.push('Incomplete scenery or occlusion images');
await fs.writeFile(`${out}/inspection.json`,JSON.stringify({base:process.env.BASE_URL||'local',viewport:{width,height},shots,stats,props,requests,errors},null,1));console.log(JSON.stringify({stats,requests,errors}));
if(errors.length)process.exitCode=1;
}finally{await browser.close();await server?.close();}
