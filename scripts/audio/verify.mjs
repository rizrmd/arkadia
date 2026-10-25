import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const live=process.env.AUDIO_URL;
const server=live?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5199'],{stdio:'ignore'});
if(server)await new Promise((resolve,reject)=>{server.on('exit',c=>reject(Error('Vite exited '+c)));const poll=async()=>{try{await fetch('http://127.0.0.1:5199');resolve();}catch{setTimeout(poll,200);}};poll();});
const browser=await chromium.launch({headless:true,env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},args:['--no-sandbox','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__audioNodes={oscillators:0,started:0};const p=AudioContext.prototype;const old=p.createOscillator;p.createOscillator=function(...args){window.__audioNodes.oscillators++;return old.apply(this,args);};});
 await page.goto((live||'http://127.0.0.1:5199')+'/?offline=1&hero=ember-warden&quality=low&time=.45');
 await page.waitForFunction(()=>window.__STRONGHOLD_COMBAT__?.snapshot().vfx.fx.ready&&!document.querySelector('#loading-screen'),null,{timeout:180000});
 await page.keyboard.press('Shift');
 await page.waitForFunction(()=>window.__SETTINGS__?.audio().loaded===true,null,{timeout:30000});
 if(!live){
 await page.evaluate(()=>{window.__STRONGHOLD_COMBAT__?.setPreviewMode(true);window.__STRONGHOLD_COMBAT__?.clearFoes();});
 const checked=await page.evaluate(async()=>{
 const a=await import('/src/app/game-audio.ts');const {gameSettings:s}=await import('/src/app/settings-state.ts');
 a.startGameAudio();await new Promise(r=>setTimeout(r,150));
 const initial=a.audioSnapshot();for(let i=0;i<25;i++)a.playSkillSound();const spam=a.audioSnapshot();
 for(let i=0;i<50&&a.audioSnapshot().activeVoices;i++)await new Promise(r=>setTimeout(r,100));const quiet=a.audioSnapshot();
 s.set({soundEffects:0,music:31});a.playSkillSound();const muted=a.audioSnapshot();
 s.set({soundEffects:80});
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));a.playSkillSound();const hidden=a.audioSnapshot();
 Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,100));
 const visible=a.audioSnapshot();a.disposeGameAudio();a.startGameAudio();a.playSkillSound();const disposed=a.audioSnapshot();
 return {initial,spam,quiet,muted,hidden,visible,disposed};});
 console.log(JSON.stringify(checked));assert.equal(checked.initial.state,'running');assert(checked.spam.activeVoices<=3);assert(checked.spam.dropped>=24);assert.equal(checked.quiet.activeVoices,0);assert.equal(checked.muted.music,.31);assert.equal(checked.muted.activeVoices,0);assert.equal(checked.hidden.activeVoices,0);assert.equal(checked.disposed.state,'disposed');results.push({mobile,checked});
 }else{
 await page.keyboard.down('KeyS');await page.waitForTimeout(8000);await page.keyboard.up('KeyS');
 results.push({mobile,snapshot:await page.evaluate(()=>window.__SETTINGS__.audio())});
 assert.equal(results.at(-1).snapshot.engine,'@pixi/sound');assert.equal(results.at(-1).snapshot.loadError,false);
 }
 const nodes=await page.evaluate(()=>window.__audioNodes);assert.equal(nodes.oscillators,0);assert.deepEqual(errors,[]);results.at(-1).nodes=nodes;await context.close();
 }
 mkdirSync('docs/audio',{recursive:true});writeFileSync(`docs/audio/${live?'live':'local'}-verification.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server?.kill();}
