import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {launchOptions} from './typography/browser.mjs';
const source=await fs.readFile('src/stronghold/tent-shadow.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {tentHeightAt,withTentGeometry}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const h=(x,y)=>tentHeightAt(x/756,y/498);
assert.equal(h(274,140),260);assert.equal(h(560,35),260);
assert.equal(h(371,316),142);assert.equal(h(662,191),142);
for(const [x,y] of [[136,390],[380,459],[688,300],[455,483],[47,390],[748,282]])assert.ok(h(x,y)<1e-6,'ground contact');
// Equal-height ridge endpoints preserve the 105px longitudinal ground depth.
assert.equal(140+h(274,140)-(35+h(560,35)),105);
for(const scale of [.5,1,2])for(const shear of [-.2,0,.2]){
 const p={x:200,y:300,width:756*scale,height:498*scale,pivot:[.5,.95],shear,vertical:.8};const q=withTentGeometry(p);
 const lx=(274/756-.5)*p.width,y=p.y+shear*lx+(140/498-.95)*p.height*.8;
 assert.ok(Math.abs(q.heightAtScreen(p.x+lx,y)-260*scale*.8)<1e-6);
}
const out=process.env.OUT||'docs/tent-shadow';await fs.mkdir(out,{recursive:true});
const vite=process.env.BASE_URL?null:await createServer({server:{host:'127.0.0.1',port:5643,strictPort:true,hmr:false,watch:null},logLevel:'error'});await vite?.listen();
let browser;const report={base:process.env.BASE_URL||'http://127.0.0.1:5643',errors:[],runs:[]};
try{
 browser=await chromium.launch(launchOptions());
 const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('arkodia.hero','ember-warden');localStorage.removeItem('arkodia.stronghold.hero');});
 for(const time of (process.env.TIMES||'.3,.52,.72').split(',')){
  await page.goto(`${report.base}/?offline=1&time=${time}`,{timeout:120000});
  await page.waitForFunction(()=>window.__SCENE_SHADOWS__?.stats().ready&&!document.querySelector('#loading-screen'),null,{timeout:120000});
  await page.waitForTimeout(700);
  const stats=await page.evaluate(()=>window.__SCENE_SHADOWS__.stats());assert.equal(stats.error,'');console.log(JSON.stringify({time,ready:stats.ready,error:stats.error}));
  const image=`${process.env.PREFIX||'after'}-${time}.png`;await page.screenshot({path:out+'/'+image,timeout:120000});report.runs.push({time,stats,image});
 }
 assert.deepEqual(report.errors,[]);
}finally{await browser?.close();await vite?.close();await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:true,runs:report.runs.length,errors:report.errors}));
