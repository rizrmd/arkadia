import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const v=await createServer({server:{port:5196,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={errors:[],checks:[]};
try{
 const p=await b.newPage({viewport:{width:1000,height:800}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>console.log('browser:',m.type(),m.text()));p.on('requestfailed',r=>console.log('request failed',r.url(),r.failure()));
 await p.route('**/core-upgrade-test*',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/core-upgrade-test.ts"></script></body></html>'}));
 await p.route('**/core-upgrade-test.ts',r=>r.fulfill({contentType:'application/javascript',body:`import {Application,Container,Sprite,Assets} from '/node_modules/.vite/deps/pixi__js.js';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createCoreUpgradePanel} from '/src/stronghold/core-upgrade-panel.ts';
import {createFarmPanel} from '/src/stronghold/farm-panel.ts';
import {createLumberPanel} from '/src/stronghold/lumber-panel.ts';
import {createKitchenPanel} from '/src/stronghold/kitchen-panel.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());const peers=[];let coreRoot;let pos={x:577,y:420},online=false;let panel=createCoreUpgradePanel(ui,Number(new URLSearchParams(location.search).get('level')||1),()=>online,draw);
await panel.loaded;coreRoot=ui.children[0];peers.push(createLumberPanel(ui,()=>({level:0,core:1}),()=>online,draw),createFarmPanel(ui,()=>({level:0,core:1}),()=>online,draw),createKitchenPanel(ui,()=>({level:0,core:1,farm:0}),()=>online,draw));await Promise.all(peers.map(p=>p.loaded));
function draw(){panel.place(-77,300,1,innerWidth,innerHeight,pos.x,pos.y);for(const peer of peers)peer.place(-77,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
window.fixture={badges:()=>ui.children.map(root=>({label:root.label,visible:root.children[0].visible,enabled:root.children[0].eventMode==='static'&&root.children[0].interactiveChildren,point:root.children[0].toGlobal({x:0,y:0})})),peerStates:()=>peers.map(p=>p.snapshot()),closePoint:()=>coreRoot.children[1].getChildByLabel('Close Core upgrade').toGlobal({x:515,y:30}),destroyCore:()=>coreRoot.destroy({children:true}),switchLevel:async n=>{coreRoot.destroy({children:true});panel=createCoreUpgradePanel(ui,n,()=>online,draw);coreRoot=ui.children[ui.children.length-1];ui.setChildIndex(coreRoot,0);await panel.loaded;draw();},texts:()=>{const out=[];function walk(c){if(typeof c.text==='string')out.push(c.text);for(const child of c.children||[])walk(child)}walk(ui);return [...new Set(out)];},open:()=>{ui.children[0].children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=ui.children[0].children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},snapshot:()=>panel.snapshot(),move:(x,y)=>{pos={x,y};draw()},online:v=>{online=v;draw()}};draw();` }));
 await p.goto('http://127.0.0.1:5196/core-upgrade-test');await p.waitForFunction(()=>window.fixture,{timeout:45000});
 assert((await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.mouse.click(500,540);assert((await p.evaluate(()=>window.fixture.snapshot())).open);report.checks.push('actual pointer tap opens native Pixi panel');
 assert((await p.evaluate(()=>window.fixture.badges())).every(b=>!b.visible&&!b.enabled));
 const blocked=await p.evaluate(()=>window.fixture.badges());for(const badge of blocked)await p.mouse.click(badge.point.x,badge.point.y);
 assert((await p.evaluate(()=>window.fixture.peerStates())).every(s=>!s.open));
 report.checks.push('real Core/Farm/Lumber/Kitchen modules: all external badges immediately hidden and disabled while Core opens');
 await p.screenshot({path:'docs/core-upgrade/pixi-desktop.png',timeout:15000});
 await p.keyboard.press('Escape');assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);
 assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));
 await p.mouse.click(500,540);const closePoint=await p.evaluate(()=>window.fixture.closePoint());await p.mouse.click(closePoint.x,closePoint.y);
 assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));
 const peerPoint=(await p.evaluate(()=>window.fixture.badges()))[1].point;await p.mouse.click(peerPoint.x,peerPoint.y);
 assert((await p.evaluate(()=>window.fixture.peerStates()))[0].open);assert((await p.evaluate(()=>window.fixture.badges())).every(b=>!b.visible&&!b.enabled));
 await p.keyboard.press('Escape');assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));
 report.checks.push('actual close-button and Escape restore appropriate badges; opening peer panel also suppresses every external badge');
 await p.mouse.click(500,540);assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.move(577,500));assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);assert((await p.evaluate(()=>window.fixture.badges())).every(b=>!b.visible&&!b.enabled));
 await p.evaluate(()=>window.fixture.move(577,420));await p.mouse.click(500,540);assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.online(true));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);report.checks.push('leave range closes panel; Escape closes; co-op hides interaction');
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5196/core-upgrade-test');await p.waitForFunction(()=>window.fixture,{timeout:45000});
 // Anchor is outside this fixture camera on mobile; use Pixi event dispatch to open, then verify clamped rendered bounds.
 await p.evaluate(()=>window.fixture.open());const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=390);await p.screenshot({path:'docs/core-upgrade/pixi-mobile.png',timeout:15000});report.mobileBounds=bounds;assert((await p.evaluate(()=>window.fixture.badges())).every(b=>!b.visible&&!b.enabled));
 report.checks.push('mobile panel fits viewport');
 await p.setViewportSize({width:1000,height:800});await p.goto('http://127.0.0.1:5196/core-upgrade-test?level=30');await p.waitForFunction(()=>window.fixture,{timeout:45000});assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe,null);report.checks.push('level 30 maximum tier');
 await fs.mkdir('public/core-upgrade/kit-v2/transitions',{recursive:true});
 report.transitions=[];
 for(let level=1;level<30;level++){
  await p.evaluate(async level=>{await window.fixture.switchLevel(level);window.fixture.open();},level);
  const state=await p.evaluate(()=>window.fixture.snapshot());const texts=await p.evaluate(()=>window.fixture.texts());
  assert.deepEqual(state.requirements,[`Core level ${level}`]);
  assert(texts.includes(`Core level ${level}`));for(const forbidden of ['Owned solo base','Build queue idle','Storage capacity'])assert(!texts.includes(forbidden));
  assert(texts.includes(Math.ceil(300*1.25**level).toLocaleString('en-US')));assert(texts.includes(Math.ceil(150*1.25**level).toLocaleString('en-US')));assert(texts.includes(Math.ceil(5*1.2**level).toLocaleString('en-US')+' min'));
  const file=`transition-${String(level).padStart(2,'0')}-${String(level+1).padStart(2,'0')}.png`;
  const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=1000);
  await p.screenshot({path:'public/core-upgrade/kit-v2/transitions/'+file,clip:bounds,timeout:15000});
  report.transitions.push({...state,file,texts});
 }
 report.checks.push('all 29 upgrade transitions: generated tier portraits, single correct Core requirement, exact rendered costs and duration');
 await fs.writeFile('public/core-upgrade/kit-v2/transitions.json',JSON.stringify(report.transitions,null,2));
 await p.evaluate(()=>window.fixture.destroyCore());assert((await p.evaluate(()=>window.fixture.badges())).every(b=>b.visible&&b.enabled));report.checks.push('destroying open Core restores peer badges');
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile('docs/core-upgrade/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}
console.log(report);
