import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchOptions} from './typography/browser.mjs';
// Desktop minimap: corner grips resize, dragging moves, Shift while resizing moves, double-click a grip resets.
const out=process.env.MINIMAP_OUT||'docs/minimap-resize';await mkdir(out,{recursive:true});
const server=process.env.VERIFY_URL?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8797'],{stdio:'pipe'});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('8797'))resolve();});server.on('exit',reject);});
 browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('ERROR',String(e))});
 await page.goto((process.env.VERIFY_URL||'http://127.0.0.1:8797')+'/?offline=1&time=0.35');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:240000,polling:500});
 await page.evaluate(()=>{localStorage.removeItem('arkodia.minimap.layout.v1');if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));});
 await page.waitForTimeout(800);
 const snap=()=>page.evaluate(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap.bounds);
 const mapOpen=()=>page.evaluate(()=>window.__WORLD_MAP__.snapshot().open);
 const b0=await snap();console.log('default',b0);
 const checks=[];const ok=(name,cond,data)=>{checks.push({name,pass:!!cond,data});console.log(cond?'PASS':'FAIL',name,JSON.stringify(data));};
 // 1) resize from the bottom-left grip: drag down-left grows, top-right corner stays.
 await page.screenshot({path:`${out}/1-default.png`});
 await page.mouse.move(b0.x+5,b0.y+b0.height-5);await page.mouse.down();
 for(let i=1;i<=10;i++){await page.mouse.move(b0.x+5-i*12,b0.y+b0.height-5+i*12);}
 const mid=await snap();
 await page.screenshot({path:`${out}/2-resizing.png`});
 // 2) while still resizing, hold Shift and move the whole map left.
 await page.keyboard.down('Shift');
 for(let i=1;i<=10;i++){await page.mouse.move(b0.x+5-120-i*20,b0.y+b0.height-5+120);}
 const moving=await snap();
 await page.screenshot({path:`${out}/3-moving-while-resizing.png`});
 await page.keyboard.up('Shift');await page.mouse.up();await page.waitForTimeout(100);
 const after=await snap();
 ok('resize grows the minimap',mid.width>b0.width+80,{from:b0.width,to:mid.width});
 ok('resize keeps the opposite (top-right) corner',Math.abs((mid.x+mid.width)-(b0.x+b0.width))<=1&&Math.abs(mid.y-b0.y)<=1,{b0,mid});
 ok('shift while resizing moves without resizing',moving.width===mid.width&&moving.x<mid.x-100,{mid,moving});
 ok('release keeps the layout',after.x===moving.x&&after.width===moving.width,{after});
 ok('stays square and on-screen',after.x>=0&&after.y>=0&&after.x+after.width<=1440&&after.y+after.height<=900,{after});
 ok('resizing does not open the full map',!await mapOpen());
 // 3) drag the body moves it.
 await page.mouse.move(after.x+after.width/2,after.y+after.height/2);await page.mouse.down();
 for(let i=1;i<=8;i++)await page.mouse.move(after.x+after.width/2-i*10,after.y+after.height/2+i*10);
 await page.mouse.up();await page.waitForTimeout(100);
 const dragged=await snap();
 ok('dragging does not open the full map',!await mapOpen());
 await page.mouse.click(dragged.x+dragged.width/2,dragged.y+dragged.height/2);
 ok('a fresh click after dragging opens the full map',await mapOpen());
 await page.evaluate(()=>window.__WORLD_MAP__.open(false));
 ok('dragging the body moves it',dragged.x<after.x-60&&dragged.y>after.y+60&&dragged.width===after.width,{after,dragged});
 await page.screenshot({path:`${out}/4-moved.png`});
 // 4) layout persists across reload.
 const saved=await page.evaluate(()=>localStorage.getItem('arkodia.minimap.layout.v1'));
 ok('layout saved',!!saved,{saved});
 await page.reload();
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__&&document.querySelector('#world-canvas')?.dataset.ready==='true',null,{timeout:240000,polling:500});
 await page.evaluate(()=>{if(window.__PIXI_UI__?.picker?.isOpen())window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter'}));});await page.waitForTimeout(800);
 const stored=await page.evaluate(()=>localStorage.getItem('arkodia.minimap.layout.v1'));await page.waitForFunction(w=>window.__STRONGHOLD_COMBAT__.snapshot().minimap.bounds.width===w,dragged.width,{timeout:30000,polling:250}).catch(()=>{});const reloaded=await snap();console.log('stored after reload',stored);
 ok('layout restored after reload',reloaded.x===dragged.x&&reloaded.y===dragged.y&&reloaded.width===dragged.width,{dragged,reloaded});
 // 5) double-click a grip resets.
 await page.mouse.dblclick(reloaded.x+reloaded.width-5,reloaded.y+reloaded.height-5);await page.waitForFunction(w=>window.__STRONGHOLD_COMBAT__.snapshot().minimap.bounds.width===w,b0.width,{timeout:30000,polling:250}).catch(()=>{});
 const reset=await snap();
 ok('double-click grip resets to default',reset.x===b0.x&&reset.width===b0.width,{b0,reset});
 // 6) mobile viewport has no custom layout.
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__.snapshot().minimap.bounds.width<=112,null,{timeout:30000,polling:250}).catch(()=>{});
 const mob=await snap();ok('mobile unaffected',mob.width<=112,mob);
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));
 if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await browser?.close();server?.kill();}
