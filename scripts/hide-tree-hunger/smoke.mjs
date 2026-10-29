import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage();
 await page.addInitScript(()=>localStorage.setItem('arkodia.hero','rift-runner'));
 const ready=()=>page.waitForFunction(()=>window.__GATHERING__&&window.__PIXI_UI__,null,{timeout:90000});
 await page.goto('https://arkodia.online/?3d=0&shadowField=0',{waitUntil:'domcontentloaded'});await ready();
 for(const [width,height] of [[1280,800],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  const result=await page.evaluate(()=>{
   const ui=window.__PIXI_UI__,found={};
   function walk(c){if(c.label==='Open Building Tree'||c.label==='Hunger')found[c.label]={visible:c.visible,eventMode:c.eventMode};for(const child of c.children??[])walk(child);}
   walk(ui.app.stage);ui.buildingTree.open();return {found,open:ui.buildingTree.isOpen(),hunger:window.__GATHERING__.snapshot().state.hunger};
  });
  assert.equal(result.found['Open Building Tree'].visible,false);assert.equal(result.found.Hunger.visible,false);assert.equal(result.open,false);assert.equal(result.hunger,100);
  await page.keyboard.press('b');assert.equal(await page.evaluate(()=>window.__PIXI_UI__.buildingTree.isOpen()),false);
 }
 const result=await page.evaluate(()=>{const g=window.__GATHERING__,before=g.snapshot();for(let i=0;i<6000;i++)g.step(100,{alive:false,steering:true,busy:false});g.eat();const after=g.snapshot();return {before:before.state.day,after:after.state.day,hunger:after.state.hunger,foodBefore:before.resources.food,foodAfter:after.resources.food};});
 assert(result.after>result.before);assert.equal(result.hunger,100);assert.equal(result.foodAfter,result.foodBefore);
 await page.evaluate(()=>{const key='arkodia-stronghold-v1',s=JSON.parse(localStorage.getItem(key));s.gathering={...(s.gathering??window.__GATHERING__.snapshot().state),hunger:78};localStorage.setItem(key,JSON.stringify(s));});
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.evaluate(()=>window.__GATHERING__.snapshot().state.hunger),100);
 console.log('PASS live desktop/portrait/landscape hidden controls, B and API disabled, clock advances with full hunger, Food unchanged, old save normalized after reload');
}finally{await browser.close();}
