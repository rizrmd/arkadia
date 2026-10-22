import {Container,Sprite,type Texture} from 'pixi.js';
import type {FrameSet} from './frames';
import {MsdfText} from './text';

// Gameplay HUD rebuilt from the Typography Reference Asset (1672 × 941). Coordinates are reference pixels; each group is
// anchored to its screen corner or edge, so other aspect ratios keep the corners and centre where the reference has them.
export const HUD_DESIGN={width:1672,height:941};
export interface HudState{name:string;level:number;hp:number;hpMax:number;gold:number;time:string;zone:string;xp:number;xpMax:number;skills:{name:string;level:number;art:string}[]}
export const DEFAULT_HUD:HudState={name:'Ember Warden',level:9,hp:96,hpMax:100,gold:250,time:'06:27',zone:'Wilds',xp:60,xpMax:100,
 skills:[{name:'Flame Fan',level:1,art:'skill-flame-fan'},{name:'Rift Trap',level:2,art:'skill-rift-trap'},{name:'Seismic Slam',level:3,art:'skill-seismic-slam'}]};

const centred=(s:Sprite|Container,cx:number,cy:number,w?:number,h?:number)=>{if(w)s.width=w;if(h)s.height=h;s.position.set(cx-s.width/2,cy-s.height/2);return s;};

export class Hud extends Container{
 private groups:Record<'tl'|'tr'|'bc'|'bl'|'br',Container>={tl:new Container(),tr:new Container(),bc:new Container(),bl:new Container(),br:new Container()};
 private backdrop?:Sprite;
 private overlay?:Sprite;
 private hpFill!:Container;private hpText!:MsdfText;private xpFill!:Container;private xpValue!:MsdfText;private xpRest!:MsdfText;
 constructor(private frames:FrameSet,private state:HudState=DEFAULT_HUD,images:{backdrop?:Texture;reference?:Texture}={}){
  super();
  if(images.backdrop)this.addChild(this.backdrop=new Sprite(images.backdrop));
  for(const g of Object.values(this.groups))this.addChild(g);
  if(images.reference){this.overlay=new Sprite(images.reference);this.overlay.alpha=0;this.addChild(this.overlay);}
  this.buildHero();this.buildStats();this.buildSkills();this.buildKeys();
  this.setHp(state.hp);this.setXp(state.xp);
 }
 set referenceAlpha(a:number){if(this.overlay)this.overlay.alpha=a;}

 private buildHero(){
  const g=this.groups.tl,f=this.frames,s=this.state;
  g.addChild(f.frame('corner'));
  g.addChild(f.frame('hero-plate',388,104)).position.set(150,24);
  g.addChild(f.frame('hp-frame',362,40)).position.set(178,68);
  this.hpFill=g.addChild(new Container());this.hpFill.position.set(186,77);
  this.hpFill.addChild(f.frame('hp-fill',320,22));
  this.hpText=g.addChild(new MsdfText('hud-value',''));
  g.addChild(new MsdfText('hud-name',s.name)).place(195,56);
  g.addChild(centred(f.frame('portrait-ember-warden'),95,88));
  g.addChild(centred(f.frame('portrait-ring'),95,88));
  g.addChild(centred(f.frame('level-medallion'),57,149));
  g.addChild(new MsdfText('hud-level',String(s.level))).place(57,157.5,.5);
 }
 private buildStats(){
  const g=this.groups.tr,f=this.frames,s=this.state;
  const rows:[number,number,string,string,number,number,number][]=[[1450,20,'icon-coins',`${s.gold} Gold`,1495,44,1530],[1510,72,'icon-clock',s.time,1553,96,1581],[1505,125,'icon-pin',s.zone,1551,149,1574]];
  const baselines=[51,104,156];
  rows.forEach(([x,y,icon,text,ix,iy,tx],i)=>{
   g.addChild(f.frame('pill',1665-x,48)).position.set(x,y);
   g.addChild(centred(f.frame(icon),ix,iy));
   g.addChild(new MsdfText('hud-stat',text)).place(tx,baselines[i]);
  });
 }
 private buildSkills(){
  const g=this.groups.bc,f=this.frames;
  this.state.skills.forEach((sk,i)=>{
   const cx=680+i*157,cy=700;
   g.addChild(centred(f.frame(sk.art),cx,cy));
   g.addChild(centred(f.frame('skill-ring'),cx,cy));
   g.addChild(f.frame('badge-level',58,24)).position.set(cx-29,736);
   g.addChild(new MsdfText('hud-badge',`Lv. ${sk.level}`)).place(cx,753.5,.5);
   g.addChild(f.frame('badge-auto',84,28)).position.set(cx-42,761);
   g.addChild(new MsdfText('hud-state','Auto')).place(cx,781,.5);
   g.addChild(new MsdfText('hud-skill',sk.name)).place(cx,813,.5);
  });
  g.addChild(f.frame('xp-frame',716,50)).position.set(483,829);
  this.xpFill=g.addChild(new Container());this.xpFill.position.set(527,842);
  this.xpFill.addChild(f.frame('xp-fill',628,24));
  this.xpValue=g.addChild(new MsdfText('hud-xp',''));this.xpRest=g.addChild(new MsdfText('hud-xp-accent',''));
 }
 private buildKeys(){
  const f=this.frames,bl=this.groups.bl,br=this.groups.br;
  bl.addChild(f.frame('pill-wide',258,60)).position.set(6,853);
  ['W','A','S','D'].forEach((k,i)=>{bl.addChild(f.frame('keycap',28,28)).position.set(40+i*30,872);bl.addChild(new MsdfText('hud-key',k)).place(54+i*30,893,.5);});
  bl.addChild(new MsdfText('hud-hint','· Move')).place(166,891);
  br.addChild(f.frame('pill-wide',190,60)).position.set(1478,853);
  br.addChild(f.frame('keycap',46,30)).position.set(1509,871);
  br.addChild(new MsdfText('hud-key','Esc')).place(1532,892,.5);
  br.addChild(new MsdfText('hud-hint','· Menu')).place(1566,891);
 }
 setHp(hp:number){
  const max=this.state.hpMax,w=Math.max(12,320*hp/max);(this.hpFill.children[0] as Container).width=w;
  this.hpText.text=`${hp} / ${max} HP`;this.hpText.place(349,95,.5);
 }
 setXp(xp:number){
  const max=this.state.xpMax;(this.xpFill.children[0] as Container).width=Math.max(12,628*xp/max);
  // The value sits just past the fill's end (as in the reference), or inside its end when the bar is nearly full.
  this.xpValue.text=String(xp);this.xpRest.text=` / ${max} XP`;
  const end=527+Math.max(12,628*xp/max),w=this.xpValue.advance+this.xpRest.advance,x=end+8+w<=1150?end+8:end-8-w;
  this.xpValue.place(x,858);this.xpRest.place(x+this.xpValue.advance,858);
 }
 // Desktop and landscape keep the reference arrangement at one uniform scale; portrait raises the skill row above the key hints.
 layout(width:number,height:number){
  const {width:W,height:H}=HUD_DESIGN,portrait=width<height;
  const s=portrait?width/790:Math.min(width/W,height/H);
  const place=(g:Container,px:number,py:number,x:number,y:number)=>{g.scale.set(s);g.pivot.set(px,py);g.position.set(x,y);};
  place(this.groups.tl,0,0,0,0);place(this.groups.tr,W,0,width,0);
  place(this.groups.bc,W/2,H,width/2,height-(portrait?72*s:0));
  place(this.groups.bl,0,H,0,height);place(this.groups.br,W,H,width,height);
  for(const img of [this.backdrop,this.overlay]){if(!img)continue;const c=Math.max(width/W,height/H);img.scale.set(c*W/img.texture.width);img.position.set((width-W*c)/2,(height-H*c)/2);}
  return s;
 }
 static sceneScale(width:number,height:number){return width<height?width/790:Math.min(width/HUD_DESIGN.width,height/HUD_DESIGN.height);}
}
