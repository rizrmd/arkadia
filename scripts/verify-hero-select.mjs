import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';import dns from 'node:dns/promises';
// Hero selection (src/stronghold/hero-picker.ts). A new tab opens on the picker over the loaded world; picking swaps
// the hero in place; a reload keeps the pick without asking; the hero's name in the health panel reopens the picker;
// each picked hero walks and swings with its own six unmirrored views; in a co-op room every tab draws each ally as
// the hero they picked and follows a later switch. Automated browsers skip the picker unless ?pick=1.
//   npm run build && node scripts/verify-hero-select.mjs        (starts server/ on dist/)
//   DEMO_URL=https://host node scripts/verify-hero-select.mjs   (a deployed host)
const out='docs/hero-select';await fs.mkdir(out,{recursive:true});
const base=process.env.DEMO_URL?.replace(/\/$/,'');let server=null;
if(!base){
 execFileSync(process.env.GO||'go',['build','-o','bin/arkadia','./cmd/arkadia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
 server=spawn('server/bin/arkadia',[],{env:{...process.env,PORT:'8794',SITE_DIR:'dist'},stdio:['ignore','pipe','inherit']});
 await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
}
const url=base||'http://127.0.0.1:8794',suffix=base?'-live':'';
const rules=base?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${(await dns.lookup(new URL(base).hostname)).address}`]:[];
const launch=()=>chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process',...rules]});
const shot=async(page,name)=>{const file=`${out}/${name}${suffix}.webp`;await fs.writeFile(file,await sharp(await page.screenshot()).webp({quality:82}).toBuffer());return file;};
const ready=page=>page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&!document.querySelector('#loading-screen'),null,{timeout:180000});
const heroIs=(page,id,sel='#world-hero')=>page.waitForFunction(([s,h])=>document.querySelector(s)?.dataset.hero===h,[sel,id],{timeout:20000});
const clip=(page,sel='#world-hero')=>page.evaluate(s=>document.querySelector(s)?.dataset.clip,sel);
const hold=async(page,key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
const errors=[],results={url},browsers=[];
const open=async(path,context)=>{const b=await launch();browsers.push(b);const p=await (await b.newContext(context)).newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(url+path);await ready(p);return p;};
try{
 // 1. A new tab on a phone: the picker, then Ember Warden.
 const phone=await open('/?pick=1&offline=1&time=0.5',{viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 await phone.waitForSelector('#hero-picker:not([hidden])');
 results.picker={first:await phone.getAttribute('#hero-picker','data-first'),cards:await phone.$$eval('.picker-hero',b=>b.map(x=>x.querySelector('.picker-name').textContent)),
  focused:await phone.evaluate(()=>document.activeElement?.dataset.hero),closeShown:await phone.isVisible('.picker-close'),
  portraits:await phone.$$eval('.picker-hero img',i=>i.map(x=>x.complete&&x.naturalHeight>0)),
  frames:await phone.evaluate(async()=>{const u=['/ui/hero-card-frame.webp','/ui/hero-card-frame-active.webp'];for(const s of u){const i=new Image();i.src=s;await i.decode();}return [...document.querySelectorAll('.picker-hero')].map(b=>getComputedStyle(b,'::before').borderImageSource);})};
 assert.deepEqual(results.picker.cards,['Rift Runner','Ember Warden']);assert.equal(results.picker.first,'true');assert.equal(results.picker.closeShown,false);
 assert.equal(results.picker.focused,'rift-runner','the default hero is focused');assert.ok(results.picker.portraits.every(Boolean),'portraits load');
 assert.match(results.picker.frames[0],/hero-card-frame-active\.webp/);assert.match(results.picker.frames[1],/hero-card-frame\.webp/);
 const fits=await phone.evaluate(()=>{const r=document.querySelector('.picker-card').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;});assert.ok(fits,'the picker fits a 390 px phone');
 results.shots=[await shot(phone,'1-picker-phone')];
 await phone.tap('.picker-hero[data-hero=ember-warden]');await phone.waitForSelector('#hero-picker',{state:'hidden'});
 await heroIs(phone,'ember-warden');results.emberHud=await phone.textContent('#hero-hud .hud-hero');assert.equal(results.emberHud,'Ember Warden');
 results.shots.push(await shot(phone,'2-ember-phone'));
 // 2. A reload in the same tab keeps the pick and does not ask again; ?hero=reset clears the pick and position and reopens the picker.
 await phone.reload();await ready(phone);await heroIs(phone,'ember-warden');await phone.waitForTimeout(800);
 results.reloadAsks=await phone.isVisible('#hero-picker');assert.equal(results.reloadAsks,false);
 await phone.evaluate(()=>localStorage.setItem('arkadia.stronghold.hero',JSON.stringify({x:640,y:450})));
 await phone.goto(url+'/?hero=reset&offline=1&time=0.5');await ready(phone);
 await phone.waitForSelector('#hero-picker:not([hidden])');
 results.shots.push(await shot(phone,'7-reset-picker'));
 results.reset=await phone.evaluate(()=>({
  first:document.querySelector('#hero-picker')?.getAttribute('data-first'),
  focused:document.activeElement?.dataset.hero,
  hero:document.querySelector('#world-hero')?.dataset.hero,
  x:+document.querySelector('#world-hero')?.dataset.x,
  y:+document.querySelector('#world-hero')?.dataset.y,
  savedHero:localStorage.getItem('arkadia.hero'),
  pickedSession:sessionStorage.getItem('arkadia.hero.picked'),
  savedPos:localStorage.getItem('arkadia.stronghold.hero'),
  urlHero:new URL(location.href).searchParams.get('hero')
 }));
 assert.deepEqual(results.reset,{first:'true',focused:'rift-runner',hero:'rift-runner',x:590,y:420,savedHero:null,pickedSession:null,savedPos:null,urlHero:null});
 await phone.tap('.picker-hero[data-hero=rift-runner]');await phone.waitForSelector('#hero-picker',{state:'hidden'});
 await phone.reload();await ready(phone);await heroIs(phone,'rift-runner');await phone.waitForTimeout(400);
 assert.equal(await phone.isVisible('#hero-picker'),false,'reload after ?hero=reset pick does not reset again');
 // 3. Desktop: Ember Warden walks with its own views (no mirroring) and swings at a revenant.
 const desk=await open('/?pick=1&offline=1&time=0.45',{viewport:{width:1440,height:900}});
 await desk.waitForSelector('#hero-picker:not([hidden])');await desk.keyboard.press('ArrowRight');
 assert.equal(await desk.evaluate(()=>document.activeElement?.dataset.hero),'ember-warden','arrow keys move between cards');
 await desk.keyboard.press('Enter');await heroIs(desk,'ember-warden');
 const views={};
 for(const [keys,view] of [[['KeyD'],'SE'],[['KeyA'],'SW'],[['KeyW','KeyD'],'NE'],[['KeyW','KeyA'],'NW'],[['KeyS'],'S'],[['KeyW'],'N']]){
  for(const k of keys)await desk.keyboard.down(k);await desk.waitForTimeout(450);views[view]=await clip(desk);for(const k of keys)await desk.keyboard.up(k);await desk.waitForTimeout(150);
 }
 results.walkViews=views;
 // D walks right and down a tile edge, W+D up and right: diagonals; S and W alone are straight down and up.
 for(const [view,c] of Object.entries(views))assert.equal(c,'move-'+view,`walking ${view}`);
 const fight=await desk.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;for(const [u,v] of [[17.2,16.2],[13,23],[16.5,17.5]])if(c.teleport(u,v)){for(const [du,dv] of [[.7,0],[0,.7],[-.7,0],[0,-.7]])if(c.summon(u+du,v+dv)>=0)return {u,v};}return null;});
 assert.ok(fight,'a spot in the wilds with a revenant beside the hero');
 await desk.waitForFunction(()=>/^attack-/.test(document.querySelector('#world-hero').dataset.clip),null,{timeout:8000});results.attackClip=await clip(desk);
 results.shots.push(await shot(desk,'3-ember-attack-desktop'));
 // 4. The hero's name reopens the picker; Rift Runner replaces the Ember Warden where it stands.
 await desk.waitForTimeout(1200);const before=await desk.evaluate(()=>({x:+document.querySelector('#world-hero').dataset.x,y:+document.querySelector('#world-hero').dataset.y}));
 await desk.click('#hero-hud .hud-hero');await desk.waitForSelector('#hero-picker:not([hidden])');await desk.waitForTimeout(350);
 results.reopen={first:await desk.getAttribute('#hero-picker','data-first'),closeShown:await desk.isVisible('.picker-close'),focused:await desk.evaluate(()=>document.activeElement?.dataset.hero)};
 assert.equal(results.reopen.closeShown,true);assert.equal(results.reopen.focused,'ember-warden');
 results.shots.push(await shot(desk,'4-picker-desktop'));
 await desk.click('.picker-hero[data-hero=rift-runner]');await heroIs(desk,'rift-runner');
 const after=await desk.evaluate(()=>({x:+document.querySelector('#world-hero').dataset.x,y:+document.querySelector('#world-hero').dataset.y}));
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<40,'the swap keeps the hero where it stands');
 await desk.waitForFunction(()=>/^(attack|idle|hit)-/.test(document.querySelector('#world-hero').dataset.clip),null,{timeout:8000});
 results.riftClip=await clip(desk);results.shots.push(await shot(desk,'5-rift-runner-desktop'));
 // Escape keeps the current hero.
 await desk.click('#hero-hud .hud-hero');await desk.keyboard.press('Escape');await desk.waitForSelector('#hero-picker',{state:'hidden'});assert.equal(await desk.evaluate(()=>document.querySelector('#world-hero').dataset.hero),'rift-runner');
 // 5. Co-op: A plays the Ember Warden, B joins with the Rift Runner; each draws the other's pick, and B's switch shows on A.
 const a=await open('/?hero=ember-warden&time=0.42',{viewport:{width:1280,height:800}});
 await a.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000});const room=await a.evaluate(()=>window.__COOP__.stats().room);results.room=room;
 const b=await open(`/?room=${room}&hero=rift-runner&time=0.42`,{viewport:{width:390,height:844}});
 await b.waitForSelector('#coop-panel:not([hidden])');await b.fill('#coop input[name=name]','Bima');await b.click('#coop .coop-primary');
 await b.waitForFunction(()=>window.__COOP__?.stats().status==='online',null,{timeout:30000});
 const ally='canvas[id^=world-ally-]';await a.waitForSelector(ally,{timeout:15000});await b.waitForSelector(ally,{timeout:15000});
 await heroIs(a,'rift-runner',ally);await heroIs(b,'ember-warden',ally);
 await hold(b,'KeyS',900);
 await a.click('#coop .coop-chip');results.roster=await a.$$eval('.coop-players li span',l=>l.map(x=>x.textContent));await a.click('#coop .coop-chip');
 assert.ok(results.roster.some(r=>/Bima\s*Rift Runner/.test(r))&&results.roster.some(r=>/Ember Warden/.test(r)),'the roster names each hero');
 results.shots.push(await shot(a,'6-coop-allies'));
 await b.click('#hero-hud .hud-hero');await b.click('.picker-hero[data-hero=ember-warden]');
 await heroIs(b,'ember-warden');await heroIs(a,'ember-warden',ally);results.coopSwitch='ally shown as Ember Warden after switching';
 results.errors=errors.filter(e=>!/favicon/.test(e));assert.deepEqual(results.errors,[]);
 results.pass=true;
}catch(e){results.pass=false;results.error=String(e?.stack||e);throw e;}
finally{
 await fs.writeFile(`${out}/results${suffix}.json`,JSON.stringify(results,null,1));
 for(const b of browsers)await b.close().catch(()=>{});server?.kill();
 console.log(JSON.stringify(results,null,1));
}
