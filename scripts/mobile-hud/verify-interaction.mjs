import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const base=process.env.VERIFY_URL||'https://ark-whachat.fural.space',out=process.env.HUD_OUT||'docs/mobile-hud/v1';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/?offline=1&hero=ember-warden&time=.35');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000,polling:500});
 const actualHero=await page.evaluate(()=>{const h=window.__STRONGHOLD_COMBAT__.hud;return {name:h.state.name,portrait:h.playerConsole.loadedPortrait,skills:h.state.skills};});
 assert.equal(actualHero.name,'Ember Warden');assert.equal(actualHero.portrait,'portrait-ember-warden');
 await page.screenshot({path:out+'/live-actual-ember.png'});
 const cdp=await page.context().newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id:id+1}))});
 const interactions=[];
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);
  await page.evaluate(()=>{const h=window.__STRONGHOLD_COMBAT__.hud;window.__hudOriginalClick=h.callbacks.onSkillClick;window.__hudTaps=[];h.callbacks.onSkillClick=i=>window.__hudTaps.push(i);});
  const sockets=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets);
  for(const s of sockets){
   assert(s.radius*2>=44,'Minimum touch diameter');
   await touch('touchStart',[[s.x,s.y]]);await touch('touchEnd',[]);await page.waitForTimeout(60);
   assert.equal(await page.evaluate(()=>window.__PIXI_UI__.stick.visible),false);
  }
  const taps=await page.evaluate(()=>{const h=window.__STRONGHOLD_COMBAT__.hud;h.callbacks.onSkillClick=window.__hudOriginalClick;return window.__hudTaps;});
  assert.deepEqual(taps,[0,1,2]);
  interactions.push({width,height,taps,sockets});
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 // Simulate a notched viewport without relying on headless Chromium's zero-valued env() insets.
 const safe=await page.evaluate(()=>{
  const probe=[...document.querySelectorAll('div')].find(e=>e.style.cssText.includes('safe-area-inset-top'));
  if(!probe)throw Error('Safe-area probe missing');probe.style.padding='20px 16px 24px 16px';
  const h=window.__STRONGHOLD_COMBAT__.hud;h.layout(innerWidth,innerHeight);
  return {console:h.playerConsole.getBounds(),skills:h.getSkillSocketScreenGeometry()};
 });
 await page.waitForTimeout(200);
 const map=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap);
 assert.equal(map.bounds.y,30);assert(map.bounds.x+map.bounds.width<=390-16-8);
 for(const s of safe.skills.sockets){assert(s.x+s.radius<=390-16);assert(s.y+s.radius<=844-24);}
 await page.screenshot({path:out+'/live-safe-area-ember.png'});
 assert.deepEqual(errors,[]);
 await writeFile(out+'/live-interaction.json',JSON.stringify({actualHero,interactions,safe,map,errors},null,2));
 console.log('PASS actual Ember identity, all mobile touch targets, minimum 44px hit diameters and simulated safe-area insets');
}finally{await browser.close();}
