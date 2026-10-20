import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const url=process.env.DEMO_URL||'http://127.0.0.1:3016/';
const server=process.env.DEMO_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3016'}});
const out='public/evidence/walls';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,timeout:15000,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
try{
 const page=await browser.newPage({viewport:{width:1680,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(server)await new Promise(r=>setTimeout(r,500));
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.__ARKADIA_WALLS__,{},{timeout:30000});
 const regression=JSON.parse(await page.evaluate(await fs.readFile('scripts/check-browser.js','utf8')));assert.deepEqual(regression.failures,[]);
 const geometry=await page.evaluate(()=>{
  const world=window.__ARKADIA_APP__.stage.children[0],sources=window.__ARKADIA_WALLS__;
  return world.children[2].children.filter(s=>sources[s.label]).map(s=>{
   const points=sources[s.label].feet.map(([x,y])=>world.toLocal(s.toGlobal({x:x-s.anchor.x*s.texture.width,y:y-s.anchor.y*s.texture.height})));
   return {id:s.label,position:[s.x,s.y],points,depth:s.zIndex};
  });
 });
 assert.equal(geometry.length,8);
 for(const w of geometry){const [a,b]=w.points;assert.ok(Math.abs((b.y-a.y)/(b.x-a.x)-(w.id==='wall-a'?.5:-.5))<1e-6);assert.ok(Math.abs(b.x-a.x-128)<1e-6);assert.equal(w.depth,w.position[1]);}
 for(const left of [true,false]){
  const row=geometry.filter(w=>(w.id!=='wall-a')===left).sort((a,b)=>a.position[1]-b.position[1]);
  for(let i=1;i<row.length;i++){const a=row[i-1].points[left?0:1],b=row[i].points[left?1:0];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,'ground endpoints must meet');}
 }
 // Observe the real image alpha where the image preview showed brown haze.
 const alpha=await page.evaluate(async()=>{
  const image=new Image();image.src='/assets/walls/wall-left.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);
  return [[400,400],[500,500],[900,250],[200,900]].map(([x,y])=>c.getImageData(x,y,1,1).data[3]);
 });assert.deepEqual(alpha,[0,0,0,0]);
 await page.selectOption('#crowd','0');await page.uncheck('#auto');await page.uncheck('#inspect');await page.uncheck('#grid');
 await page.evaluate(()=>{window.__ARKADIA_APP__.ticker.stop();window.__ARKADIA_APP__.render();});
 await page.screenshot({path:out+'/arena.png'});
 await page.check('#grid');await page.check('#checker');
 await page.evaluate(()=>window.__ARKADIA_APP__.render());await page.screenshot({path:out+'/grid-checker.png'});
 await page.uncheck('#checker');await page.uncheck('#grid');await page.click('#source');
 const newImages=page.locator('#gallery img[src*="/walls/"]');assert.equal(await newImages.count(),3);
 for(const img of await newImages.all())assert.equal(await img.evaluate(i=>i.complete&&i.naturalWidth===1536),true);
 await page.click('#close');
 const character=await page.evaluate(()=>{const a=window.__ARKADIA_ARENA__;a.respawnHero();const x=a.hero.x;a.keys.add('d');for(let i=0;i<10;i++)a.update(1000/60);a.keys.clear();return {moved:a.hero.x>x,state:a.hero.state};});assert.ok(character.moved);assert.equal(character.state,'move');
 assert.deepEqual(errors,[]);
 const result={url,at:new Date().toISOString(),regression:regression.checks,geometry,transparentHaloPixels:alpha,character,errors};
 await fs.writeFile(out+`/${process.env.DEMO_URL?'live':'local'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,url,regression:regression.checks.length,walls:geometry.length,transparentHaloPixels:alpha,character}));
}finally{await browser.close();server?.kill();}
