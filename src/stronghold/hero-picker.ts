import {HEROES,heroInfo,portraitUrl,type HeroId} from './heroes';
// Hero selection over the live world: a new tab opens on it (a reload in the same tab keeps the pick), with the last
// pick on this device focused; the hero's name in the health panel reopens it at any time. Picking swaps the hero
// in place, keeping its spot, health and room.
const SESSION_KEY='arkadia.hero.picked';
export function createHeroPicker(root:HTMLElement,o:{current:()=>HeroId;choose:(id:HeroId)=>void}){
 const el=document.createElement('section');el.id='hero-picker';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','hero-picker-title');
 el.innerHTML=`<div class="picker-card"><small>ARKADIA</small><h2 id="hero-picker-title">Choose your hero</h2>
 <div class="picker-heroes">${HEROES.map(h=>`<button type="button" class="picker-hero" data-hero="${h.id}" aria-pressed="false">
  <span class="picker-portrait"><img src="${portraitUrl(h.id)}" alt="" height="200" decoding="async"></span>
  <span class="picker-name">${h.name}</span><span class="picker-role">${h.role}</span><span class="picker-blurb">${h.blurb}</span></button>`).join('')}</div>
 <button type="button" class="picker-close">Keep current hero</button></div>`;
 root.append(el);
 const buttons=[...el.querySelectorAll<HTMLButtonElement>('.picker-hero')],close=el.querySelector<HTMLButtonElement>('.picker-close')!;
 let done:(()=>void)|null=null,opener:HTMLElement|null=null;
 function hide(){el.hidden=true;el.dataset.first='false';const d=done;done=null;d?.();opener?.focus();opener=null;}
 function pick(id:HeroId){try{sessionStorage.setItem(SESSION_KEY,id);}catch{}if(id!==o.current())o.choose(id);label?.update();hide();}
 for(const b of buttons)b.onclick=()=>pick(b.dataset.hero as HeroId);
 close.onclick=()=>pick(o.current());
 // Arrow keys move between the cards; Escape keeps the current hero.
 el.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();pick(o.current());return;}
  const i=buttons.indexOf(document.activeElement as HTMLButtonElement);if(i<0)return;
  const step=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;
  if(step){e.preventDefault();buttons[(i+step+buttons.length)%buttons.length].focus();}
  // Keys pressed while choosing must not walk the hero.
  e.stopPropagation();
 });
 function open(first=false){
  if(!el.hidden)return Promise.resolve();
  opener=first?null:document.activeElement as HTMLElement|null;
  const current=o.current();for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.hero===current));
  el.dataset.first=String(first);el.hidden=false;buttons.find(b=>b.dataset.hero===current)?.focus();
  return new Promise<void>(r=>{done=r;});
 }
 // The health panel's label names the hero and opens the picker.
 let label:{update():void}|null=null;
 return {
  open,
  // A new tab asks once; a reload in the same tab (or a ?hero= link) plays on.
  start(){let picked='';try{picked=sessionStorage.getItem(SESSION_KEY)||'';}catch{}const q=new URLSearchParams(location.search);
   return picked||q.has('hero')||(navigator.webdriver&&!q.has('pick'))?Promise.resolve():open(true);},
  attach(slot:HTMLElement){
   const b=document.createElement('button');b.type='button';b.className='hud-hero';b.setAttribute('aria-haspopup','dialog');slot.replaceWith(b);
   label={update(){const h=heroInfo(o.current());b.textContent=h.name;b.setAttribute('aria-label',`${h.name}. Change hero`);}};label.update();
   b.onclick=()=>void open();
  }
 };
}
