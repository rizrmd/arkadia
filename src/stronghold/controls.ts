// Walk input for the Stronghold hero: arrow keys or WASD on a keyboard, a thumbstick that appears under a touch in the bottom third.
// direction() is a screen-space vector of length 0..1. Keys combine on the ground grid like the arena
// (W+D walks along a 2:1 tile edge, not at 45 degrees on screen); the stick follows the thumb's direction.
// The vector eases toward the keys or stick (ACCEL, BRAKE: time constants in s), so the hero gathers speed over
// about 0.12 s and comes to rest over about 0.1 s instead of jumping between a dead stop and full pace. Easing the
// input, not the hero, keeps the co-op server and its prediction on one walking rule.
export type Walk={x:number;y:number};
// Tile-space steps: up/down walk straight up/down the screen, left/right straight across it.
const KEYS:Record<string,[number,number]>={ArrowUp:[-1,-1],KeyW:[-1,-1],ArrowDown:[1,1],KeyS:[1,1],ArrowLeft:[-1,1],KeyA:[-1,1],ArrowRight:[1,-1],KeyD:[1,-1]};
// The stick reaches full speed at 60% of its travel: a thumb resting short of the rim still walks at full pace
// instead of slowing whenever it drifts inward.
const DEAD=.18,FULL=.6,ACCEL=.055,BRAKE=.045;
export function createControls(root:HTMLElement){
 const held=new Set<string>();let stick:Walk={x:0,y:0},eased:Walk={x:0,y:0},at=0;
 const editable=(t:EventTarget|null)=>t instanceof HTMLElement&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
 // The clock slider keeps its own arrow keys; modified keys stay browser shortcuts.
 window.addEventListener('keydown',e=>{if(!KEYS[e.code]||editable(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();held.add(e.code);});
 window.addEventListener('keyup',e=>{held.delete(e.code);});
 const release=()=>{held.clear();stick={x:0,y:0};finger=-1;knob.style.transform='';base.dataset.active='false';};
 const reset=()=>{touches.clear();release();eased={x:0,y:0};};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 // Floating thumbstick: hidden until a touch starts on the world in the bottom third of the screen, then shown
 // centred under that thumb and hidden again on release. Its finger is taken in the capture phase so the canvas never
 // pans or selects a building with it; touches anywhere else keep panning, pinching and tapping as before.
 // A joining touch promotes an active stick to a camera pinch; neither finger can restart walking.
 const base=document.createElement('div'),knob=document.createElement('div');base.id='move-stick';base.setAttribute('aria-hidden','true');knob.className='stick-knob';base.append(knob);root.append(base);
 let finger=-1,ox=0,oy=0;const touches=new Set<number>();
 let canvas:HTMLCanvasElement|null=null,lastX=0,lastY=0;
 const inZone=(e:PointerEvent)=>e.clientY>=innerHeight*2/3;
 const aim=(e:PointerEvent)=>{const radius=base.offsetWidth/2,dx=e.clientX-ox,dy=e.clientY-oy,d=Math.hypot(dx,dy),k=Math.min(1,d/(radius*.62));
  knob.style.transform=`translate(${dx/(d||1)*k*radius*.62}px,${dy/(d||1)*k*radius*.62}px)`;
  // Rescale past the dead zone so a light push starts slow instead of jumping to a third of full speed.
  const m=k<DEAD?0:Math.min(1,(k-DEAD)/(FULL-DEAD));stick={x:dx/(d||1)*m,y:dy/(d||1)*m};};
 const take=(e:PointerEvent)=>{e.stopImmediatePropagation();e.preventDefault();};
 window.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!(e.target instanceof HTMLCanvasElement))return;
  const pinch=touches.size>0;touches.add(e.pointerId);
  if(finger>=0){
   // Hand the walking finger to the camera at its CURRENT position, before the joining finger.
   // Both now belong to the camera until lifted; no remaining pinch finger becomes a stick.
   const id=finger,target=canvas!;release();
   target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:'touch',clientX:lastX,clientY:lastY,buttons:1}));
   return;
  }
  if(pinch||!inZone(e))return;
  canvas=e.target;lastX=e.clientX;lastY=e.clientY;
  take(e);finger=e.pointerId;ox=e.clientX;oy=e.clientY;base.style.left=`${ox}px`;base.style.top=`${oy}px`;base.dataset.active='true';aim(e);
 },{capture:true});
 window.addEventListener('pointermove',e=>{if(e.pointerId===finger){take(e);lastX=e.clientX;lastY=e.clientY;aim(e);}},{capture:true});
 const lift=(e:PointerEvent)=>{touches.delete(e.pointerId);if(e.pointerId!==finger)return;take(e);finger=-1;release();};
 window.addEventListener('pointerup',lift,{capture:true});window.addEventListener('pointercancel',lift,{capture:true});
 function input():Walk{
  if(stick.x||stick.y)return stick;let u=0,v=0;for(const code of held){u+=KEYS[code][0];v+=KEYS[code][1];}
  const x=(u-v)*2,y=u+v,d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:0,y:0};
 }
 return {
  direction():Walk{
   const now=performance.now(),dt=at?Math.min(.25,(now-at)/1000):0,raw=input(),on=!!(raw.x||raw.y),k=1-Math.exp(-dt/(on?ACCEL:BRAKE));at=now;
   eased={x:eased.x+(raw.x-eased.x)*k,y:eased.y+(raw.y-eased.y)*k};
   if(!on&&Math.hypot(eased.x,eased.y)<.03)eased={x:0,y:0};return eased;
  },
  stick:base
 };
}
