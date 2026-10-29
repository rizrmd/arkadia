import {requestGameFrame as requestAnimationFrame,cancelGameFrame as cancelAnimationFrame} from '../app/frame-scheduler';
import {Container,Rectangle} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import type {Hud} from '../typography/hud';
import {MsdfText} from '../typography/text';
import {clockLabel} from './daylight';
import type {ClockState} from './lighting';

const PRESETS:[string,number][]=[['Midnight',0],['Dawn',5],['Morning',9],['Noon',12],['Golden hour',17],['Dusk',19]].map(([name,hour])=>[name as string,(hour as number)/24]);
const STEP=15,MINUTES=24*60;
const PANEL_W=332,PANEL_H=318,TRACK_X=26,TRACK_Y=70,TRACK_W=280;

export function createClock(
 uiStage:Container,
 frames:FrameSet,
 hud:Hud,
 o:{setTime:(t:number|null)=>void;preview:(on:boolean)=>void;subscribe:(f:(s:ClockState)=>void)=>unknown},
){
 const panel=new Container();
 panel.zIndex=40;
 panel.visible=false;
 panel.eventMode='static';
 panel.hitArea=new Rectangle(0,0,PANEL_W,PANEL_H);
 uiStage.addChild(panel);

 panel.addChild(frames.frame('panel-bronze',PANEL_W,PANEL_H));

 const titleText=panel.addChild(new MsdfText('panel-label','SET THE HOUR',{size:12.5}));
 titleText.place(26,38);
 const readoutText=panel.addChild(new MsdfText('panel-body','06:27 · Dawn',{size:16}));
 readoutText.place(PANEL_W-26,38,1);

 // Interactive slider track + fill + thumb
 const sliderHit=panel.addChild(new Container());
 sliderHit.eventMode='static';
 sliderHit.cursor='pointer';
 sliderHit.hitArea=new Rectangle(TRACK_X-10,TRACK_Y-14,TRACK_W+20,38);
 const trackBg=sliderHit.addChild(frames.frame('slider-track',TRACK_W,12));
 trackBg.position.set(TRACK_X,TRACK_Y);
 const trackFill=sliderHit.addChild(new Container());
 trackFill.position.set(TRACK_X+2,TRACK_Y+2);
 trackFill.addChild(frames.frame('xp-fill',TRACK_W-4,8));
 const thumb=sliderHit.addChild(frames.frame('slider-thumb',24,24));
 thumb.position.set(TRACK_X-12,TRACK_Y-6);

 // Scale labels 00 .. 24
 ['00','06','12','18','24'].forEach((lbl,i)=>{
  const t=panel.addChild(new MsdfText('panel-muted',lbl,{size:12}));
  t.place(TRACK_X+(TRACK_W*i)/4,104,0.5);
 });

 // 6 preset buttons (2 columns x 3 rows)
 const presetBtns:{box:Container;nameText:MsdfText;subText:MsdfText;t:number}[]=[];
 PRESETS.forEach(([name,t],i)=>{
  const col=i%2,row=Math.floor(i/2);
  const bw=134,bh=44,bx=26+col*146,by=118+row*50;
  const box=panel.addChild(new Container());
  box.position.set(bx,by);
  box.eventMode='static';
  box.cursor='pointer';
  box.hitArea=new Rectangle(0,0,bw,bh);
  box.addChild(frames.frame('button-bronze',bw,bh));
  const nameText=box.addChild(new MsdfText('panel-body',name,{size:14.5}));
  nameText.place(bw/2,20,0.5);
  const subText=box.addChild(new MsdfText('panel-muted',clockLabel(t),{size:11.5}));
  subText.place(bw/2,36,0.5);
  box.on('pointertap',()=>o.setTime(t));
  presetBtns.push({box,nameText,subText,t});
 });

 // Return to live clock button
 const liveBtn=panel.addChild(new Container());
 liveBtn.position.set(26,272);
 liveBtn.eventMode='static';
 liveBtn.cursor='pointer';
 liveBtn.hitArea=new Rectangle(0,0,280,32);
 liveBtn.addChild(frames.frame('button-bronze',280,32));
 const liveText=liveBtn.addChild(new MsdfText('panel-title','Return to Live Clock',{size:13}));
 liveText.place(140,21,0.5);
 liveBtn.on('pointertap',()=>o.setTime(null));

 let dragging=false,pending:number|null=null,frame=0,idle=0,currentT=0.25;

 const layout=()=>{
  const anchor=hud.topRightPopoverAnchor(1);
  const s=Math.min(1,Math.max(0.78,(innerWidth-16)/PANEL_W));
  panel.scale.set(s);
  panel.position.set(Math.max(8,anchor.x-PANEL_W*s),anchor.y);
 };
 window.addEventListener('resize',layout);

 const setSliderVisual=(tNorm:number)=>{
  const clamped=Math.max(0,Math.min(1,tNorm));
  const fillW=Math.max(8,Math.round((TRACK_W-4)*clamped));
  (trackFill.children[0] as Container).width=fillW;
  thumb.position.set(TRACK_X+clamped*TRACK_W-12,TRACK_Y-6);
 };

 const apply=()=>{cancelAnimationFrame(frame);frame=0;if(pending!==null){const t=pending;pending=null;o.setTime(t);}};
 const release=()=>{if(!dragging)return;clearTimeout(idle);apply();dragging=false;o.preview(false);};

 const scrubFromPointer=(globalX:number)=>{
  const local=panel.toLocal({x:globalX,y:0});
  const raw=Math.max(0,Math.min(1,(local.x-TRACK_X)/TRACK_W));
  const minutes=Math.round((raw*MINUTES)/STEP)*STEP%MINUTES;
  const snapped=minutes/MINUTES;
  setSliderVisual(snapped);
  pending=snapped;
  if(!frame)frame=requestAnimationFrame(apply);
  clearTimeout(idle);idle=window.setTimeout(release,1500);
 };

 sliderHit.on('pointerdown',e=>{
  dragging=true;
  o.preview(true);
  scrubFromPointer(e.global.x);
 });
 window.addEventListener('pointermove',e=>{
  if(!dragging)return;
  scrubFromPointer(e.clientX);
 });
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);

 document.addEventListener('keydown',e=>{
  if(!panel.visible)return;
  if(e.key==='Escape'){
   e.preventDefault();
   open(false);
   return;
  }
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   const delta=(e.key==='ArrowRight'?STEP:-STEP)/MINUTES;
   o.setTime((currentT+delta+1)%1);
  }
 });

 function open(v:boolean){
  panel.visible=v;
  if(v)layout();
 }

 o.subscribe(s=>{
  currentT=s.t;
  const label=clockLabel(s.t);
  hud.setTime(label,true);
  readoutText.text=`${label} · ${s.phase}${s.manual?' (Pinned)':''}`;
  readoutText.place(PANEL_W-26,38,1);
  liveBtn.alpha=!s.manual&&s.mode==='dynamic'?0.48:1;
  if(!dragging)setSliderVisual(s.t);
  for(const p of presetBtns){
   const active=s.manual&&Math.abs(p.t-s.t)<1e-3;
   p.box.alpha=active?1:0.86;
  }
 });

 return {
  open,
  toggle(){open(!panel.visible);},
  isOpen:()=>panel.visible,
 };
}
