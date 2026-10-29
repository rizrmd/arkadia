// Rift Runner Skill Tree check (Knowledge: "Rift Runner — Ascension Tree Concept" › Implementation):
//   node scripts/skill-tree/verify.mjs            local Vite build of the working tree
//   VERIFY_URL=https://ark-whachat.fural.space node scripts/skill-tree/verify.mjs
// Skills only auto-cast. Drives the real inputs on a phone (390 × 844, touch) and a desktop (1440 × 900, mouse):
// a tap/click on a HUD skill slot (or key 1/2/3) casts nothing and opens the tree on that slot's skill; tapping a learned
// skill equips it to that slot (an equipped one swaps), unlearned and passive nodes change nothing; the panel leaves the
// HUD uncovered; drag/wheel scroll, X, a tap outside, Esc and K. Writes docs/skill-tree/*.webp and results-<local|live>.json.
import {chromium} from 'playwright';import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const OUT=process.env.OUT||'docs/skill-tree',remote=process.env.VERIFY_URL,port=5200+process.pid%700,tag=remote?'live':'local';
await fs.mkdir(OUT,{recursive:true});
// No file watching or HMR: other sessions editing the shared clone must not reload the page mid-run.
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const base=remote||`http://127.0.0.1:${port}`;
const report={base,views:{},errors:[]};
// Mid-run state of the overlay mockups (level 8): Rift Bolt Lv. 3 on Skill 1, Rift Dash on 2, Astral Cleave on 3, Rift Trap
// learned but not equipped (the fourth learned active), Second Wind and Titan Strike; picked through the game's level-ups.
const buildRun=()=>{const c=window.__STRONGHOLD_COMBAT__;
 for(const [offer,pick] of [[['rift-dash','might','heal'],'rift-dash'],[['cleave','might','heal'],'cleave'],[['rift-bolt','nova','heal'],'rift-bolt'],[['rift-bolt','nova','heal'],'rift-bolt'],[['rift-trap','might','heal'],'rift-trap'],[['rift-bolt','might','heal'],'heal'],[['rift-bolt','might','heal'],'might']]){c.offer(offer);c.choose(pick);}
 c.resetCooldowns();return c.snapshot().run;};
const tree=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
const sockets=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets);
const slots=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().run.slots);
const hudNames=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets.map(s=>s.name));
const cooldowns=page=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().loadout.slots.map(s=>s.cooldownMs));
const settle=(page,ms=1800)=>page.waitForTimeout(ms);
const node=(t,id)=>t.nodes.find(n=>n.id===id);
async function shot(page,name){if(remote)name=`live-${name}`;const png=`${OUT}/${name}.png`;await page.screenshot({path:png,timeout:120000});await sharp(png).webp({quality:84}).toFile(png.replace(/\.png$/,'.webp'));await fs.rm(png);return `${name}.webp`;}
// Nothing on the page (DOM HUD buttons included) may sit over the tree's close button.
const closeClear=(page,t)=>page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.id==='world-canvas',[t.close.x,t.close.y]);
function checkOpen(t,id,slot,label){
 assert.equal(t.open,true,`${label}: tree open`);assert.equal(t.highlighted,id,`${label}: ${id} highlighted`);assert.equal(t.slot,slot,`${label}: slot mode`);
 const n=node(t,id);assert(n.inView,`${label}: ${id} scrolled into view`);return n;
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
// The run is in the safe zone, where nothing auto-casts: any cooldown after an input would be a manual cast.
const noCast=async(page,label)=>assert.deepEqual(await cooldowns(page),[0,0,0],`${label}: nothing was cast`);
try{
 if(!process.env.ONLY||process.env.ONLY==='mobile'){
  const r=report.views.mobile={viewport:[390,844],shots:[]};
  const {browser,page}=await open('mobile',[390,844],true);
  try{
   const cdp=await page.context().newCDPSession(page);
   const tap=async(x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
   r.run=await page.evaluate(buildRun);await settle(page);
   const s=await sockets(page);
   // Tap Skill 2 (Rift Dash): no cast, the tree opens for slot 2 on Rift Dash.
   await tap(s[1].x,s[1].y);await settle(page,2500);
   let t=await tree(page);checkOpen(t,'rift-dash',1,'tap Skill 2');await noCast(page,'tap Skill 2');
   assert.equal(t.vertical,true,'portrait tree is vertical');
   const skillTop=Math.min(...s.map(k=>k.y-k.radius));r.layout={panel:t.panel,skillTop,u:t.u,maxScroll:t.maxScroll};
   assert(t.panel.y+t.panel.height<=skillTop,'panel ends above the skill arc');assert(t.maxScroll>0,'portrait tree scrolls');
   assert.deepEqual([node(t,'rift-bolt').slot,node(t,'rift-dash').slot,node(t,'astral-cleave').slot,node(t,'rift-trap').slot],[1,2,3,0],'slot badges before');
   assert.equal(node(t,'rift-trap').learned,true,'Rift Trap learned, not equipped');assert.equal(node(t,'rift-bolt').pips,3,'Rift Bolt 3 pips');
   r.opened={hint:t.hint,slot:t.slot,highlighted:t.highlighted};
   r.shots.push(await shot(page,'mobile-tap-skill-2'));
   // Tap Rift Trap: it takes Skill 2; Rift Dash stays learned without a badge; the HUD slot follows.
   let n=node(t,'rift-trap');await tap(n.screen.x,n.screen.y);await settle(page,2500);
   t=await tree(page);r.equipTrap={slots:await slots(page),hud:await hudNames(page),hint:t.hint};
   assert.deepEqual(r.equipTrap.slots,['rift-bolt','rift-trap','cleave'],'Rift Trap equipped to Skill 2');
   assert.equal(r.equipTrap.hud[1],'Rift Trap','HUD Skill 2 shows Rift Trap');assert.equal(node(t,'rift-trap').slot,2);assert.equal(node(t,'rift-dash').slot,0);
   await noCast(page,'equip');
   r.shots.push(await shot(page,'mobile-equip-rift-trap'));
   // Tap Astral Cleave (equipped on Skill 3) for slot 2: the two swap. Tap an unlearned skill: nothing changes.
   n=node(t,'astral-cleave');await tap(n.screen.x,n.screen.y);await settle(page,1500);
   r.swap={slots:await slots(page),hint:(await tree(page)).hint};assert.deepEqual(r.swap.slots,['rift-bolt','cleave','rift-trap'],'equipped skills swap');
   t=await tree(page);n=node(t,'seismic-slam');await tap(n.screen.x,n.screen.y);await settle(page,1500);
   r.unlearned={slots:await slots(page),hint:(await tree(page)).hint};assert.deepEqual(r.unlearned.slots,r.swap.slots,'unlearned skill does not equip');
   assert.match(r.unlearned.hint,/not learned/);
   // Drag up the trunk to the capstone, then tap outside the panel to close.
   const v=t.view,x=v.x+v.width*.82;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:v.y+60,id:1}]});
   for(let k=1;k<=12;k++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:v.y+60+k*30,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle(page,2500);
   t=await tree(page);r.drag={scroll:t.scroll,maxScroll:t.maxScroll};assert(t.scroll<t.maxScroll,'drag scrolls the tree');
   if(!node(t,'ascendant-star').inView){await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('ascendant-star',1));await settle(page,2500);}
   r.shots.push(await shot(page,'mobile-scrolled-capstone'));
   await tap(30,t.panel.y+t.panel.height+40);await settle(page,900);assert.equal((await tree(page)).open,false,'tap outside closes');
   // Tap Skill 1: back at the root with Rift Bolt highlighted; X closes.
   await tap(s[0].x,s[0].y);await settle(page,2500);
   t=await tree(page);checkOpen(t,'rift-bolt',0,'tap Skill 1');await noCast(page,'tap Skill 1');
   assert(await closeClear(page,t),'mobile: X is not covered');
   r.shots.push(await shot(page,'mobile-tap-skill-1'));
   await tap(t.close.x,t.close.y);await settle(page,900);assert.equal((await tree(page)).open,false,'X closes');
   r.pass=true;
  }finally{await browser.close();}
 }
 if(!process.env.ONLY||process.env.ONLY==='desktop'){
  const r=report.views.desktop={viewport:[1440,900],shots:[]};
  const {browser,page}=await open('desktop',[1440,900],false);
  try{
   // Fresh run: K opens the tree on Rift Bolt, the only learned node, with no slot chosen.
   await page.keyboard.press('k');await settle(page,2500);
   let t=await tree(page);checkOpen(t,'rift-bolt',null,'K');assert.equal(t.vertical,false,'desktop tree is horizontal');
   r.fresh={learned:t.nodes.filter(n=>n.learned).map(n=>n.name),hint:t.hint};assert.deepEqual(r.fresh.learned,['Rift Bolt']);
   r.shots.push(await shot(page,'desktop-fresh-run'));
   await page.keyboard.press('Escape');await settle(page,600);assert.equal((await tree(page)).open,false,'Esc closes');
   r.run=await page.evaluate(buildRun);await settle(page);
   const s=await sockets(page);
   // Click Skill 2: no cast, the tree opens for slot 2 on Rift Dash.
   await page.mouse.click(s[1].x,s[1].y);await settle(page,2500);
   t=await tree(page);checkOpen(t,'rift-dash',1,'click Skill 2');await noCast(page,'click Skill 2');
   const skillLeft=Math.min(...s.map(k=>k.x-k.radius));r.layout={panel:t.panel,skillLeft,u:t.u,maxScroll:t.maxScroll};
   assert(t.panel.x+t.panel.width<=skillLeft,'panel stays left of the skill arc');assert(t.maxScroll>0,'desktop tree scrolls');
   r.shots.push(await shot(page,'desktop-click-skill-2'));
   // Click Rift Trap: equipped to Skill 2, the HUD follows.
   let n=node(t,'rift-trap');await page.mouse.click(n.screen.x,n.screen.y);await settle(page,2500);
   t=await tree(page);r.equipTrap={slots:await slots(page),hud:await hudNames(page),hint:t.hint};
   assert.deepEqual(r.equipTrap.slots,['rift-bolt','rift-trap','cleave'],'Rift Trap equipped to Skill 2');assert.equal(r.equipTrap.hud[1],'Rift Trap');
   r.shots.push(await shot(page,'desktop-equip-rift-trap'));
   // Key 3 retargets the open tree to slot 3 (Astral Cleave) without casting; the wheel reaches the end of the tree.
   await page.keyboard.press('3');await settle(page,2500);
   t=await tree(page);checkOpen(t,'astral-cleave',2,'key 3');await noCast(page,'key 3');
   await page.mouse.move(t.view.x+t.view.width/2,t.view.y+t.view.height/2);
   for(let k=0;k<8;k++){await page.mouse.wheel(0,240);await page.waitForTimeout(120);}
   await settle(page,2000);t=await tree(page);r.wheel={scroll:t.scroll,maxScroll:t.maxScroll};
   assert(node(t,'ascendant-star').inView,'wheel reaches Ascendant Star');
   assert(await closeClear(page,t),'desktop: X is not covered');
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
