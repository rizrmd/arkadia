import {createServer} from 'vite';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {launch} from '../vfx/browser.mjs';
const out='docs/skill-inspection';
const vite=await createServer({server:{host:'127.0.0.1',port:5294,hmr:false,watch:null},logLevel:'error'});await vite.listen();
const report={mode:'Actual Pixi tree isolated from world loading',views:[],errors:[]};let browser;
try{for(const [name,width,height,touch] of [['desktop',1440,900,false],['portrait',390,844,true],['landscape',844,390,true]]){
 browser=await launch();const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});page.on('console',m=>{if(m.type()==='error')console.log(m.text());});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/__floating',r=>r.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#080b0e"><script type="module" src="/scripts/skill-inspection/floating-harness.ts"></script></body></html>'}));
 await page.addInitScript(()=>window.__HUD_REVISION__='floating-verification');await page.goto('http://127.0.0.1:5294/__floating');await page.waitForFunction(()=>window.test,null,{timeout:45000});
 await page.waitForTimeout(600);await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 const snap=()=>page.evaluate(()=>window.test.tree.snapshot());
 const geom=t=>({panel:t.panel,view:t.view,u:t.u,scroll:t.scroll,maxScroll:t.maxScroll,nodes:t.nodes.map(n=>({id:n.id,screen:n.screen}))});
 const click=async(x,y)=>{if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.clock.runFor(40);};
 const control=async id=>{await page.clock.runFor(100);await page.evaluate(()=>window.test.app.renderer.render(window.test.app.stage));const t=await snap(),c=t.inspection.controls[id];assert(c,id);await click(t.panel.x+c.x,t.panel.y+c.y);};
 let t=await snap();const initial=geom(t),slots=t.nodes.map(n=>n.slot);assert(t.inspection.visible);assert(t.inspection.preview.width<t.panel.width);assert.equal(t.inspection.preview.width,t.inspection.preview.height);
 const drag=async(dx,dy)=>{await page.clock.runFor(100);await page.evaluate(()=>window.test.app.renderer.render(window.test.app.stage));const t=await snap(),h=t.inspection.controls['preview-drag'],x=t.panel.x+h.x,y=t.panel.y+h.y;
 if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();}await page.clock.runFor(50);};
 const origin=t.inspection.preview;await drag(-60,-70);t=await snap();assert(Math.abs(t.inspection.preview.x-Math.max(8,origin.x-60))<2);assert(Math.abs(t.inspection.preview.y-Math.max(8,origin.y-70))<2);assert.deepEqual(geom(t),initial);assert.deepEqual(t.nodes.map(n=>n.slot),slots);await drag(origin.x-t.inspection.preview.x,origin.y-t.inspection.preview.y);assert.deepEqual(geom(await snap()),initial);
 await control('preview-close');assert(!(await snap()).inspection.visible);assert.deepEqual(geom(await snap()),initial);
 t=await snap();const dash=t.nodes.find(n=>n.id==='rift-dash');await click(dash.screen.x,dash.screen.y);assert((await snap()).inspection.visible);assert.deepEqual(geom(await snap()),initial);assert.deepEqual((await snap()).nodes.map(n=>n.slot),slots);
 await control('skill-details');assert((await snap()).inspection.details);assert.deepEqual(geom(await snap()),initial);await control('back-to-tree');assert(!(await snap()).inspection.details);assert.deepEqual(geom(await snap()),initial);
 const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png'});await cdp.detach();await fs.writeFile(`${out}/square-local-${name}.png`,Buffer.from(data,'base64'));
 await control('skill-equip');assert.equal((await snap()).nodes.find(n=>n.id==='rift-dash').slot,1);assert.deepEqual(geom(await snap()),initial);
 await click(t.panel.x+t.panel.width/2,t.panel.y+28);assert(!(await snap()).inspection.visible);assert.deepEqual(geom(await snap()),initial);
 await click(dash.screen.x,dash.screen.y);await control('skill-details');await page.keyboard.press('Escape');assert(!(await snap()).inspection.details);await page.keyboard.press('Escape');assert(!(await snap()).inspection.visible);assert((await snap()).open);assert.deepEqual(geom(await snap()),initial);
 // Switch selection at an existing pan offset without recentering or relayout.
 await page.evaluate(()=>{const t=window.test.tree;t.choose(t.views.get('astral-cleave'));});t=await snap();assert.equal(t.inspection.selected,'astral-cleave');assert(t.inspection.data.rank===0);assert.deepEqual(geom(t),initial);assert.deepEqual(t.nodes.map(n=>n.slot),(await snap()).nodes.map(n=>n.slot));
 await control('skill-details');await control('details-close');assert.deepEqual(geom(await snap()),initial);
 await page.evaluate(()=>{const t=window.test.tree;t.setScroll(Math.min(t.maxScroll,120));t.choose(t.views.get('rift-bolt'));});const pan=geom(await snap());await control('preview-close');assert.deepEqual(geom(await snap()),pan);
 report.views.push({name,width,height,pass:true,layoutInvariance:true,explicitEquip:true,outsideDismiss:true,close:true,details:true,locked:true,panPreserved:true,square:true,drag:true});console.log(name,'passed');await browser.close();browser=null;
}assert.deepEqual(report.errors,[]);}finally{await fs.writeFile(`${out}/square-local-verification.json`,JSON.stringify(report,null,2));await browser?.close();await vite.close();}
