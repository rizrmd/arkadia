import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launchOptions} from './typography/browser.mjs';

const OUT='docs/environment-corners';
await fs.mkdir(OUT,{recursive:true});

const TMP_SITE=`/tmp/arkodia-corners-dist-${process.pid}`;
const TMP_BIN=`/tmp/arkodia-server-${process.pid}`;

execFileSync('npx',['vite','build','--outDir',TMP_SITE],{
 stdio:'inherit',
});

execFileSync(process.env.GO||'go',['build','-o',TMP_BIN,'./cmd/arkodia'],{
 cwd:'server',
 stdio:'inherit',
 env:{...process.env,CGO_ENABLED:'0'},
});

const PORT=String(18800+(process.pid%1000));
const server=spawn(TMP_BIN,[],{
 env:{...process.env,PORT,SITE_DIR:TMP_SITE},
 stdio:['ignore','pipe','inherit'],
});
await new Promise((ok,no)=>{
 server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
 server.on('exit',c=>no(Error('server exited '+c)));
});

const baseUrl=`http://127.0.0.1:${PORT}`;
const consoleErrors=[];
const pageErrors=[];
const report={
 viewports:{},
 biomeResolution:{},
 mobileFps:{},
};

async function saveWebp(page,name){
 const png=await page.screenshot({type:'png'});
 const outPath=`${OUT}/${name}.webp`;
 await sharp(png).webp({quality:90}).toFile(outPath);
 console.log('saved',outPath);
}

try{
 for(const vp of [
  {tag:'1440x900',mode:'desktop',width:1440,height:900,dpr:1,isMobile:false,hasTouch:false},
  {tag:'390x844',mode:'mobile-portrait',width:390,height:844,dpr:2,isMobile:true,hasTouch:true},
  {tag:'844x390',mode:'mobile-landscape',width:844,height:390,dpr:2,isMobile:true,hasTouch:true},
 ]){
  const browser=await chromium.launch(launchOptions());
  try{
   const ctx=await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    deviceScaleFactor:vp.dpr,
    isMobile:vp.isMobile,
    hasTouch:vp.hasTouch,
   });
   const page=await ctx.newPage();
   page.on('console',m=>{
    if(m.type()==='error'){
     console.error(`[console.error ${vp.tag}]`,m.text());
     consoleErrors.push(`${vp.tag}: ${m.text()}`);
    }
   });
   page.on('pageerror',e=>{
    console.error(`[pageerror ${vp.tag}]`,e.message);
    pageErrors.push(`${vp.tag}: ${e.message}`);
   });

   await page.goto(`${baseUrl}/?offline=1&time=0.35`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.__STRONGHOLD_PARALLAX__&&window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true'),null,{timeout:90000});
   await page.waitForTimeout(350);

   // Close hero picker if open
   await page.evaluate(()=>{
    if(window.__PIXI_UI__?.picker?.isOpen())window.__PIXI_UI__.picker.open(false);
   });
   await page.waitForTimeout(150);

   // 1. Verify Court state & capture court screenshot
   const courtState=await page.evaluate(()=>{
    const p=window.__STRONGHOLD_PARALLAX__;
    const c=window.__STRONGHOLD_COMBAT__;
    c.teleport(8.5,8.5);
    p.forceArea('court');
    p.step(8.5,8.5,16);
    return p.snapshot();
   });
   assert.equal(courtState.mode,vp.mode,`Expected mode ${vp.mode} at ${vp.tag}`);
   assert.equal(courtState.biome,'court','Hero in safe zone resolves to court');
   assert.equal(courtState.area,'court','Active corner area is court');
   assert.equal(courtState.biomeLabel,'Court','English label for court');
   assert(courtState.blurPx>0,'Corner art is drawn out of focus (depth-of-field blur)');
   assert(courtState.textureSize.w<=(vp.mode==='desktop'?320:180),'Blurred corner textures are baked at half resolution');
   await page.waitForTimeout(120);
   await saveWebp(page,`court-${vp.tag}`);

   // Test camera pan parallax behavior (desktop moves within +-60px; mobile stays 0)
   const panCheck=await page.evaluate(()=>{
    const p=window.__STRONGHOLD_PARALLAX__;
    p.place(760,460,1.1,innerWidth,innerHeight);
    const snapPan=p.snapshot();
    p.setReducedMotionOverride(true);
    p.place(760,460,1.1,innerWidth,innerHeight);
    const snapReduced=p.snapshot();
    p.setReducedMotionOverride(null);
    p.place(577,385,1,innerWidth,innerHeight);
    return {
     panOffset:snapPan.offset,
     reducedOffset:snapReduced.offset,
    };
   });
   if(vp.mode==='desktop'){
    assert(Math.abs(panCheck.panOffset.dx)>0,'Desktop camera pan produces non-zero parallax offset');
    assert(Math.abs(panCheck.panOffset.dx)<=60&&Math.abs(panCheck.panOffset.dy)<=60,'Desktop parallax offset clamped to +-60px');
   }else{
    assert.equal(panCheck.panOffset.dx,0,'Mobile has zero horizontal parallax motion');
    assert.equal(panCheck.panOffset.dy,0,'Mobile has zero vertical parallax motion');
   }
   assert.equal(panCheck.reducedOffset.dx,0,'Reduced motion disables horizontal parallax offset');
   assert.equal(panCheck.reducedOffset.dy,0,'Reduced motion disables vertical parallax offset');

   // 2. Test border hysteresis (no flicker when stepping across gate briefly) and stable gate cross-fade
   const gateCheck=await page.evaluate(()=>{
    const p=window.__STRONGHOLD_PARALLAX__;
    const c=window.__STRONGHOLD_COMBAT__;
    p.forceArea('court');
    // Step slightly outside gate (< 2 tiles and < 1500ms) then back inside court
    p.step(15.3,15.3,300);
    p.step(15.4,15.4,300);
    const briefOutside=p.snapshot();
    p.step(14.5,14.5,300);
    const backInside=p.snapshot();

    // Now cross gate to (16.6, 16.6) and hold for 1600ms to trigger the single stable cross-fade
    c.teleport(16.6,16.6);
    p.step(16.6,16.6,800);
    p.step(16.6,16.6,800);
    // Advance halfway through cross-fade (350ms of 700ms) for gate screenshot
    p.step(16.6,16.6,350);
    const midFade=p.snapshot();
    return {briefOutside,backInside,midFade};
   });
   assert.equal(gateCheck.briefOutside.area,'court','Hysteresis holds court during brief border step');
   assert.equal(gateCheck.backInside.transitionCount,0,'Stepping back across border causes zero flicker');
   assert.equal(gateCheck.midFade.transitioning,true,'Holding across gate triggers cross-fade');
   assert(gateCheck.midFade.left.slotAAlpha>0&&gateCheck.midFade.left.slotBAlpha>0,'Both A/B slots active during cross-fade');
   await page.waitForTimeout(80);
   await saveWebp(page,`gate-${vp.tag}`);

   // Complete cross-fade and move to Snow Outskirts with combatants
   const outskirtsCheck=await page.evaluate(()=>{
    const p=window.__STRONGHOLD_PARALLAX__;
    const c=window.__STRONGHOLD_COMBAT__;
    p.step(17.5,16.5,500);
    const afterFade=p.snapshot();
    c.teleport(17.5,16.5);
    c.summon(18.2,17.0,2);
    // Pan camera so hero/foes fall inside the left corner box to verify 0.5 combatant proximity fade
    const box=afterFade.left.box;
    const targetScreenX=(box.left+box.right)*0.5;
    const targetScreenY=(box.top+box.bottom)*0.5;
    const hw=window.__STRONGHOLD_COMBAT__.snapshot().hero;
    // Place camera so hero screen pos lands inside leftBox
    const worldX=(hw.u-hw.v)*64+577;
    const worldY=(hw.u+hw.v)*32-160;
    const scale=1;
    const camX=worldX-(targetScreenX-innerWidth/2)/scale;
    const camY=worldY-(targetScreenY-innerHeight/2)/scale;
    p.place(camX,camY,scale,innerWidth,innerHeight);
    for(let i=0;i<10;i++)p.step(17.5,16.5,60);
    const combatFadeSnap=p.snapshot();
    // Re-center camera on hero for clean outskirts screenshot
    p.place(worldX,worldY-40,scale,innerWidth,innerHeight);
    for(let i=0;i<10;i++)p.step(17.5,16.5,60);
    const centeredSnap=p.snapshot();
    return {afterFade,combatFadeSnap,centeredSnap};
   });
   assert.equal(outskirtsCheck.afterFade.area,'snow','Cross-fade completed to snow area');
   assert.equal(outskirtsCheck.afterFade.transitionCount,1,'Exactly one stable gate cross-fade occurred');
   assert.equal(outskirtsCheck.combatFadeSnap.left.nearCombatant,true,'Detected combatant inside corner bounding box');
   assert.equal(outskirtsCheck.combatFadeSnap.left.targetAlpha,0.5,'Corner target opacity fades to 0.5 near combatants');
   assert(outskirtsCheck.combatFadeSnap.left.alpha<=0.55,'Corner opacity faded to ~0.5');
   await page.waitForTimeout(80);
   await page.evaluate(()=>{
    const c=window.__STRONGHOLD_COMBAT__;
    while(c.isModalOpen()){
     const offers=c.snapshot().run.offers;
     if(!offers?.length)break;
     c.choose(offers[0]);
    }
    c.summon(18.6,16.8,2);
    c.summon(16.6,17.4,2);
   });
   await page.waitForTimeout(40);
   await saveWebp(page,`outskirts-${vp.tag}`);

   // 3. Verify HUD & controls clearance
   const hudClearance=await page.evaluate(()=>{
    const ui=window.__PIXI_UI__;
    const p=window.__STRONGHOLD_PARALLAX__;
    const worldStage=ui.app.stage.children[0];
    const uiStage=ui.app.stage.children[1];
    const parallaxInWorld=worldStage.children.includes(p.container);
    const hudInUi=uiStage.children.includes(ui.hud);
    return {
     parallaxInWorld,
     hudInUi,
     parallaxEventMode:p.container.eventMode,
     parallaxInteractiveChildren:p.container.interactiveChildren,
    };
   });
   assert.equal(hudClearance.parallaxInWorld,true,'Parallax container sits in worldStage below uiStage');
   assert.equal(hudClearance.hudInUi,true,'HUD sits in uiStage above worldStage');
   assert.equal(hudClearance.parallaxEventMode,'none','Parallax never intercepts pointer events');
   assert.equal(hudClearance.parallaxInteractiveChildren,false,'Parallax children never intercept pointer events');

   // 4. On 390x844 mobile portrait, measure FPS with and without parallax layer and test biomeAt() across outdoor biomes
   if(vp.tag==='390x844'){
    report.biomeResolution=await page.evaluate(()=>{
     const p=window.__STRONGHOLD_PARALLAX__;
     const samples=[
      {u:7.5,v:7.5},
      {u:16.5,v:16.5},
      {u:8,v:40},
      {u:22,v:45},
      {u:35,v:42},
      {u:50,v:50},
     ];
     return samples.map(s=>{
      const id=p.biomeAt(s.u,s.v);
      return {...s,biome:id,label:p.biomeDisplayName(id)};
     });
    });
    for(const s of report.biomeResolution){
     assert(!/Sungai|Pegunungan|Rawa|Hutan Relik|Perbatasan Abu/.test(s.label),`Biome label must be English: ${s.label}`);
    }

    report.mobileFps=await page.evaluate(async()=>{
     const p=window.__STRONGHOLD_PARALLAX__;
     const app=window.__PIXI_UI__.app;
     async function measure(enabled){
      p.setEnabled(enabled);
      const frames=60;
      const start=performance.now();
      for(let i=0;i<frames;i++){
       p.place(577+Math.sin(i*0.2)*30,385+Math.cos(i*0.2)*20,1,innerWidth,innerHeight);
       await new Promise(r=>requestAnimationFrame(r));
      }
      const elapsed=performance.now()-start;
      const rafFps=+(frames*1000/Math.max(1,elapsed)).toFixed(1);
      // Also measure pure synchronous WebGL stage render pass overhead over 120 passes
      const passes=120;
      const t0=performance.now();
      for(let i=0;i<passes;i++){
       p.place(577+Math.sin(i*0.2)*30,385+Math.cos(i*0.2)*20,1,innerWidth,innerHeight);
       app.renderer.render(app.stage);
      }
      const renderMs=+((performance.now()-t0)/passes).toFixed(3);
      return {rafFps,renderMsPerFrame:renderMs};
     }
     const withLayer=await measure(true);
     const withoutLayer=await measure(false);
     p.setEnabled(true);
     return {withLayer,withoutLayer};
    });
   }

   report.viewports[vp.tag]={
    mode:vp.mode,
    court:{biome:courtState.biome,area:courtState.area,blurPx:courtState.blurPx,textureSize:courtState.textureSize,leftBox:courtState.left.box,rightBox:courtState.right.box},
    panCheck,
    gate:{transitionCount:outskirtsCheck.afterFade.transitionCount,activeSlot:outskirtsCheck.afterFade.activeSlot},
    outskirts:{
     biome:outskirtsCheck.centeredSnap.biome,
     area:outskirtsCheck.centeredSnap.area,
     combatantFadeAlpha:outskirtsCheck.combatFadeSnap.left.alpha,
    },
    hudClearance,
   };
  }finally{
   await browser.close();
  }
 }
}finally{
 server.kill();
 await fs.rm(TMP_SITE,{recursive:true,force:true}).catch(()=>{});
 await fs.rm(TMP_BIN,{force:true}).catch(()=>{});
}

report.consoleErrors=consoleErrors;
report.pageErrors=pageErrors;
await fs.writeFile(`${OUT}/verification.json`,JSON.stringify(report,null,2)+'\n');
console.log('Verification report:',JSON.stringify(report,null,2));
assert.equal(consoleErrors.length,0,`Console errors: ${consoleErrors.join('; ')}`);
assert.equal(pageErrors.length,0,`Page errors: ${pageErrors.join('; ')}`);
