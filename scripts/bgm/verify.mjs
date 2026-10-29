import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5198'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5198')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const results=[];
 for(const mobile of [false,true]){
 browser=await chromium.launch({executablePath:chromium.executablePath(),env:{...process.env,LD_LIBRARY_PATH:'/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu'},args:['--no-sandbox','--no-zygote','--single-process','--autoplay-policy=document-user-activation-required']});
  const context=await browser.newContext({isMobile:mobile,hasTouch:mobile});const page=await context.newPage();
  await page.route('http://127.0.0.1:5198/',r=>r.fulfill({contentType:'text/html',body:'<html><body>Audio verification</body></html>'}));
  await page.goto('http://127.0.0.1:5198/');
  await page.evaluate(async()=>{window.audio=await import('/src/app/game-audio.ts');window.settings=(await import('/src/app/settings-state.ts')).gameSettings;});
  await page.waitForFunction(()=>window.audio.audioSnapshot().musicLoaded,{},{timeout:30000});
  assert.equal(await page.evaluate(()=>window.audio.audioSnapshot().musicPlaying),false);
  if(mobile)await page.touchscreen.tap(20,20);else await page.keyboard.press('Shift');
  await page.waitForFunction(()=>window.audio.audioSnapshot().musicPlaying);
  const checks=await page.evaluate(async()=>{
   const pause=()=>new Promise(r=>setTimeout(r,100));const a=window.audio,s=window.settings;
   for(let i=0;i<10;i++)a.startGameAudio();await pause();const playing=a.audioSnapshot();
   s.set({music:0});const muted=a.audioSnapshot();s.set({music:40,soundEffects:0});await pause();const restored=a.audioSnapshot();
   Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const hidden=a.audioSnapshot();
   Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));await pause();const visible=a.audioSnapshot();
   a.disposeGameAudio();const disposed=a.audioSnapshot();return {playing,muted,restored,hidden,visible,disposed};
  });
  assert.equal(checks.playing.musicVoices,1);assert.equal(checks.muted.musicPlaying,false);assert.equal(checks.restored.musicPlaying,true);assert.equal(checks.restored.musicVolume,.2);assert.equal(checks.restored.soundEffects,0);assert.equal(checks.hidden.musicPlaying,false);assert.equal(checks.visible.musicPlaying,true);assert.equal(checks.disposed.musicVoices,0);assert.equal(checks.playing.loadError,false);
  results.push({mobile,checks});await browser.close();browser=undefined;
 }
 await fs.mkdir('docs/bgm',{recursive:true});await fs.writeFile('docs/bgm/local-verification.json',JSON.stringify(results,null,2));console.log('PASS: desktop/mobile gesture unlock, single voice, mute, independent volume, visibility, disposal');
}finally{await browser?.close();server.kill();}
