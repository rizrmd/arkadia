import sharp from 'sharp';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import http from 'node:http';import path from 'node:path';import {chromium} from 'playwright';
const root=path.resolve('public/elegant-idle'),out='docs/elegant-idle';await fs.mkdir(out,{recursive:true});const m=JSON.parse(await fs.readFile(root+'/manifest.json'));
const audit={frames:[],clips:[],errors:[],player:{}};
for(const [hero,entry]of Object.entries(m.characters)){
 const sheet=await sharp(root+'/'+entry.sheet).metadata();assert.equal(sheet.width,3072);assert.equal(sheet.height,3072);assert(sheet.hasAlpha);
 for(let row=0;row<8;row++){
 const hashes=[],pixels=[];
 for(let frame=0;frame<8;frame++){
  const {data,info}=await sharp(root+'/'+entry.sheet).extract({left:frame*384,top:row*384,width:384,height:384}).raw().toBuffer({resolveWithObject:true});const hash=createHash('sha256').update(data).digest('hex');hashes.push(hash);pixels.push(data);let clear=0,bottom=-1,border=0;
  for(let y=0;y<384;y++)for(let x=0;x<384;x++){const alpha=data[(y*384+x)*4+3];if(alpha===0)clear++;if(alpha>16)bottom=Math.max(y,bottom);if((x===0||y===0||x===383||y===383)&&alpha>16)border++;}
  assert(clear>384*384*.25);assert.equal(border,0);assert(bottom>=356&&bottom<=360);audit.frames.push({hero,direction:m.directions[row],frame:frame+1,hash,clear,bottom,border});
 }
 assert.equal(new Set(hashes).size,8,'Duplicate frames');const diff=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length};const adjacent=pixels.map((p,i)=>diff(p,pixels[(i+1)%8]));audit.clips.push({hero,direction:m.directions[row],uniqueFrames:8,meanPixelDifferences:adjacent,seamDifference:adjacent[7]});
 }
 await sharp(root+'/'+entry.sheet).flatten({background:'#dce6eb'}).png().toFile(out+'/'+hero+'-atlas-light.png');
}
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('outside');const data=await fs.readFile(file);const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'}[path.extname(file)];res.writeHead(200,{'Content-Type':type||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>audit.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)audit.errors.push(r.status()+' '+r.url())});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.previewState?.ready);await page.getByRole('button',{name:'Pause',exact:true}).click();
 for(let row=0;row<8;row++){
  await page.locator(`[data-direction="${row}"]`).click();for(let frame=0;frame<8;frame++){await page.locator('#frame').fill(String(frame));assert.deepEqual(await page.evaluate(()=>[window.previewState.renderedDirection,window.previewState.renderedFrame]),[row,frame]);}
 }
 await page.getByRole('button',{name:'Next frame',exact:true}).click();assert.equal(await page.evaluate(()=>window.previewState.frame),0);await page.getByRole('button',{name:'Previous frame',exact:true}).click();assert.equal(await page.evaluate(()=>window.previewState.frame),7);
 await page.locator('#speed').selectOption('2');await page.getByRole('button',{name:'Play',exact:true}).click();const seen=new Set;for(let i=0;i<24;i++){seen.add(await page.evaluate(()=>window.previewState.renderedFrame));await page.waitForTimeout(60)}assert.equal(seen.size,8);await page.getByRole('button',{name:'Pause',exact:true}).click();const stopped=await page.evaluate(()=>window.previewState.frame);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.previewState.frame),stopped);
 await page.locator('[data-direction="3"]').click();await page.locator('#frame').fill('0');await page.screenshot({path:out+'/player-desktop.png',fullPage:true});await page.locator('#background').selectOption('snow');await page.screenshot({path:out+'/player-snow.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/player-mobile.png',fullPage:true});
 audit.player={status:'passed',scrubbedFrames:128,actualPlaybackFrames:[...seen].sort(),pause:true,stepWrap:true,directionSelection:true,mobileOverflow:false,canvasCount:await page.locator('canvas').count()};assert.equal(audit.errors.length,0);
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.writeFile(out+'/validation.json',JSON.stringify(audit,null,2)+'\n')}
console.log(JSON.stringify({frames:audit.frames.length,clips:audit.clips.length,player:audit.player,errors:audit.errors}));
