import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchOptions} from './typography/browser.mjs';
const out=process.env.MINIMAP_OUT||'docs/minimap';await mkdir(out,{recursive:true});
const server=process.env.VERIFY_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8798'],{stdio:'pipe'});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('8798'))resolve();});server.on('exit',reject);});
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:Number(process.env.VERIFY_DPR||1)});
 const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('ERROR',String(e))});
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:8798')+'/?offline=1&time=0.35');
 await page.waitForTimeout(15000);console.log('Ready diagnostic',await page.evaluate(()=>({ready:document.querySelector('#world-canvas')?.dataset.ready,combat:!!window.__STRONGHOLD_COMBAT__,text:document.body.innerText.slice(-1000)})));
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:60000,polling:500});
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));});
 const results=[];
 for(const [name,width,height] of [['portrait',390,844],['narrow',320,568],['landscape',844,390],['desktop',1440,900]]){
  console.log('Checking',name);await page.setViewportSize({width,height});await page.waitForTimeout(650);
  const s=await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;return {map:c.snapshot().minimap,tr:c.snapshot().topRightHud.screenBounds,player:c.hud.playerConsole.getBounds(),skills:c.snapshot().hudGeometry};});
  if(!s.map.obstacles?.some(p=>p.kind==='tree')||!s.map.obstacles.some(p=>p.id==='boulders-snow'))throw Error('Missing trees/obstacles');
  const b=s.map.bounds;if(!s.map.visible||b.x<0||b.y<s.tr.bottom||b.x+b.width>width||b.y+b.height>height*.65)throw Error('Map placement: '+JSON.stringify(s));
  if(b.x<s.player.maxX&&b.x+b.width>s.player.minX&&b.y<s.player.maxY&&b.y+b.height>s.player.minY)throw Error('Player overlap');
  for(const socket of s.skills.sockets)if(b.x<socket.x+socket.radius&&b.x+b.width>socket.x-socket.radius&&b.y<socket.y+socket.radius&&b.y+b.height>socket.y-socket.radius)throw Error('Skill overlap');
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
 const performanceCheck=process.env.VERIFY_URL?null:await page.evaluate(async()=>{
  const {Minimap}=await import('/src/stronghold/minimap.ts');const map=new Minimap();
  map.updateMap({x:577,y:320},390,844,77,['expedition','gate']);
  const started=performance.now();for(let i=0;i<5000;i++)map.updateMap({x:577+i*.01,y:320},390,844,77,['expedition','gate']);
  const ms=performance.now()-started;map.destroy({children:true});return {updates:5000,totalMs:ms,meanMs:ms/5000};
 });
 const report={performanceCheck,results,movement:{before,after},edges,errors};await writeFile(`${out}/${process.env.VERIFY_URL?'live-':''}verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server?.kill();}
