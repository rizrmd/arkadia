import {Container} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';
import {createHero,type Column,type Placed} from './hero';
import type {Sun} from './daylight';
import type {Net} from './net/client';
import type {PlayerState} from './net/protocol';
import {DEFAULT_HERO,isHero} from './heroes';
import {measureTracelogPhase} from './tracelog';

export function createParty<P extends Placed>(o:{
 layer:Container;
 frames:FrameSet;
 lightmap:HTMLCanvasElement;
 surface:HTMLElement;
 footprint:(p:P)=>Column[];
 sun:()=>Sun;
 net:Net;
 own:()=>{x:number;y:number};
}){
 type Ally={
  hero:Awaited<ReturnType<typeof createHero<P>>>|null;
  tag:Container;
  nameText:MsdfText;
  fillGreen:Container;
  fillLow:Container;
  state:PlayerState;
  plays:number;
  clipAt:number;
  behind:boolean|null;
  gone:boolean;
 };
 const allies=new Map<string,Ally>();
 const tags=new Container();
 tags.zIndex=42;
 o.layer.addChild(tags);
 let scene:P[]=[],origin={x:0,y:0,scale:1};
 const pick=(p:PlayerState)=>isHero(p.h)?p.h:DEFAULT_HERO;

 function add(p:PlayerState){
  const tag=new Container();
  const nameText=tag.addChild(new MsdfText('tag-ally',p.name));
  nameText.place(0,-14,0.5);
  const barTrack=tag.addChild(o.frames.frame('overhead-bar',48,10));
  barTrack.position.set(-24,-10);
  const fillGreen=tag.addChild(new Container());
  fillGreen.position.set(-21,-7.5);
  fillGreen.addChild(o.frames.frame('hp-fill-green',42,5));
  const fillLow=tag.addChild(new Container());
  fillLow.position.set(-21,-7.5);
  fillLow.addChild(o.frames.frame('hp-fill',42,5));
  fillLow.visible=false;
  tags.addChild(tag);

  const a:Ally={hero:null,tag,nameText,fillGreen,fillLow,state:p,plays:p.n,clipAt:performance.now(),behind:null,gone:false};
  allies.set(p.id,a);

  void createHero<P>({
   hero:pick(p),layer:o.layer,lightmap:o.lightmap,surface:o.surface,footprint:o.footprint,sun:o.sun,
   direction:()=>({x:0,y:0}),follow:()=>{},id:'world-ally-'+p.id,
   drive:()=>{const s=a.state;return {x:s.x,y:s.y,pose:s.st==='idle'?null:{clip:s.st,t:performance.now()-a.clipAt},look:{facing:s.fc,back:s.bk,vertical:s.vt}};},
  }).then(h=>{
   if(a.gone){h.remove();return;}
   a.hero=h;h.setScene(scene);h.place(origin.x,origin.y,origin.scale);h.start();
  }).catch(console.error);
 }

 function update(now:number){
  measureTracelogPhase('encountersRender',()=>{
   const list=o.net.active()?o.net.remotes(now):[],seen=new Set<string>(),me=o.own();
   for(const p of list){
    seen.add(p.id);const a=allies.get(p.id);if(!a){add(p);continue;}
    if(p.n!==a.plays){a.plays=p.n;a.clipAt=performance.now();}
    a.state=p;
    if(a.nameText.text!==p.name){a.nameText.text=p.name;a.nameText.place(0,-14,0.5);}
    if(a.hero&&a.hero.hero()!==pick(p))void a.hero.setHero(pick(p));
    const behind=p.y<me.y;
    if(a.hero&&behind!==a.behind){a.behind=behind;a.hero.sprite.zIndex=behind?29:31;}
   }
   for(const [id,a] of allies)if(!seen.has(id)){a.gone=true;a.hero?.remove();a.tag.destroy({children:true});allies.delete(id);}
   place();
  });
  requestAnimationFrame(update);
 }

 function place(){
  const k=origin.scale;
  for(const a of allies.values()){
   const s=a.state,ratio=Math.max(0,Math.min(1,s.hp/Math.max(1,s.max)));
   a.tag.position.set(origin.x+s.x*k,origin.y+(s.y-80)*k);
   a.tag.alpha=s.st==='die'?0.45:1;
   const low=ratio<0.3;
   a.fillGreen.visible=!low&&ratio>0.02;
   a.fillLow.visible=low&&ratio>0.02;
   const w=Math.max(8,Math.round(42*ratio));
   (a.fillGreen.children[0] as Container).width=w;
   (a.fillLow.children[0] as Container).width=w;
  }
 }
 requestAnimationFrame(update);
 return {
  setScene(list:P[]){scene=list;for(const a of allies.values())a.hero?.setScene(list);},
  place(x:number,y:number,scale:number){origin={x,y,scale};for(const a of allies.values())a.hero?.place(x,y,scale);place();},
  count:()=>allies.size
 };
}
