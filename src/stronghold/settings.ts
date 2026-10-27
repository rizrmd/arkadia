import {Assets,Container,Graphics,NineSliceSprite,Rectangle,Sprite,type Texture,type FederatedPointerEvent} from 'pixi.js';
import {createHudActionButton,hudActionPosition,type HudActionGesture} from './hud-action-button';
import {MsdfText} from '../typography/text';
import {audioSnapshot} from '../app/game-audio';
import {gameSettings,type GameSettings} from '../app/settings-state';
import {skillBindings} from '../app/skill-bindings';
import {setGamePaused} from '../app/frame-scheduler';
import {resetProgression,RESET_EXPLANATION} from './reset-progression';

type Options={stage:Container;bounds:()=>{x:number;y:number;width:number;height:number};showFps:(show:boolean)=>void;solo:boolean;pause:(paused:boolean)=>void;canOpen:()=>boolean;redraw:()=>void;releaseInput:()=>void};
type Control={id:string;y:number;h:number;action:()=>void;adjust?:(step:number)=>void};
export function createSettings(o:Options){
 let open=false,confirm=false,busy=false,destroyed=false,capture=-1,focus='close',keyboard=false,message='',scroll=0,maxScroll=0;
 let openingTime=-Infinity;
 const openingTap=(e:FederatedPointerEvent)=>Math.abs(((e.nativeEvent as {timeStamp?:number})?.timeStamp??e.timeStamp)-openingTime)<1;
 let previous:HTMLElement|null=null,controls:Control[]=[],panelRect={x:0,y:0,width:0,height:0},viewTop=0,viewHeight=0;
 const overlay=new Container({label:'Settings',eventMode:'static'});overlay.zIndex=110;overlay.visible=false;o.stage.addChild(overlay);
 const gear=createHudActionButton(o.stage,'/ui/hud-actions/settings.webp','Open Settings',show);
 const textures=new Map<string,Texture>();
 for(const name of ['music','sound-effects','v2/panel','v2/button'])void Assets.load(`/ui/settings/${name}.webp`).then(t=>{if(destroyed)return;textures.set(name,t);refresh();}).catch(()=>{});
 const text=(p:Container,value:string,x:number,y:number,size=16,width=400,color=0xf4ead3,nowrap=false)=>{const t=new MsdfText({font:value==='Settings'||value==='Reset progression?'?'display':'body',size,letterSpacing:0,fill:color,shadow:{color:0x000000,alpha:.8,dx:0,dy:1,softness:1}},value,{...(nowrap?{}:{wrapWidth:width}),lineHeight:Math.ceil(size*1.3)});t.text=value;t.position.set(x,y);t.eventMode='none';p.addChild(t);return t;};
 function art(parent:Container,name:string,w:number,h:number){const texture=textures.get('v2/'+name);if(!texture)return;const a=new NineSliceSprite({texture,leftWidth:name==='panel'?42:22,rightWidth:name==='panel'?42:22,topHeight:name==='panel'?42:12,bottomHeight:name==='panel'?42:12});a.label='Settings '+name+' artwork';a.width=w;a.height=h;a.eventMode='none';parent.addChild(a);return a;}
 function mobile(){return innerWidth<1024||/Mobi|Android|iPad/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
 function button(p:Container,id:string,label:string,x:number,y:number,w:number,action:()=>void,selected=false,danger=false){
  const c=new Container({label:id,eventMode:'static',cursor:busy?'default':'pointer'});c.position.set(x,y);c.hitArea=new Rectangle(0,0,w,44);p.addChild(c);
  const skin=art(c,'button',w,44);if(skin)skin.tint=danger?0xd2a49a:selected?0xffe0a0:0xcabca2;
  if(selected)c.addChild(new Graphics().rect(9,8,Math.max(0,w-18),28).fill({color:0xc69543,alpha:.13}).moveTo(12,37).lineTo(w-12,37).stroke({color:0xe6be68,width:1.5}));
  if(keyboard&&focus===id)c.addChild(new Graphics().rect(3,3,w-6,38).stroke({color:0xffdfa1,width:1.5}));
  const t=text(c,label,0,0,18,w-8,danger?0xffc9ba:selected?0xffe2a7:0xf4ead3,true);if(t.width>w-16)t.scale.set((w-16)/t.width);t.x=(w-t.width)/2;t.y=22-t.inkCenterY()*t.scale.y;
  controls.push({id,y,h:44,action});
  c.on('pointerdown',(e:FederatedPointerEvent)=>{e.stopPropagation();keyboard=false;focus=id;});
  c.on('pointertap',(e:FederatedPointerEvent)=>{e.stopPropagation();if(!busy&&!openingTap(e))action();});return c;
 }
 function set(patch:Partial<GameSettings>){message=gameSettings.set(patch)?'':'Settings could not be saved on this browser.';refresh();}
 function refresh(){
  if(!open||destroyed)return;
  overlay.removeChildren().forEach(c=>c.destroy({children:true}));controls=[];
  const vw=innerWidth,vh=innerHeight,w=Math.max(260,Math.min(560,vw-32)),h=Math.min(confirm?700:mobile()?654:790,vh-32),x=Math.round((vw-w)/2),y=Math.round((vh-h)/2);
  panelRect={x,y,width:w,height:h};overlay.hitArea=new Rectangle(0,0,vw,vh);
  const shade=overlay.addChild(new Graphics().rect(0,0,vw,vh).fill({color:0,alpha:.68}));shade.eventMode='static';shade.on('pointertap',(e:FederatedPointerEvent)=>{if(!openingTap(e)){if(confirm)cancel();else close();}});
  const panel=overlay.addChild(new Container({label:confirm?'Reset confirmation':'Settings panel',eventMode:'static'}));panel.position.set(x,y);panel.hitArea=new Rectangle(0,0,w,h);panel.on('pointertap',e=>e.stopPropagation());
  panel.addChild(new Graphics().rect(10,10,w-20,h-20).fill(0x0b0c0d));art(panel,'panel',w,h);
  const title=text(panel,confirm?'Reset progression?':'Settings',32,18,confirm&&w<340?19:26,w-100,0xf3d59a,true);if(title.width>w-108)title.scale.set((w-108)/title.width);title.y=37-title.inkCenterY()*title.scale.y;
  panel.addChild(new Graphics().moveTo(26,62).lineTo(w-26,62).stroke({color:0x9d7942,alpha:.65,width:1}));
  button(panel,'close','×',w-68,15,44,()=>confirm?cancel():close());
  viewTop=68;viewHeight=h-164;
  const viewport=panel.addChild(new Container({label:'Settings scroll area',eventMode:'static'}));viewport.position.set(26,viewTop);viewport.hitArea=new Rectangle(0,0,w-52,viewHeight);
  const mask=panel.addChild(new Graphics().rect(26,viewTop,w-52,viewHeight).fill(0xffffff));viewport.mask=mask;
  const content=viewport.addChild(new Container());const cw=w-52,s=gameSettings.get();let row=0;
  if(confirm){
   const desc=text(content,RESET_EXPLANATION,4,0,15,cw-14);row=desc.height+16;
  }else{
   text(content,'Visual Quality',4,row,17,cw);row+=27;
   for(const [i,q] of (['auto','low','high'] as const).entries())button(content,`quality-${q}`,q[0].toUpperCase()+q.slice(1),i*(cw/3),row,cw/3-6,()=>set({quality:q}),s.quality===q);
   row+=48;text(content,'Low reduces shadows and effects.',4,row,12,cw,0xbaad91);row+=29;
   text(content,'Frame Rate',4,row+12,17,cw);
   for(const [i,fps] of ([30,60] as const).entries())button(content,`fps-${fps}`,String(fps),cw-152+i*78,row,72,()=>set({frameRate:fps}),s.frameRate===fps);row+=57;
   for(const key of ['music','soundEffects'] as const){
    const icon=textures.get(key==='music'?'music':'sound-effects');if(icon){const a=content.addChild(new Sprite(icon));a.position.set(4,row+2);a.width=a.height=22;a.eventMode='none';}
    text(content,key==='music'?'Music':'Sound Effects',32,row,17,cw-70);text(content,`${s[key]}%`,cw-50,row,15,50);row+=27;
    const id=`volume-${key}`,trackW=cw-12,slider=content.addChild(new Container({label:id,eventMode:'static',cursor:'pointer'}));slider.position.set(6,row);slider.hitArea=new Rectangle(0,0,trackW,44);
    slider.addChild(new Graphics().roundRect(0,19,trackW,6,3).fill(0x24201a).roundRect(0,19,trackW*s[key]/100,6,3).fill(0xbd8c3f).circle(trackW*s[key]/100,22,9).fill(0xe7bd62));
    if(keyboard&&focus===id)slider.addChild(new Graphics().roundRect(-3,0,trackW+6,44,4).stroke({color:0xffdfa1,width:2}));
    const change=(e:FederatedPointerEvent)=>{const local=slider.toLocal(e.global);set({[key]:Math.round(Math.max(0,Math.min(1,local.x/trackW))*100)});};
    // Drag uses the stable browser pointer stream because each value redraws Pixi controls.
    slider.on('pointerdown',(e:FederatedPointerEvent)=>{e.stopPropagation();keyboard=false;focus=id;const rect=slider.getBounds();drag={key,x:rect.x,width:trackW,pointer:e.pointerId};change(e);});
    controls.push({id,y:row,h:44,action:()=>{},adjust:step=>set({[key]:gameSettings.get()[key]+step})});row+=52;
   }
   for(const key of ['screenShake','showFps'] as const){text(content,key==='screenShake'?'Screen Shake':'Show FPS',4,row+12,17,cw-90);button(content,key,s[key]?'On':'Off',cw-76,row,70,()=>set({[key]:!gameSettings.get()[key]}),s[key]);row+=53;}
   if(!mobile()){
   text(content,'Equipped Skill Shortcuts',4,row+4,19,cw);row+=33;
   text(content,'Select a slot, then press a letter or number. Esc cancels.',4,row,12,cw,0xbaad91);row+=38;
   for(let i=0;i<3;i++){text(content,`Skill Slot ${i+1}`,4,row+12,16,cw-100);button(content,`binding-${i}`,capture===i?'Press key…':skillBindings.label(i),cw-120,row,114,()=>{capture=i;message='Press a new key. Escape cancels.';refresh();},capture===i);row+=51;}
   button(content,'reset-bindings','Reset Shortcuts to Defaults',4,row,cw-10,()=>{capture=-1;message=skillBindings.reset()?'Shortcuts reset to 1 / 2 / 3.':'Shortcuts changed but could not be saved.';refresh();});row+=54;
   }
   button(content,'reset-progression','Reset Progression',4,row,cw-10,()=>{capture=-1;confirm=true;scroll=0;focus='cancel';keyboard=true;message='';refresh();},false,true);row+=54;
  }
  maxScroll=Math.max(0,row-viewHeight);scroll=Math.max(0,Math.min(scroll,maxScroll));content.y=-scroll;
  if(maxScroll>0){panel.addChild(new Graphics().roundRect(w-12,viewTop,3,viewHeight,2).fill(0x24201a).roundRect(w-12,viewTop+(viewHeight-24)*(scroll/maxScroll),3,24,2).fill(0xc7a359));}
  const contentControls=controls.slice(1);for(const c of contentControls)c.y+=viewTop-scroll;
  if(confirm){const bw=(w-50)/2;button(panel,'cancel','Cancel',24,h-88,bw-6,cancel);button(panel,'confirm-reset',busy?'Resetting…':'Reset Progression',26+bw,h-88,bw-6,()=>void reset(),false,true);}
  else button(panel,'resume','Resume Game',26,h-88,w-52,close,true);
  text(panel,message||(maxScroll?'Scroll or swipe for more settings.':mobile()?'':'Esc to close'),28,h-54,12,w-56,0xe2c793);
  o.redraw();
 }
 let drag:null|{key:'music'|'soundEffects';x:number;width:number;pointer:number}=null;
 let swipe:null|{y:number;scroll:number;pointer:number}=null;
 function pointerDown(e:PointerEvent){if(!open||busy)return;if(e.pointerType==='touch'&&e.clientX>panelRect.x&&e.clientX<panelRect.x+panelRect.width&&e.clientY>panelRect.y+viewTop&&e.clientY<panelRect.y+viewTop+viewHeight)swipe={y:e.clientY,scroll,pointer:e.pointerId};}
 function pointerMove(e:PointerEvent){if(!open)return;if(drag&&drag.pointer===e.pointerId){e.preventDefault();set({[drag.key]:Math.round(Math.max(0,Math.min(1,(e.clientX-drag.x)/drag.width))*100)});}else if(swipe&&swipe.pointer===e.pointerId&&Math.abs(e.clientY-swipe.y)>8){scroll=swipe.scroll+swipe.y-e.clientY;refresh();}}
 function pointerUp(){drag=null;swipe=null;}
 function wheel(e:WheelEvent){if(!open)return;e.preventDefault();scroll+=e.deltaY;refresh();}
 function cancel(){if(busy)return;confirm=false;capture=-1;scroll=0;focus='reset-progression';message='';refresh();}
 function close(){if(busy||!open)return;capture=-1;open=false;confirm=false;drag=null;swipe=null;overlay.visible=false;o.releaseInput();if(o.solo){setGamePaused(false);o.pause(false);}previous?.focus();o.redraw();}
 function show(gesture?:HudActionGesture){if(open||!o.canOpen())return;openingTime=gesture?.timeStamp??-Infinity;previous=document.activeElement as HTMLElement;previous?.blur();o.releaseInput();open=true;confirm=false;capture=-1;scroll=0;focus='close';message='';overlay.visible=true;if(o.solo){setGamePaused(true);o.pause(true);}refresh();}
 async function reset(){if(busy)return;busy=true;refresh();try{await resetProgression();location.reload();}catch(e){busy=false;message=e instanceof Error?e.message:'Reset failed.';refresh();}}
 function ensureFocus(){const c=controls.find(c=>c.id===focus);if(!c||['close','resume','cancel','confirm-reset'].includes(c.id))return;if(c.y<viewTop)scroll-=viewTop-c.y;else if(c.y+c.h>viewTop+viewHeight)scroll+=c.y+c.h-viewTop-viewHeight;}
 function key(e:KeyboardEvent){
  if(!open){if(e.type==='keydown'&&e.key==='Escape'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){show();if(open){e.preventDefault();e.stopImmediatePropagation();}}return;}e.stopImmediatePropagation();if(e.type==='keyup')return;e.preventDefault();if(busy||e.repeat)return;
  keyboard=true;
  if(capture>=0){if(e.key==='Escape'){capture=-1;message='Shortcut change cancelled.';}else if(!['Shift','Control','Alt','Meta'].includes(e.key)){if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)message='Use a single key without modifiers.';else{message=skillBindings.assign(capture,e.code);if(!message){capture=-1;message='Shortcut saved.';}}}refresh();return;}
  if(e.key==='Escape'){if(confirm)cancel();else close();return;}
  const current=controls.find(c=>c.id===focus);
  if(e.key==='Tab'){const i=controls.findIndex(c=>c.id===focus);focus=controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].id;ensureFocus();}
  else if(e.key==='Enter'||e.code==='Space')current?.action();
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){current?.adjust?.(e.key==='ArrowLeft'?-5:5);}
  else if(e.key==='Home'&&current?.adjust)current.adjust(-100);
  else if(e.key==='End'&&current?.adjust)current.adjust(100);
  else if(e.key==='ArrowDown'||e.key==='PageDown')scroll+=e.key==='PageDown'?viewHeight:48;
  else if(e.key==='ArrowUp'||e.key==='PageUp')scroll-=e.key==='PageUp'?viewHeight:48;
  refresh();
 }
 const unsubscribe=gameSettings.subscribe(s=>{o.showFps(s.showFps);refresh();});o.showFps(gameSettings.get().showFps);
 const unbind=skillBindings.subscribe(refresh);
 function blur(){drag=null;swipe=null;if(capture>=0){capture=-1;message='Shortcut change cancelled.';refresh();}}
 function position(){const {x,y}=hudActionPosition(o.bounds());gear.position(x,y);}
 function resize(){position();drag=null;swipe=null;if(mobile()&&capture>=0){capture=-1;message='';focus='close';}refresh();}
 document.addEventListener('keydown',key,true);document.addEventListener('keyup',key,true);
 window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('pointerdown',pointerDown);window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerUp);window.addEventListener('resize',resize);window.addEventListener('blur',blur);
 const debug={renderer:'pixi',snapshot:()=>({...gameSettings.get(),open,confirm,busy,capture,focus,scroll,maxScroll,message,bindings:skillBindings.get(),mobile:mobile(),artReady:textures.has('v2/panel')&&textures.has('v2/button'),panel:panelRect}),audio:audioSnapshot,overlay,gear:gear.button,open:show};
 (window as any).__SETTINGS__=debug;
 position();const timer=setInterval(position,250);
 return {isOpen:()=>open,close,destroy(){destroyed=true;clearInterval(timer);unsubscribe();unbind();document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',key,true);window.removeEventListener('wheel',wheel);window.removeEventListener('pointerdown',pointerDown);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',pointerUp);window.removeEventListener('resize',resize);window.removeEventListener('blur',blur);if(open&&o.solo){setGamePaused(false);o.pause(false);}gear.destroy();overlay.destroy({children:true});if((window as any).__SETTINGS__===debug)delete (window as any).__SETTINGS__;}};
}
