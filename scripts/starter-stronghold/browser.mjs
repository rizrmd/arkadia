import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import {createServer} from 'node:http';import {Readable} from 'node:stream';import assert from 'node:assert/strict';
const out='docs/starter-stronghold';await fs.mkdir(out,{recursive:true});
let server,browser;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
let base=process.env.BASE_URL;
if(!base){const root=path.resolve(process.env.SITE_DIR||'/home/dev/releases/starter-stronghold-check/site');server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+'/'))throw Error('bad path');try{const data=await fs.readFile(f);res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(data);return;}catch{}const upstream=await fetch('https://arkodia.online'+u.pathname+u.search,{signal:AbortSignal.timeout(30000)});res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/octet-stream'});Readable.fromWeb(upstream.body).pipe(res);}catch(e){res.writeHead(502);res.end(String(e));}});await new Promise(r=>server.listen(19770,'127.0.0.1',r));base='http://127.0.0.1:19770';}
const report={base,cases:[],errors:[],scope:'Offline isolated browser saves; production map read only'};
try{
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let context,page;const loaded=new Set();
 const advance=ms=>process.env.REAL_TIME?page.waitForTimeout(ms):page.clock.fastForward(ms);
 const click=async label=>{const b=await page.evaluate(label=>{function find(c){if(c.label===label)return c;for(const ch of c.children??[]){const r=find(ch);if(r)return r;}}const c=find(window.__PIXI_UI__.app.stage);if(!c)throw Error('Missing Pixi control '+label);const b=c.getBounds();return {x:b.x+b.width/2,y:b.y+b.height/2};},label);await page.mouse.click(b.x,b.y);};
 for(const mode of (process.env.VISUAL_ONLY?['locked']:['locked','watchtower','runetower'])){
  const hero=mode==='runetower'?'ember-warden':'rift-runner';
  await context?.close();context=await browser.newContext({viewport:{width:1024,height:768}});page=await context.newPage();page.on('console',m=>{if(/webgl|texture|invalid|gpu/i.test(m.text()))console.log('GPU diagnostic',m.text().slice(0,300));});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===200&&r.url().includes('/buildings/starter-stronghold/'))loaded.add(new URL(r.url()).pathname);});
 await page.addInitScript(mode=>{localStorage.setItem('arkodia.desktop-movement-hint.v1','1');const k='arkodia-stronghold-v1';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,at:Date.now(),revision:0,gold:600,mana:80,souls:20,storedGold:0,storedMana:0,levels:{mine:1,altar:1,barracks:1,forge:1,mage:1,expedition:1,gate:1},hero:false,training:0,skill:0,weapon:0,affix:0,runId:'',rewarded:['retained-run'],built:['expedition','gate'],resources:{wood:100,food:0,storedWood:0,storedFood:0},...(mode==='locked'?{}:{strongholdCore:{completedLevel:12}})}));},mode);
 if(!process.env.REAL_TIME)await page.clock.install();

  await page.goto(base+'/?offline=1&quality=low&shadowField=0&time=.5&hero='+hero);
  await page.waitForFunction(()=>window.__STARTER_ENCLOSURE__&&window.__STRONGHOLD_COMBAT__&&window.__PIXI_UI__?.buildingTree&&!document.getElementById('loading-screen'),null,{timeout:120000});console.log('Loaded starter case:',mode);
  const enclosure=await page.evaluate(()=>window.__STARTER_ENCLOSURE__());assert.equal(enclosure.walls.length,12);assert.equal(enclosure.bastions,0);assert(enclosure.walls.every(w=>w.file.includes('/starter-stronghold/snowy-')));
  await click('Open Building Tree');await advance(100);
  if(mode!=='locked'){await click(hero==='rift-runner'?'Requires Runeseekers':'Requires Stormshade');assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).careerDefenses??{}).length),0);}
  await click(mode==='runetower'?'Build Runetower':'Build Watchtower');
  if(mode!=='locked')await page.waitForFunction(hero=>!!JSON.parse(localStorage.getItem('arkodia-stronghold-v1')).careerDefenses?.[hero],hero);
  await click('Close');
  await advance(1500);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));
  assert.deepEqual(saved.rewarded,['retained-run']);
  if(mode==='locked'){assert.equal(Object.keys(saved.careerDefenses??{}).length,0);assert.equal(saved.resources.wood,100);assert.equal(saved.gold,600);}
  else{assert.equal(saved.careerDefenses[hero],mode==='runetower'?'arcane-tower':'watchtower');assert.equal(saved.resources.wood,75);assert.equal(saved.gold,500);}
  const tower=await page.evaluate(()=>{function find(c){if(c.label==='Level 1 faction defense')return c;for(const ch of c.children??[]){const r=find(ch);if(r)return r;}}const t=find(window.__PIXI_UI__.app.stage);return t?{visible:t.visible,anchor:t.anchor.y}:null;});assert(tower);assert.equal(tower.visible,mode!=='locked');assert(Math.abs(tower.anchor-860/900)<1e-8);
  if(mode==='locked'){
   const image=await page.evaluate(()=>window.__WORLD_SURFACE__.toDataURL('image/png'));
   await fs.writeFile(out+'/'+(process.env.BASE_URL?'production':'local')+'-enclosure.png',Buffer.from(image.split(',')[1],'base64'));
  }
  const painted=await page.evaluate(()=>{const app=window.__PIXI_UI__.app;app.render();let surface;function find(c){if(c.texture?.source?.resource?.id==='world-surface')surface=c;c.children?.forEach(find);}find(app.stage);const b=surface.getBounds(),canvas=window.__WORLD_SURFACE__,x=380,y=440,size=32,u=Math.floor((x-b.x)/b.width*canvas.width),v=Math.floor((y-b.y)/b.height*canvas.height),w=Math.round(size*canvas.width/b.width),h=Math.round(size*canvas.height/b.height);const avg=data=>{const a=[0,0,0];for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)a[c]+=data[i+c];return a.map(n=>Math.round(n/(data.length/4)));};const cpu=avg(canvas.getContext('2d').getImageData(u,v,w,h).data),gl=app.renderer.gl,r=app.renderer.resolution,pixels=new Uint8Array(Math.round(size*r)**2*4),previous=gl.getParameter(gl.FRAMEBUFFER_BINDING);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.readPixels(Math.floor(x*r),app.canvas.height-Math.floor((y+size)*r),Math.round(size*r),Math.round(size*r),gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.bindFramebuffer(gl.FRAMEBUFFER,previous);const gpu=avg(pixels);return {cpu,gpu,difference:cpu.reduce((n,c,i)=>n+Math.abs(c-gpu[i]),0),outsideAlpha:canvas.getContext('2d').getImageData(0,0,1,1).data[3]};});
  assert(painted.difference<40,'GPU court area must match baked court rather than overlaid snow: '+JSON.stringify(painted));assert.equal(painted.outsideAlpha,0,'Terrain remains visible outside the baked court');
  const screen=await page.evaluate(()=>{const app=window.__PIXI_UI__.app;app.render();return app.canvas.toDataURL('image/png');});
  await fs.writeFile(out+'/'+(process.env.BASE_URL?'production':'local')+'-'+mode+'.png',Buffer.from(screen.split(',')[1],'base64'));
  const nav=await page.evaluate(()=>window.__STRONGHOLD_NAV__());assert(nav.columns.some(c=>Math.abs(c.x-577)<3&&c.back<320&&c.front>320),'Core remains centered');
  if(mode==='locked'){
   const blocked=(x,y)=>nav.columns.some(c=>Math.abs(x-c.x)<c.w/2+9&&y>c.back-4.5&&y<c.front+4.5);
   assert(!blocked(590,420));for(let y=420;y<710;y+=2)assert(!blocked(590,y),'Clear gateway approach '+y);
   const initial=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);await page.keyboard.down('KeyS');for(let n=0;n<12;n++)await advance(100);await page.keyboard.up('KeyS');const after=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.combatants()[0]);assert(after.y>initial.y+40,'Actual movement from safe starter spawn');report.starterMovement={initial,after,clearGatewayApproach:true};
  }
  report.cases.push({mode,hero,walls:12,bastions:0,tower,painted,resourceChargesPreserved:true,crossFactionDenied:mode!=='locked',coreGateEnforced:mode==='locked'});
 }
 if(process.env.VISUAL_ONLY){report.visual=await page.evaluate(()=>{const app=window.__PIXI_UI__.app,out=[];function walk(c){if(c.texture?.source?.resource?.id==='world-surface'){const b=c.getBounds();out.push({visible:c.visible,renderable:c.renderable,alpha:c.alpha,x:c.x,y:c.y,w:c.width,h:c.height,bounds:{x:b.x,y:b.y,w:b.width,h:b.height},source:[c.texture.source.width,c.texture.source.height],frame:c.texture.frame,uvs:c.texture.uvs,textureScaleMode:c.texture.source.scaleMode,maxTexture:app.renderer.gl.getParameter(app.renderer.gl.MAX_TEXTURE_SIZE),glError:app.renderer.gl.getError(),parentVisible:c.parent.visible,children:c.parent.children.map(q=>({id:q.texture?.source?.resource?.id,pipe:q.renderPipeId,z:q.zIndex}))});}c.children?.forEach(walk);}walk(app.stage);return out;});try{await page.screenshot({path:out+'/local-real-screen.png',timeout:8000});}catch(e){report.captureWarning=String(e).slice(0,100);}report.pass=true;}else{
 for(const name of ['snowy-ne.png','snowy-se.png','watchtower-01.png','runetower-01.png'])assert(loaded.has('/buildings/starter-stronghold/'+name),name+' loaded');
 await page.reload();await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&!document.getElementById('loading-screen'),null,{timeout:120000});
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('arkodia-stronghold-v1')));assert.equal(persisted.careerDefenses['ember-warden'],'arcane-tower');assert.equal(persisted.resources.wood,75);assert.equal(persisted.gold,500);
 await page.setViewportSize({width:390,height:844});await advance(200);await page.waitForFunction(()=>window.__PIXI_UI__.app.screen.width===390,null,{timeout:10000});assert.equal(await page.evaluate(()=>window.__PIXI_UI__.app.screen.width),390);
 assert.deepEqual(report.errors,[]);report.loaded=[...loaded];report.reloadPreserved=true;report.mobilePixiResize=true;report.pass=true;}
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await fs.writeFile(out+'/'+(process.env.VISUAL_ONLY?'visual':process.env.BASE_URL?'production':'local')+'-browser.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS: starter enclosure, both legal faction defenses, locked Core gate, save/reload charges and Pixi mobile resize');
