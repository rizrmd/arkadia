import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launch} from './vfx/browser.mjs';
const out='docs/main-hall-spawn';await fs.mkdir(out,{recursive:true});
const vite=await createServer({server:{port:5193,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await vite.listen();
const economy=await vite.ssrLoadModule('/src/stronghold/economy.ts');
const map=await fs.readFile(`${out}/published-map.json`,'utf8');
const report={mapRevision:JSON.parse(map).revision,cases:[],errors:[]};let browser;
try{
 for(const existing of [false,true]){
  browser=await launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  let hallLoaded=false;page.on('response',r=>{if(r.url().includes('main-hall-v3')&&r.status()===200)hallLoaded=true;});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/api/environment/published*',r=>r.fulfill({contentType:'application/json',body:map}));
  await page.route('**/api/vfx/visuals',r=>r.fulfill({contentType:'application/json',body:'{}'}));
  const state=economy.fresh();state.gold=9876;state.levels.expedition=3;state.rewarded=['retained-run'];
  if(existing){const loaded=economy.load(JSON.stringify(state),state.at);assert.deepEqual(loaded,state);}
  await page.addInitScript(({existing,state})=>{localStorage.clear();localStorage.setItem('arkodia.desktop-movement-hint.v1','1');if(existing){localStorage.setItem('arkodia-stronghold-v1',JSON.stringify(state));localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:320}));}}, {existing,state});
  await page.clock.install();
  await page.goto('http://127.0.0.1:5193/?offline=1&time=.5&quality=low');
  await page.waitForFunction(()=>window.__STRONGHOLD_NAV__&&window.__STRONGHOLD_COMBAT__&&!document.getElementById('loading-screen'),null,{timeout:90000});
  await page.clock.pauseAt(Date.now()+100);await page.evaluate(()=>window.__PIXI_UI__.app.ticker.stop());
  const nav=await page.evaluate(()=>window.__STRONGHOLD_NAV__());
  assert.deepEqual(nav.layout.sort(),['expedition','gate']);
  const blocked=(x,y)=>nav.columns.some(c=>Math.abs(x-c.x)<c.w/2+9&&y>c.back-4.5&&y<c.front+4.5);
  assert(!blocked(590,420),'spawn clear');
  for(let y=420;y<710;y+=2)assert(!blocked(590,y),'exit corridor clear '+y);
  const initial=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);assert(!blocked(initial.x,initial.y),'loaded position clear');
  await page.keyboard.down('KeyS');for(let n=0;n<12;n++)await page.clock.fastForward(100);await page.keyboard.up('KeyS');
  const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);assert(after.y>initial.y+40,'actual walking from spawn');
  const image=hallLoaded;assert(image,'Main Hall loaded');
  if(existing){const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.equal(saved.gold,state.gold);assert.equal(saved.levels.expedition,3);assert.deepEqual(saved.rewarded,state.rewarded);}
  report.cases.push({existing,initial,after,columns:nav.columns.length,mainHallLoaded:image,spawnClear:true,exitCorridorClear:true,savePreserved:true});
  await browser.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile(`${out}/validation.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();await vite.close();}
console.log(JSON.stringify(report));
