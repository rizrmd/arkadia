import {chromium} from 'playwright';import {spawn} from 'node:child_process';import {readFileSync,readdirSync} from 'node:fs';
// Print (one per line) the dist/ files the Stronghold actually loads, so a release stages those and not the
// 370 MB of documentation renders in public/. Serves dist/ with the built server/bin/arkadia, opens the game in
// co-op and offline, walks the hero out through the gate, and records every same-origin file fetched.
const server=spawn('server/bin/arkadia',[],{env:{...process.env,PORT:'8793',SITE_DIR:'dist'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
// Single-process Chromium survives only one context, so each visit gets its own browser.
const launch=()=>chromium.launch({
 headless:true,
 env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
 args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
const files=new Set(['index.html']);let browser=null;
try{
 for(const path of ['/?time=0.5','/?offline=1&time=0.9']){
  await browser?.close();browser=await launch();
  const page=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  page.on('response',r=>{const u=new URL(r.url());if(u.host==='127.0.0.1:8793'&&r.status()===200&&!u.pathname.startsWith('/api/')&&u.pathname!=='/ws')files.add(u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1)));});
  await page.goto('http://127.0.0.1:8793'+path);
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:180000});
  await page.keyboard.down('KeyS');await page.waitForTimeout(6000);await page.keyboard.up('KeyS');await page.waitForTimeout(1500);
  await page.context().close();
 }
 // The FX Lab (/fx-lab, src/fx/lab.ts) is a page of the same build with its own chunks.
 await browser?.close();browser=await launch();
 const lab=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
 lab.on('response',r=>{const u=new URL(r.url());if(u.host==='127.0.0.1:8793'&&r.status()===200&&!u.pathname.startsWith('/api/')&&u.pathname!=='/fx-lab')files.add(decodeURIComponent(u.pathname.slice(1)));});
 await lab.goto('http://127.0.0.1:8793/fx-lab');
 await lab.waitForFunction(()=>document.body.dataset.fxLab==='ready',null,{timeout:180000});
}finally{await browser?.close();server.kill();}
// Every pickable hero's atlas and portrait (src/stronghold/heroes.ts).
const {characters}=JSON.parse(readFileSync('dist/assets/characters/manifest.json','utf8'));
for(const m of Object.values(characters))for(const f of [m.image,m.portrait])if(f)files.add('assets/characters/'+f);
// All @1x/@2x/@3x HUD frames from public/typography/v2/hud/manifest.json and MSDF fonts.
const hudManifest=JSON.parse(readFileSync('dist/typography/v2/hud/manifest.json','utf8'));
files.add('typography/v2/hud/manifest.json');
for(const name of Object.keys(hudManifest.frames)){
 for(const s of [1,2,3])files.add(`typography/v2/hud/@${s}x/${name}.png`);
}
for(const f of [
 'typography/v2/fonts/cinzel-semibold.fnt','typography/v2/fonts/cinzel-semibold.png','typography/v2/fonts/Cinzel-OFL.txt',
 'typography/v2/fonts/garamond-medium.fnt','typography/v2/fonts/garamond-medium.png','typography/v2/fonts/EBGaramond-OFL.txt',
 'typography/v2/hero/logo@1x.png','typography/v2/hero/logo@2x.png','typography/v2/hero/logo@3x.png',
 'typography/v2/loading/bg-desktop.webp','typography/v2/loading/bg-mobile.webp','typography/v2/loading/vignette.png',
 'typography/v2/loading/logo@1x.png','typography/v2/loading/logo@2x.png','typography/v2/loading/logo@3x.png',
 'typography/v2/loading/divider@1x.png','typography/v2/loading/divider@2x.png','typography/v2/loading/divider@3x.png',
 'typography/v2/loading/bar-track@1x.png','typography/v2/loading/bar-track@2x.png','typography/v2/loading/bar-track@3x.png',
 'typography/v2/loading/bar-fill@1x.png','typography/v2/loading/bar-fill@2x.png','typography/v2/loading/bar-fill@3x.png',
 'typography/v2/loading/bar-crest@1x.png','typography/v2/loading/bar-crest@2x.png','typography/v2/loading/bar-crest@3x.png',
 'modular-stronghold/v2/full-gateway-v7-open.webp','modular-stronghold/v2/full-gateway-v7-sheet.webp',
])files.add(f);
// Choose Your Hero (src/stronghold/choose-hero.ts): every @1x/@2x/@3x UI texture, art and labels from its manifest, and the
// NixieFX bundle its highlights play from, since the screen loads frames only when it opens at a given scale.
const chooseHero=JSON.parse(readFileSync('dist/assets/choose-hero/manifest.json','utf8'));
for(const f of ['manifest.json','labels.en.json',...Object.values(chooseHero.art).map(a=>a.file),...Object.keys(chooseHero.frames).flatMap(n=>[1,2,3].map(s=>`@${s}x/${n}.png`))])files.add('assets/choose-hero/'+f);
files.add('vfx/skills.bin');for(const f of readdirSync('dist/vfx/textures'))files.add('vfx/textures/'+f);
if(files.size<20)throw Error('Only '+files.size+' files loaded');
console.log([...files].sort().join('\n'));
