import {Container,Graphics,Rectangle,Sprite,type Texture} from 'pixi.js';
import type {FrameSet} from './frames';
import {MsdfText} from './text';

// Gameplay HUD rebuilt from the Typography Reference Asset (1672 × 941). Coordinates are reference pixels; each group is
// anchored to its screen corner or edge, so other aspect ratios keep the corners and centre where the reference has them.
export const HUD_DESIGN={width:1672,height:941};
export interface HudSkillState{name:string;level:number;art:string;stateLabel?:string;locked?:boolean;cooldownRatio?:number}
export interface HudState{
 name:string;
 portrait?:string;
 level:number;
 hp:number;
 hpMax:number;
 gold:number;
 time:string;
 zone:string;
 xp:number;
 xpMax:number;
 coopLabel?:string;
 skills:HudSkillState[];
}
export interface HudCallbacks{
 onHeroClick?:()=>void;
 onClockClick?:()=>void;
 onCoopClick?:()=>void;
 onSkillClick?:(index:number)=>void;
 onMenuClick?:()=>void;
}
export const DEFAULT_HUD:HudState={name:'Ember Warden',portrait:'portrait-ember-warden',level:9,hp:96,hpMax:100,gold:250,time:'06:27',zone:'Wilds',xp:60,xpMax:100,
 skills:[{name:'Flame Fan',level:1,art:'skill-flame-fan'},{name:'Rift Trap',level:2,art:'skill-rift-trap'},{name:'Seismic Slam',level:3,art:'skill-seismic-slam'}]};

const centred=(s:Sprite|Container,cx:number,cy:number,w?:number,h?:number)=>{if(w)s.width=w;if(h)s.height=h;s.position.set(cx-s.width/2,cy-s.height/2);return s;};

interface SkillSlotView{
 root:Container;
 artHolder:Container;
 currentArt:string;
 cooldownArc:Graphics;
 levelText:MsdfText;
 stateBadge:Container;
 stateText:MsdfText;
 nameText:MsdfText;
 cx:number;
 cy:number;
}

export class Hud extends Container{
 private groups:Record<'tl'|'tr'|'bc'|'bl'|'br',Container>={tl:new Container(),tr:new Container(),bc:new Container(),bl:new Container(),br:new Container()};
 private backdrop?:Sprite;
 private overlay?:Sprite;
 private heroPlate!:Container;
 private hpFill!:Container;private hpText!:MsdfText;
 private tlXpGroup!:Container;private tlXpFill!:Container;private tlXpValue!:MsdfText;private tlXpRest!:MsdfText;
 private bcXpGroup!:Container;private xpFill!:Container;private xpValue!:MsdfText;private xpRest!:MsdfText;
 private heroNameText!:MsdfText;
 private levelText!:MsdfText;
 private portraitHolder!:Container;
 private currentPortrait='';
 private goldPillBg!:Container;
 private goldCoinIcon!:Container;
 private goldText!:MsdfText;
 private clockText!:MsdfText;
 private zonePillBg!:Container;
 private zonePinIcon!:Container;
 private zoneText!:MsdfText;
 private coopPill?:Container;
 private coopPillBg?:Container;
 private coopIcon?:Container;
 private coopText?:MsdfText;
 private skillViews:SkillSlotView[]=[];
 private lastScale=1;
 private lastWidth=HUD_DESIGN.width;

 constructor(
  private frames:FrameSet,
  private state:HudState={...DEFAULT_HUD,skills:DEFAULT_HUD.skills.map(s=>({...s}))},
  images:{backdrop?:Texture;reference?:Texture}={},
  private callbacks:HudCallbacks={},
 ){
  super();
  if(images.backdrop)this.addChild(this.backdrop=new Sprite(images.backdrop));
  for(const g of Object.values(this.groups))this.addChild(g);
  if(images.reference){this.overlay=new Sprite(images.reference);this.overlay.alpha=0;this.addChild(this.overlay);}
  this.buildHero();this.buildStats();this.buildSkills();this.buildKeys();
  this.setHp(state.hp,state.hpMax);this.setXp(state.xp,state.xpMax);
 }
 set referenceAlpha(a:number){if(this.overlay)this.overlay.alpha=a;}

 private buildHero(){
  const g=this.groups.tl,f=this.frames,s=this.state;
  const hit=new Container();
  hit.eventMode='static';
  hit.cursor='pointer';
  hit.hitArea=new Rectangle(0,0,545,190);
  hit.on('pointertap',()=>this.callbacks.onHeroClick?.());
  g.addChild(hit);

  hit.addChild(f.frame('corner'));
  this.heroPlate=hit.addChild(f.frame('hero-plate',388,104));
  this.heroPlate.position.set(150,24);
  hit.addChild(f.frame('hp-frame',362,40)).position.set(178,68);
  this.hpFill=hit.addChild(new Container());this.hpFill.position.set(186,77);
  this.hpFill.addChild(f.frame('hp-fill',320,22));
  this.hpText=hit.addChild(new MsdfText('hud-value',''));
  this.heroNameText=hit.addChild(new MsdfText('hud-name',s.name));
  this.heroNameText.place(195,52.5);

  // Portrait XP bar directly below HP bar inside hero-plate (matches mobile portrait reference)
  this.tlXpGroup=hit.addChild(new Container());
  this.tlXpGroup.visible=false;
  this.tlXpGroup.addChild(f.frame('hp-frame',362,40)).position.set(178,108);
  this.tlXpFill=this.tlXpGroup.addChild(new Container());
  this.tlXpFill.position.set(186,117);
  this.tlXpFill.addChild(f.frame('xp-fill',320,22));
  this.tlXpValue=this.tlXpGroup.addChild(new MsdfText('hud-xp',''));
  this.tlXpRest=this.tlXpGroup.addChild(new MsdfText('hud-xp-accent',''));

  this.portraitHolder=hit.addChild(new Container());
  this.currentPortrait=s.portrait??'portrait-ember-warden';
  this.portraitHolder.addChild(centred(f.frame(this.currentPortrait),95,88));
  hit.addChild(centred(f.frame('portrait-ring'),95,88));
  hit.addChild(centred(f.frame('level-medallion'),57,149));
  this.levelText=hit.addChild(new MsdfText('hud-level',String(s.level)));
  this.levelText.place(57,154.5,.5);
 }

 private buildStats(){
  const g=this.groups.tr,f=this.frames,s=this.state;
  // Row 0: Gold / Kills
  const goldRow=g.addChild(new Container());
  this.goldPillBg=goldRow.addChild(f.frame('pill',1665-1450,48));
  this.goldCoinIcon=goldRow.addChild(centred(f.frame('icon-coins'),1495,44));
  this.goldText=goldRow.addChild(new MsdfText('hud-stat',`${s.gold} Gold`));
  this.layoutGoldPill();

  // Row 1: Clock (interactive)
  const clockRow=g.addChild(new Container());
  clockRow.eventMode='static';
  clockRow.cursor='pointer';
  clockRow.hitArea=new Rectangle(1508,70,162,52);
  clockRow.on('pointertap',()=>this.callbacks.onClockClick?.());
  clockRow.addChild(f.frame('pill',1665-1512,48)).position.set(1512,72);
  clockRow.addChild(centred(f.frame('icon-clock'),1557,96));
  this.clockText=clockRow.addChild(new MsdfText('hud-stat',s.time));
  this.clockText.place(1611,100.5,.5);

  // Row 2: Zone
  const zoneRow=g.addChild(new Container());
  this.zonePillBg=zoneRow.addChild(f.frame('pill',1665-1505,48));
  this.zonePinIcon=zoneRow.addChild(centred(f.frame('icon-pin'),1551,149));
  this.zoneText=zoneRow.addChild(new MsdfText('hud-stat',s.zone));
  this.layoutZonePill(s.zone);

  // Optional Row 3: Co-op pill (only shown when coopLabel is provided)
  if(s.coopLabel!==undefined){
   this.ensureCoopPill(s.coopLabel);
  }
 }

 private layoutGoldPill(){
  const pillX=Math.min(1450,Math.round(1665-(this.goldText.advance+123)));
  const pillW=1665-pillX;
  this.goldPillBg.position.set(pillX,20);
  this.goldPillBg.width=pillW;
  centred(this.goldCoinIcon,pillX+45,44);
  this.goldText.place((pillX+82+1632)/2,48,.5);
 }

 private layoutZonePill(zone:string){
  const pillX=zone==='Wilds'?1505:Math.min(1505,Math.round(1665-(this.zoneText.advance+106)));
  const pillW=1665-pillX;
  this.zonePillBg.position.set(pillX,125);
  this.zonePillBg.width=pillW;
  centred(this.zonePinIcon,pillX+46,149);
  this.zoneText.place((pillX+77+1630)/2,153.5,.5);
 }

 private ensureCoopPill(label:string){
  if(!this.coopPill){
   const g=this.groups.tr,f=this.frames;
   const row=g.addChild(new Container());
   row.eventMode='static';
   row.cursor='pointer';
   row.on('pointertap',()=>this.callbacks.onCoopClick?.());
   this.coopPillBg=row.addChild(f.frame('pill',1665-1470,48));
   this.coopIcon=row.addChild(centred(f.frame('icon-users'),1514,202));
   this.coopText=row.addChild(new MsdfText('hud-stat',label));
   this.coopPill=row;
  }
  if(this.coopText&&this.coopPillBg&&this.coopIcon&&this.coopPill){
   this.coopText.text=label;
   const pillX=Math.min(1480,Math.round(1665-(this.coopText.advance+110)));
   const pillW=1665-pillX;
   this.coopPillBg.position.set(pillX,178);
   this.coopPillBg.width=pillW;
   centred(this.coopIcon,pillX+45,202);
   this.coopText.place((pillX+70+1629)/2,205.5,.5);
   this.coopPill.hitArea=new Rectangle(pillX-4,176,pillW+8,52);
  }
 }

 private buildSkills(){
  const g=this.groups.bc,f=this.frames;
  this.skillViews=[];
  this.state.skills.forEach((sk,i)=>{
   const cx=680+i*157,cy=700;
   const slot=g.addChild(new Container());
   slot.eventMode='static';
   slot.cursor='pointer';
   slot.hitArea=new Rectangle(cx-68,cy-62,136,192);
   slot.on('pointertap',()=>this.callbacks.onSkillClick?.(i));

   const artHolder=slot.addChild(new Container());
   artHolder.addChild(centred(f.frame(sk.art),cx,cy));

   const cooldownArc=slot.addChild(new Graphics());
   slot.addChild(centred(f.frame('skill-ring'),cx,cy));
   slot.addChild(f.frame('badge-level',58,24)).position.set(cx-29,736);
   const levelText=slot.addChild(new MsdfText('hud-badge',sk.locked?'—':`Lv. ${sk.level}`));
   levelText.place(cx,751.5,.5);
   const stateBadge=slot.addChild(f.frame('badge-auto',84,28));
   const stateText=slot.addChild(new MsdfText('hud-state',sk.stateLabel??(sk.locked?'Locked':'Auto')));
   const bw=Math.max(84,Math.round(stateText.advance+36));
   stateBadge.width=bw;
   stateBadge.position.set(cx-bw/2,761);
   stateText.place(cx,779,.5);
   const nameText=slot.addChild(new MsdfText('hud-skill',sk.name));
   nameText.place(cx,811,.5);

   this.skillViews.push({root:slot,artHolder,currentArt:sk.art,cooldownArc,levelText,stateBadge,stateText,nameText,cx,cy});
  });
  this.bcXpGroup=g.addChild(new Container());
  this.bcXpGroup.addChild(f.frame('xp-frame',716,50)).position.set(483,829);
  this.xpFill=this.bcXpGroup.addChild(new Container());this.xpFill.position.set(527,842);
  this.xpFill.addChild(f.frame('xp-fill',628,24));
  this.xpValue=this.bcXpGroup.addChild(new MsdfText('hud-xp',''));this.xpRest=this.bcXpGroup.addChild(new MsdfText('hud-xp-accent',''));
 }

 private buildKeys(){
  const f=this.frames,bl=this.groups.bl,br=this.groups.br;
  bl.addChild(f.frame('pill-wide',258,60)).position.set(6,853);
  ['W','A','S','D'].forEach((k,i)=>{bl.addChild(f.frame('keycap',28,28)).position.set(40+i*30,872);bl.addChild(new MsdfText('hud-key',k)).place(54+i*30,890,.5);});
  bl.addChild(new MsdfText('hud-hint','· Move')).place(166,888);
  br.eventMode='static';
  br.cursor='pointer';
  br.hitArea=new Rectangle(1478,853,190,60);
  br.on('pointertap',()=>this.callbacks.onMenuClick?.());
  br.addChild(f.frame('pill-wide',190,60)).position.set(1478,853);
  br.addChild(f.frame('keycap',46,30)).position.set(1509,871);
  br.addChild(new MsdfText('hud-key','Esc')).place(1532,889.5,.5);
  br.addChild(new MsdfText('hud-hint','· Hero')).place(1566,888);
  // Keep reference text '· Menu' if no menu callback is wired so capture.mjs stays 100% identical
  if(!this.callbacks.onMenuClick){
   const last=br.children[br.children.length-1] as MsdfText;
   last.text='· Menu';last.place(1566,888);
  }
 }

 setHero(name:string,portrait?:string){
  this.state.name=name;
  this.heroNameText.text=name;
  this.heroNameText.place(195,52.5);
  const nextPortrait=portrait??(name.toLowerCase().includes('rift')?'portrait-rift-runner':'portrait-ember-warden');
  if(nextPortrait!==this.currentPortrait){
   this.currentPortrait=nextPortrait;
   this.portraitHolder.removeChildren();
   this.portraitHolder.addChild(centred(this.frames.frame(nextPortrait),95,88));
  }
 }

 setLevel(level:number){
  this.state.level=level;
  this.levelText.text=String(level);
  this.levelText.place(57,154.5,.5);
 }

 setHp(hp:number,hpMax=this.state.hpMax){
  this.state.hp=hp;this.state.hpMax=hpMax;
  const max=Math.max(1,hpMax),w=Math.max(0,Math.min(320,320*Math.max(0,hp)/max));
  const bar=this.hpFill.children[0] as Container;
  bar.visible=w>2;
  if(w>2)bar.width=Math.max(12,w);
  this.hpText.text=`${Math.round(hp)} / ${Math.round(max)} HP`;this.hpText.place(352,92.5,.5);
 }

 setXp(xp:number,xpMax=this.state.xpMax,overrideRestText?:string){
  this.state.xp=xp;this.state.xpMax=xpMax;
  const max=Math.max(1,xpMax),ratio=Math.max(0,Math.min(1,xp/max));
  const rawW=628*ratio,bar=this.xpFill.children[0] as Container;
  bar.visible=rawW>1;
  if(rawW>1)bar.width=Math.max(12,Math.min(628,rawW));
  this.xpValue.text=String(Math.floor(xp));
  this.xpRest.text=overrideRestText??` / ${max} XP`;
  const w=this.xpValue.advance+this.xpRest.advance,x=Math.round(852-w/2);
  this.xpValue.place(x,855.5);this.xpRest.place(x+this.xpValue.advance,855.5);

  const tlRawW=320*ratio,tlBar=this.tlXpFill.children[0] as Container;
  tlBar.visible=tlRawW>1;
  if(tlRawW>1)tlBar.width=Math.max(12,Math.min(320,tlRawW));
  this.tlXpValue.text=this.xpValue.text;
  this.tlXpRest.text=this.xpRest.text;
  const tlX=Math.round(352-w/2);
  this.tlXpValue.place(tlX,132.5);this.tlXpRest.place(tlX+this.tlXpValue.advance,132.5);
 }

 setGold(labelOrAmount:number|string){
  const text=typeof labelOrAmount==='number'?`${labelOrAmount} Gold`:labelOrAmount;
  this.goldText.text=text;
  this.layoutGoldPill();
 }

 setTime(time:string){
  if(this.state.time===time)return;
  this.state.time=time;
  this.clockText.text=time;
  this.clockText.place(1611,100.5,.5);
 }

 setZone(zone:string){
  if(this.state.zone===zone)return;
  this.state.zone=zone;
  this.zoneText.text=zone;
  this.layoutZonePill(zone);
 }

 setCoop(label:string){
  this.state.coopLabel=label;
  this.ensureCoopPill(label);
 }

 setSkills(skills:HudSkillState[]){
  this.state.skills=skills;
  skills.forEach((sk,i)=>{
   const view=this.skillViews[i];
   if(!view)return;
   if(view.currentArt!==sk.art){
    view.currentArt=sk.art;
    view.artHolder.removeChildren();
    view.artHolder.addChild(centred(this.frames.frame(sk.art),view.cx,view.cy));
   }
   view.artHolder.alpha=sk.locked?0.45:1;
   view.levelText.text=sk.locked?'—':`Lv. ${sk.level}`;
   view.levelText.place(view.cx,751.5,.5);
   view.stateText.text=sk.stateLabel??(sk.locked?'Locked':'Auto');
   const bw=Math.max(84,Math.round(view.stateText.advance+36));
   view.stateBadge.width=bw;
   view.stateBadge.position.set(view.cx-bw/2,761);
   view.stateText.place(view.cx,779,.5);
   view.nameText.text=sk.name;
   view.nameText.place(view.cx,811,.5);
   this.drawCooldown(view,sk.cooldownRatio??0,sk.stateLabel);
  });
 }

 setSkillCooldown(index:number,ratio:number,stateLabel?:string){
  const view=this.skillViews[index];
  if(!view)return;
  this.drawCooldown(view,ratio,stateLabel);
 }

 private drawCooldown(view:SkillSlotView,ratio:number,stateLabel?:string){
  view.cooldownArc.clear();
  if(ratio>0.01){
   const r=43,start=-Math.PI/2,end=start+Math.PI*2*Math.min(1,ratio);
   view.cooldownArc.moveTo(view.cx,view.cy);
   view.cooldownArc.arc(view.cx,view.cy,r,start,end);
   view.cooldownArc.closePath();
   view.cooldownArc.fill({color:0x060402,alpha:0.68});
  }
  if(stateLabel!==undefined){
   view.stateText.text=stateLabel;
   const bw=Math.max(84,Math.round(view.stateText.advance+36));
   view.stateBadge.width=bw;
   view.stateBadge.position.set(view.cx-bw/2,761);
   view.stateText.place(view.cx,779,.5);
  }
 }

 // Returns screen-space anchor below the top-right pills for positioning popovers (Clock / Co-op).
 topRightPopoverAnchor(row:1|3):{x:number;y:number;scale:number}{
  const s=this.lastScale;
  const designY=row===1?126:232;
  return {x:this.lastWidth-12*s,y:designY*s,scale:s};
 }

 // Desktop and landscape keep the reference arrangement at one uniform scale; portrait places XP below HP and removes bottom desktop clutter.
 layout(width:number,height:number){
  this.lastWidth=width;
  const {width:W,height:H}=HUD_DESIGN,portrait=width<height;
  const s=portrait?width/848:Math.min(width/W,height/H);
  this.lastScale=s;
  this.heroPlate.height=portrait?138:104;
  this.heroPlate.position.set(150,portrait?22:24);
  this.tlXpGroup.visible=portrait;
  this.bcXpGroup.visible=!portrait;
  this.groups.bl.visible=!portrait;
  this.groups.br.visible=!portrait;
  const place=(g:Container,px:number,py:number,x:number,y:number)=>{g.scale.set(s);g.pivot.set(px,py);g.position.set(x,y);};
  place(this.groups.tl,0,0,0,0);place(this.groups.tr,W,0,width,0);
  place(this.groups.bc,W/2,portrait?842:H,width/2,height);
  place(this.groups.bl,0,H,0,height);place(this.groups.br,W,H,width,height);
  for(const img of [this.backdrop,this.overlay]){if(!img)continue;const c=Math.max(width/W,height/H);img.scale.set(c*W/img.texture.width);img.position.set((width-W*c)/2,(height-H*c)/2);}
  return s;
 }
 static sceneScale(width:number,height:number){return width<height?width/848:Math.min(width/HUD_DESIGN.width,height/HUD_DESIGN.height);}
}
