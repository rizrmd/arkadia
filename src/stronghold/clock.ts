import {clockLabel,SUNRISE,SUNSET} from './daylight';
import {icon} from './icons';
import type {ClockState} from './lighting';
// In-game clock: shows the Stronghold hour and lets the player pin any hour to
// inspect its lighting and shadows. The only HUD element on the world-only view.
const PRESETS:[string,number][]=[['Midnight',0],['Dawn',6],['Morning',9],['Noon',12],['Golden hour',17],['Dusk',18.75]].map(([name,hour])=>[name as string,(hour as number)/24]);
const STEP=15,MINUTES=24*60;
export function createClock(root:HTMLElement,o:{setTime:(t:number|null)=>void;preview:(on:boolean)=>void;subscribe:(f:(s:ClockState)=>void)=>unknown}){
 const el=document.createElement('section');el.id='day-clock';el.setAttribute('aria-label','Time of day');
 el.innerHTML=`<button type="button" class="clock-chip" aria-expanded="false" aria-controls="clock-panel"><span class="clock-icon"></span><span class="clock-time">--:--</span><span class="clock-phase"></span><span class="clock-mode"></span></button>
 <div class="clock-panel" id="clock-panel" hidden>
  <div class="clock-head"><label for="clock-slider">Set the hour</label><output class="clock-readout" for="clock-slider"></output></div>
  <input id="clock-slider" type="range" min="0" max="${MINUTES-STEP}" step="${STEP}">
  <div class="clock-scale" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
  <div class="clock-presets">${PRESETS.map(([name,t])=>`<button type="button" data-t="${t}">${name}<small>${clockLabel(t)}</small></button>`).join('')}</div>
  <button type="button" class="clock-live">Return to live clock</button>
 </div>`;
 root.append(el);
 const q=<T extends Element>(s:string)=>el.querySelector(s) as T,chip=q<HTMLButtonElement>('.clock-chip'),panel=q<HTMLElement>('.clock-panel'),slider=q<HTMLInputElement>('#clock-slider'),live=q<HTMLButtonElement>('.clock-live');
 let dragging=false,lastIcon='',pending:number|null=null,frame=0,idle=0;
 const open=(v:boolean)=>{panel.hidden=!v;chip.setAttribute('aria-expanded',String(v));};
 chip.onclick=()=>open(panel.hidden===true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){open(false);chip.focus();}});
 // Dragging previews the lighting live (see lighting.ts) and applies at most one hour per frame;
 // releasing the slider, or resting on it, bakes the final hour once.
 const apply=()=>{cancelAnimationFrame(frame);frame=0;if(pending!==null){const t=pending;pending=null;o.setTime(t);}};
 const release=()=>{clearTimeout(idle);apply();dragging=false;o.preview(false);};
 slider.oninput=()=>{dragging=true;o.preview(true);pending=Number(slider.value)/MINUTES;if(!frame)frame=requestAnimationFrame(apply);clearTimeout(idle);idle=window.setTimeout(release,1500);};
 slider.onchange=release;
 el.querySelectorAll<HTMLButtonElement>('.clock-presets button').forEach(b=>b.onclick=()=>o.setTime(Number(b.dataset.t)));
 live.onclick=()=>o.setTime(null);
 o.subscribe(s=>{
  const label=clockLabel(s.t),name=s.t>=SUNRISE&&s.t<SUNSET?'sun':'moon';
  if(name!==lastIcon){q('.clock-icon').innerHTML=icon(name);lastIcon=name;}
  q('.clock-time').textContent=label;q('.clock-phase').textContent=s.phase;q('.clock-mode').textContent=s.manual?'Pinned':'Live';
  q('.clock-readout').textContent=`${label} · ${s.phase}`;el.dataset.phase=s.phase;el.dataset.sky=name;el.dataset.clock=s.manual?'manual':'live';live.disabled=!s.manual&&s.mode==='dynamic';
  if(!dragging)slider.value=String(Math.round(s.t*MINUTES/STEP)*STEP%MINUTES);
  el.querySelectorAll<HTMLButtonElement>('.clock-presets button').forEach(b=>b.setAttribute('aria-pressed',String(s.manual&&Math.abs(Number(b.dataset.t)-s.t)<1e-3)));
 });
}
