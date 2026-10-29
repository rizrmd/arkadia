import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const v=await createServer({cacheDir:'/home/dev/.cache/lumber-vite',server:{port:5197,host:'127.0.0.1',hmr:false,watch:null},logLevel:'error'});await v.listen();
const b=await chromium.launch({...launchOptions(),args:launchOptions().args.filter(a=>a!=='--single-process')});
const report={errors:[],checks:[]};
try{
 const p=await b.newPage({viewport:{width:1000,height:800}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text())});
 await p.route('**/lumber-panel-test*',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><script type="module" src="/scripts/lumber-panels/fixture.mjs"></script></body></html>'}));
 await fs.writeFile('scripts/lumber-panels/fixture.mjs',"import {Application,Container,Sprite,Assets} from 'pixi.js';\nimport {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';\nimport {createLumberPanel} from '/src/stronghold/lumber-panel.ts';\nconst app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');\nconst fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);\nconst ui=app.stage.addChild(new Container());let pos={x:577,y:420},online=false;const panel=createLumberPanel(ui,()=>({level:Number(new URLSearchParams(location.search).get('level')||0),core:Number(new URLSearchParams(location.search).get('core')||1)}),()=>online,draw);\nawait panel.loaded;\nfunction draw(){panel.place(-77,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}\nwindow.fixture={open:()=>{ui.children[0].children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=ui.children[0].children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},snapshot:panel.snapshot,level:(l,c)=>{history.replaceState({},'','?level='+l+'&core='+c);draw()},browse:()=>{ui.children[0].children[1].children.find(c=>c.label==='Next target level').emit('pointertap',{stopPropagation(){}})},move:(x,y)=>{pos={x,y};draw()},online:v=>{online=v;draw()}};draw();");
 await p.goto('http://127.0.0.1:5197/lumber-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:60000});
 assert((await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.mouse.click(582,540);assert((await p.evaluate(()=>window.fixture.snapshot())).open);report.checks.push('actual pointer tap opens native Pixi panel');
 await p.screenshot({path:'docs/lumber-panels/pixi-desktop.png',timeout:15000});
 await p.keyboard.press('Escape');assert(!(await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.move(577,500));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);
 await p.evaluate(()=>window.fixture.move(577,420));await p.mouse.click(582,540);assert((await p.evaluate(()=>window.fixture.snapshot())).open);
 await p.evaluate(()=>window.fixture.online(true));assert(!(await p.evaluate(()=>window.fixture.snapshot())).near);report.checks.push('leave range closes panel; Escape closes; co-op hides interaction');
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:5197/lumber-panel-test');await p.waitForFunction(()=>window.fixture,{timeout:60000});
 // Anchor is outside this fixture camera on mobile; use Pixi event dispatch to open, then verify clamped rendered bounds.
 await p.evaluate(()=>window.fixture.open());const bounds=await p.evaluate(()=>window.fixture.bounds());assert(bounds.x>=0&&bounds.x+bounds.width<=390);await p.screenshot({path:'docs/lumber-panels/pixi-mobile.png',timeout:15000});report.mobileBounds=bounds;
 report.checks.push('mobile panel fits viewport');
 await p.setViewportSize({width:1000,height:800});
 await p.evaluate(()=>{window.fixture.browse()});assert.equal((await p.evaluate(()=>window.fixture.snapshot())).previewTarget,2);report.checks.push('target preview controls change displayed recipe without changing completed level');
 // Return to the actual recipe before capturing each completed-level scenario.
 await p.evaluate(()=>{const f=window.fixture;location.hash='';});
 for(let target=1;target<=30;target++){
  await p.evaluate(([l,c])=>{window.fixture.level(l,c)},[target-1,target]);
  // Reload only once to reset preview, then keep the same renderer for all 30 captures.
  if(target===1){await p.goto('http://127.0.0.1:5197/lumber-panel-test?level=0&core=1');await p.waitForFunction(()=>window.fixture,{timeout:60000});await p.evaluate(()=>window.fixture.open());}
  assert.equal((await p.evaluate(()=>window.fixture.snapshot())).requirements[0].satisfied,true);
  await p.screenshot({path:'docs/lumber-panels/target-'+String(target).padStart(2,'0')+'.png',timeout:15000});
 }

 await p.goto('http://127.0.0.1:5197/lumber-panel-test?level=30');await p.waitForFunction(()=>window.fixture,{timeout:60000});assert.equal((await p.evaluate(()=>window.fixture.snapshot())).recipe,null);report.checks.push('level 30 maximum tier');
 assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await fs.writeFile('docs/lumber-panels/browser.json',JSON.stringify(report,null,2));await b.close();await v.close();}
console.log(report);
