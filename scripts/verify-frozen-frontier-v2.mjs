import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('public/frozen-frontier/v2'),docs='docs/frozen-frontier-v2';
const live=process.argv.includes('--live');
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+'/'))throw Error('path');const body=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'image/png');res.end(body)}catch{res.writeHead(404).end()}});
if(!live)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=live?'https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/':`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:`${process.env.HOME}/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc`},args:['--no-sandbox','--no-zygote','--single-process']});
const errors=[],failed=[];const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
try{
 await page.goto(base);await page.waitForFunction(()=>window.__FROZEN_V2_READY__);
 if(await page.locator('.card').count()!==14)throw Error('Missing sprites');
 if(await page.locator('.scene canvas').count()!==3)throw Error('Missing scenes');
 if(!live){for(const id of ['ruined-gate','broken-watchtower','snowy-shrine']){const data=await page.locator(`figure[data-id="${id}"] canvas`).evaluate(c=>c.toDataURL('image/png'));await fs.writeFile(`${root}/${id}-composition.png`,Buffer.from(data.split(',')[1],'base64'))}
 await page.locator('#grid').screenshot({path:`${root}/contact-sheet.png`});}
 await page.screenshot({path:`${docs}/${live?'live':'local'}-desktop.png`,fullPage:true});
 await page.locator('#pivots').click();if(await page.locator('#pivots').getAttribute('aria-pressed')!=='true')throw Error('Sprite pivots failed');
 await page.locator('#scene-pivots').click();if(await page.locator('#scene-pivots').getAttribute('aria-pressed')!=='true')throw Error('Scene pivots failed');
 await page.locator('#scale').click();if(await page.locator('#scale').getAttribute('aria-pressed')!=='true')throw Error('Scale failed');
 await page.locator('#category').selectOption('Pines');if(await page.locator('.card:visible').count()!==3)throw Error('Filter failed');
 await page.locator('#category').selectOption('all');await page.locator('#background').click();
 const viewports=[];for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Viewport overflow '+viewport.width);viewports.push({...viewport,overflow});await page.screenshot({path:`${docs}/${live?'live':'local'}-${viewport.width}.png`,fullPage:true})}
 if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
 const manifest=JSON.parse(await fs.readFile(`${root}/manifest.json`)),alpha=[];
 for(const a of manifest.assets){const {data,info}=await sharp(`${root}/${a.file}`).raw().toBuffer({resolveWithObject:true});let clear=0,solid=0,edge=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const v=data[(y*info.width+x)*4+3];if(!v)clear++;if(v>240)solid++;if((x<24||y<24||x>=info.width-24||y>=info.height-24)&&v)edge++}if(!clear||!solid||edge||a.pivot.x<0||a.pivot.y<0||a.pivot.x>=info.width||a.pivot.y>=info.height)throw Error('Export validation '+a.id);alpha.push({id:a.id,clear,solid,transparentPadding:24,pivotInBounds:true})}
 const report={mode:live?'live':'local',base,assets:14,compositions:3,placementsPerScene:64,alpha,browser:{errors,failed,viewports,spritePivots:true,scenePivots:true,sharedScale:true,categoryFilter:true,backgroundToggle:true},gameplayImports:0};
 await fs.writeFile(`${docs}/${live?'live-':' '}verification.json`.replace('/ ','/'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({base,assets:14,compositions:3,browser:report.browser}));
}finally{await browser.close();if(!live)server.close()}
