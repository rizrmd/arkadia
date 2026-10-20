import {chromium} from 'playwright';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3018';const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3018'}});let browser;
try{
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const context=await browser.newContext({isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[390,844],[360,640],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.goto(base+'/stronghold.html');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  const dimensions=await page.evaluate(()=>({pageHeight:document.documentElement.scrollHeight,height:innerHeight,sceneHeight:document.querySelector('.scene').getBoundingClientRect().height,pageWidth:document.body.scrollWidth,width:document.body.clientWidth}));
  assert(dimensions.pageHeight<=dimensions.height,JSON.stringify(dimensions));assert(dimensions.sceneHeight>dimensions.height*.65,'Courtyard must occupy most of screen height');
  if(width<height)assert(dimensions.pageWidth>dimensions.width,'Portrait game must pan horizontally');
  for(const building of ['mine','altar','barracks','forge','mage','expedition','gate']){
   await page.locator('.building[data-building='+building+']').click();
   assert(await page.locator('aside').evaluate(e=>e.scrollHeight<=e.clientHeight),'Building panel must fit without internal vertical scrolling: '+building);
  }
  await page.locator('.building[data-building=forge]').click();await page.evaluate(()=>{document.body.scrollLeft=0;window.scrollTo(0,9999);});assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({path:`docs/fortress-ui/mobile-fit-${width}x${height}.png`});
  await page.locator('#claim').scrollIntoViewIfNeeded();await page.locator('#claim').click();
  assert.equal(await page.evaluate(()=>scrollY),0);await page.mouse.wheel(0,600);assert.equal(await page.evaluate(()=>scrollY),0);
  const button=await page.locator('#start-run').boundingBox();assert(button.y>=0&&button.y+button.height<=height);
  await page.screenshot({path:`docs/fortress-ui/mobile-panel-${width}x${height}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS portrait 390×844, 360×640, 320×568 and landscape 844×390: large courtyard, horizontal panning, all panels fit, visible actions, no vertical page or panel scroll, no errors');
}finally{await browser?.close();server?.kill();}
