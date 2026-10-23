import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launchOptions} from './typography/browser.mjs';

const OUT='docs/pixi-ui';
await fs.mkdir(OUT,{recursive:true});

execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{
 cwd:'server',
 stdio:'inherit',
 env:{...process.env,CGO_ENABLED:'0'},
});
const PORT='8796';
const server=spawn('server/bin/arkodia',[],{
 env:{...process.env,PORT,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit'],
});
await new Promise((ok,no)=>{
 server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
 server.on('exit',c=>no(Error('server exited '+c)));
});

const baseUrl=`http://127.0.0.1:${PORT}`;
const consoleErrors=[];
const pageErrors=[];
const report={viewports:{},domAudit:{},interactions:{}};

async function saveWebp(page,name){
 const png=await page.screenshot({type:'png'});
 const outPath=`${OUT}/${name}.webp`;
 await sharp(png).webp({quality:92}).toFile(outPath);
 console.log('saved',outPath);
}

try{
 for(const vp of [
  {tag:'desktop',width:1440,height:900,dpr:1,isMobile:false,hasTouch:false},
  {tag:'mobile',width:390,height:844,dpr:2,isMobile:true,hasTouch:true},
 ]){
  // 1. Capture Pixi Loading Screen
  let browser=await chromium.launch(launchOptions());
  try{
   const ctx=await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    deviceScaleFactor:vp.dpr,
    isMobile:vp.isMobile,
    hasTouch:vp.hasTouch,
   });
   const page=await ctx.newPage();
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(`${vp.tag}-loading: ${m.text()}`);});
   page.on('pageerror',e=>pageErrors.push(`${vp.tag}-loading: ${e.message}`));
   await page.goto(`${baseUrl}/?offline=1&holdLoading=1`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__LOADING_READY__===true&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:90000});
   await page.waitForTimeout(300);
   await saveWebp(page,`after-loading-${vp.tag}`);
  }finally{
   await browser.close();
  }

  // 2. Capture Hero Picker, HUD, Clock, Blessing & Co-op Lobby
  browser=await chromium.launch(launchOptions());
  try{
   const ctx=await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    deviceScaleFactor:vp.dpr,
    isMobile:vp.isMobile,
    hasTouch:vp.hasTouch,
   });
   const page=await ctx.newPage();
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(`${vp.tag}: ${m.text()}`);});
   page.on('pageerror',e=>pageErrors.push(`${vp.tag}: ${e.message}`));

   await page.goto(`${baseUrl}/?pick=1&time=0.35`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.__PIXI_UI__?.picker?.isOpen()),null,{timeout:90000});
   await page.waitForTimeout(500);
   await saveWebp(page,`after-hero-picker-${vp.tag}`);

   // Test keyboard switching between heroes and confirming with Enter
   await page.keyboard.press('ArrowRight');
   await page.waitForTimeout(200);
   await page.keyboard.press('ArrowLeft');
   await page.waitForTimeout(200);
   await page.keyboard.press('Enter');
   await page.waitForFunction(()=>!window.__PIXI_UI__?.picker?.isOpen(),null,{timeout:10000});
   await page.waitForTimeout(400);

   // Audit DOM children inside #app and body (Acceptance #1)
   const domInfo=await page.evaluate(()=>{
    const appChildren=[...document.querySelector('#app').children].map(el=>({
     tag:el.tagName,
     id:el.id,
     ariaHidden:el.getAttribute('aria-hidden'),
    }));
    const bodyChildren=[...document.body.children].map(el=>({tag:el.tagName,id:el.id}));
    const stylesheets=document.querySelectorAll('link[rel="stylesheet"]').length;
    return {appChildren,bodyChildren,stylesheets};
   });
   report.domAudit[vp.tag]=domInfo;
   assert.equal(domInfo.stylesheets,0,'No external CSS stylesheets in DOM');
   assert(
    domInfo.appChildren.every(c=>c.id==='world-canvas'||c.id==='coop-keyboard-proxy'),
    `Unexpected DOM elements in #app: ${JSON.stringify(domInfo.appChildren)}`,
   );

   // Open Clock popover in Pixi and pin Golden Hour
   await page.evaluate(()=>{
    window.__PIXI_UI__.clock.open(true);
    window.__STRONGHOLD_COMBAT__.hud.setTime('17:00');
   });
   await page.waitForTimeout(300);
   await saveWebp(page,`after-clock-${vp.tag}`);
   await page.keyboard.press('Escape');
   await page.waitForTimeout(150);
   const clockClosed=await page.evaluate(()=>!window.__PIXI_UI__.clock.isOpen());
   assert(clockClosed,'Escape key closes Clock popover');

   // Open Co-op Lobby popover in Pixi
   await page.evaluate(()=>{
    window.__PIXI_UI__.lobby.open(true);
   });
   await page.waitForTimeout(300);
   await saveWebp(page,`after-lobby-${vp.tag}`);
   await page.keyboard.press('Escape');
   await page.waitForTimeout(150);

   // Switch to local encounter simulation, teleport hero outside the gate into the wilds, summon revenants, and trigger combat + crits for HUD capture
   await page.evaluate(()=>{
    window.__COOP__?.net?.leave();
   });
   await page.waitForTimeout(80);
   await page.evaluate(()=>{
    const c=window.__STRONGHOLD_COMBAT__;
    c.teleport(17.5,8.2);
    c.summon(18.1,8.5,2);
    c.summon(17.2,8.9,2);
    c.castSkill('rift-bolt',{targetU:18.1,targetV:8.5,forceCrit:true});
    c.hitFoe(0,true);
   });
   await page.waitForTimeout(220);
   await saveWebp(page,`after-hud-${vp.tag}`);

   // Open Level-Up Blessing modal in Pixi and capture + test choosing a card
   await page.evaluate(()=>{
    window.__STRONGHOLD_COMBAT__.offer(['cinder-step','ember-snare','might']);
   });
   await page.waitForTimeout(350);
   await saveWebp(page,`after-blessing-${vp.tag}`);

   // Select 1st blessing via key '1' and verify Slot 2 unlocks
   await page.keyboard.press('1');
   await page.waitForTimeout(250);
   const slotsAfter=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.equippedCount);
   assert.equal(slotsAfter,2,'Selecting active blessing unlocked Slot 2');
   report.interactions[vp.tag]={heroPicker:true,clockEscape:clockClosed,blessingSlotUnlock:slotsAfter===2};
  }finally{
   await browser.close();
  }
 }
}finally{
 server.kill();
}

report.consoleErrors=consoleErrors;
report.pageErrors=pageErrors;
await fs.writeFile(`${OUT}/verification.json`,JSON.stringify(report,null,2)+'\n');
console.log('consoleErrors:',consoleErrors.length,'pageErrors:',pageErrors.length);
assert.equal(consoleErrors.length,0,`Console errors: ${consoleErrors.join('; ')}`);
assert.equal(pageErrors.length,0,`Page errors: ${pageErrors.join('; ')}`);
