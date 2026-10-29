import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const out='docs/knight-footfalls',m=JSON.parse(await fs.readFile('public/assets/characters/manifest.json','utf8')).characters.hero;
const bytes=await fs.readFile('public/assets/characters/hero.png');
assert.equal(m.revision,createHash('sha256').update(bytes).digest('hex').slice(0,16));
assert.equal(m.frames.length,57);assert(m.frames.slice(0,48).every(f=>f.source.file==='knight-unified-v4.png'));
const previous=JSON.parse(execFileSync('git',['show','0a029fa:public/assets/characters/manifest.json'],{encoding:'utf8'})).characters.hero;
const oldBytes=execFileSync('git',['show','0a029fa:public/assets/characters/hero.png'],{maxBuffer:10e6});
for(const name of ['moveDown','idleDown','attack','hit','die']){
 assert.deepEqual(m.clips[name],previous.clips[name]);
 for(const index of m.clips[name].frames){const f=m.frames[index],rect={left:f.x,top:f.y,width:f.w,height:f.h};
  assert((await sharp(oldBytes).extract(rect).raw().toBuffer()).equals(await sharp(bytes).extract(rect).raw().toBuffer()),name+' original pixels retained');
 }
}
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
for(const name of ['move','moveBack','moveUp']){
 const clip=m.clips[name],poses=clip.frames.map(i=>m.frames[i].footfall);
 assert.deepEqual(poses,['contact','rightSwing','contact','leftSwing']);
 assert.equal(clip.strideScale,1.6);
 const list=clip.frames.map(i=>measures[i]);
 assert(Math.max(...list.map(f=>f.bottom))-Math.min(...list.map(f=>f.bottom))<=1,'one foot always grounded');
 assert(Math.max(...list.map(f=>f.top))-Math.min(...list.map(f=>f.top))<=2,'no whole-body bounce');
 // Compare actual boot pixels, not just frame labels: the lower foot switches screen sides.
 const balance=async index=>{
  const f=m.frames[index],{data}=await sharp(bytes).extract({left:f.x,top:f.y,width:f.w,height:f.h}).raw().toBuffer({resolveWithObject:true});
  const halves=[[],[]];for(let x=75;x<126;x++){let bottom=-1;for(let y=118;y<132;y++)if(data[(y*f.w+x)*4+3]>96)bottom=y;if(bottom>=122)halves[x<99?0:1].push(bottom);}
  return halves.map(a=>a.reduce((n,v)=>n+v,0)/a.length);
 };
 const right=await balance(clip.frames[1]),left=await balance(clip.frames[3]);
 assert(right[0]>right[1],name+' right swing leaves left boot lower');
 assert(left[1]>left[0],name+' left swing leaves right boot lower');
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
  for(const [key,expected] of [[['KeyD'],'move'],[['KeyW'],'moveUp'],[['KeyS'],'moveDown'],[['KeyA'],'move'],[['KeyW','KeyD'],'moveBack'],[['KeyS','KeyD'],'move']]){
   for(const k of key)await page.keyboard.down(k);await page.waitForTimeout(180);const state=await read();clips.push(state);for(const k of key)await page.keyboard.up(k);assert.equal(state.clip,expected);await page.waitForTimeout(250);
  }
  await page.screenshot({path:`${out}/${base?'live':'local'}-${width}.png`,timeout:10000});
  const combat=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__?.snapshot());
  if(width===1440&&combat?.foes.length){const foe=combat.foes[0];await page.evaluate(f=>window.__STRONGHOLD_COMBAT__.teleport(f.u-.1,f.v+.05),foe);await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().kills>0,null,{timeout:20000});}
  assert.deepEqual(errors,[]);results.push({width,clips,revision:live.revision,errors});await page.close();
 }
 await fs.writeFile(`${out}/${base?'live':'local'}.json`,JSON.stringify({url:base||'local',measurements:measures,results},null,2));console.log('PASS: alternating boot pixels, grounded support, no body bounce, revision, directions, desktop/mobile and combat');
}finally{await browser?.close();server?.kill();}
