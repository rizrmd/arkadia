import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {launch} from '../vfx/browser.mjs';import {createHash} from 'node:crypto';
const live=!!process.env.BASE,base=process.env.BASE||'http://127.0.0.1:18976',out='docs/run-cadence';await fs.mkdir(out,{recursive:true});
const server=live?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','18976','--strictPort'],{stdio:['ignore','pipe','inherit']});
let browser;const report={base,heroes:{},errors:[]},dirs=['N','NE','E','SE','S','SW','W','NW'];
try{
 if(server)await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('18976'))ok();});server.once('exit',c=>no(Error('Vite exited '+c)));setTimeout(()=>no(Error('Vite timeout')),30000).unref();});
 browser=await launch();const page=await browser.newPage({viewport:{width:1200,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 if(!live)await page.route(base+'/sprite-player/**',async route=>{const path=new URL(route.request().url()).pathname,file='public'+path+(path.endsWith('/')?'index.html':'');const ext=file.split('.').pop(),type={html:'text/html',js:'text/javascript',json:'application/json',css:'text/css',webp:'image/webp'}[ext]||'application/octet-stream';await route.fulfill({contentType:type,body:await fs.readFile(file)});});
 for(const hero of ['ember-warden','rift-runner']){
  const r=report.heroes[hero]={sprite:{},skill:{},lab:{},runtime:{}};console.log('Checking',hero);
  if(!process.argv.includes('--runtime-only')){
  const expected=JSON.parse(await fs.readFile(`public/sprite-player/sheets/${hero}-run.json`,'utf8'));
  const remote=await (await fetch(base+`/sprite-player/sheets/${hero}-run.json`)).json();assert.deepEqual(remote,expected);
  await page.goto(base+`/sprite-player/?hero=${hero}&pose=run&controls=simple&autoplay=0`);
  await page.waitForFunction(()=>window.spritePlayer?.state.ready,null,{timeout:60000});
  for(const [row,dir]of dirs.entries()){
   await page.click('#dir-'+dir);const cells=[];
   for(let f=0;f<8;f++){
    await page.locator('#frame').evaluate((el,f)=>{el.value=String(f);el.dispatchEvent(new Event('input'));},f);
    const st=await page.evaluate(()=>window.spritePlayer.state);assert.equal(st.drawn.frame,f);assert.equal(st.drawn.row,row);assert.equal(st.fps,10);cells.push(st.drawn);
   }
   r.sprite[dir]={cells:cells.length,fps:10,cycleMs:800,mirror:expected.mirrorRows[row]};
  }
  await page.screenshot({path:`${out}/${hero}-sprite${live?'-live':''}.webp`});
  for(const [key,path]of [['skill','/skill-player/'],['lab','/fx-lab']]){
   await page.goto(base+path+`?hero=${hero}&pose=run&controls=simple&autoplay=0&loop=0`);await page.waitForFunction(()=>window.skillPlayer,null,{timeout:90000});
   await page.evaluate(()=>window.skillPlayer.pause(true));
   for(const dir of dirs){
    const states=await page.evaluate(dir=>{const api=window.skillPlayer;api.setDir(dir);const states=[];for(let i=0;i<40;i++){api.advance(50);states.push(api.state());}return states;},dir),seen=new Set();
    for(const st of states){assert.equal(st.heroClip,`move-${dir}`);assert.equal(st.heroFlip,['NW','W','SW'].includes(dir));seen.add(st.heroFrame);}
    assert.equal(seen.size,8,hero+' '+key+' '+dir+' frame coverage');r[key][dir]={clip:`move-${dir}`,uniqueFrames:seen.size,cycleMs:800};
   }
   console.log(hero,key,'all directions passed');
   // Existing skill/Attack playback remains available.
   await page.evaluate(()=>{window.skillPlayer.setPose('idle');window.skillPlayer.setDir('SE');window.skillPlayer.play();window.skillPlayer.advance(100);});
   assert.equal((await page.evaluate(()=>window.skillPlayer.state())).heroClip,'attack-SE');
   await page.evaluate(()=>window.skillPlayer.setPose('run'));
   await page.screenshot({path:`${out}/${hero}-${key}${live?'-live':''}.webp`});
  }
  }else{const prior=JSON.parse(await fs.readFile(`${out}/verification${live?'-live':''}.json`,'utf8'));for(const key of ['sprite','skill','lab']){assert.equal(Object.keys(prior.heroes[hero][key]).length,8);r[key]=prior.heroes[hero][key];}}
  await page.goto(base+`/?offline=1&hero=${hero}&time=0.5`);await page.waitForFunction(()=>window.__WORLD_HERO__?.dataset.hero,null,{timeout:180000});
  const keys={N:['KeyW'],NE:['KeyW','KeyD'],E:['KeyD'],SE:['KeyS','KeyD'],S:['KeyS'],SW:['KeyS','KeyA'],W:['KeyA'],NW:['KeyW','KeyA']};
  for(const dir of dirs){
   await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(8.5,8.5));
   for(const key of keys[dir])await page.keyboard.down(key);
   await page.waitForFunction(dir=>window.__WORLD_HERO__?.dataset.state==='move'&&window.__WORLD_HERO__?.dataset.clip===`move-${dir}`,dir,{timeout:8000});const st=await page.evaluate(()=>({...window.__WORLD_HERO__.dataset}));
   for(const key of keys[dir])await page.keyboard.up(key);await page.waitForTimeout(250);
   assert.equal(st.state,'move',hero+' '+dir+' runtime moving');assert.equal(st.clip,`move-${dir}`,hero+' '+dir+' runtime direction');r.runtime[dir]={clip:st.clip,frame:st.frame};
  }
  await page.screenshot({path:`${out}/${hero}-runtime${live?'-live':''}.webp`});console.log(hero,'Sprite Player, Skill Player, FX Lab and runtime: all eight directions pass');
 }
 if(live){for(const hero of Object.keys(report.heroes)){const file=`assets/characters/${hero}.webp`,bytes=Buffer.from(await(await fetch(base+'/'+file,{headers:{Accept:'image/webp'}})).arrayBuffer()),local=await fs.readFile('public/'+file);assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(local).digest('hex'));}report.liveAtlasBytesMatch=true;}
 assert.deepEqual(report.errors,[]);report.status='passed';
}finally{await browser?.close();server?.kill();await fs.writeFile(`${out}/verification${live?'-live':''}.json`,JSON.stringify(report,null,2)+'\n');}
