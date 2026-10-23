import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchOptions} from './typography/browser.mjs';
const base=process.env.DEMO_URL||'http://127.0.0.1:3078';
const server=process.env.DEMO_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3078']);
let browser;
try {
 await new Promise(r=>setTimeout(r,1200));
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:Number(process.env.PIXEL_RATIO||1)});
 await page.addInitScript(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:577,y:700})));
 await page.goto(base+'/?time='+ (process.env.TIME||'.5') +'&offline=1');
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&Boolean(window.__WORLD_GATE_DOORS__||document.querySelector('#world-gate-doors')));
 await page.waitForTimeout(1000);
 const gateRect=()=>page.evaluate(()=>{const g=window.__WORLD_GATE_DOORS__||document.querySelector('#world-gate-doors');return g.dataset?.rect?JSON.parse(g.dataset.rect):g.getBoundingClientRect();});
 let r=await gateRect();

 await page.mouse.move(800,400);await page.mouse.down();await page.mouse.move(800+550-(r.x+r.width/2),400+400-(r.y+r.height/2),{steps:8});await page.mouse.up();await page.waitForTimeout(150);r=await gateRect();
 await page.screenshot({path:`docs/gate-seams/${process.env.CAPTURE||'after'}.png`,clip:{x:Math.max(0,r.x-180),y:Math.max(0,r.y-70),width:Math.min(1000,r.width+360),height:Math.min(process.env.CLOSEUP?420:650,900-Math.max(0,r.y-70))}});
 const density=await page.evaluate(()=>{const gate=window.__WORLD_GATE_DOORS__||document.querySelector('#world-gate-doors'),surface=window.__WORLD_SURFACE__||document.querySelector('#world-surface');return {gateX:gate.width/parseFloat(gate.style.width),gateY:gate.height/parseFloat(gate.style.height),worldX:surface.width/parseFloat(surface.style.width),worldY:surface.height/parseFloat(surface.style.height),state:gate.dataset.state};});
 assert(Math.abs(density.gateX-density.worldX)<.005,'gate and wall horizontal raster density must match');
 assert(Math.abs(density.gateY-density.worldY)<.005,'gate and wall vertical raster density must match');
 await page.screenshot({path:`docs/gate-seamless/${process.env.CAPTURE||'integration'}-gameplay.png`});
 const report={gate:r,state:density.state,density:{gateX:density.gateX,gateY:density.gateY,worldX:density.worldX,worldY:density.worldY}};
 await fs.writeFile('docs/gate-seamless/integration.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
} finally {await browser?.close();server?.kill();}
