// Walk input for the Stronghold hero: arrow keys or WASD on a keyboard, a thumbstick that appears under a touch in the bottom-left quarter.
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
 const release=()=>{held.clear();stick={x:0,y:0};finger=-1;knob.style.transform='';base.dataset.active='false';};
 const reset=()=>{touches.clear();release();};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 // Floating thumbstick: hidden until a touch starts on the world in the bottom-left quarter of the screen, then shown
 // centred under that thumb and hidden again on release. Its finger is taken in the capture phase so the canvas never
 // pans or selects a building with it; touches anywhere else keep panning, pinching and tapping as before.
 // A touch that joins one already on the world is the second finger of a pinch, so it never becomes the stick.
 const base=document.createElement('div'),knob=document.createElement('div');base.id='move-stick';base.setAttribute('aria-hidden','true');knob.className='stick-knob';base.append(knob);root.append(base);
 let finger=-1,ox=0,oy=0;const touches=new Set<number>();
 const inZone=(e:PointerEvent)=>e.clientX<innerWidth/2&&e.clientY>innerHeight/2;
 const aim=(e:PointerEvent)=>{const radius=base.offsetWidth/2,dx=e.clientX-ox,dy=e.clientY-oy,d=Math.hypot(dx,dy),k=Math.min(1,d/(radius*.62));
  knob.style.transform=`translate(${dx/(d||1)*k*radius*.62}px,${dy/(d||1)*k*radius*.62}px)`;
  // Rescale past the dead zone so a light push starts slow instead of jumping to a third of full speed.
  const m=k<DEAD?0:(k-DEAD)/(1-DEAD);stick={x:dx/(d||1)*m,y:dy/(d||1)*m};};
 const take=(e:PointerEvent)=>{e.stopImmediatePropagation();e.preventDefault();};
 window.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!(e.target instanceof HTMLCanvasElement))return;
  const pinch=touches.size>0;touches.add(e.pointerId);if(finger>=0||pinch||!inZone(e))return;
  take(e);finger=e.pointerId;ox=e.clientX;oy=e.clientY;base.style.left=`${ox}px`;base.style.top=`${oy}px`;base.dataset.active='true';aim(e);
 },{capture:true});
 window.addEventListener('pointermove',e=>{if(e.pointerId===finger){take(e);aim(e);}},{capture:true});
 const lift=(e:PointerEvent)=>{touches.delete(e.pointerId);if(e.pointerId!==finger)return;take(e);finger=-1;release();};
 window.addEventListener('pointerup',lift,{capture:true});window.addEventListener('pointercancel',lift,{capture:true});
 return {
  direction():Walk{
   if(stick.x||stick.y)return stick;let u=0,v=0;for(const code of held){u+=KEYS[code][0];v+=KEYS[code][1];}
   const x=(u-v)*2,y=u+v,d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:0,y:0};
  },
  stick:base
 };
}
