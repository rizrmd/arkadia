import {audioSnapshot} from '../app/game-audio';
import './settings.css';
import {gameSettings,type GameSettings} from '../app/settings-state';
import {setGamePaused} from '../app/frame-scheduler';
import {resetProgression,RESET_EXPLANATION} from './reset-progression';

type Options={bounds:()=>{x:number;y:number;width:number;height:number};showFps:(show:boolean)=>void;solo:boolean;pause:(paused:boolean)=>void;canOpen:()=>boolean};
export function createSettings(o:Options){
 const gear=document.createElement('button');gear.className='settings-gear';gear.textContent='⚙';gear.title='Settings';gear.setAttribute('aria-label','Open Settings');
 const overlay=document.createElement('div');overlay.className='settings-overlay';overlay.hidden=true;
 overlay.innerHTML=`<section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1"><header><h2 id="settings-title">Settings</h2><button class="settings-close" aria-label="Close Settings">×</button></header>
 <div class="settings-section"><div class="settings-row"><span>Visual Quality</span><div class="settings-group" role="group" aria-label="Visual Quality">${['auto','low','high'].map(v=>`<button data-quality="${v}" aria-pressed="false">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div><p class="settings-help">Low reduces shadows and effects.</p></div></div>
 <div class="settings-section settings-row"><span>Frame Rate</span><div class="settings-group" role="group" aria-label="Frame Rate"><button data-fps="30">30</button><button data-fps="60">60</button></div></div>
 ${(['music','soundEffects'] as const).map(key=>`<div class="settings-row"><label for="settings-${key}">${key==='music'?'Music':'Sound Effects'}</label><div class="settings-volume"><span aria-hidden="true">♪</span><input id="settings-${key}" type="range" min="0" max="100" step="1" data-volume="${key}"><output for="settings-${key}"></output></div></div>`).join('')}
 ${(['screenShake','showFps'] as const).map(key=>`<div class="settings-row"><span id="label-${key}">${key==='screenShake'?'Screen Shake':'Show FPS'}</span><button class="settings-switch" role="switch" aria-labelledby="label-${key}" data-toggle="${key}"></button></div>`).join('')}
 <div class="settings-reset settings-row"><span>Progression</span><div><button class="settings-danger" data-reset>Reset Progression</button><p class="settings-help">Requires confirmation.</p></div></div>
 <footer class="settings-footer"><button class="settings-resume">Resume Game</button><span class="settings-keyboard">Esc to close</span></footer><p class="settings-status" role="status"></p></section>`;
 const confirm=document.createElement('div');confirm.className='settings-overlay';confirm.hidden=true;
 confirm.innerHTML='<section class="settings-panel settings-confirm" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><header><h2 id="reset-title">Reset progression?</h2></header><p id="reset-description"></p><footer><button data-cancel>Cancel</button><button data-confirm class="settings-danger">Reset Progression</button></footer><p role="status" class="settings-status"></p></section>';
 confirm.querySelector('#reset-description')!.textContent=RESET_EXPLANATION;
 document.body.append(gear,overlay,confirm);
 (window as any).__SETTINGS__={snapshot:()=>gameSettings.get(),audio:audioSnapshot};
 const panel=overlay.querySelector<HTMLElement>('.settings-panel')!;
 let open=false,busy=false,previous:HTMLElement|null=null;
 const status=overlay.querySelector<HTMLElement>('.settings-status')!;
 const update=(s:GameSettings)=>{
  overlay.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.quality===s.quality)));
  overlay.querySelectorAll<HTMLButtonElement>('[data-fps]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.fps)===s.frameRate)));
  overlay.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(b=>{b.value=String(s[b.dataset.volume as 'music'|'soundEffects']);b.nextElementSibling!.textContent=b.value+'%';b.style.setProperty('--volume',b.value+'%');});
  overlay.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(b=>b.setAttribute('aria-checked',String(s[b.dataset.toggle as 'screenShake'|'showFps'])));
  o.showFps(s.showFps);
 };
 const set=(patch:Partial<GameSettings>)=>{status.textContent=gameSettings.set(patch)?'':'Settings could not be saved on this browser.';};
 gameSettings.subscribe(update);update(gameSettings.get());
 const cancel=()=>{if(busy)return;confirm.hidden=true;panel.inert=false;overlay.querySelector<HTMLButtonElement>('[data-reset]')!.focus();};
 const close=()=>{if(busy)return;confirm.hidden=true;overlay.hidden=true;panel.inert=false;open=false;if(o.solo){setGamePaused(false);o.pause(false);}previous?.focus();};
 gear.onclick=()=>{if(!o.canOpen())return;previous=document.activeElement as HTMLElement;open=true;overlay.hidden=false;if(o.solo){setGamePaused(true);o.pause(true);}overlay.querySelector<HTMLButtonElement>('.settings-close')!.focus();};
 overlay.querySelector<HTMLButtonElement>('.settings-close')!.onclick=close;
 overlay.querySelector<HTMLButtonElement>('.settings-resume')!.onclick=close;
 overlay.onclick=e=>{if(e.target===overlay)close();};
 overlay.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(b=>b.onclick=()=>set({quality:b.dataset.quality as GameSettings['quality']}));
 overlay.querySelectorAll<HTMLButtonElement>('[data-fps]').forEach(b=>b.onclick=()=>set({frameRate:Number(b.dataset.fps) as 30|60}));
 overlay.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(b=>b.oninput=()=>set({[b.dataset.volume!]:Number(b.value)}));
 overlay.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(b=>b.onclick=()=>{const k=b.dataset.toggle as 'screenShake'|'showFps';set({[k]:!gameSettings.get()[k]});});
 overlay.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=()=>{panel.inert=true;confirm.hidden=false;confirm.querySelector<HTMLButtonElement>('[data-cancel]')!.focus();};
 confirm.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=cancel;
 confirm.onclick=e=>{if(e.target===confirm)cancel();};
 confirm.querySelector<HTMLButtonElement>('[data-confirm]')!.onclick=async()=>{
  if(busy)return;busy=true;confirm.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await resetProgression();location.reload();}catch(e){confirm.querySelector<HTMLElement>('[role=status]')!.textContent=e instanceof Error?e.message:'Reset failed.';busy=false;confirm.querySelectorAll('button').forEach(b=>b.disabled=false);}
 };
 document.addEventListener('keydown',e=>{
  if(!open)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!confirm.hidden)cancel();else close();return;}
  if(e.key==='Tab'){
   const root=confirm.hidden?panel:confirm;
   const buttons=[...root.querySelectorAll<HTMLElement>('button:not(:disabled),input')];
   const first=buttons[0],last=buttons[buttons.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  // Prevent game hotkeys and movement handlers from consuming form keys.
  e.stopImmediatePropagation();
 },true);
 function position(){const b=o.bounds();gear.style.left=`${Math.round(Math.max(8,Math.min(innerWidth-54,b.x+b.width-46)))}px`;gear.style.top=`${Math.round(Math.max(8,Math.min(innerHeight-54,b.y+b.height+(innerWidth<=600?27:8))))}px`;}
 position();const timer=setInterval(position,250);
 return {isOpen:()=>open,close,destroy(){clearInterval(timer);gear.remove();overlay.remove();confirm.remove();}};
}
