// Deterministic in-game close-up of the 3D hero and its ground shadow (fake clock, fixed spot, no foes), for
// comparing renderer revisions: node scripts/fps-profile/capture-hero3d.mjs out.png [time=0.5] [root=.]
import {createServer} from 'vite';
import path from 'node:path';
import {launch} from '../vfx/browser.mjs';
const OUT=process.argv[2],TIME=process.argv[3]||'0.5',ROOT=path.resolve(process.argv[4]||'.');
const vite=await createServer({root:ROOT,configFile:path.join(ROOT,'vite.config.ts'),server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:394,height:734},deviceScaleFactor:2});
 await page.routeWebSocket('**/*',()=>{});
 await page.clock.install();
 await page.goto(`${GAME}/?offline=1&hero=ember-warden&time=${TIME}`);
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:300000});
 for(let i=0;i<300&&!(await page.evaluate(()=>window.__WORLD_HERO__?.dataset.mode==='3d-60fps'));i++)await page.clock.runFor(100);
 await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(true);c.setHudVisible(false);c.clearFoes();c.teleport(20,20);});
 await page.clock.runFor(2000);
 const t0=Date.now();await page.screenshot({path:OUT,clip:{x:97,y:217,width:200,height:300},timeout:180000});console.log('screenshot ms',Date.now()-t0);
 console.log('wrote',OUT,await page.evaluate(()=>window.__WORLD_HERO__?.dataset.mode));
}finally{await browser.close();await vite.close();}
