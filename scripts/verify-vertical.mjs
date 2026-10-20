import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.DEMO_URL||'http://127.0.0.1:3027/';
const server=process.env.DEMO_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3027'}});
let browser;
try {
 if(server) await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const atlasRequests=[];page.on('request',r=>{if(/\/assets\/characters\/(hero|revenant)\.png/.test(r.url()))atlasRequests.push(r.url())});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__ARKADIA_ARENA__);
 const results=await page.evaluate(()=>{
  window.__ARKADIA_APP__.ticker.stop();
  const a=window.__ARKADIA_ARENA__,out=[];
  const check=(name,ok)=>out.push({name,passed:!!ok});
  a.auto=false;a.spawn(1);
  for(const actor of a.actors) {
   for(const [name,d] of [['Up',{x:-1,y:-1}],['Down',{x:1,y:1}]]) {
    actor.x=5;actor.y=5;actor.facing=-1;actor.stride=0;
    const frames=new Set();let visible=true;
    for(let i=0;i<90;i++){
     a.moves.clear();a.move(actor,d,1000/60);a.finishMoves(1000/60);a.sync();
     if(!frames.has(actor.frame())) {
      const {pixels}=window.__ARKADIA_APP__.renderer.extract.pixels(actor.sprite.texture);
      let opaque=0;for(let p=3;p<pixels.length;p+=4)if(pixels[p]>16)opaque++;
      out.push({name:actor.kind+' '+name+' frame '+actor.frame()+' opaque pixels '+opaque,passed:opaque>500});
      visible=visible&&opaque>500;
     }
     frames.add(actor.frame());
    }
    check(actor.kind+' '+name+' uses six distinct gait frames',actor.textureClip==='move'+name&&frames.size===6);
    check(actor.kind+' '+name+' every GPU texture frame contains visible pixels',visible);
    check(actor.kind+' '+name+' is never horizontally mirrored',actor.sprite.scale.x>0);
    actor.play('idle');a.sync();
    check(actor.kind+' '+name+' idle retains vertical direction',actor.textureClip==='idle'+name);
   }
   a.face(actor,{x:-1,y:-1});
   for(let i=0;i<100;i++)a.face(actor,{x:-1,y:-1+(i%2?.05:-.05)});
   check(actor.kind+' vertical jitter stays vertical',actor.vertical&&actor.back);
   a.face(actor,{x:1,y:0});actor.play('move');
   check(actor.kind+' diagonal down restored',!actor.vertical&&actor.textureClip==='move');
   a.face(actor,{x:0,y:-1});
   check(actor.kind+' diagonal up restored',!actor.vertical&&actor.textureClip==='moveBack');
  }
  // Exercise actual manual input mapping.
  a.enemies.forEach(e=>{e.x=9;e.y=9});a.hero.x=5;a.hero.y=5;
  for(const [key,clip] of [['w','moveUp'],['s','moveDown']]){
   a.keys.clear();a.keys.add(key);a.update(100);
   check('keyboard '+key+' selects '+clip,a.hero.textureClip===clip);
  }
  a.keys.clear();
  a.spawn(3);
  const dirs=[{x:-1,y:-1},{x:1,y:1},{x:-1,y:-1},{x:1,y:1}];
  a.actors.forEach((actor,i)=>{actor.x=3+i;actor.y=5;a.face(actor,dirs[i]);actor.play('move');actor.stride=.3});
  a.attach(a.hero.view.parent);a.sync();window.__ARKADIA_APP__.render();
  return out;
 });
 results.push({name:'character atlases use content revisions to bypass stale image caches',passed:['hero','revenant'].every(id=>atlasRequests.some(u=>new RegExp('/'+id+'\\.png\\?v=[a-f0-9]{16}$').test(u)))});
 results.forEach(r=>console.log(r.passed?'PASS':'FAIL',r.name));
 assert.ok(results.every(r=>r.passed));assert.deepEqual(errors,[]);
 await fs.mkdir('docs/vertical-facing',{recursive:true});
 await page.screenshot({path:'docs/vertical-facing/runtime.png'});
 await fs.writeFile('docs/vertical-facing/'+(process.env.DEMO_URL?'live':'local')+'.json',JSON.stringify({url,results,errors},null,2));
}finally{await browser?.close();server?.kill();}
