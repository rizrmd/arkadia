import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {chromium} from 'playwright';import sharp from 'sharp';import assert from 'node:assert/strict';
const root=path.resolve('public'),local=!process.env.DEMO_URL,server=local?http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://local').pathname;const f=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+'/'))throw Error('Path');res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':f.endsWith('.webp')?'image/webp':'image/png');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1'):null;
if(server)await new Promise(r=>server.on('listening',r));const base=process.env.DEMO_URL||`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1200,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(base+'/enemies/v1/');await page.waitForFunction(()=>window.enemyPreviewReady);
 const manifest=await page.evaluate(()=>window.enemyPreview.manifest),checks=[];
 for(const [name,clip]of Object.entries(manifest.characters.ashfang.clips)){
   await page.evaluate(n=>window.enemyPreview.setClip(n),name);
   await page.waitForFunction(v=>window.enemyPreview.state.clip===v.name&&window.enemyPreview.state.seen?.length===v.n,{name,n:clip.frames.length},{timeout:5000}).catch(async e=>{console.log(name,await page.evaluate(()=>window.enemyPreview.state),errors);throw e});
   if(!clip.loop){await page.waitForTimeout(350);assert.equal((await page.evaluate(()=>window.enemyPreview.state)).index,clip.frames.length-1);}
   checks.push({clip:name,framesObserved:clip.frames.length,oneShotHold:!clip.loop});
 }
 await page.selectOption('#view','mirror');await page.evaluate(()=>window.enemyPreview.setClip('move'));await page.waitForFunction(()=>window.enemyPreview.state.mirrored);
 await page.check('#transition');await page.evaluate(()=>window.enemyPreview.setClip('attack'));await page.waitForFunction(()=>['idle before','action','idle after'].every(p=>window.enemyPreview.state.phases.includes(p)),null,{timeout:5000});
 await page.uncheck('#transition');await page.selectOption('#view','original');await page.evaluate(()=>window.enemyPreview.setClip('attack'));await page.waitForFunction(()=>window.enemyPreview.state.index===3);await page.click('#play');
 await page.screenshot({path:`docs/enemies-v1/${local?'local':'live'}-playback.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const pixel=[];
 for(const m of Object.values(manifest.characters)){
   const response=await page.request.get(base+'/enemies/v1/'+m.image);assert.equal(response.status(),200);const b=await response.body(),{data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([info.width,info.height],m.atlasSize);assert.equal(m.frames.length,48);
   for(const f of m.frames){let opaque=0;for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){const a=data[((y+f.y)*info.width+x+f.x)*4+3];opaque+=a>0;if(x===0||y===0||x===f.w-1||y===f.h-1)assert.equal(a,0);}assert.ok(opaque>100);}
   for(const [n,c]of Object.entries(m.clips)){const r=await page.request.get(base+`/enemies/v1/previews/${m.id}-${n}.webp`);assert.equal(r.status(),200);const meta=await sharp(await r.body(),{animated:true}).metadata();assert.equal(meta.pages||1,c.frames.length);}
   pixel.push({id:m.id,frames:48,allBordersTransparent:true,allAnimatedPreviewsValid:true});
 }
 assert.deepEqual(errors,[]);const report={base,checks,pixel,mirror:true,attackTransition:true,mobileOverflow:false,errors};await fs.writeFile(`docs/enemies-v1/${local?'local':'live'}-playback.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server?.close()}
