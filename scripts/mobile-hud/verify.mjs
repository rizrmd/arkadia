import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchOptions} from '../typography/browser.mjs';
const out=process.env.MINIMAP_OUT||'docs/mobile-hud/v1';await mkdir(out,{recursive:true});
const server=process.env.VERIFY_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8798'],{stdio:'pipe'});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('8798'))resolve();});server.on('exit',reject);});
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:Number(process.env.VERIFY_DPR||2),hasTouch:true});
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});page.on('requestfailed',r=>console.log('REQUEST',r.url(),r.failure()));
 const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('ERROR',String(e))});
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:8798')+'/?offline=1&hero=rift-runner&time=0.35');
 await page.waitForTimeout(3000);console.log('Ready diagnostic',await page.evaluate(()=>({ready:document.querySelector('#world-canvas')?.dataset.ready,combat:!!window.__STRONGHOLD_COMBAT__,text:document.body.innerText.slice(-1000)})));
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000,polling:500});
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));});
 const results=[];
 for(const [name,width,height] of [['portrait',390,844],['narrow',320,568],['wide-portrait',430,932],['landscape',844,390],['desktop',1440,900]]){
  console.log('Checking',name);await page.setViewportSize({width,height});await page.waitForTimeout(650);
  const s=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;return {map:c.snapshot().minimap,tr:c.snapshot().topRightHud.screenBounds,player:c.hud.playerConsole.getBounds(),skills:c.snapshot().hudGeometry};});
  if(!s.map.obstacles?.some(p=>p.kind==='tree')||!s.map.obstacles.some(p=>p.id==='boulders-snow'))throw Error('Missing trees/obstacles');
  const b=s.map.bounds;if(!s.map.visible||b.x<0||(width>=1024&&b.y<s.tr.bottom)||b.x+b.width>width||b.y+b.height>height*.65)throw Error('Map placement: '+JSON.stringify(s));
  if(b.x<s.player.maxX&&b.x+b.width>s.player.minX&&b.y<s.player.maxY&&b.y+b.height>s.player.minY)throw Error('Player overlap');
  for(const socket of s.skills.sockets)if(b.x<socket.x+socket.radius&&b.x+b.width>socket.x-socket.radius&&b.y<socket.y+socket.radius&&b.y+b.height>socket.y-socket.radius)throw Error('Skill overlap');
  const controls=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.skillViews.map(v=>{const b=v.root.children.filter(c=>c.visible&&c.renderable).map(c=>c.getBounds()).filter(b=>b.width>0&&b.height>0);return {x:Math.min(...b.map(b=>b.minX)),y:Math.min(...b.map(b=>b.minY)),right:Math.max(...b.map(b=>b.maxX)),bottom:Math.max(...b.map(b=>b.maxY))};}));
  for(const control of controls)if(control.x<0||control.y<0||control.right>width||control.bottom>height)throw Error('Control out of viewport '+JSON.stringify(control));
  await page.screenshot({path:`${out}/${process.env.VERIFY_URL?'live-':''}${name}.png`});results.push({name,width,height,...s});
 }
 await page.setViewportSize({width:390,height:844});
 const before=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap);await page.keyboard.down('ArrowDown');await page.waitForTimeout(1200);await page.keyboard.up('ArrowDown');
 const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap);
 if(Math.hypot(before.tile.u-after.tile.u,before.tile.v-after.tile.v)<.1)throw Error('Marker did not track movement');
 const edges=[];for(const [u,v] of [[-460,470],[470,-460],[470,470]]){
  const ok=await page.evaluate(([u,v])=>window.__STRONGHOLD_COMBAT__.teleport(u,v),[u,v]);await page.waitForTimeout(200);
  edges.push({requested:{u,v},ok,map:await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap)});
 }
 if(errors.length)throw Error(errors.join('\n'));
 const states=[];
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[1440,900],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  await page.evaluate(()=>window.__PIXI_UI__.app.ticker.stop());
  for(const hero of ['Rift Runner','Ember Warden']){
   for(const [hp,gate,xp] of [[0,0,0],[37,64,14],[125,100,280]]){
    const state=await page.evaluate(({hero,hp,gate,xp})=>{
     const hud=window.__STRONGHOLD_COMBAT__.hud;hud.setHero(hero,hero==='Rift Runner'?'portrait-rift-runner':'portrait-ember-warden');hud.setLevel(12);hud.setHp(hp,100);hud.setGateHp(gate,100);hud.setXp(xp,280);hud.setGold(9999);hud.setTime('12:00');
     hud.setSkills([{name:hero==='Rift Runner'?'Rift Bolt':'Flame Fan',art:hero==='Rift Runner'?'skill-rift-bolt':'skill-flame-fan',level:2,locked:false,cooldownRatio:.5,cooldownSec:3.2},{...hud.state.skills[1]},{...hud.state.skills[2]}]);
     const pc=hud.playerConsole;window.__PIXI_UI__.app.render();
     return {values:pc.rows.map(r=>r.value.text),ratios:pc.rows.map(r=>r.ratio),portrait:pc.loadedPortrait,consoleBounds:pc.getBounds(),cooldown:hud.skillViews[0].cooldownText.text,cooldownVisible:hud.skillViews[0].cooldownText.visible,arcs:hud.crescentArcG.getBounds().width};
    },{hero,hp,gate,xp});
    if(state.values.join('|')!==`${hp} / 100|${gate} / 100|${xp} / 280`||state.cooldown!=='3.2s'||!state.cooldownVisible)throw Error('Live state '+JSON.stringify(state));
    if(width<1024&&state.arcs!==0)throw Error('Mobile connecting arcs visible');
    states.push({width,height,hero,hp,gate,xp,...state});
   }
   await page.screenshot({path:`${out}/${process.env.VERIFY_URL?'live-':''}${width}-${hero.replaceAll(' ','-')}.png`});
  }
  await page.evaluate(()=>window.__PIXI_UI__.app.ticker.start());
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 await writeFile(`${out}/states-interim.json`,JSON.stringify({states,results},null,2));
 const context=page.context(),cdp=await context.newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id:id+1}))});
 await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.teleport(9.2,9));await page.waitForTimeout(200);
 const beforeTouch=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().hero);
 await touch('touchStart',[[90,720]]);for(let i=1;i<=12;i++){await touch('touchMove',[[90+i*4,720-i*2]]);await page.waitForTimeout(30);}await page.waitForTimeout(500);
 const activeTouch=await page.evaluate(()=>({hero:window.__STRONGHOLD_COMBAT__.snapshot().hero,visible:window.__PIXI_UI__.stick.visible}));
 await page.screenshot({path:`${out}/${process.env.VERIFY_URL?'live-':''}touch.png`});
 await touch('touchEnd',[]);await page.waitForTimeout(100);
 const released=await page.evaluate(()=>window.__PIXI_UI__.stick.visible);
 if(!activeTouch.visible||released||Math.hypot(activeTouch.hero.u-beforeTouch.u,activeTouch.hero.v-beforeTouch.v)<.1)throw Error('Touch movement failed '+JSON.stringify({beforeTouch,activeTouch,released}));
 const socket=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.hud.getSkillSocketScreenGeometry().sockets[0]);
 await touch('touchStart',[[socket.x,socket.y]]);
 if(await page.evaluate(()=>window.__PIXI_UI__.stick.visible))throw Error('Skill touch spawned joystick');
 await touch('touchEnd',[]);
 if(errors.length)throw Error(errors.join('\n'));
 const performanceCheck=process.env.VERIFY_URL?null:await page.evaluate(async()=>{
  const {Minimap}=await import('/src/stronghold/minimap.ts');const map=new Minimap();
  map.updateMap({x:577,y:320},390,844,77,['expedition','gate']);
  const started=performance.now();for(let i=0;i<5000;i++)map.updateMap({x:577+i*.01,y:320},390,844,77,['expedition','gate']);
  const ms=performance.now()-started;map.destroy({children:true});return {updates:5000,totalMs:ms,meanMs:ms/5000};
 });
 const report={states,touch:{beforeTouch,activeTouch,released},performanceCheck,results,movement:{before,after},edges,errors};await writeFile(`${out}/${process.env.VERIFY_URL?'live-':''}verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server?.kill();}
