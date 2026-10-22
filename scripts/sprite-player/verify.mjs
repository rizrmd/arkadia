// Chromium check of the sprite player, loaded the way Knowledge loads it: inside an iframe on another page.
//   node scripts/sprite-player/verify.mjs                       (serves public/ from disk under a stand-in public origin)
//   BASE=https://ark-whachat.fural.space node scripts/sprite-player/verify.mjs   (deployed player)
// Writes screenshots and docs/sprite-player/verification[-live].json.
import fs from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const live=!!process.env.BASE,OUT='docs/sprite-player',TYPES={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',webp:'image/webp',png:'image/png'};
fs.mkdirSync(OUT,{recursive:true});
// Chromium blocks a public page from framing 127.0.0.1 (Local Network Access), so local files are routed under a public-looking origin.
const base=process.env.BASE||'https://sprite-player.example';
const serveDisk=route=>{const p=decodeURIComponent(new URL(route.request().url()).pathname),f=path.join('public',p.endsWith('/')?p+'index.html':p);
 fs.existsSync(f)?route.fulfill({contentType:TYPES[path.extname(f).slice(1)]||'application/octet-stream',body:fs.readFileSync(f)}):route.fulfill({status:404,body:''});};
// The host page is served from a separate origin, as the Fural Knowledge page is.
const HOST='https://knowledge.example/host.html',host=(query,w,h)=>`<!doctype html><body style="margin:0;background:#fff"><iframe id="f" src="${base}/rift-runner/sprite-player/${query}" style="border:0;width:${w}px;height:${h}px;display:block" title="Sprite player"></iframe></body>`;
const checks=[],failures=[],test=(ok,name)=>(ok?checks:failures).push(name);
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
// One page for every scenario: closing a page takes down single-process Chromium.
const errors=[],page=await chromiumPage();
async function chromiumPage(){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});return p;}
if(!live)await page.route(base+'/**',serveDisk);
async function open(query,w,h){
 await page.setViewportSize({width:w+40,height:h+40});await page.unroute(HOST);await page.route(HOST,r=>r.fulfill({contentType:'text/html',body:host(query,w,h)}));await page.goto(HOST);const frame=await (await page.waitForSelector('#f')).contentFrame();
 await frame.waitForFunction(()=>window.spritePlayer?.state.ready||window.spritePlayer?.state.error,null,{timeout:60000});
 return {frame,state:()=>frame.evaluate(()=>JSON.parse(JSON.stringify(window.spritePlayer.state)))};
}
try{
 // Default sample, sized like the Knowledge design frame.
 let {frame,state}=await open('',560,620);let s=await state();
 test(s.ready&&!s.error,'sample sheet loads inside an iframe');test(s.row===4&&s.fps===5&&s.loop,'starts on heading S at 5 fps in Loop mode');
 const seen=new Set();for(let i=0;i<14;i++){seen.add((await state()).frame);await page.waitForTimeout(110);}
 test(seen.size>=6,`timed playback advances frames (saw ${seen.size} distinct)`);
 await frame.click('#play');s=await state();test(!s.playing,'pause button stops playback');const held=s.frame;await page.waitForTimeout(600);test((await state()).frame===held,'paused frame holds');
 await frame.click('#next');test((await state()).frame===(held+1)%8,'next frame');await frame.click('#prev');await frame.click('#prev');test((await state()).frame===(held+7)%8,'previous frame wraps');
 const labels=await frame.$$eval('#headings button',b=>b.map(x=>x.textContent));test(labels.join()==='N,NE,E,SE,S,SW,W,NW','eight heading buttons in sheet order');
 const visited=[];for(let r=0;r<8;r++){await frame.click(`#headings button:nth-child(${r+1})`);for(let f=0;f<8;f++){await frame.evaluate(f=>{const el=document.getElementById('frame');el.value=f;el.dispatchEvent(new Event('input'))},f);const d=(await state()).drawn;if(d.row===r&&d.frame===f)visited.push(r*8+f);}}
 test(visited.length===64,`all 64 heading/frame cells drawn (${visited.length})`);
 const pixels=await frame.evaluate(()=>{const c=document.getElementById('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>200)n++;return n/(d.length/4);});
 test(pixels>0.03&&pixels<0.6,`character pixels on canvas (${(pixels*100).toFixed(1)} %)`);
 await frame.click('#headings button:nth-child(5)');await frame.click('#play');await frame.focus('#canvas').catch(()=>{});
 await frame.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('ArrowDown');test((await state()).row===5,'arrow key changes heading');await page.keyboard.press('ArrowUp');
 await page.screenshot({path:`${OUT}/embed-560.png`});
 await frame.check('#guides');await frame.check('#all');await frame.selectOption('#bg','checker');await frame.evaluate(()=>window.spritePlayer.state.playing=false);
 s=await state();test(s.all&&s.guides&&s.bg==='checker','all-headings view, pivot guides and checker background');
 await page.screenshot({path:`${OUT}/all-headings.png`});
 // Query-parameter configuration and a full-size stage that needs the full-resolution sheet.
 ({frame,state}=await open('?row=E&fps=8&bg=snow&guides=1&controls=min',900,820));s=await state();
 await frame.waitForFunction(()=>window.spritePlayer.state.source==='full',null,{timeout:60000}).catch(()=>{});s=await state();
 test(s.row===2&&s.fps===8&&s.bg==='snow'&&s.guides,'row, fps, background and guides from the URL');test(s.source==='full','large stage switches to the full-resolution sheet');
 test(await frame.$eval('#headings',e=>getComputedStyle(e).display==='none'),'controls=min hides the option rows');await page.screenshot({path:`${OUT}/large-snow.png`});
 // Phone-width embed.
 ({frame,state}=await open('',340,520));s=await state();
 test(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at 340 px');
 await page.screenshot({path:`${OUT}/embed-340.png`});
 ({frame,state}=await open('?controls=none',170,200));await page.waitForTimeout(1500);s=await state();
 test(s.source==='half','thumbnail-size embed keeps the half-size sheet');await page.screenshot({path:`${OUT}/thumbnail.png`});
 // A sheet given directly by URL, without a manifest.
 ({frame,state}=await open('?sheet=sheets/rift-runner-idle@0.5x.webp&cell=192&cols=8&rows=8&labels=N,NE,E,SE,S,SW,W,NW&row=NW&fps=4',420,480));s=await state();
 test(s.ready&&s.row===7&&s.fps===4,'sheet parameters work without a manifest');
 // postMessage control from the host page.
 ({frame,state}=await open('',480,520));await page.evaluate(()=>{const w=document.getElementById('f').contentWindow;w.postMessage({type:'sprite-player',action:'pause'},'*');w.postMessage({type:'sprite-player',action:'row',value:'W'},'*');});
 await page.waitForTimeout(200);s=await state();test(!s.playing&&s.row===6,'host page controls the player with postMessage');
 // Knowledge design frame: Fural renders frame HTML as srcdoc in a sandbox without allow-same-origin, and the
 // nested player inherits that sandbox (opaque origin), exactly as in the "Idle — Sprite Player" design document.
 await page.setViewportSize({width:600,height:660}); await page.unroute(HOST);await page.route(HOST,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body style="margin:0"><iframe id="d" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" style="border:0;width:560px;height:620px" srcdoc="${`<!doctype html><style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe src='${base}/rift-runner/sprite-player/?row=S'></iframe>`.replace(/"/g,'&quot;')}"></iframe></body>`}));
 await page.goto(HOST);const outer=await (await page.waitForSelector('#d')).contentFrame(),inner=await (await outer.waitForSelector('iframe')).contentFrame();
 await inner.waitForFunction(()=>window.spritePlayer?.state.ready||window.spritePlayer?.state.error,null,{timeout:60000});s=await inner.evaluate(()=>({...window.spritePlayer.state,origin:self.origin}));
 test(s.ready&&!s.error&&s.origin==='null',`plays inside a Knowledge design frame sandbox (origin ${s.origin}${s.error?', '+s.error:''})`);await page.waitForTimeout(700);
 test((await inner.evaluate(()=>window.spritePlayer.state.frame))!==s.frame,'design-frame playback advances');await page.screenshot({path:`${OUT}/design-frame.png`});
 // Simple embed: 8-direction switcher (N, NE, E, SE, S, SW, W, NW), Play/Pause, Loop/Once and zoom.
 await page.setViewportSize({width:600,height:600});({frame,state}=await open('?row=S&controls=simple',560,560));
 const visible=await frame.$$eval('button,input,select,output',els=>els.filter(e=>e.offsetParent!==null&&getComputedStyle(e).visibility!=='hidden').map(e=>e.id));
 test(visible.join()==='dir-N,dir-NE,dir-E,dir-SE,dir-S,dir-SW,dir-W,dir-NW,play,loop,once,zoom-out,zoom-level,zoom-in,zoom-reset',`simple controls show 8-direction switcher, play, loop/once and zoom (${visible.join()})`);
 const switched=[];for(const [idx,dir] of ['N','NE','E','SE','S','SW','W','NW'].entries()){await frame.click(`#dir-${dir}`);if((await state()).row===idx)switched.push(dir);}
 test(switched.join()==='N,NE,E,SE,S,SW,W,NW','all 8 directions switchable in simple embed mode');
 await frame.click('#dir-S');
 await frame.click('#once');await frame.waitForFunction(()=>!window.spritePlayer.state.playing,null,{timeout:5000}).catch(()=>{});s=await state();
 test(!s.loop&&!s.playing&&s.frame===7,'Once stops on the last frame');
 await frame.click('#play');s=await state();test(s.playing&&s.frame===0,'Play after Once restarts from the first frame');
 await frame.click('#loop');await page.waitForTimeout(1500);s=await state();test(s.loop&&s.playing,'Loop keeps playing past the last frame');
 await frame.click('#zoom-in');await frame.click('#zoom-in');s=await state();
 test(s.zoom===1.5&&(await frame.$eval('#zoom-level',e=>e.textContent))==='150%','zoom in steps 100 → 125 → 150 %');
 const box=await (await frame.$('#stage')).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+30,{steps:4});await page.mouse.up();
 s=await state();test(s.pan[0]>0&&s.pan[1]>0,'drag pans the zoomed sprite');await page.screenshot({path:`${OUT}/simple-zoomed.png`});
 await frame.click('#zoom-reset');s=await state();test(s.zoom===1&&s.pan[0]===0&&s.pan[1]===0,'Reset returns to 100 % and centres');
 await frame.click('#zoom-out');s=await state();test(s.zoom===0.75,'zoom out below 100 %');await frame.click('#zoom-reset');
 await page.keyboard.press('Escape');await page.screenshot({path:`${OUT}/simple.png`});
 ({frame,state}=await open('?controls=simple&zoom=2&loop=0',560,560));s=await state();test(s.zoom===2&&!s.loop,'zoom and loop=0 from the URL');
 // Knowledge page iframe: fural.space renders <iframe> from *.fural.space in a card with this sandbox, no-referrer and lazy loading.
 await page.setViewportSize({width:760,height:700});await page.unroute(HOST);await page.route(HOST,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body style="margin:0"><iframe id="k" src="${base}/rift-runner/sprite-player/?row=S&controls=simple" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" loading="lazy" allowfullscreen style="display:block;border:0;width:100%;height:560px"></iframe></body>`}));
 await page.goto(HOST);const knowledge=await (await page.waitForSelector('#k')).contentFrame();
 await knowledge.waitForFunction(()=>window.spritePlayer?.state.ready||window.spritePlayer?.state.error,null,{timeout:60000});s=await knowledge.evaluate(()=>window.spritePlayer.state);
 test(s.ready&&!s.error&&s.row===4,'plays inside a Knowledge page iframe (fural.space sandbox card)');await page.waitForTimeout(700);
 test((await knowledge.evaluate(()=>window.spritePlayer.state.frame))!==s.frame,'Knowledge page iframe playback advances');await page.screenshot({path:`${OUT}/knowledge-iframe.png`});

 // Verify all 8 hero/pose manifests (Rift Runner & Ember Warden × Idle, Hurt, Death, Run) in simple embed mode.
 const POSE_CASES=[
  {hero:'rift-runner',pose:'idle',name:'Rift Runner — Idle',fps:5,loop:true},
  {hero:'rift-runner',pose:'hurt',name:'Rift Runner — Hurt',fps:8,loop:false},
  {hero:'rift-runner',pose:'death',name:'Rift Runner — Death',fps:8,loop:false},
  {hero:'rift-runner',pose:'run',name:'Rift Runner — Run',fps:10,loop:true},
  {hero:'ember-warden',pose:'idle',name:'Ember Warden — Idle',fps:5,loop:true},
  {hero:'ember-warden',pose:'hurt',name:'Ember Warden — Hurt',fps:8,loop:false},
  {hero:'ember-warden',pose:'death',name:'Ember Warden — Death',fps:8,loop:false},
  {hero:'ember-warden',pose:'run',name:'Ember Warden — Run',fps:10,loop:true}
 ];
 for(const c of POSE_CASES){
  ({frame,state}=await open(`?hero=${c.hero}&pose=${c.pose}&row=S&controls=simple`,560,560));s=await state();
  const sheetName=await frame.evaluate(()=>window.spritePlayer.sheet?.name);
  test(s.ready&&!s.error&&sheetName===c.name&&s.fps===c.fps&&s.loop===c.loop,`${c.name}: loads with default loop=${c.loop} and fps=${c.fps}`);
  const poseDirs=[];for(const [idx,dir] of ['N','NE','E','SE','S','SW','W','NW'].entries()){await frame.click(`#dir-${dir}`);if((await state()).row===idx)poseDirs.push(dir);}
  test(poseDirs.length===8,`${c.name}: all 8 directions selectable in simple mode`);
  await frame.click('#dir-S');
  if(!c.loop){
   await frame.waitForFunction(()=>!window.spritePlayer.state.playing&&window.spritePlayer.state.frame===7,null,{timeout:5000}).catch(()=>{});
   s=await state();test(!s.playing&&s.frame===7,`${c.name}: Once mode holds final frame 8`);
  }
 }
 await page.screenshot({path:`${OUT}/ember-warden-simple.png`});
 // Broken configuration reports an error instead of failing silently.
 ({frame,state}=await open('?manifest=sheets/missing.json',400,400));s=await state();test(!!s.error&&!s.ready,'missing sheet description shows an error');errors.splice(errors.findIndex(e=>e.includes('missing.json')),1);
 test(errors.length===0,'no page or resource errors'+(errors.length?': '+errors.join(' | '):''));
}finally{await browser.close();}
const result={base,checks,failures,verifiedAt:new Date().toISOString()};
fs.writeFileSync(`${OUT}/verification${live?'-live':''}.json`,JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify({passed:checks.length,failed:failures},null,1));process.exit(failures.length?1:0);
