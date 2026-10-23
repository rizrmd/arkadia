import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launchOptions} from '../typography/browser.mjs';

const OUT='docs/nixie-fx';
await fs.mkdir(OUT,{recursive:true});

execFileSync(process.env.GO||'go',['build','-o','bin/arkadia','./cmd/arkadia'],{
 cwd:'server',
 stdio:'inherit',
 env:{...process.env,CGO_ENABLED:'0'},
});

const port=String(8910+Math.floor(Math.random()*80));
const base=process.env.DEMO_URL||`http://127.0.0.1:${port}`;
const server=process.env.DEMO_URL?null:spawn('server/bin/arkadia',[],{
 env:{...process.env,PORT:port,SITE_DIR:'dist'},
 stdio:['ignore','pipe','inherit'],
});

let browser;
try{
 if(server){
  await new Promise((ok,no)=>{
   server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});
   server.on('exit',c=>no(Error('server '+c)));
  });
 }
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));

 await page.goto(base+'/?offline=1&hero=ember-warden&time=0.5');
 await page.waitForFunction(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  return c&&c.fxStage&&c.fxStage.ready()&&document.querySelector('#world-canvas')?.dataset.ready==='true';
 },null,{timeout:120000});
 await page.waitForTimeout(500);

 // 1. Scenario A: Particle FX behind the Stronghold Gateway (archway threshold)
 const gateCheck=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const heroEl=window.__WORLD_HERO__;
  let best=null;
  // Find a walkable tile right behind the gateway arch (px ~ 577, py ~ 720..765) where hero is occluded by gate
  for(let u=13.4;u<=14.8;u+=0.1){
   for(let v=13.4;v<=14.8;v+=0.1){
    if(c.teleport(u,v)){
     const behind=Number(heroEl.dataset.behind||0);
     const hx=Number(heroEl.dataset.x||0),hy=Number(heroEl.dataset.y||0);
     if(behind>=1&&Math.abs(hx-577)<28&&hy>=715&&hy<=768){
      best={u,v,hx,hy,behind};
      break;
     }
    }
   }
   if(best)break;
  }
  if(!best)throw new Error('Could not locate walkable tile behind gateway arch');
  // Sample occlusion inside the gateway arch/tower above the hero
  let minSampleOcc=1;
  for(let dy=-60;dy<=0;dy+=6){
   for(let dx=-45;dx<=45;dx+=9){
    const occ=c.occlusionAt(best.hx,best.hy,best.hx+dx,best.hy+dy,10,false,false);
    if(occ<minSampleOcc)minSampleOcc=occ;
   }
  }
  // Spawn ground decal + volumetric world particle FX at the gateway and just behind the gateway arch in the courtyard
  c.fxStage.play('ember-warden/ember-snare.telegraph.ground',{u:best.u-1.1,v:best.v-1.1,scale:1.2});
  c.fxStage.play('ember-warden/ember-snare.detonate',{u:best.u-1.1,v:best.v-1.1,scale:1.2});
  c.fxStage.play('ember-warden/flame-fan.cast',{u:best.u-0.8,v:best.v-0.8,yaw:Math.PI*0.25,scale:1.15});
  c.fxStage.play('ember-warden/shockwave.detonate',{u:best.u,v:best.v,scale:1.1});
  for(let i=0;i<2;i++)c.fxStage.frame(0.03,false);
  return {best,minSampleOcc,stats:c.fxStage.stats()};
 });

 assert.ok(gateCheck.best.behind>=1,'hero behind gateway arch must register gateway occluder');
 assert.ok(gateCheck.minSampleOcc<=0.35,`gateway occlusion sample expected <= 0.35, got ${gateCheck.minSampleOcc}`);
 assert.ok(gateCheck.stats.occludedParticles>0,`expected occluded particles behind gateway, got ${gateCheck.stats.occludedParticles}`);
 assert.ok(gateCheck.stats.minOcclusion<=0.35,`expected minOcclusion <= 0.35 behind gateway, got ${gateCheck.stats.minOcclusion}`);

 await page.waitForTimeout(36);
 const gatePng=await page.screenshot({type:'png'});
 await sharp(gatePng).webp({quality:90}).toFile(`${OUT}/occlusion-behind-gateway.webp`);

 // 2. Scenario B: Particle FX behind a Stronghold Building / Wall inside the courtyard
 const buildingCheck=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const heroEl=window.__WORLD_HERO__;
  let spot=null;
  for(let u=3.0;u<=13.0;u+=0.25){
   for(let v=3.0;v<=13.0;v+=0.25){
    if(c.teleport(u,v)){
     const behind=Number(heroEl.dataset.behind||0);
     const hx=Number(heroEl.dataset.x||0),hy=Number(heroEl.dataset.y||0);
     if(behind>=1&&hy<680){
      let minOcc=1;
      for(let dy=-48;dy<=4;dy+=8){
       for(let dx=-24;dx<=24;dx+=8){
        const o=c.occlusionAt(hx,hy,hx+dx,hy+dy,10,false,false);
        if(o<minOcc)minOcc=o;
       }
      }
      if(minOcc<=0.35){
       spot={u,v,hx,hy,behind,minOcc};
       break;
      }
     }
    }
   }
   if(spot)break;
  }
  if(!spot)throw new Error('Could not locate walkable tile occluded by courtyard building');
  c.fxStage.play('rift-runner/rift-trap.telegraph.ground',{u:spot.u,v:spot.v,scale:1.2});
  c.fxStage.play('rift-runner/rift-trap.detonate',{u:spot.u,v:spot.v,scale:1.2});
  c.fxStage.play('ember-warden/flame-fan.cast',{u:spot.u,v:spot.v,yaw:-Math.PI*0.25,scale:1.15});
  for(let i=0;i<2;i++)c.fxStage.frame(0.03,false);
  return {spot,stats:c.fxStage.stats()};
 });

 assert.ok(buildingCheck.spot.behind>=1,'hero behind building must register building occluder');
 assert.ok(buildingCheck.spot.minOcc<=0.35,'building silhouette must attenuate particles to <= 0.35');
 assert.ok(buildingCheck.stats.occludedParticles>0,'building occluder must attenuate active NixieFX particles');

 await page.waitForTimeout(36);
 const buildingPng=await page.screenshot({type:'png'});
 await sharp(buildingPng).webp({quality:90}).toFile(`${OUT}/occlusion-behind-building.webp`);

 // 3. Scenario C: Particle FX Y-depth sorting (backLayer vs frontLayer) and Hero silhouette occlusion
 const heroDepthCheck=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const heroEl=window.__WORLD_HERO__;
  // Advance existing effects so stage is clean
  for(let i=0;i<60;i++)c.fxStage.frame(0.1,false);
  let open=null;
  for(let u=6.5;u<=11.5;u+=0.25){
   for(let v=6.5;v<=11.5;v+=0.25){
    if(c.teleport(u,v)){
     const behind=Number(heroEl.dataset.behind||0);
     if(behind===0){
      open={u,v,hx:Number(heroEl.dataset.x||0),hy:Number(heroEl.dataset.y||0)};
      break;
     }
    }
   }
   if(open)break;
  }
  if(!open)throw new Error('Could not locate unoccluded courtyard tile');
  // Sample hero silhouette occlusion directly behind vs in front of the hero
  let behindHeroMinOcc=1,frontOfHeroMinOcc=1;
  for(let dy=-38;dy<=-6;dy+=4){
   for(let dx=-12;dx<=12;dx+=4){
    const occBehind=c.occlusionAt(open.hx,open.hy-8,open.hx+dx,open.hy+dy,8,false,true);
    if(occBehind<behindHeroMinOcc)behindHeroMinOcc=occBehind;
    const occFront=c.occlusionAt(open.hx,open.hy+8,open.hx+dx,open.hy+dy,8,false,true);
    if(occFront<frontOfHeroMinOcc)frontOfHeroMinOcc=occFront;
   }
  }
  // Play one world effect strictly behind the hero (north: u-0.55, v-0.55),
  // one world effect strictly in front of the hero (south: u+0.55, v+0.55),
  // and one radial burst centered on the hero
  c.fxStage.play('rift-runner/rift-dash.detonate',{u:open.u-0.55,v:open.v-0.55,yaw:-Math.PI*0.75,scale:1.0});
  c.fxStage.play('ember-warden/cinder-step.detonate',{u:open.u+0.55,v:open.v+0.55,scale:1.0});
  c.fxStage.play('ember-warden/shockwave.detonate',{u:open.u,v:open.v,scale:1.1});
  c.fxStage.play('ember-warden/shockwave.detonate.ground',{u:open.u,v:open.v,scale:1.1});
  for(let i=0;i<2;i++)c.fxStage.frame(0.03,false);
  return {open,behindHeroMinOcc,frontOfHeroMinOcc,stats:c.fxStage.stats()};
 });

 assert.ok(heroDepthCheck.behindHeroMinOcc<=0.35,`particle behind hero torso must be occluded (<= 0.35), got ${heroDepthCheck.behindHeroMinOcc}`);
 assert.equal(heroDepthCheck.frontOfHeroMinOcc,1,'particle in front of hero baseline must not be occluded by hero');
 assert.ok(heroDepthCheck.stats.backEffects>=1,`expected >= 1 backLayer effect behind hero, got ${heroDepthCheck.stats.backEffects}`);
 assert.ok(heroDepthCheck.stats.frontEffects>=1,`expected >= 1 frontLayer effect in front of hero, got ${heroDepthCheck.stats.frontEffects}`);
 assert.ok(heroDepthCheck.stats.occludedParticles>0,'expected hero silhouette to occlude back-half particles');

 await page.waitForTimeout(36);
 const heroDepthPng=await page.screenshot({type:'png'});
 await sharp(heroDepthPng).webp({quality:90}).toFile(`${OUT}/occlusion-hero-depth.webp`);

 // 4. Scenario D: Wall collision & zero wall bleed-through (projectiles, AoE telegraphs, and ground particles stopped by rampart walls)
 const wallCollisionCheck=await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;
  const heroEl=window.__WORLD_HERO__;
  for(let i=0;i<60;i++)c.fxStage.frame(0.1,false);
  // Place hero inside the SW courtyard near the SW rampart wall (u=7.5, v=13.6)
  let wallSpot=null;
  for(let v=13.6;v>=12.8;v-=0.1){
   if(c.teleport(7.5,v)){
    wallSpot={u:7.5,v:+v.toFixed(2),hx:Number(heroEl.dataset.x||0),hy:Number(heroEl.dataset.y||0)};
    break;
   }
  }
  if(!wallSpot)throw new Error('Could not locate walkable tile near SW rampart wall');
  const beforeSnap=c.snapshot();
  const prevWallHits=beforeSnap.vfx.totals.wallHits||0;
  // Fire Flame Fan bolts and cast Ember Snare directly toward an outside tile beyond the solid SW rampart wall (u=7.5, v=17.2)
  c.resetCooldowns();
  c.castSkill('flame-fan',{targetU:7.5,targetV:17.2});
  const snare=c.spawnAoE({kind:'ember-snare',skill:'ember-snare',shape:'circle',u:7.5,v:17.2,radius:1.5,duration:640});
  c.fxStage.play('ember-warden/ember-snare.detonate',{u:snare.u,v:snare.v,scale:1.15});
  c.fxStage.play('ember-warden/ember-snare.detonate.ground',{u:snare.u,v:snare.v,scale:1.15});
  // Step simulation to peak eruption where outer rim particles hit the wall boundary and are occluded to 0
  for(let i=0;i<2;i++)c.fxStage.frame(0.03,false);
  // Check ground occlusion inside the non-walkable wall footprint
  const wallFootOcc=c.occlusionAt(wallSpot.hx-64,wallSpot.hy+32,wallSpot.hx-64,wallSpot.hy+32,12,true,false);
  const afterSnap=c.snapshot();
  return {
   wallSpot,
   snareClamped:{u:+snare.u.toFixed(2),v:+snare.v.toFixed(2)},
   wallFootOcc,
   wallHitsDelta:(afterSnap.vfx.totals.wallHits||0)-prevWallHits,
   stats:c.fxStage.stats(),
  };
 });

 assert.equal(wallCollisionCheck.wallFootOcc,0,'ground particles on non-walkable wall footprint must have 0 occlusion visibility (no wall bleed-through)');
 assert.ok(wallCollisionCheck.snareClamped.v<=14.6,`AoE target across wall must be clamped before wall, got v=${wallCollisionCheck.snareClamped.v}`);
 assert.ok(wallCollisionCheck.wallHitsDelta>=1,`expected skill cast against wall to register wallHits, got ${wallCollisionCheck.wallHitsDelta}`);

 await page.waitForTimeout(36);
 const wallPng=await page.screenshot({type:'png'});
 await sharp(wallPng).webp({quality:90}).toFile(`${OUT}/occlusion-wall-collision.webp`);

 assert.deepEqual(errors,[],'no page errors during occlusion depth verification');

 const report={
  checkedAt:new Date().toISOString(),
  passed:true,
  gatewayOcclusion:gateCheck,
  buildingOcclusion:buildingCheck,
  heroDepthAndSilhouette:heroDepthCheck,
  wallCollisionAndOcclusion:wallCollisionCheck,
  screenshots:[
   `${OUT}/occlusion-behind-gateway.webp`,
   `${OUT}/occlusion-behind-building.webp`,
   `${OUT}/occlusion-hero-depth.webp`,
   `${OUT}/occlusion-wall-collision.webp`,
  ],
 };
 await fs.writeFile(`${OUT}/occlusion-depth.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();
 server?.kill();
}
