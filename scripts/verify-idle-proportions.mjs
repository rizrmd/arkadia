import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.DEMO_URL||'http://127.0.0.1:3031/';
const server=process.env.DEMO_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3031'}});
let browser;
try {
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__ARKODIA_ARENA__);
 const report=await page.evaluate(()=>{
  const app=window.__ARKODIA_APP__,a=window.__ARKODIA_ARENA__,results=[],measurements=[];
  app.ticker.stop();a.auto=false;a.spawn(1);
  const check=(name,passed)=>results.push({name,passed:!!passed});
  const measure=texture=>{
   const {pixels,width,height}=app.renderer.extract.pixels(texture);
   let top=height,bottom=-1;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>32){top=Math.min(top,y);bottom=Math.max(bottom,y);}
   // The top 10% isolates the helmet/skull crown, before shoulders and cape.
   let left=width,right=-1;
   for(let y=top;y<top+Math.round((bottom-top+1)*.10);y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);}
   return {top,bottom,height:bottom-top+1,headWidth:right-left+1,headCenter:(left+right)/2};
  };
  for(const actor of a.actors){
   for(const [suffix,vertical,back] of [['',false,false],['Back',false,true],['Up',true,true],['Down',true,false]]){
    actor.x=5;actor.y=5;actor.vertical=vertical;actor.back=back;
    const pair={kind:actor.kind,direction:suffix||'Front',idle:[],move:[]};
    const anchor=JSON.stringify(actor.sprite.anchor),position=[actor.x,actor.y];
    for(const state of ['idle','move']){
     actor.play(state);const count=actor.clip.frames.length;
     const seen=new Set();
     for(let i=0;i<count;i++){
      actor.t=i*1000/actor.clip.fps+.1;actor.stride=(i+.01)/count;a.sync();seen.add(actor.sprite.texture);
      const m=measure(actor.sprite.texture);pair[state].push(m);
      check(`${actor.kind} ${suffix||'Front'} ${state} ${i} visible`,m.height>60&&m.headWidth>5);
      check(`${actor.kind} ${suffix||'Front'} ${state} ${i} fixed scale/pivot`,Math.abs(actor.sprite.scale.x)===1.1&&actor.sprite.scale.y===1.1&&JSON.stringify(actor.sprite.anchor)===anchor&&actor.x===position[0]&&actor.y===position[1]);
     }
     check(`${actor.kind} ${suffix||'Front'} ${state} covers clip`,seen.size===count);
    }
    const avg=(list,key)=>list.reduce((n,v)=>n+v[key],0)/list.length;
    pair.headRatio=avg(pair.idle,'headWidth')/avg(pair.move,'headWidth');
    pair.heightRatio=avg(pair.idle,'height')/avg(pair.move,'height');
    pair.headShift=avg(pair.idle,'headCenter')-avg(pair.move,'headCenter');
    check(`${actor.kind} ${suffix||'Front'} crown stays aligned across idle/walk`,Math.abs(pair.headShift)<=2);
    pair.idleHeadDrift=Math.max(...pair.idle.map(v=>v.top))-Math.min(...pair.idle.map(v=>v.top));
    check(`${actor.kind} ${suffix||'Front'} helmet/skull width matches gait within 10%`,Math.abs(pair.headRatio-1)<.10);
    check(`${actor.kind} ${suffix||'Front'} total height matches gait within 5%`,Math.abs(pair.heightRatio-1)<.05);
    check(`${actor.kind} ${suffix||'Front'} idle crown stays within 2 atlas pixels`,pair.idleHeadDrift<=2);
    measurements.push(pair);
   }
  }
  // Build a same-scale visual comparison from GPU textures, not the source PNG.
  const panel=document.createElement('div');panel.id='proportion-proof';panel.style='position:fixed;inset:0;z-index:99999;background:#20252a;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:16px;color:white;font:16px sans-serif;overflow:auto';
  for(const actor of a.actors)for(const [label,vertical,back] of [['Front',false,false],['Back',false,true],['Up',true,true],['Down',true,false]]){
   actor.vertical=vertical;actor.back=back;
   const box=document.createElement('div');box.textContent=actor.kind+' '+label+' — idle / walk';
   const canvas=document.createElement('canvas');canvas.width=672;canvas.height=216;canvas.style='width:100%';const ctx=canvas.getContext('2d');
   for(const [i,state] of ['idle','move'].entries()){
    actor.play(state);actor.t=0;actor.stride=0;a.sync();const source=app.renderer.extract.canvas(actor.sprite.texture);ctx.drawImage(source,i*336+30,0,source.width*1.7,source.height*1.7);
   }
   box.append(canvas);panel.append(box);
  }
  document.body.append(panel);return {results,measurements};
 });
 await page.screenshot({path:'public/idle-proportions/comparison.png'});
 await page.locator('#proportion-proof').evaluate(e=>e.remove());
 await page.evaluate(()=>{const a=window.__ARKODIA_ARENA__;a.spawn(12);a.respawnHero();a.sync();window.__ARKODIA_APP__.render();});
 await page.screenshot({path:'public/idle-proportions/runtime.png'});
 await fs.writeFile(`docs/idle-proportions/${process.env.DEMO_URL?'live':'local'}.json`,JSON.stringify({url,...report,errors},null,2));
 for(const m of report.measurements)console.log(m.kind,m.direction,'head ratio',m.headRatio.toFixed(3),'height ratio',m.heightRatio.toFixed(3),'drift',m.idleHeadDrift,'head shift',m.headShift.toFixed(2));
 for(const r of report.results.filter(r=>!r.passed))console.error('FAIL',r.name);
 assert.deepEqual(errors,[]);assert.ok(report.results.every(r=>r.passed),'Proportion checks failed');
 console.log('PASS',report.results.length,'proportion and texture checks');
}finally{await browser?.close();server?.kill();}
