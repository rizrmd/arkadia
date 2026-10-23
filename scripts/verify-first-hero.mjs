// First visit asks for a hero once, before gameplay (src/stronghold/hero-picker.ts). Builds the game into a private
// folder, serves it with vite preview (offline), and drives Chromium as a real visitor (navigator.webdriver masked so
// the automation skip does not apply):
//  1. a fresh device: the loading screen lifts onto Choose Your Hero; the hero and the revenants stay still while it is
//     open, even with movement keys held; there is no Back, Escape and HUD clicks do not close it;
//  2. Begin Journey with Ember Warden starts gameplay with that hero and saves the pick;
//  3. a reload and a new tab on the same device go straight to the game; the HUD does not reopen the screen;
//  4. ?hero=reset asks again.
// Usage: node scripts/verify-first-hero.mjs [BASE_URL]  (with a URL, tests that site instead of a local build)
import fs from 'node:fs';import os from 'node:os';
import sharp from 'sharp';import {build,preview} from 'vite';import {chromium} from 'playwright';
import {launchOptions} from './typography/browser.mjs';
// FIRST_HERO_ONLINE=1 joins the co-op server instead of ?offline=1 (needs a site with the Go server).
const Q=process.env.FIRST_HERO_ONLINE?'':'offline=1&';
const PORT=3063,OUT=process.argv[2]?`docs/first-hero/live${Q?'':'-online'}`:'docs/first-hero';
fs.mkdirSync(OUT,{recursive:true});
let server,BASE=process.argv[2];
if(!BASE){
 const DIST=`${os.homedir()}/.cache/first-hero-dist`;
 await build({configFile:'vite.config.ts',logLevel:'warn',build:{outDir:DIST,emptyOutDir:true}});
 server=await preview({configFile:'vite.config.ts',logLevel:'error',build:{outDir:DIST},preview:{port:PORT,strictPort:true}});
 BASE=`http://127.0.0.1:${PORT}`;
}
BASE=BASE.replace(/\/$/,'');
const results=[],ok=(name,pass,detail='')=>{results.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail);};
const browser=await chromium.launch(launchOptions());
const ctx=await browser.newContext({viewport:{width:1280,height:720}});
await ctx.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false});});
await ctx.route('**/api/tracelogs',r=>r.fulfill({status:204,body:''}));
const errors=[];
const loaded=async p=>{
 await p.waitForFunction(()=>!document.querySelector('#loading-screen')&&window.__PIXI_UI__,null,{timeout:240000});
 return p.evaluate(()=>({open:window.__PIXI_UI__.picker.isOpen(),saved:localStorage.getItem('arkadia.hero')}));
};
const snap=p=>p.evaluate(()=>{const s=window.__STRONGHOLD_COMBAT__.snapshot();return {hero:[s.hero.u,s.hero.v,s.hero.state],foes:s.foes.map(f=>[f.u,f.v,f.state]).join('|'),spawns:s.spawns.length};});
const shot=async(p,name)=>sharp(await p.screenshot({timeout:180000})).webp({quality:88}).toFile(`${OUT}/${name}.webp`);
const hud=p=>p.evaluate(()=>window.__PIXI_UI__.hud.heroNameText?.text);
const hold=async(p,key,ms)=>{await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key);};
// Holds a key until the hero has moved (software-rendered Chromium can take seconds per few frames), up to ms.
const walks=async(p,key,ms=8000)=>{const at=(await snap(p)).hero;await p.keyboard.down(key);let moved=false;for(const end=Date.now()+ms;!moved&&Date.now()<end;){await p.waitForTimeout(250);moved=JSON.stringify((await snap(p)).hero.slice(0,2))!==JSON.stringify(at.slice(0,2));}await p.keyboard.up(key);return {from:at,to:(await snap(p)).hero,moved};};
try{
 // 1. Fresh device.
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(BASE+'/?'+Q);
 const first=await loaded(p);
 ok('first visit: loading screen lifts onto Choose Your Hero',first.open,`saved=${first.saved}`);
 await p.waitForTimeout(1500);
 await shot(p,'first-visit');
 const a=await snap(p);
 await hold(p,'d',1200);await hold(p,'ArrowUp',800);await p.waitForTimeout(800);
 const b=await snap(p);
 ok('gameplay held while choosing (hero and revenants still, keys ignored)',JSON.stringify(a)===JSON.stringify(b),JSON.stringify({before:a.hero,after:b.hero,foesSame:a.foes===b.foes}));
 const t=await p.evaluate(async()=>(await window.__PIXI_UI__.picker.view()).targets());
 ok('no Back control',t.back===null);
 await p.keyboard.press('Escape');await p.waitForTimeout(400);
 ok('Escape does not close the screen',await p.evaluate(()=>window.__PIXI_UI__.picker.isOpen()));
 await p.mouse.click(60,60);await p.waitForTimeout(400);
 ok('clicking where Back used to be does not close it',await p.evaluate(()=>window.__PIXI_UI__.picker.isOpen()));
 // 2. Pick Ember Warden and begin.
 await p.mouse.click(...t.cards['ember-warden']);await p.waitForTimeout(300);
 await p.mouse.click(...t.journey);
 await p.waitForFunction(()=>!window.__PIXI_UI__.picker.isOpen(),null,{timeout:10000});
 await p.waitForTimeout(1500);
 const w=await walks(p,'d');
 ok('Begin Journey starts gameplay (hero walks)',w.moved,JSON.stringify(w));
 const saved=await p.evaluate(()=>localStorage.getItem('arkadia.hero'));
 ok('pick saved on the device and shown in the HUD',saved==='ember-warden'&&/ember/i.test(await hud(p)),`saved=${saved} hud=${await hud(p)}`);
 await shot(p,'after-pick');
 // 3. The HUD hero panel and the Esc pill no longer reopen it; reload and new tab play on.
 await p.mouse.click(200,60);await p.keyboard.press('Escape');await p.waitForTimeout(600);
 ok('HUD hero panel and Escape do not reopen the screen',!(await p.evaluate(()=>window.__PIXI_UI__.picker.isOpen())));
 await p.reload();const r=await loaded(p);
 ok('reload goes straight to the game',!r.open&&/ember/i.test(await hud(p)),`hud=${await hud(p)}`);
 // Single-process Chromium handles one heavy page at a time: the first tab closes; the context (device) keeps storage.
 await p.close();
 const p2=await ctx.newPage();p2.on('pageerror',e=>errors.push(String(e)));
 await p2.goto(BASE+'/?'+Q);const n=await loaded(p2);
 const w2=await walks(p2,'d');
 ok('new tab on the same device goes straight to the game',!n.open&&/ember/i.test(await hud(p2))&&w2.moved,`hud=${await hud(p2)} ${JSON.stringify(w2)}`);
 // 4. ?hero=reset asks again.
 await p2.goto(BASE+'/?'+Q+'hero=reset');const z=await loaded(p2);
 ok('?hero=reset asks again',z.open&&z.saved===null);
 ok('no page errors',errors.length===0,errors.join(' | '));
}finally{
 await browser.close();await server?.close();
}
const failed=results.filter(r=>!r.pass);
fs.writeFileSync(`${OUT}/results.json`,JSON.stringify({base:server?'local build (vite preview)':BASE,date:new Date().toISOString(),results},null,1)+'\n');
console.log(failed.length?`${failed.length} FAILED`:'ALL PASS');
process.exit(failed.length?1:0);
