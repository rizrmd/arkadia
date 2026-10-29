import {setGamePaused} from '../app/frame-scheduler';
import {Container,Graphics,Rectangle,type FederatedPointerEvent} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {BUILDING_BRANCHES,constructionReason,constructDefense,DEFENSE_COST} from './building-branches';
import {KEY,load} from './economy';
import {transactResources} from './store';
import type {HeroId} from './heroes';
export function createBuildingTree(o:{stage:Container;hero:()=>HeroId;online:()=>boolean;canOpen:()=>boolean;changed:()=>void;release:()=>void;pause:(open:boolean)=>void;redraw:()=>void;siteClear:()=>boolean}){
 let opened=false,busy=false,message='',scroll=0,maxScroll=0,dragY:number|null=null;
 const layer=o.stage.addChild(new Container({label:'Building Tree',eventMode:'static'}));layer.zIndex=115;layer.visible=false;
 const launcher=o.stage.addChild(new Container({label:'Open Building Tree',eventMode:'static',cursor:'pointer'}));launcher.zIndex=20;launcher.visible=false;launcher.eventMode='none';
 const label=(p:Container,value:string,x:number,y:number,size=16,width=300)=>{const t=p.addChild(new MsdfText({font:'body',size,letterSpacing:0,fill:0xf8e8c7},value,{wrapWidth:width,lineHeight:size*1.3}));t.position.set(x,y);return t;};
 launcher.addChild(new Graphics().roundRect(0,0,125,42,8).fill(0x253642).stroke({color:0xb08c57,width:1}));label(launcher,'Building Tree',10,11,16,110);launcher.hitArea=new Rectangle(0,0,125,42);
 // Temporarily unavailable, including the keyboard shortcut and debug API.
 const enabled=false;
 function open(){if(enabled&&!opened&&o.canOpen()){opened=true;message='';scroll=0;o.release();if(!o.online())setGamePaused(true);o.pause(true);draw();}}
 launcher.on('pointertap',e=>{e.stopPropagation();open();});
 function close(){if(busy)return;opened=false;layer.visible=false;o.release();if(!o.online())setGamePaused(false);o.pause(false);o.redraw();}
 function button(p:Container,value:string,x:number,y:number,w:number,fn:()=>void,disabled=false){const b=p.addChild(new Container({label:value,eventMode:'static',cursor:disabled?'default':'pointer'}));b.position.set(x,y);b.hitArea=new Rectangle(0,0,w,44);b.addChild(new Graphics().roundRect(0,0,w,44,6).fill(disabled?0x39434a:0x775c34));label(b,value,10,11,16,w-20);b.on('pointerdown',e=>e.stopPropagation());b.on('pointertap',e=>{e.stopPropagation();if(!disabled&&!busy)fn();});}
 let body:Container|undefined;
 function setScroll(value:number){scroll=Math.max(0,Math.min(maxScroll,value));if(body)body.y=70-scroll;o.redraw();}
 function draw(){
  launcher.position.set(12,Math.max(80,innerHeight-130));
  if(!opened)return;layer.visible=true;layer.removeChildren().forEach(c=>c.destroy({children:true}));
  const w=Math.min(540,innerWidth-24),h=Math.min(550,innerHeight-24),x=(innerWidth-w)/2,y=(innerHeight-h)/2;
  layer.hitArea=new Rectangle(0,0,innerWidth,innerHeight);const shade=layer.addChild(new Graphics().rect(0,0,innerWidth,innerHeight).fill({color:0,alpha:.75}));shade.eventMode='static';shade.on('pointertap',close);
  const p=layer.addChild(new Container({label:'Building Tree panel',eventMode:'static'}));p.position.set(x,y);p.hitArea=new Rectangle(0,0,w,h);p.addChild(new Graphics().roundRect(0,0,w,h,12).fill(0x182832).stroke({color:0xc7a666,width:2}));
  label(p,'Building Tree',20,20,24,w-125);button(p,'Close',w-90,12,76,close);
  const viewport=p.addChild(new Container({eventMode:'static'})),mask=p.addChild(new Graphics().rect(15,68,w-30,h-80).fill(0xffffff));viewport.mask=mask;viewport.hitArea=new Rectangle(15,68,w-30,h-80);
  body=viewport.addChild(new Container());body.position.set(20,70-scroll);const bw=w-40;
  label(body,'Advanced buildings for your faction.',0,0,16,bw);
  let state;try{state=load(localStorage.getItem(KEY));}catch(e){label(body,String(e),0,60,16,bw);return;}
  Object.entries(BUILDING_BRANCHES).forEach(([id,c],i)=>{
   const active=id===o.hero(),rowY=42+i*115;
   label(body!,`${active?'Selected: ':''}${c.name}`,0,rowY,19,bw);
   body!.addChild(new Graphics().moveTo(7,rowY+29).lineTo(7,rowY+42).lineTo(20,rowY+42).stroke({color:0xb99b63,width:1.5}));
   label(body!,c.label,27,rowY+30,18,bw-27);
   const reason=constructionReason(state,o.hero(),c.defense,o.online());
   const built=state.careerDefenses?.[id as HeroId]===c.defense;
   button(body!,built?'Built':active?'Build '+c.label:'Requires '+c.name,0,rowY+58,bw,()=>{
    busy=true;message='Building…';
    void transactResources(s=>{if(!o.siteClear())throw Error('Move away from the building site beside the gate.');constructDefense(s,o.hero(),c.defense,o.online());}).then(()=>{message=c.label+' constructed inside the fortress.';o.changed();},e=>{message=e.message;}).finally(()=>{busy=false;draw();});draw();
   },!!reason||busy);
  });
  label(body,`Core Lv. 12 · ${DEFENSE_COST.gold} Gold + ${DEFENSE_COST.wood} Wood (Log).`,0,282,15,bw);
  label(body,message||constructionReason(state,o.hero(),BUILDING_BRANCHES[o.hero()].defense,o.online())||'Build your faction defense beside the fortress gate.',0,324,16,bw);
  label(body,'Defends against nearby enemies. Common buildings keep their existing rules.',0,388,14,bw);
  maxScroll=Math.max(0,452-(h-84));setScroll(scroll);
  if(maxScroll>0)label(p,'Scroll to view more',20,h-19,12,w-40);o.redraw();
 }
 layer.on('wheel',e=>{if(opened){e.preventDefault();e.stopPropagation();setScroll(scroll+e.deltaY);}});
 layer.on('pointerdown',(e:FederatedPointerEvent)=>{dragY=e.global.y;});
 layer.on('pointermove',(e:FederatedPointerEvent)=>{if(dragY!==null){setScroll(scroll+dragY-e.global.y);dragY=e.global.y;}});
 for(const event of ['pointerup','pointerupoutside','pointercancel'] as const)layer.on(event,()=>{dragY=null;});
 addEventListener('resize',draw);addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.stopImmediatePropagation();close();}else if(e.code==='KeyB'&&!e.repeat&&!opened)open();});
 draw();return {isOpen:()=>opened,open,close,refresh:draw,snapshot:()=>({open:opened,scroll,maxScroll,faction:BUILDING_BRANCHES[o.hero()].name})};
}
