import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const out='docs/knight-unified',m=JSON.parse(await fs.readFile('public/assets/characters/manifest.json','utf8')).characters.hero;
const bytes=await fs.readFile('public/assets/characters/hero.png');
assert.equal(m.revision,createHash('sha256').update(bytes).digest('hex').slice(0,16));
assert.equal(m.frames.length,48);assert(m.frames.every(f=>f.source.file==='knight-unified-v4.png'));
const measures=[];
for(const [i,f] of m.frames.entries()){
 const {data,info}=await sharp(bytes).extract({left:f.x,top:f.y,width:f.w,height:f.h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let top=info.height,bottom=-1,count=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){
  assert(x>0&&y>0&&x<info.width-1&&y<info.height-1,`frame ${i} transparent border`);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
 }
 assert(count>1000,`frame ${i} visible`);
 let l=info.width,r=-1;
 for(let y=top;y<top+Math.round((bottom-top)*.1);y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){l=Math.min(l,x);r=Math.max(r,x);}
 measures.push({frame:i,top,bottom,crownWidth:r-l+1,crownCenter:(l+r)/2});
}
for(const [a,b] of [[0,1],[4,5]]){
 const avg=(row,key)=>measures.slice(row*6,row*6+6).reduce((n,f)=>n+f[key],0)/6;
 const ratio=avg(a,'crownWidth')/avg(b,'crownWidth');assert(ratio>.8&&ratio<1.2,`helmet proportions ${a}/${b}: ${ratio}`);
 assert(Math.abs(avg(a,'crownCenter')-avg(b,'crownCenter'))<2,'crown stays registered');assert.equal(avg(a,'top'),avg(b,'top'));
}
for(const c of Object.values(m.clips))assert(c.frames.every(i=>m.frames[i]));
const base=process.env.DEMO_URL?.replace(/\/$/,''),server=base?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3071'}});let browser;
try{
 await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote']});
 const results=[];
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((base||'http://127.0.0.1:3071')+'/?time=0.5');await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>document.querySelector('#world-hero')?.dataset.x);
  const live=await page.evaluate(async()=>{const m=await(await fetch('/assets/characters/manifest.json')).json();return m.characters.hero;});assert.equal(live.revision,m.revision);
  const read=()=>page.evaluate(()=>({...document.querySelector('#world-hero').dataset}));
  const clips=[];
  for(const [key,expected] of [['KeyD','move'],['KeyW','moveUp'],['KeyS','moveDown'],['KeyA','move']]){
   await page.keyboard.down(key);await page.waitForTimeout(180);const state=await read();clips.push(state);await page.keyboard.up(key);assert.equal(state.clip,expected);await page.waitForTimeout(250);
  }
  await page.screenshot({path:`${out}/${base?'live':'local'}-${width}.png`,timeout:10000});
  const combat=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__?.snapshot());
  if(width===1440&&combat?.foes.length){const foe=combat.foes[0];await page.evaluate(f=>window.__STRONGHOLD_COMBAT__.teleport(f.u-.1,f.v+.05),foe);await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().kills>0,null,{timeout:20000});}
  assert.deepEqual(errors,[]);results.push({width,clips,revision:live.revision,errors});await page.close();
 }
 await fs.writeFile(`${out}/${base?'live':'local'}.json`,JSON.stringify({url:base||'local',measurements:measures,results},null,2));console.log('PASS: 48 isolated frames, consistent helmets and crowns, revision, four directions, desktop/mobile, combat kill, no browser errors');
}finally{await browser?.close();server?.kill();}
