import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {launch} from '../vfx/browser.mjs';

const baseline=process.env.BASELINE==='1';
const vite=await createServer({cacheDir:`/tmp/gpu-preparation-${process.pid}`,plugins:baseline?[{name:'before-gpu-warmup',enforce:'pre',load(id){if(id.endsWith('/src/fx/stage.ts'))return execFileSync('git',['show','72db7f15:src/fx/stage.ts'],{encoding:'utf8'});}}]:[],optimizeDeps:{include:['pixi.js','nixie-fx','nixie-fx/pixi','nixie-fx/export','nixie-fx/materials','@pixi/sound']},server:{host:'127.0.0.1',port:18153,strictPort:true,hmr:false,watch:null},logLevel:'error'});
await vite.listen();const browser=await launch();
try{
 const page=await browser.newPage({viewport:{width:392,height:735}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tracelogs',r=>r.fulfill({status:201,contentType:'application/json',body:'{"ok":true,"id":"gpu-preparation-probe"}'}));
 await page.addInitScript(()=>{
  window.__GPU_PROBE__={programs:[],seen:new WeakSet()};
  for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]){
   if(!Object.prototype.hasOwnProperty.call(proto,'linkProgram'))continue;
   const original=proto.linkProgram;proto.linkProgram=function(program){if(!window.__GPU_PROBE__.seen.has(program)){window.__GPU_PROBE__.seen.add(program);window.__GPU_PROBE__.programs.push({gl:this,program});}return original.call(this,program);};
  }
 });
 await page.goto('http://127.0.0.1:18153/?offline=1&hero=ember-warden&quality=low&shadowField=0');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.fxStage.ready()&&!document.querySelector('#loading-screen'),null,{timeout:240000});
 const prepared=await page.evaluate(()=>window.__STRONGHOLD_COMBAT__.fxStage.stats());
 const actorCache=await page.evaluate(async()=>{const probe=await import('/scripts/android-stutter/gpu-probe.ts');return probe.actorProgramCacheProbe();});
 assert.deepEqual(actorCache,{sameProgram:true,independentUniforms:true,differentSamplerCounts:true});
 if(!baseline){assert.ok(prepared.gpuPreparation.compiledPrograms>0);assert.ok(prepared.gpuPreparation.uploadedTextures>0);}
 await page.evaluate(()=>{
  const c=window.__STRONGHOLD_COMBAT__;c.setMaxHp(1e6);
  for(let i=1;i<8;i++){const r=c.offer();if(r.offers?.length)c.choose(r.offers[0]);}
 });
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{window.__GPU_PROBE__.programs=[];const c=window.__STRONGHOLD_COMBAT__;c.triggerLevelUp(8);c.castSimultaneous(['flame-fan','ember-snare','cinder-step']);});
 await page.waitForTimeout(5000);
 const result=await page.evaluate(()=>({
  linkedPrograms:window.__GPU_PROBE__.programs.map(({gl,program})=>({names:(gl.getAttachedShaders(program)||[]).map(s=>(gl.getShaderSource(s)||'').match(/#define SHADER_NAME ([^\n]+)/)?.[1]||'unnamed')})),
  fx:window.__STRONGHOLD_COMBAT__.fxStage.stats(),
 }));
 const vfxLinks=result.linkedPrograms.filter(p=>p.names.some(n=>/vfx-tier2|particle/i.test(n)));
 if(!baseline)assert.equal(vfxLinks.length,0,`first cast linked unprepared particle shaders: ${JSON.stringify(vfxLinks)}`);
 assert.deepEqual(result.fx.missing,[]);assert.deepEqual(result.fx.unsupported,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(`docs/android-stutter/gpu-preparation-${baseline?'before':'after'}.json`,JSON.stringify({baseline,prepared,result,vfxLinks,actorCache,errors},null,2)+'\n');
 console.log(JSON.stringify({baseline,prepared:prepared.gpuPreparation,vfxLinks,linkedPrograms:result.linkedPrograms,actorCache,errors}));
}finally{await browser.close();await vite.close();}
