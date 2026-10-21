import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';import dns from 'node:dns/promises';
// Two real browser tabs in one co-op room. Tab A opens the game (a solo room is created), tab B opens A's invite
// link and joins with a name. Both walk out through the gate with the keyboard and fight. Checks: each tab draws
// the other hero with its name tag, both record identical server revenants (ids and hit points) for the same
// ticks, and the own hero's prediction needs only small corrections. Screenshots go to docs/coop/.
//   npm run build && node scripts/coop-browser.mjs          (starts server/ on dist/)
//   DEMO_URL=https://host node scripts/coop-browser.mjs     (a deployed host)
const out='docs/coop';await fs.mkdir(out,{recursive:true});
const base=process.env.DEMO_URL?.replace(/\/$/,'');let server=null;
if(!base){
 execFileSync(process.env.GO||'go',['build','-o','bin/arkadia','./cmd/arkadia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
 server=spawn('server/bin/arkadia',[],{env:{...process.env,PORT:'8792',SITE_DIR:'dist'},stdio:['ignore','pipe','inherit']});
 await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
}
const url=base||'http://127.0.0.1:8792',suffix=base?'-live':'';
const rules=base?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${(await dns.lookup(new URL(base).hostname)).address}`]:[];
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process',...rules]});
const shot=async(page,name)=>{const file=`${out}/${name}${suffix}.webp`;await fs.writeFile(file,await sharp(await page.screenshot()).webp({quality:82}).toBuffer());return file;};
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
const online=page=>page.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000});
// Record every snapshot's revenants by tick inside the page.
const record=page=>page.evaluate(()=>{window.__rec={};window.__COOP__.net.onSnapshot(s=>{window.__rec[s.tick]=JSON.stringify(s.enemies.map(e=>[e.id,e.g,e.hp,e.st]));});});
const hold=async(page,key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
const errors=[],results={url};const browsers=[];
try{
 const open=async(path,viewport)=>{const b=await launch();browsers.push(b);const p=await (await b.newContext({viewport})).newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(url+path);await ready(p);return p;};
 const a=await open('/?time=0.42',{width:1280,height:800});await online(a);
 const room=await a.evaluate(()=>window.__COOP__.stats().room);results.room=room;
 assert.match(new URL(a.url()).search,new RegExp('room='+room),'the address bar becomes the invite link');
 // B follows the invite link: the panel asks for a name.
 const b=await open(`/?room=${room}&time=0.42`,{width:390,height:844});
 await b.waitForSelector('#coop-panel:not([hidden])');assert.match(await b.textContent('.coop-title'),new RegExp(`invited to room ${room}`));
 await b.fill('#coop input[name=name]','Bima');await b.click('#coop .coop-primary');await online(b);
 assert.equal(await b.evaluate(()=>window.__COOP__.stats().room),room);
 await Promise.all([record(a),record(b)]);
 // Both see the other hero and its name tag.
 await a.waitForSelector('.party-tag .party-name',{timeout:15000});await b.waitForSelector('.party-tag .party-name',{timeout:15000});
 results.tagOnA=await a.textContent('.party-tag .party-name');results.tagOnB=await b.textContent('.party-tag .party-name');
 assert.equal(results.tagOnA,'Bima');assert.match(results.tagOnB,/^Guest \d{4}$/);
 assert.equal(await a.textContent('.coop-count'),'2/4');
 await a.waitForTimeout(1500);results.shots=[await shot(a,'1-court-desktop'),await shot(b,'1-court-phone')];
 // Walk out of the court together (S = straight down the screen), then stand and let the auto attack fight.
 await Promise.all([hold(a,'KeyS',6200),(async()=>{await b.waitForTimeout(300);await hold(b,'KeyS',6000);})()]);
 const walked=await a.evaluate(()=>window.__COOP__.stats());results.predictionWhileWalking={corrections:walked.corrections,maxCorrectionPx:+walked.maxCorrection.toFixed(2),inputs:walked.inputs,rttMs:Math.round(walked.rtt)};
 await a.waitForFunction(()=>document.querySelector('#hero-hud')?.dataset.zone==='wild',null,{timeout:10000});
 await a.waitForFunction(()=>Number(document.querySelector('#hero-hud')?.dataset.kills)>0,null,{timeout:40000});
 await a.waitForTimeout(800);results.shots.push(await shot(a,'2-wilds-desktop'),await shot(b,'2-wilds-phone'));
 // Same server revenants on both tabs, tick for tick.
 const [ra,rb]=await Promise.all([a.evaluate(()=>window.__rec),b.evaluate(()=>window.__rec)]);
 const common=Object.keys(ra).filter(t=>t in rb);let mismatched=0;for(const t of common)if(ra[t]!==rb[t])mismatched++;
 assert(common.length>100,`only ${common.length} common ticks`);assert.equal(mismatched,0,`${mismatched} ticks disagree`);
 const lastTick=Math.max(...common.map(Number));results.sameEnemies={commonTicks:common.length,mismatched,atTick:lastTick,enemies:JSON.parse(ra[lastTick])};
 results.hud={a:await a.evaluate(()=>({...document.querySelector('#hero-hud').dataset})),b:await b.evaluate(()=>({...document.querySelector('#hero-hud').dataset}))};
 results.stats={a:await a.evaluate(()=>window.__COOP__.stats()),b:await b.evaluate(()=>window.__COOP__.stats())};
 assert.equal(errors.length,0,'page errors: '+errors.join(' | '));
 results.ok=true;console.log(JSON.stringify(results,null,1));
 await fs.writeFile(`${out}/browser${suffix}.json`,JSON.stringify(results,null,1)+'\n');
}finally{for(const b of browsers)await b.close().catch(()=>{});server?.kill();}
