// Co-op is temporarily disabled: a default visit plays solo and offline. This checks that the game opens no
// WebSocket, creates no lobby and draws no co-op HUD (ledger entry, pill or ping), and that `?coop` still opts in.
//   SITE_DIR=dist node scripts/verify-solo-offline.mjs      (writes docs/solo-offline/)
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {launchOptions} from './typography/browser.mjs';

const OUT='docs/solo-offline';
await fs.mkdir(OUT,{recursive:true});
const bin=process.env.ARKODIA_BIN||'server/bin/arkodia';
if(!existsSync(bin))execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
const PORT=process.env.PORT||'8797';
const server=spawn(bin,[],{env:{...process.env,PORT,SITE_DIR:process.env.SITE_DIR||'dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});

const base=`http://127.0.0.1:${PORT}`;
const results={checkedAt:new Date().toISOString(),runs:{}};
const errors=[];

async function visit(tag,query,vp){
 const browser=await chromium.launch(launchOptions());
 try{
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:vp.dpr,isMobile:vp.mobile,hasTouch:vp.mobile});
  // Count every WebSocket the page opens, before any game code runs.
  await ctx.addInitScript(()=>{
   const W=window.WebSocket;window.__WS_OPENED__=[];
   window.WebSocket=class extends W{constructor(u,p){super(u,p);window.__WS_OPENED__.push(String(u));}};
  });
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(`${tag}: ${e.message}`));
  await page.goto(`${base}/${query}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__STRONGHOLD_COMBAT__&&window.__PIXI_UI__&&document.querySelector('#world-canvas')?.dataset.ready==='true'),null,{timeout:180000});
  if(query.includes('coop'))await page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:60000});
  await page.waitForTimeout(1500);
  const state=await page.evaluate(()=>{
   const hud=window.__STRONGHOLD_COMBAT__.hud,t=hud.getTopRightTelemetry();
   return {
    websockets:window.__WS_OPENED__,
    coopNet:Boolean(window.__COOP__),
    lobby:Boolean(window.__PIXI_UI__.lobby),
    coopLabel:t.coopLabel,pingLabel:t.pingLabel,fpsLabel:t.fpsLabel,zoneLabel:t.zoneLabel,
    ribbonCoopVisible:hud.trRibbonCoopHit?.visible??false,
    ribbonPingVisible:hud.trTelemetryPingText?.visible??false,
    legacyCoopPill:Boolean(hud.coopPill),
    variant:t.variant,
   };
  });
  const png=await page.screenshot({type:'png'});
  await sharp(png).webp({quality:90}).toFile(`${OUT}/${tag}.webp`);
  // Close-up of the top-right HUD, where the co-op entry and ping used to sit.
  const w=vp.width,left=Math.round(w*0.55),crop={left,top:0,width:w-left,height:Math.round(Math.min(vp.height,w)*0.22)};
  await sharp(png).extract({left:crop.left*vp.dpr,top:0,width:crop.width*vp.dpr,height:crop.height*vp.dpr}).webp({quality:92}).toFile(`${OUT}/${tag}-top-right.webp`);
  results.runs[tag]={url:`/${query}`,viewport:vp,...state};
  console.log(tag,JSON.stringify(state));
  return state;
 }finally{await browser.close();}
}

try{
 const desktop={width:1440,height:900,dpr:1,mobile:false},phone={width:390,height:844,dpr:2,mobile:true};
 for(const [tag,vp] of [['solo-desktop',desktop],['solo-mobile',phone]]){
  const s=await visit(tag,'?time=0.42',vp);
  assert.deepEqual(s.websockets,[],`${tag}: default play opens no WebSocket`);
  assert.equal(s.coopNet,false,`${tag}: no co-op client`);
  assert.equal(s.lobby,false,`${tag}: no co-op lobby`);
  assert.equal(s.coopLabel,null,`${tag}: no co-op label`);
  assert.equal(s.pingLabel,null,`${tag}: no ping readout`);
  assert.equal(s.ribbonCoopVisible,false,`${tag}: co-op ledger entry hidden`);
  assert.equal(s.ribbonPingVisible,false,`${tag}: ping hidden`);
  assert.equal(s.legacyCoopPill,false,`${tag}: no legacy co-op pill`);
 }
 // An old invite link (?room=) no longer joins anyone.
 const invite=await visit('solo-invite-link','?room=ABCD&time=0.42',desktop);
 assert.deepEqual(invite.websockets,[],'an invite link plays solo too');
 assert.equal(invite.lobby,false,'an invite link shows no lobby');
 // Developers can still opt in to test netcode.
 const coop=await visit('coop-opt-in-desktop','?coop&time=0.42',desktop);
 assert.equal(coop.websockets.length>0,true,'?coop connects');
 assert.equal(coop.lobby,true,'?coop creates the lobby');
 assert.equal(coop.ribbonCoopVisible,true,'?coop shows the co-op ledger entry');
 assert.deepEqual(errors,[],'no page errors');
 results.pass=true;
}catch(e){
 results.pass=false;results.error=e.message;results.pageErrors=errors;
 throw e;
}finally{
 await fs.writeFile(`${OUT}/results.json`,JSON.stringify(results,null,1)+'\n');
 server.kill();
}
console.log('PASS');
