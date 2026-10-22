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
const errors=[],page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
if(!live)await page.route(base+'/**',serveDisk);
async function open(query,w,h){
 await page.setViewportSize({width:w+40,height:h+40});await page.unroute(HOST);await page.route(HOST,r=>r.fulfill({contentType:'text/html',body:host(query,w,h)}));await page.goto(HOST);const frame=await (await page.waitForSelector('#f')).contentFrame();
 await frame.waitForFunction(()=>window.spritePlayer?.state.ready||window.spritePlayer?.state.error,null,{timeout:60000});
 return {frame,state:()=>frame.evaluate(()=>JSON.parse(JSON.stringify(window.spritePlayer.state)))};
}
try{
 // Default sample, sized like the Knowledge design frame.
 let {frame,state}=await open('',560,620);let s=await state();
 test(s.ready&&!s.error,'sample sheet loads inside an iframe');test(s.row===4&&s.fps===5,'starts on heading S at 5 fps');
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
 // Broken configuration reports an error instead of failing silently.
 ({frame,state}=await open('?manifest=sheets/missing.json',400,400));s=await state();test(!!s.error&&!s.ready,'missing sheet description shows an error');errors.splice(errors.findIndex(e=>e.includes('missing.json')),1);
 test(errors.length===0,'no page or resource errors'+(errors.length?': '+errors.join(' | '):''));
}finally{await browser.close();}
const result={base,checks,failures,verifiedAt:new Date().toISOString()};
fs.writeFileSync(`${OUT}/verification${live?'-live':''}.json`,JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify({passed:checks.length,failed:failures},null,1));process.exit(failures.length?1:0);
