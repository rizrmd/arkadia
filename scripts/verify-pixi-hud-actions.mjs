import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from './typography/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const remote=process.env.VERIFY_URL;
const server=remote?null:await createServer({server:{host:'127.0.0.1',port:5598,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await server?.listen();
const out='docs/pixi-hud-actions';await fs.mkdir(out,{recursive:true});
const report=[];let browser;
try{
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['desktop',1440,900]]){
  const opts=launchOptions();opts.args=opts.args.filter(x=>x!=='--single-process');
  browser=await chromium.launch(opts);
  const page=await browser.newPage({viewport:{width,height}});
  await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','rift-runner');localStorage.setItem('arkodia.settings.v1',JSON.stringify({quality:'low',frameRate:30}));});
  await page.goto((remote||'http://127.0.0.1:5598')+'/?offline=1&hero=rift-runner&3d=0&time=.45');
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:300000});
  if(!remote){
   await page.evaluate(async()=>{window.__actionStage=(await (await import('/src/app/loader.ts')).ensurePixiRuntime()).uiStage;});
   await page.waitForFunction(()=>window.__actionStage?.children.filter(c=>['Open Inventory','Open Settings'].includes(c.label)).every(c=>c.children[0].texture.width>1));
  }else{
   const local=JSON.parse(await fs.readFile(`${out}/local-results.json`,'utf8')).find(r=>r.name===name);
   assert.equal(await page.locator('.inventory-bag,.settings-gear').count(),0);
   for(const [i,dialog] of ['Inventory','Settings'].entries()){
    const {x,y}=local.results[i].rest;await page.mouse.click(x+2,y+2);
    await page.getByRole('dialog',{name:dialog,exact:true}).waitFor();await page.keyboard.press('Escape');
   }
   await page.screenshot({path:`${out}/live-${name}.png`,timeout:90000});
   report.push({name,edgeClicksOpenBothDialogs:true,htmlUtilityButtons:0});
   await browser.close();browser=null;console.log('PASS live',name);continue;
  }
  const results=[];
  for(const [label,dialog] of [['Open Inventory','Inventory'],['Open Settings','Settings']]){
   const inspect=()=>page.evaluate(label=>{const b=window.__actionStage.children.find(c=>c.label===label),a=b.children[0];return {x:b.x,y:b.y,hit:{x:b.hitArea.x,y:b.hitArea.y,width:b.hitArea.width,height:b.hitArea.height},art:{width:a.width,height:a.height,y:a.y,tint:a.tint}};},label);
   const rest=await inspect();assert.equal(rest.hit.width,46);assert.equal(rest.hit.height,46);assert.equal(rest.art.width,30);
   assert.equal(await page.locator('.inventory-bag,.settings-gear').count(),0);
   // Click inside the old hitbox but outside the reduced icon.
   await page.mouse.move(rest.x+2,rest.y+2);await page.mouse.down();
   const pressed=await inspect();assert.equal(pressed.art.width,26);assert.equal(pressed.art.y,25);assert.notEqual(pressed.art.tint,rest.art.tint);
   await page.mouse.up();await page.getByRole('dialog',{name:dialog,exact:true}).waitFor();await page.keyboard.press('Escape');
   assert.equal((await inspect()).art.width,30);
   // Drag out must reset without opening the menu.
   await page.mouse.move(rest.x+23,rest.y+23);await page.mouse.down();await page.mouse.move(rest.x-20,rest.y+70);await page.mouse.up();
   assert.equal((await inspect()).art.width,30);assert.equal(await page.getByRole('dialog',{name:dialog,exact:true}).isVisible(),false);
   results.push({label,rest,pressed});
  }
  await page.screenshot({path:`${out}/${remote?'live':'local'}-${name}.png`,timeout:90000});
  report.push({name,results});await browser.close();browser=null;console.log('PASS',name);
 }
}finally{await fs.writeFile(`${out}/${remote?'live':'local'}-results.json`,JSON.stringify(report,null,2));await browser?.close();await server?.close();}
