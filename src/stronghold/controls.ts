// Walk input for the Stronghold hero: arrow keys or WASD on a keyboard, an on-screen thumbstick on touch screens.
// direction() is a screen-space vector of length 0..1. Keys combine on the ground grid like the arena
// (W+D walks along a 2:1 tile edge, not at 45 degrees on screen); the stick follows the thumb exactly.
export type Walk={x:number;y:number};
// Tile-space steps: up/down walk straight up/down the screen, left/right straight across it.
const KEYS:Record<string,[number,number]>={ArrowUp:[-1,-1],KeyW:[-1,-1],ArrowDown:[1,1],KeyS:[1,1],ArrowLeft:[-1,1],KeyA:[-1,1],ArrowRight:[1,-1],KeyD:[1,-1]};
const DEAD=.18;
export function createControls(root:HTMLElement){
 const held=new Set<string>();let stick:Walk={x:0,y:0};
 const editable=(t:EventTarget|null)=>t instanceof HTMLElement&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
 // The clock slider keeps its own arrow keys; modified keys stay browser shortcuts.
 window.addEventListener('keydown',e=>{if(!KEYS[e.code]||editable(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();held.add(e.code);});
 window.addEventListener('keyup',e=>{held.delete(e.code);});
 const release=()=>{held.clear();stick={x:0,y:0};knob.style.transform='';base.dataset.active='false';};
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 // Thumbstick: fixed bottom-left, shown on touch screens (or after the first touch anywhere).
 const base=document.createElement('div'),knob=document.createElement('div');base.id='move-stick';base.setAttribute('aria-hidden','true');knob.className='stick-knob';base.append(knob);root.append(base);
 const coarse=matchMedia('(any-pointer: coarse)');const show=()=>{base.hidden=false;};base.hidden=!coarse.matches;
 coarse.addEventListener('change',()=>{if(coarse.matches)show();});window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')show();},{capture:true,passive:true});
 let finger=-1;
 const aim=(e:PointerEvent)=>{const r=base.getBoundingClientRect(),radius=r.width/2,dx=e.clientX-r.left-radius,dy=e.clientY-r.top-radius,d=Math.hypot(dx,dy),k=Math.min(1,d/(radius*.62));
  knob.style.transform=`translate(${dx/(d||1)*k*radius*.62}px,${dy/(d||1)*k*radius*.62}px)`;
  // Rescale past the dead zone so a light push starts slow instead of jumping to a third of full speed.
  const m=k<DEAD?0:(k-DEAD)/(1-DEAD);stick={x:dx/(d||1)*m,y:dy/(d||1)*m};};
 base.onpointerdown=e=>{if(finger>=0)return;finger=e.pointerId;try{base.setPointerCapture(e.pointerId);}catch{}base.dataset.active='true';aim(e);e.preventDefault();};
 base.onpointermove=e=>{if(e.pointerId===finger)aim(e);};
 base.onpointerup=base.onpointercancel=e=>{if(e.pointerId!==finger)return;finger=-1;release();};
 return {
  direction():Walk{
   if(stick.x||stick.y)return stick;let u=0,v=0;for(const code of held){u+=KEYS[code][0];v+=KEYS[code][1];}
   const x=(u-v)*2,y=u+v,d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:0,y:0};
  },
  stick:base
 };
}
