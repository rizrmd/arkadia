import {chromium} from 'playwright';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchOptions} from '../typography/browser.mjs';
const remote=process.env.VERIFY_URL,tag=remote?'live':'local',out='docs/rift-dash/skill-tree';
const vite=remote?null:await createServer({server:{host:'127.0.0.1',port:5289,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
const report={base:remote||'http://127.0.0.1:5289',views:{},errors:[]};let browser;
try{
 for(const [view,width,height,touch] of [['desktop',1440,900,false],['portrait',390,844,true],['landscape',844,390,true]]){
  console.log('Checking',view);browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(report.base+'/?offline=1&hero=rift-runner&time=.45');
  await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true'&&window.__STRONGHOLD_COMBAT__?.skillTree&&!document.getElementById('loading-screen'),null,{timeout:300000});
  const tree=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.snapshot());
  const focus=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.tree.show('rift-dash',1));
  const dash=t=>t.nodes.find(n=>n.id==='rift-dash');
  const click=async(x,y)=>{if(!touch)return page.mouse.click(x,y);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await focus();await page.waitForTimeout(900);let t=await tree();
  assert.equal(dash(t).kind,'active');assert.equal(dash(t).shape,'hexagon');assert.equal(dash(t).learned,false);assert.equal(dash(t).pipCount,5);
  await page.screenshot({timeout:120000,path:`${out}/${tag}-${view}-unlearned.png`});
  await page.evaluate(()=>{const c=window.__STRONGHOLD_COMBAT__;c.skillTree.close();for(const [offer,pick] of [[['rift-dash','might','heal'],'rift-dash'],[['rift-trap','might','heal'],'rift-trap']]){c.offer(offer);c.choose(pick);}c.clearFoes();});
  await focus();await page.waitForTimeout(900);t=await tree();assert.equal(dash(t).slot,2);assert.equal(dash(t).learned,true);assert.equal(dash(t).shape,'hexagon');assert.equal(dash(t).pips,1);
  await page.screenshot({timeout:120000,path:`${out}/${tag}-${view}-equipped.png`});const equipped=dash(t);
  let trap=t.nodes.find(n=>n.id==='rift-trap');assert(trap.inView);await click(trap.screen.x,trap.screen.y);await page.waitForTimeout(500);t=await tree();assert.equal(dash(t).slot,3,'equipped skills swap');assert.equal(dash(t).shape,'hexagon');
  // Move Dash back using the actual tree hit target; passive nodes never equip.
  const d=dash(t);await click(d.screen.x,d.screen.y);await page.waitForTimeout(500);t=await tree();assert.equal(dash(t).slot,2);assert.match(t.hint,/Rift Dash.*Skill 2/);
  await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.skillTree.close());await page.waitForTimeout(300);
  const snap=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot());const before=await snap();const socket=before.hudGeometry.sockets[1];
  if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:socket.x,y:socket.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:socket.x-70,y:socket.y-50,id:1}]});assert((await snap()).manualDash.aiming);assert.equal((await snap()).manualDash.last,null);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(width*.3,height*.55);await page.keyboard.press('2');}
  await page.waitForTimeout(90);const after=await snap();assert(after.manualDash.last?.distance>.1,'manual dash displaces actor');
  await page.screenshot({timeout:120000,path:`${out}/${tag}-${view}-cast.png`});
  report.views[view]={equipped,afterSwap:dash(t),manualDash:after.manualDash.last,pass:true};await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);
}finally{await fs.writeFile(`${out}/${tag}-verification.json`,JSON.stringify(report,null,2));await browser?.close();await vite?.close();}
console.log(JSON.stringify(report,null,2));
