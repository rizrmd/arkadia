import {Container} from 'pixi.js';
import type {FrameSet} from '../typography/frames';

export type Walk={x:number;y:number};
const KEYS:Record<string,[number,number]>={ArrowUp:[-1,-1],KeyW:[-1,-1],ArrowDown:[1,1],KeyS:[1,1],ArrowLeft:[-1,1],KeyA:[-1,1],ArrowRight:[1,-1],KeyD:[1,-1]};
const DEAD=.18,FULL=.6,ACCEL=.055,BRAKE=.045,RING_RADIUS=56;

export function createControls(uiStage:Container,frames:FrameSet,canStartStick?:(clientX:number,clientY:number)=>boolean){
 const held=new Set<string>();let stick:Walk={x:0,y:0},eased:Walk={x:0,y:0},at=0;
 const editable=(t:EventTarget|null)=>t instanceof HTMLElement&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
 window.addEventListener('keydown',e=>{if(!KEYS[e.code]||editable(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();held.add(e.code);});
 window.addEventListener('keyup',e=>{held.delete(e.code);});

 const base=new Container();
 base.zIndex=15;
 base.visible=false;
 const ring=base.addChild(frames.frame('thumbstick-ring',RING_RADIUS*2,RING_RADIUS*2));
 ring.position.set(-RING_RADIUS,-RING_RADIUS);
 const knob=base.addChild(frames.frame('thumbstick-cap',54,54));
 knob.position.set(-27,-27);
 uiStage.addChild(base);

 let finger=-1,ox=0,oy=0;const touches=new Set<number>();
 let canvas:HTMLCanvasElement|null=null,lastX=0,lastY=0;

 const release=()=>{
  held.clear();stick={x:0,y:0};finger=-1;
  knob.position.set(-27,-27);
  base.visible=false;
 };
 const reset=()=>{touches.clear();release();eased={x:0,y:0};};
 window.addEventListener('blur',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});

 const inZone=(e:PointerEvent)=>e.clientY>=innerHeight*2/3;
 const aim=(e:PointerEvent)=>{
  const radius=RING_RADIUS,dx=e.clientX-ox,dy=e.clientY-oy,d=Math.hypot(dx,dy),k=Math.min(1,d/(radius*.62));
  const kx=dx/(d||1)*k*radius*.62,ky=dy/(d||1)*k*radius*.62;
  knob.position.set(-27+kx,-27+ky);
  const m=k<DEAD?0:Math.min(1,(k-DEAD)/(FULL-DEAD));
  stick={x:dx/(d||1)*m,y:dy/(d||1)*m};
 };
 const take=(e:PointerEvent)=>{e.stopImmediatePropagation();e.preventDefault();};
 window.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!(e.target instanceof HTMLCanvasElement))return;
  if(canStartStick&&!canStartStick(e.clientX,e.clientY))return;
  const pinch=touches.size>0;touches.add(e.pointerId);
  if(finger>=0){
   const id=finger,target=canvas!;release();
   target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:'touch',clientX:lastX,clientY:lastY,buttons:1}));
   return;
  }
  if(pinch||!inZone(e))return;
  canvas=e.target;lastX=e.clientX;lastY=e.clientY;
  take(e);finger=e.pointerId;ox=e.clientX;oy=e.clientY;
  base.position.set(ox,oy);
  base.visible=true;
  aim(e);
 },{capture:true});
 window.addEventListener('pointermove',e=>{if(e.pointerId===finger){take(e);lastX=e.clientX;lastY=e.clientY;aim(e);}},{capture:true});
 const lift=(e:PointerEvent)=>{touches.delete(e.pointerId);if(e.pointerId!==finger)return;take(e);finger=-1;release();};
 window.addEventListener('pointerup',lift,{capture:true});
 window.addEventListener('pointercancel',lift,{capture:true});
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
