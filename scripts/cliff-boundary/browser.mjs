import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launch} from '../vfx/browser.mjs';

const base=process.env.BASE_URL,out=process.env.OUT||'docs/cliff-boundary/verified';
await fs.mkdir(out,{recursive:true});
const vite=await createServer({server:{host:'127.0.0.1',port:5481,strictPort:true,hmr:false,watch:null},logLevel:'error'});
if(!base)await vite.listen();
const relief=await vite.ssrLoadModule('/src/world/relief.ts');
const {tilePoint}=await vite.ssrLoadModule('/src/stronghold/terrain.ts');
const {unproject}=await vite.ssrLoadModule('/src/isometric.ts');
const {STRONGHOLD}=await vite.ssrLoadModule('/src/stronghold/prefabs/stronghold.ts');
const {walkStep}=await vite.ssrLoadModule('/src/stronghold/net/movement.ts');
const tile=p=>{const t=unproject(p.x-STRONGHOLD.court.origin.x,p.y-STRONGHOLD.court.origin.y);return [t.x,t.y]};
const report={base:base||'local',method:'Trusted keyboard/CDP touch inputs; 100 ms clock advances with real game collision; sparse frame cadence to bound software rendering; raw full-precision foot positions checked against shared terrain model.',cases:[],errors:[]};
let invalid;
for(const f of relief.RELIEF.filter(f=>f.type==='hill')){for(let u=f.u0+.1;u<f.u1&&!invalid;u+=.1)for(let v=f.v0+.1;v<f.v1;v+=.1)if(relief.inside(f,u,v)&&relief.reliefBlockedTile(u,v)){invalid=tilePoint(u,v);break}if(invalid)break}
assert(invalid,'legacy unsafe position fixture');
let browser;
async function save(){await fs.writeFile(`${out}/${process.env.ONLY||'both'}.json`,JSON.stringify(report,null,2)+'\n')}
const definitions=[['terrace-back',[5.5,25],[0,-1]],['terrace-front',[5.5,25],[0,1]],['ridge-corner',[25.5,7.2],[2,-1]],['ridge-side',[25.5,7.2],[1,0]],['ramp-ascent',[25.5,12.2],[2,-1]],['ramp-descent',[25.5,11.6],[-2,1]]];
try{
 for(const mobile of [false,true].filter(m=>!process.env.ONLY||process.env.ONLY===(m?'mobile':'desktop'))){
  browser=await launch();
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(invalid=>{localStorage.clear();localStorage.setItem('arkodia.desktop-movement-hint.v1','1');localStorage.setItem('arkodia.stronghold.hero',JSON.stringify(invalid))},invalid);
  await page.routeWebSocket('**/*',()=>{});await page.clock.install();
  await page.goto((base||'http://127.0.0.1:5481')+`/?buildings=all&offline=1&hero=${process.env.HERO||'ember-warden'}&time=.5&quality=low`);
  await page.waitForFunction(()=>window.__PIXI_UI__&&window.__STRONGHOLD_COMBAT__&&!document.getElementById('loading-screen'),null,{timeout:180000});
  await page.clock.pauseAt(Date.now()+100);
  // Keep real game update loops and input; skip redundant GPU presentation between captures.
  await page.evaluate(()=>window.__PIXI_UI__.app.ticker.stop());
  const initial=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);const initialTile=tile(initial);console.log('legacy recovery',JSON.stringify({invalid,initial,initialTile,clear:await page.evaluate(t=>window.__STRONGHOLD_COMBAT__.clear(...t),initialTile)}));assert(!relief.reliefBlockedTile(...initialTile),'unsafe saved feet restored');assert(Math.hypot(initial.x-invalid.x,initial.y-invalid.y)>1,'legacy unsafe position was not recovered');report.cases.push({mobile,name:'unsafe-legacy-save-recovery',invalid,initial,pass:true});await save();
  console.log('ready',mobile?'mobile':'desktop');
  for(const [name,original,dir] of definitions){
   const l=Math.hypot(...dir),d={x:dir[0]/l,y:dir[1]/l};let from=original;
   if(!name.startsWith('ramp')){
    let p=tilePoint(...original),path=[p];for(let n=0;n<300;n++){const next=walkStep(()=>false,p.x,p.y,d,34);if(next.progress<.001)break;p=next;path.push(p)}
    from=tile(path[Math.max(0,path.length-10)]);
   }
   const ok=await page.evaluate(([u,v])=>{const c=window.__STRONGHOLD_COMBAT__;c.setPreviewMode(false);c.clearFoes();return c.teleport(u,v)},from);
   assert(ok,'teleport failed '+name+' '+from);
   const read=async()=>tile(await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]));
   const start=await read();
   let cdp;
   const keys=dir[0]===0?[dir[1]<0?'KeyW':'KeyS']:dir[1]===0?[dir[0]>0?'KeyD':'KeyA']:dir[0]>0?['KeyW','KeyD']:['KeyS','KeyA'];
   if(mobile){cdp=await page.context().newCDPSession(page);const x=85,y=650;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+d.x*50,y:y+d.y*50}]});}
   else for(const key of keys)await page.keyboard.down(key);
   const samples=[];
   for(let n=0;n<10;n++){await page.clock.fastForward(100);samples.push(await read())}
   if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}else for(const key of keys)await page.keyboard.up(key);
   for(let n=0;n<3;n++)await page.clock.fastForward(100);
   const to=await read();
   for(const t of samples)assert(!relief.reliefBlockedTile(...t),'feet outside contour '+name+' '+t);
   assert(Math.hypot(to[0]-start[0],to[1]-start[1])>.03,'input did not move '+name);
   if(name==='ramp-ascent')assert(to[1]<start[1]-.1,'ramp ascent failed');
   if(name==='ramp-descent')assert(to[1]>start[1]+.1,'ramp descent failed');
   report.cases.push({mobile,name,from,start,to,samples,pass:true});await save();console.log(name,to);
   if(name==='terrace-back'||name==='ridge-corner'){
    await page.evaluate(()=>window.__PIXI_UI__.app.render());
    const session=await page.context().newCDPSession(page);const {data}=await session.send('Page.captureScreenshot',{format:'png'});await session.detach();
    await fs.writeFile(`${out}/${mobile?'mobile':'desktop'}-${name}.png`,Buffer.from(data,'base64'));
   }
  }
  await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS',report.cases.length,'cases');
}finally{await save();await browser?.close();await vite.close()}
