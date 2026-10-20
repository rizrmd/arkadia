import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {ISO,project,unproject} from '../src/isometric.ts';
const source=ts.transpileModule(await fs.readFile('src/stronghold/scene.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace("'../isometric'",JSON.stringify(pathToFileURL(process.cwd()+'/src/isometric.ts').href));
const {groundEdges,slots}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3020';
const server=process.env.PREVIEW_URL?null:spawn('node',['server.mjs'],{env:{...process.env,PORT:'3020'}});
const out=process.env.OUTPUT_DIR||'public/isometric';await fs.mkdir(out,{recursive:true});let browser;
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
try{
 if(server)await new Promise(r=>setTimeout(r,500));
 browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
 const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(base+'/stronghold.html')).status(),200);await page.locator('.building').first().waitFor();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 const buildings=await page.locator('.building').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e),i=e.querySelector('img'),m=new DOMMatrix(getComputedStyle(i).transform);return {id:e.dataset.building,x:parseFloat(s.left),y:parseFloat(s.top),depth:+s.zIndex,matrix:[m.a,m.b,m.c,m.d],origin:getComputedStyle(i).transformOrigin};}));
 assert.equal(buildings.length,7);
 for(const b of buildings){const [a,shear,c,d]=b.matrix;near(a,1);near(c,0);near(b.x,slots[b.id].x);near(b.y,slots[b.id].y);near(b.depth,b.y);for(const [i,edge] of [groundEdges[b.id].rising,groundEdges[b.id].falling].entries()){const dx=edge[1][0]-edge[0][0],dy=edge[1][1]-edge[0][1];near((shear*dx+d*dy)/dx,i===0?-ISO.slope:ISO.slope);}const p=unproject(b.x,b.y),q=project(p.x,p.y);near(q.x,b.x);near(q.y,b.y);await page.locator(`[data-building=${b.id}].building`).click();assert.equal(await page.locator('.building.selected').getAttribute('data-building'),b.id);}
 await page.mouse.move(1500,1000);await page.locator('.building.forge').click();await page.mouse.move(1500,1000);await page.screenshot({path:out+'/desktop.png'});

 const image=page.locator('.building.barracks img'),box=await image.boundingBox();
 const clip={x:box.x-30,y:Math.max(0,box.y-20),width:box.width+60,height:box.height+65};
 await page.screenshot({path:out+'/barracks.png',clip});
 await image.evaluate((img,{edges,slot})=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),s=getComputedStyle(img);
  svg.setAttribute('viewBox',`0 0 ${img.naturalWidth} ${img.naturalHeight}`);
  Object.assign(svg.style,{position:'absolute',left:slot.x+'px',top:slot.y+'px',width:s.width,height:s.height,transform:s.transform,transformOrigin:s.transformOrigin,overflow:'visible',pointerEvents:'none'});
  for(const [name,[a,b]] of Object.entries(edges)){
   const line=document.createElementNS(svg.namespaceURI,'line'),dx=b[0]-a[0],dy=b[1]-a[1];
   for(const [k,v] of Object.entries({x1:a[0]-.2*dx,y1:a[1]-.2*dy,x2:b[0]+.5*dx,y2:b[1]+.5*dy,stroke:name==='rising'?'#ff70af':'#67efff','stroke-width':4}))line.setAttribute(k,String(v));svg.append(line);
  }svg.id='angle-guides';svg.style.zIndex='999';document.querySelector('.scene-world').append(svg);
 },{edges:groundEdges.barracks,slot:slots.barracks});
 await page.screenshot({path:out+'/barracks-guides.png',clip});
 await page.locator('#angle-guides').evaluate(e=>e.remove());
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>{document.body.scrollLeft=220;});await page.mouse.move(0,0);await page.screenshot({path:out+'/mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
 await page.setViewportSize({width:1536,height:1024});await page.goto(base+'/');await page.waitForFunction(()=>window.__ARKADIA_ARENA__&&window.__ARKADIA_APP__);
 await page.selectOption('#crowd','12');await page.uncheck('#auto');await page.check('#grid');await page.check('#pivots');await page.uncheck('#inspect');
 const arena=await page.evaluate(()=>{
  const app=window.__ARKADIA_APP__,arena=window.__ARKADIA_ARENA__,world=app.stage.children[0];app.ticker.stop();
  const floor=world.children[0].children.map(s=>({x:s.x,y:s.y,width:s.width,height:s.height}));
  const props=world.children[2].children.filter(s=>s.anchor).map(s=>({label:s.label,x:s.x,y:s.y,depth:s.zIndex,anchor:[s.anchor.x,s.anchor.y]}));
  const actors=arena.actors.map(a=>({kind:a.kind,anchor:[a.sprite.anchor.x,a.sprite.anchor.y],expected:[a.set.anchor.x,a.set.anchor.y],clips:Object.values(a.set.meta.clips).map(c=>c.frames.length)}));
  const directions=[];for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){arena.respawnHero();arena.hero.x=4;arena.hero.y=4;arena.hero.x+=dx;arena.hero.y+=dy;arena.sync();directions.push({dx,dy,x:arena.hero.view.x,y:arena.hero.view.y,depth:arena.hero.view.zIndex});}
  arena.respawnHero();arena.sync();app.render();return {floor,props,actors,directions};
 });
 assert.equal(arena.floor.length,100);for(const f of arena.floor)near(f.width/f.height,2);
 for(const p of arena.props){near(p.y,p.depth);const g=unproject(p.x,p.y);assert(Number.isFinite(g.x)&&Number.isFinite(g.y));assert(p.anchor.every(Number.isFinite));}
 for(const a of arena.actors){assert.deepEqual(a.anchor,a.expected);assert(a.clips.every(n=>n>0));}
 for(const d of arena.directions){const p=project(4+d.dx-4.5,4+d.dy-4.5);near(d.x,Math.round(p.x));near(d.y,Math.round(p.y));near(d.depth,d.y);}
 await page.screenshot({path:out+'/arena-grid.png'});assert.deepEqual(errors,[]);
 const result={base,projection:ISO,buildings,arena,errors,passed:true};await fs.writeFile(out+(process.env.PREVIEW_URL?'/live.json':'/local.json'),JSON.stringify(result,null,2));console.log(`PASS ${buildings.length} building cameras; 100 floor ratios; ${arena.props.length} grounded props; ${arena.actors.length} actor pivots/all clips; 4 actor axes; mobile fit; no errors`);
}finally{await browser?.close();server?.kill();}
