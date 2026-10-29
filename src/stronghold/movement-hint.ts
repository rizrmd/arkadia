import {Container,Graphics} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';
import {heroInfo,type HeroId} from './heroes';

const SEEN='arkodia.desktop-movement-hint.v1';

// First desktop entry only. Touch visits do not consume the keyboard tutorial.
export function showMovementHint(stage:Container,frames:FrameSet,hero:HeroId){
 if(!matchMedia('(hover: hover) and (pointer: fine)').matches||innerWidth<768)return;
 try{if(localStorage.getItem(SEEN)==='1')return;}catch{}
 const bubble=new Container();bubble.label='desktop-movement-hint';bubble.zIndex=44;
 bubble.eventMode='none';
 const w=300,h=176;
 bubble.addChild(new Graphics().poly([w/2-10,h-2,w/2,h+12,w/2+10,h-2]).fill(0x9d8054));
 bubble.addChild(frames.frame('panel-bronze',w,h));
 bubble.addChild(new MsdfText('panel-label',heroInfo(hero).name,{size:12})).place(w/2,29,.5);
 bubble.addChild(new MsdfText('panel-body',"Let's move! Use WASD to guide me.",{size:14})).place(w/2,53,.5);
 const caps=new Map<string,Graphics>();
 for(const [key,x,y] of [['W',132,65],['A',92,103],['S',132,103],['D',172,103]] as const){
  const cap=new Graphics();cap.position.set(x,y);bubble.addChild(cap);caps.set(key,cap);
  draw(cap,false);
  bubble.addChild(new MsdfText('panel-title',key,{size:18})).place(x+18,y+25,.5);
 }
 bubble.addChild(new MsdfText('panel-muted','Your adventure starts with a step.',{size:11})).place(w/2,161,.5);
 function draw(cap:Graphics,down:boolean){cap.clear().roundRect(0,0,36,34,5).fill(down?0x826437:0x252b32).stroke({color:down?0xf0cd86:0x9d8054,width:1.5});}
 const layout=()=>{bubble.position.set(Math.round((innerWidth-w)/2),Math.max(120,Math.round(innerHeight/2-h-65)));};
 const key=(e:KeyboardEvent)=>{const cap=caps.get(e.key.toUpperCase());if(cap)draw(cap,e.type==='keydown');};
 const blur=()=>{for(const cap of caps.values())draw(cap,false);};
 const close=()=>{clearTimeout(timer);window.removeEventListener('resize',layout);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);bubble.destroy({children:true});};
 layout();stage.addChild(bubble);
 window.addEventListener('resize',layout);window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur);
 try{localStorage.setItem(SEEN,'1');}catch{}
 const timer=setTimeout(close,7000);
}
