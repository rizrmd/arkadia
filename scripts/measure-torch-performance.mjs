import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
const server=process.env.VERIFY_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3079'}});let browser;
try{if(server)await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:Number(process.env.VIEW_WIDTH||390),height:Number(process.env.VIEW_HEIGHT||844)}}),cdp=await page.context().newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.CPU_RATE||4)});await cdp.send('Performance.enable');
 await page.addInitScript(()=>{localStorage.clear();window.flameDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.parentElement?.id==='torch-flames')window.flameDraws++;return draw.apply(this,args);};});
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:3079')+'/?time=0');await page.waitForFunction(()=>document.querySelector('#world-surface')?.dataset.torchAssets==='ready');await page.waitForFunction(()=>document.querySelector('#world-canvas')?.dataset.ready==='true');await page.waitForTimeout(6000);
 const result={url:process.env.VERIFY_URL||'local',viewport:`${process.env.VIEW_WIDTH||390}x${process.env.VIEW_HEIGHT||844}`,cpuSlowdown:Number(process.env.CPU_RATE||4),phases:[],errors};
 for(const mode of ['idle','pan']){
  const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await page.evaluate(()=>{window.flameDraws=0;window.frameGaps=[];window.sampleFrames=true;let last=performance.now();function sample(now){window.frameGaps.push(now-last);last=now;if(window.sampleFrames)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  if(mode==='pan'){await page.mouse.move(200,350);await page.mouse.down();for(let i=0;i<60;i++){await page.mouse.move(195+Math.sin(i/8)*100,350+Math.cos(i/8)*100);await page.waitForTimeout(35);}await page.mouse.up();}else await page.waitForTimeout(3500);
  const samples=await page.evaluate(()=>{window.sampleFrames=false;const gaps=window.frameGaps.sort((a,b)=>a-b),s=document.querySelector('#world-surface');return {frames:gaps.length,p95Ms:gaps[Math.floor(gaps.length*.95)],maxMs:Math.max(...gaps),flameDraws:window.flameDraws,lightPaints:s.dataset.lightPaints};});
  const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));result.phases.push({mode,...samples,taskMs:(after.TaskDuration-before.TaskDuration)*1000,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000});
 }
 await fs.writeFile(process.env.REPORT||'docs/realistic-torch/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server?.kill();}
