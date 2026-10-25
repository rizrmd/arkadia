// Rift Runner Skill Tree check (Knowledge: "Rift Runner — Ascension Tree Concept" › Implementation):
//   node scripts/skill-tree/verify.mjs            local Vite build of the working tree
//   VERIFY_URL=https://ark-whachat.fural.space node scripts/skill-tree/verify.mjs
// Drives the real inputs: a quick tap on a HUD skill still casts it; a touch long-press (phone, 390 × 844) or a
// right-click (desktop, 1440 × 900) opens the tree, scrolls to that skill's node and highlights it; the panel leaves the
// HUD uncovered; drag/wheel scroll, the X, a tap outside, Esc and K. Writes docs/skill-tree/*.webp and results.json.
import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const OUT=process.env.OUT||'docs/skill-tree',remote=process.env.VERIFY_URL,port=5200+process.pid%700,tag=remote?'live':'local';
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: other sessions editing the shared clone must not reload the page mid-run.
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=remote||`http://127.0.0.1:${port}`;
const report={base,views:{},errors:[]};
// Mid-run state like the overlay mockups (level 7): Rift Bolt Lv. 3 on Skill 1, Rift Dash on 2, Astral Cleave on 3,
// Second Wind and Titan Strike taken; picked through the game's own level-up path.
const buildRun=()=>{const c=window.__STRONGHOLD_COMBAT__;
 for(const [offer,pick] of [[['rift-dash','might','heal'],'rift-dash'],[['cleave','might','heal'],'cleave'],[['rift-bolt','nova','heal'],'rift-bolt'],[['rift-bolt','nova','heal'],'rift-bolt'],[['rift-bolt','might','heal'],'heal'],[['rift-bolt','might','heal'],'might']]){c.offer(offer);c.choose(pick);}
 c.resetCooldowns();return c.snapshot().run;};
const tree=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
const sockets=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets);
const cooldown=(page,i)=>page.evaluate(i=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.slots[i].cooldownMs,i);
const settle=(page,ms=1800)=>page.waitForTimeout(ms);
async function shot(page,name){if(remote)name=`live-${name}`;const png=`${OUT}/${name}.png`;await page.screenshot({path:png});await sharp(png).webp({quality:84}).toFile(png.replace(/\.png$/,'.webp'));await fs.rm(png);return `${name}.webp`;}
function checkOpen(t,id,label){
 assert.equal(t.open,true,`${label}: tree open`);assert.equal(t.highlighted,id,`${label}: ${id} highlighted`);
 const n=t.nodes.find(n=>n.id===id);assert(n.inView,`${label}: ${id} scrolled into view`);return n;
}
async function open(view,[w,h],mobile){
 const browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>report.errors.push(`${view}: ${e.message}`));
 await page.goto(`${base}/?offline=1&hero=rift-runner&time=.45`);
 await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.getElementById('loading-screen')&&window.__STRONGHOLD_COMBAT__?.skillTree,null,{timeout:300000,polling:500});
 await settle(page,2500);
 return {browser,page};
}
try{
 if(!process.env.ONLY||process.env.ONLY==='mobile'){
  const r=report.views.mobile={viewport:[390,844],shots:[]};
  const {browser,page}=await open('mobile',[390,844],true);
  try{
   const cdp=await page.context().newCDPSession(page);
   const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y])=>({x,y,id:1}))});
   r.run=await page.evaluate(buildRun);await settle(page);
   const s=await sockets(page);
   // A quick tap casts Skill 1 and leaves the tree closed. Headless frames take longer than the long-press time, so
   // the tap's down and up go in one task (CDP waits a frame for each event and would make it a long-press).
   await page.evaluate(([x,y])=>{const c=document.querySelector('#world-canvas'),o={clientX:x,clientY:y,pointerId:7,pointerType:'touch',isPrimary:true,bubbles:true,button:0,buttons:1};
    c.dispatchEvent(new PointerEvent('pointerdown',o));c.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));},[s[0].x,s[0].y]);
   await settle(page,900);
   r.tapCast={cooldownMs:await cooldown(page,0),treeOpen:(await tree(page)).open};
   assert(r.tapCast.cooldownMs>0,'tap still casts Rift Bolt');assert.equal(r.tapCast.treeOpen,false,'tap does not open the tree');
   // Long-press Skill 3 (Astral Cleave): opens on that node, highlighted, without casting it.
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.resetCooldowns());
   await touch('touchStart',[[s[2].x,s[2].y]]);await page.waitForTimeout(900);await touch('touchEnd',[]);await settle(page,2500);
   let t=await tree(page);r.longPress={highlighted:t.highlighted,cast:await cooldown(page,2),node:checkOpen(t,'astral-cleave','long-press')};
   assert.equal(r.longPress.cast,0,'long-press does not cast');
   assert.equal(t.vertical,true,'portrait tree is vertical');
   // HUD stays uncovered: the panel ends above the skill arc and starts below the top bar and minimap.
   const skillTop=Math.min(...s.map(k=>k.y-k.radius));r.layout={panel:t.panel,skillTop,u:t.u,maxScroll:t.maxScroll};
   assert(t.panel.y+t.panel.height<=skillTop,'panel ends above the skill arc');assert(t.maxScroll>0,'portrait tree scrolls');
   const byId=Object.fromEntries(t.nodes.map(n=>[n.id,n]));
   r.states={learned:t.nodes.filter(n=>n.learned).map(n=>`${n.name} Lv. ${n.level}`),slots:t.nodes.filter(n=>n.slot).map(n=>`${n.slot}: ${n.name}`),placeholders:t.nodes.filter(n=>n.placeholder).map(n=>n.name)};
   assert.deepEqual([byId['rift-bolt'].slot,byId['rift-dash'].slot,byId['astral-cleave'].slot],[1,2,3],'slot badges 1/2/3');
   assert.equal(byId['rift-bolt'].pips,3,'Rift Bolt shows 3 rank pips');assert.equal(byId['rift-trap'].learned,false,'Rift Trap unlearned');
   assert.equal(byId['second-wind'].learned,true,'Second Wind learned');
   r.shots.push(await shot(page,'mobile-long-press-astral-cleave'));
   // Drag the tree down to its top (Ascendant Star), then tap outside the panel to close.
   const v=t.view,x=v.x+v.width*.82;
   await touch('touchStart',[[x,v.y+60]]);for(let k=1;k<=12;k++)await touch('touchMove',[[x,v.y+60+k*30]]);await touch('touchEnd',[]);await settle(page,2500);
   t=await tree(page);r.drag={scroll:t.scroll,starInView:t.nodes.find(n=>n.id==='ascendant-star').inView};
   assert(r.drag.scroll<r.layout.maxScroll,'drag scrolls the tree');
   if(!r.drag.starInView){await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('ascendant-star'));await settle(page,2500);}
   r.shots.push(await shot(page,'mobile-scrolled-capstone'));
   await touch('touchStart',[[30,t.panel.y+t.panel.height+40]]);await touch('touchEnd',[]);await settle(page,900);
   assert.equal((await tree(page)).open,false,'tap outside closes');
   // Long-press Skill 1: back at the root, Rift Bolt highlighted; then the X closes.
   await touch('touchStart',[[s[0].x,s[0].y]]);await page.waitForTimeout(900);await touch('touchEnd',[]);await settle(page,2500);
   t=await tree(page);checkOpen(t,'rift-bolt','long-press Skill 1');
   r.shots.push(await shot(page,'mobile-long-press-rift-bolt'));
   await touch('touchStart',[[t.close.x,t.close.y]]);await touch('touchEnd',[]);await settle(page,900);
   assert.equal((await tree(page)).open,false,'X closes');
   r.pass=true;
  }finally{await browser.close();}
 }
 if(!process.env.ONLY||process.env.ONLY==='desktop'){
  const r=report.views.desktop={viewport:[1440,900],shots:[]};
  const {browser,page}=await open('desktop',[1440,900],false);
  try{
   // Fresh run: K opens the tree on Rift Bolt, the only learned node.
   await page.keyboard.press('k');await settle(page,2500);
   let t=await tree(page);checkOpen(t,'rift-bolt','K');assert.equal(t.vertical,false,'desktop tree is horizontal');
   r.fresh={learned:t.nodes.filter(n=>n.learned).map(n=>n.name)};assert.deepEqual(r.fresh.learned,['Rift Bolt']);
   r.shots.push(await shot(page,'desktop-fresh-run'));
   await page.keyboard.press('Escape');await settle(page,600);assert.equal((await tree(page)).open,false,'Esc closes');
   r.run=await page.evaluate(buildRun);await settle(page);
   const s=await sockets(page);
   await page.mouse.click(s[0].x,s[0].y);await settle(page,900);
   r.clickCast={cooldownMs:await cooldown(page,0),treeOpen:(await tree(page)).open};
   assert(r.clickCast.cooldownMs>0,'left-click still casts');assert.equal(r.clickCast.treeOpen,false,'left-click does not open the tree');
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.resetCooldowns());
   await page.mouse.click(s[1].x,s[1].y,{button:'right'});await settle(page,2500);
   t=await tree(page);r.rightClick={node:checkOpen(t,'rift-dash','right-click Skill 2'),cast:await cooldown(page,1)};
   assert.equal(r.rightClick.cast,0,'right-click does not cast');
   const skillLeft=Math.min(...s.map(k=>k.x-k.radius));r.layout={panel:t.panel,skillLeft,u:t.u,maxScroll:t.maxScroll};
   assert(t.panel.x+t.panel.width<=skillLeft,'panel stays left of the skill arc');assert(t.maxScroll>0,'desktop tree scrolls');
   r.shots.push(await shot(page,'desktop-right-click-rift-dash'));
   // Right-click Skill 3 while open retargets the highlight; then wheel to the far end of the tree.
   await page.mouse.click(s[2].x,s[2].y,{button:'right'});await settle(page,2500);
   t=await tree(page);checkOpen(t,'astral-cleave','right-click Skill 3');
   r.shots.push(await shot(page,'desktop-right-click-astral-cleave'));
   await page.mouse.move(t.view.x+t.view.width/2,t.view.y+t.view.height/2);
   for(let k=0;k<8;k++){await page.mouse.wheel(0,240);await page.waitForTimeout(120);}
   await settle(page,2000);t=await tree(page);r.wheel={scroll:t.scroll,maxScroll:t.maxScroll,starInView:t.nodes.find(n=>n.id==='ascendant-star').inView};
   assert(r.wheel.starInView,'wheel reaches Ascendant Star');
   r.shots.push(await shot(page,'desktop-scrolled-capstone'));
   await page.mouse.click(t.close.x,t.close.y);await settle(page,900);assert.equal((await tree(page)).open,false,'X closes');
   r.pass=true;
  }finally{await browser.close();}
 }
 assert.deepEqual(report.errors,[],'no page errors');
 report.pass=true;
}catch(e){report.failure=String(e?.stack||e);throw e;}
finally{
 await fs.writeFile(`${OUT}/results-${tag}.json`,JSON.stringify(report,null,1)+'\n');
 await vite?.close();
}
console.log(JSON.stringify(report,null,1));
