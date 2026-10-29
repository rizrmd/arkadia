import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
const launch=()=>{const options=launchOptions();options.args=options.args.filter(a=>a!=='--single-process');return chromium.launch(options);};
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.OUT||'docs/starting-campfire';await fs.mkdir(out,{recursive:true});
const vite=await createServer({server:{port:5193,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await vite.listen();
const economy=await vite.ssrLoadModule('/src/stronghold/economy.ts');
const map=await fs.readFile('docs/core-center/published-map.json','utf8');
const camp=await vite.ssrLoadModule('/src/stronghold/starting-campfire.ts');
assert.equal(camp.usesStartingCampfire(1),true);
for(let level=2;level<=30;level++)assert.equal(camp.usesStartingCampfire(level),false);
const block=(x,y)=>camp.campfireColumns().some(c=>Math.abs(x-c.x)<c.w/2+9&&y>c.back-4.5&&y<c.front+4.5);
assert(block(577,320));assert(!block(630,320));assert(!block(590,420));
const report={mapRevision:JSON.parse(map).revision,cases:[],errors:[]};let browser;
try{
 for(const existing of (process.env.EXISTING_ONLY?[true]:process.env.FRESH_ONLY?[false]:[false,true])){
  browser=await launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  let hallLoaded=false;const coreResponses=[];page.on('response',r=>{if(r.url().includes('stronghold-core')||r.url().includes('starting-campfire')){coreResponses.push({url:r.url(),status:r.status()});console.log('Core response',existing,r.status(),r.url());}if(r.url().includes(existing?'/buildings/stronghold-core/painted/level-10':'/buildings/starting-campfire/campfire-v1.png')&&r.status()===200)hallLoaded=true;});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/api/environment/published*',r=>r.fulfill({contentType:'application/json',body:map}));
  await page.route('**/api/vfx/visuals',r=>r.fulfill({contentType:'application/json',body:'{}'}));
  const state=economy.fresh();state.gold=9876;state.strongholdCore={completedLevel:12};state.careerDefenses={'rift-runner':'watchtower'};state.levels.expedition=3;state.rewarded=['retained-run'];
  if(existing){const loaded=economy.load(JSON.stringify(state),state.at);assert.deepEqual(loaded,state);}
  await page.addInitScript(({existing,state})=>{localStorage.clear();localStorage.setItem('arkodia.desktop-movement-hint.v1','1');if(existing){localStorage.setItem('arkodia-stronghold-v1',JSON.stringify(state));localStorage.setItem('arkodia.stronghold.hero',JSON.stringify({x:577,y:320}));}}, {existing,state});
  await page.clock.install();
  await page.goto(`${process.env.BASE||'http://127.0.0.1:5193'}/?offline=1&time=.5&quality=low`);
  try{await page.waitForFunction(()=>window.__STRONGHOLD_NAV__&&window.__STRONGHOLD_COMBAT__&&!document.getElementById('loading-screen'),null,{timeout:60000});}catch(e){console.log('Startup diagnostic',await page.evaluate(()=>({loading:document.getElementById('loading-screen')?.textContent,saved:JSON.parse(localStorage.getItem('arkodia-stronghold-v1'))?.strongholdCore})),coreResponses,report.errors);throw e;}
  await page.clock.pauseAt(await page.evaluate(()=>Date.now())+100);await page.evaluate(()=>window.__PIXI_UI__.app.ticker.stop());
  const nav=await page.evaluate(()=>window.__STRONGHOLD_NAV__());
  assert.deepEqual(nav.layout.sort(),['expedition','gate']);
  const blocked=(x,y)=>nav.columns.some(c=>Math.abs(x-c.x)<c.w/2+9&&y>c.back-4.5&&y<c.front+4.5);
  assert(!blocked(590,420),'spawn clear');
  for(let y=420;y<710;y+=2)assert(!blocked(590,y),'exit corridor clear '+y);
  await page.evaluate(()=>window.__PIXI_UI__.app.render());await page.screenshot({path:`${out}/${existing?'existing':'fresh'}-spawn.png`,timeout:15000});
  const initial=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);assert(!blocked(initial.x,initial.y),'loaded position clear');
  await page.keyboard.down('KeyS');for(let n=0;n<12;n++)await page.clock.fastForward(100);await page.keyboard.up('KeyS');
  const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);assert(after.y>initial.y+40,'actual walking from spawn');
  await fs.writeFile(`${out}/${existing?'existing':'fresh'}-nav.json`,JSON.stringify(nav));
  const image=hallLoaded;assert(image,'Expected base artwork loaded: '+JSON.stringify({coreResponses,saved:await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).strongholdCore)}));
  if(existing){const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.equal(saved.gold,state.gold);assert.equal(saved.levels.expedition,3);assert.deepEqual(saved.rewarded,state.rewarded);assert.deepEqual(saved.strongholdCore,state.strongholdCore);assert.deepEqual(saved.careerDefenses,state.careerDefenses);}
  if(true){try{await page.evaluate(()=>window.__PIXI_UI__.app.render());await page.screenshot({path:`${out}/${existing?'existing':'fresh'}.png`,timeout:8000});}catch(e){report.screenshotError=String(e).slice(0,160);}}
  report.cases.push({existing,initial,after,columns:nav.columns.length,strongholdCoreLoaded:image,spawnClear:true,exitCorridorClear:true,savePreserved:true});
  await browser.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile(`${out}/validation.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();await vite.close();}
console.log(JSON.stringify(report));
