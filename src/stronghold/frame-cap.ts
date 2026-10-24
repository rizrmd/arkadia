import {Container} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';

// Detects a browser that hands the page only every other vsync (Chrome's Energy Saver, and battery saver modes, cap
// rAF at 30 fps). The signature is frames locked near 33.3 ms while the game's own work per frame stays light: the
// game is waiting, not working, so cutting quality (the particle budget, fx/stage.ts) cannot bring 60 fps back.
// Fed once per frame by the FPS tracelog (tracelog.ts) with the frame interval and the measured main-thread work.
const WINDOW=60,LOCK_MIN=31,LOCK_MAX=36,LIGHT_WORK_MS=12,HOLD_MS=4000;
const dts:number[]=[],works:number[]=[];
let capHz=0,lockedSince=0;
const listeners=new Set<(hz:number)=>void>();

export function noteFrame(now:number,dtMs:number,workMs:number){
 dts.push(dtMs);works.push(workMs);
 if(dts.length>WINDOW){dts.shift();works.shift();}
 if(dts.length<WINDOW)return;
 const locked=dts.filter(d=>d>=LOCK_MIN&&d<=LOCK_MAX).length/WINDOW;
 const work=[...works].sort((a,b)=>a-b)[WINDOW>>1];
 // Enter at 80% of frames on the 30 Hz cadence with light work, leave below 50%, so a burst of slow frames neither
 // flips it on nor off.
 const on=capHz?locked>=.5&&work<LIGHT_WORK_MS*1.5:locked>=.8&&work<LIGHT_WORK_MS;
 if(!on){lockedSince=0;if(capHz){capHz=0;for(const f of listeners)f(0);}return;}
 lockedSince||=now;
 if(!capHz&&now-lockedSince>=HOLD_MS){capHz=30;for(const f of listeners)f(30);}
}

// 30 while the browser is capping the frame rate, else 0.
export function frameCapHz(){return capHz;}
export function onFrameCap(f:(hz:number)=>void){listeners.add(f);return ()=>listeners.delete(f);}
// After a hidden tab or a blur the cadence is measured afresh (the cap may have been lifted meanwhile).
export function resetFrameCap(){dts.length=0;works.length=0;lockedSince=0;if(capHz){capHz=0;for(const f of listeners)f(0);}}

// Battery state for the tracelog and the hint: Chrome caps at 30 fps on battery when Energy Saver is on.
type Battery={charging:boolean;level:number};
let battery:Battery|undefined;
void (navigator as any).getBattery?.().then((b:any)=>{
 const read=()=>{battery={charging:Boolean(b.charging),level:Math.round(Number(b.level)*100)/100};};
 read();b.addEventListener?.('chargingchange',read);b.addEventListener?.('levelchange',read);
}).catch(()=>{});
export function batteryState(){return battery;}

// Tells the player once per session why the game runs at 30 fps and how to get 60 back.
export function showFrameCapHint(uiStage:Container,frames:FrameSet){
 let shown=false;
 try{shown=sessionStorage.getItem('arkodia-frame-cap-hint')==='1';}catch{}
 const off=onFrameCap(hz=>{
  if(!hz||shown)return;
  shown=true;off();
  try{sessionStorage.setItem('arkodia-frame-cap-hint','1');}catch{}
  const text=battery&&!battery.charging
   ?'Battery saver is limiting the game to 30 fps. Plug in or turn off Energy Saver for 60 fps.'
   :'Your browser is limiting the game to 30 fps. Turn off Energy Saver for 60 fps.';
  const item=new Container();item.zIndex=46;item.eventMode='static';item.cursor='pointer';
  let t=new MsdfText('panel-body',text,{size:14});
  // Narrow phones get a smaller line that fits, rather than one wrapping out of the pill.
  const room=innerWidth-56;if(t.width>room){const size=Math.max(9,14*room/t.width);t.destroy();t=new MsdfText('panel-body',text,{size});}
  const w=Math.round(Math.min(innerWidth-16,t.width+40));
  item.addChild(frames.frame('pill',w,38));item.addChild(t);t.place(w/2,24,.5);
  // Below the phone HUD's gold, clock and zone rows; on desktop, top centre between the hero panel and the minimap.
  item.position.set(Math.round((innerWidth-w)/2),innerWidth<1024?150:72);
  const close=()=>{if(!item.destroyed)item.destroy({children:true});};
  item.on('pointertap',close);setTimeout(close,9000);
  uiStage.addChild(item);
  (window as any).__FRAME_CAP__.hint=text;
 });
 (window as any).__FRAME_CAP__={hz:frameCapHz,battery:batteryState,hint:''};
}
