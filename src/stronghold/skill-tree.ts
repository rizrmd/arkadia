import {requestGameFrame as requestAnimationFrame,cancelGameFrame as cancelAnimationFrame} from '../app/frame-scheduler';
import {Container,Graphics,Rectangle,Sprite} from 'pixi.js';
import {FrameSet,pickFrameScale} from '../typography/frames';
import {MsdfText} from '../typography/text';
import {ROLES,type TextRole} from '../typography/tokens';
import type {Progression} from './progression';

// Rift Runner Skill Tree (Knowledge: "Rift Runner — Ascension Tree Concept", revised progression): a gold-framed panel in
// front of the dimmed world with the HUD left uncovered. Portrait screens stack the tree bottom to top (Rift Bolt at the
// bottom) and scroll vertically; wider screens run it left to right and scroll horizontally. Active skills are round gold
// rings with five rank pips, passives are borderless emblems, equipped actives carry their Skill 1/2/3 badge.
// Art: public/skill-tree/v1 (scripts/skill-tree/build-assets.mjs).

export type TreeNodeId='rift-bolt'|'rift-dash'|'rift-trap'|'astral-cleave'|'seismic-slam'|'phantom-legion'|'event-horizon'|'rift-lance'|
 'second-wind'|'titan-strike'|'arc-nova'|'soul-feast'|'chrono-surge'|'furnace-heart'|'ascendant-star';
type Kind='active'|'ultimate'|'passive';
// game: the progression id the node reads its rank from; nodes without one are not in the game yet and always show unlearned.
interface NodeDef{id:TreeNodeId;name:string;kind:Kind;game?:string;evolution?:boolean;v:[number,number];h:[number,number]}
// Positions in node units (u = an active ring's diameter), relative to Rift Bolt. v: portrait [column, row height up];
// h: landscape [column, offset down]. Rows and columns follow the tiers: Tier I, Tier II, Ultimate, Tier III, Capstone.
const COL=1.16,STEP=2.55;
export const TREE_NODES:NodeDef[]=[
 {id:'rift-bolt',name:'Rift Bolt',kind:'active',game:'rift-bolt',v:[0,0],h:[0,0]},
 {id:'rift-dash',name:'Rift Dash',kind:'active',game:'rift-dash',v:[-1.5*COL,1.85],h:[STEP,-1.55]},
 {id:'rift-trap',name:'Rift Trap',kind:'active',game:'rift-trap',v:[-.5*COL,1.85],h:[STEP,0]},
 {id:'second-wind',name:'Second Wind',kind:'passive',game:'heal',v:[.5*COL,1.85],h:[STEP,1.5]},
 {id:'titan-strike',name:'Titan Strike',kind:'passive',game:'might',v:[1.5*COL,1.85],h:[STEP,2.72]},
 {id:'astral-cleave',name:'Astral Cleave',kind:'active',game:'cleave',v:[-1.5*COL,3.65],h:[2*STEP,-1.55]},
 {id:'seismic-slam',name:'Seismic Slam',kind:'active',game:'shockwave',v:[-.5*COL,3.65],h:[2*STEP,0]},
 {id:'arc-nova',name:'Arc Nova',kind:'passive',game:'nova',v:[.5*COL,3.65],h:[2*STEP,1.5]},
 {id:'soul-feast',name:'Soul Feast',kind:'passive',game:'leech',v:[1.5*COL,3.65],h:[2*STEP,2.72]},
 {id:'phantom-legion',name:'Phantom Legion',kind:'ultimate',v:[-1.05*COL,5.6],h:[3*STEP+.1,-1.4]},
 {id:'event-horizon',name:'Event Horizon',kind:'ultimate',v:[1.05*COL,5.6],h:[3*STEP+.1,1.5]},
 {id:'chrono-surge',name:'Chrono Surge',kind:'passive',game:'haste',v:[-1.3*COL,7.5],h:[4*STEP+.2,-1.6]},
 {id:'rift-lance',name:'Rift Lance',kind:'active',evolution:true,v:[0,7.5],h:[4*STEP+.2,0]},
 {id:'furnace-heart',name:'Furnace Heart',kind:'passive',game:'vitality',v:[1.3*COL,7.5],h:[4*STEP+.2,1.6]},
 {id:'ascendant-star',name:'Ascendant Star',kind:'passive',game:'star',v:[0,9.2],h:[5*STEP+.1,0]},
];
// Rows (portrait) and columns (landscape) that hang off the trunk with right-angle connectors.
const TIERS:TreeNodeId[][]=[['rift-dash','rift-trap','second-wind','titan-strike'],['astral-cleave','seismic-slam','arc-nova','soul-feast'],
 ['phantom-legion','event-horizon'],['chrono-surge','rift-lance','furnace-heart']];
// Progression id → tree node, for the HUD skill slots.
export const nodeForSkill=(id:string|undefined)=>TREE_NODES.find(n=>n.game===id)?.id;
export const PLACEHOLDER_NODES=TREE_NODES.filter(n=>!n.game).map(n=>n.id);

const MAX_PIPS=5,TAP=8,LEVEL_PLATE='level-plate';
const NAME_ROLE:TextRole={...ROLES['panel-body'],outline:{color:0x0a0604,alpha:.85,width:1}};
const TITLE_ROLE:TextRole={...ROLES['display-title']};
const LEVEL_ROLE:TextRole={...ROLES['hud-badge'],fill:0xfbe7b5};
// Diameters relative to u: ring frame, icon disc inside it, passive emblem, highlight halo.
const SIZE:Record<Kind,number>={active:1,ultimate:1.08,passive:.9};
const ICON_IN_RING=94/128,GLOW=1.7;

type NodeView={def:NodeDef;root:Container;glow:Sprite;icon:Sprite;ring?:Sprite;plate:Container;level:MsdfText;name:MsdfText;pips:Sprite[];badge?:Sprite;x:number;y:number;r:number;state:string};
type Rect={x:number;y:number;width:number;height:number};
type Pt={x:number;y:number};

export class SkillTree{
 // The shade sits under the HUD (it dims only the world); the panel sits above the HUD in the space the HUD leaves free.
 readonly shade=new Graphics();
 readonly panel=new Container();
 private frames?:FrameSet;
 private loading?:Promise<FrameSet>;
 private frameArt?:Container;
 private ornaments=new Container();
 private title=new MsdfText(TITLE_ROLE,'Skill Tree');
 private rule?:Container;private finial?:Container;private close?:Container;
 private viewport=new Container();
 private clip=new Graphics();
 private content=new Container();
 private lines=new Container();
 private nodesLayer=new Container();
 private fadeA?:Container;private fadeB?:Container;
 private chevronA?:Sprite;private chevronB?:Sprite;
 private track?:Container;private thumb?:Container;
 private views=new Map<TreeNodeId,NodeView>();
 private vertical=true;
 private u=72;
 private rect:Rect={x:0,y:0,width:0,height:0};
 private view:Rect={x:0,y:0,width:0,height:0};
 private size={width:0,height:0};
 private scroll=0;private maxScroll=0;private velocity=0;private target:number|null=null;
 private highlighted:TreeNodeId|null=null;private pulse=0;
 private press:{x:number;y:number;at:number;last:number;moved:boolean;id:number}|null=null;
 private frame=0;private lastTick=0;private stateKey='';private layoutKey='';
 private openState=false;
 constructor(private uiStage:Container,private o:{run:()=>Progression;region:()=>{rect:Rect;vertical:boolean};onClose?:()=>void}){
  this.shade.zIndex=-1;this.shade.visible=false;this.shade.eventMode='static';
  this.shade.on('pointertap',()=>this.open(false));
  // Above the first-visit movement hint (44), under the world map (45) and the level-up offer (55).
  this.panel.zIndex=44.5;this.panel.visible=false;this.panel.eventMode='static';this.panel.label='skill-tree';
  this.viewport.eventMode='static';
  this.content.addChild(this.lines,this.nodesLayer);this.content.mask=this.clip;
  this.viewport.addChild(this.clip,this.content);
  this.panel.addChild(this.ornaments,this.viewport,this.title);
  uiStage.addChild(this.shade,this.panel);
  this.viewport.on('pointerdown',e=>{
   if(this.press)return;
   this.press={x:e.global.x,y:e.global.y,at:this.scroll,last:this.axis(e.global),moved:false,id:e.pointerId};this.velocity=0;this.target=null;
  });
  addEventListener('pointermove',e=>{
   const p=this.press;if(!p||p.id!==e.pointerId||!this.openState)return;
   if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>TAP)p.moved=true;
   if(!p.moved)return;
   const a=this.axis({x:e.clientX,y:e.clientY});
   this.velocity=p.last-a;p.last=a;
   this.setScroll(this.scroll+this.velocity);
  });
  const up=(e:PointerEvent)=>{
   const p=this.press;if(!p||p.id!==e.pointerId)return;this.press=null;
   if(!p.moved&&this.openState)this.tap(e.clientX,e.clientY);
  };
  addEventListener('pointerup',up);
  addEventListener('pointercancel',e=>{if(this.press?.id===e.pointerId)this.press=null;});
  addEventListener('wheel',e=>{
   if(!this.openState||!this.inView(e.clientX,e.clientY))return;e.preventDefault();
   this.target=null;this.velocity=0;this.setScroll(this.scroll+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY));
  },{passive:false});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&this.openState){e.preventDefault();this.open(false);}});
  addEventListener('resize',()=>{if(this.openState)this.layout(true);});
 }
 isOpen(){return this.openState;}
 // Loads the kit once (about 60 small textures); the first open waits for it, later opens are instant.
 preload(){
  if(!this.loading){
   const scale=pickFrameScale(Math.min(devicePixelRatio||1,3),.9);
   this.loading=FrameSet.load('/skill-tree/v1/',scale).then(f=>{this.frames=f;return f;});
   this.loading.catch(e=>{console.error('Skill tree art failed to load',e);this.loading=undefined;});
  }
  return this.loading;
 }
 // Opens the tree (or retargets it while open) and scrolls to `focus`, which pulses gold until another node is tapped.
 async show(focus?:TreeNodeId){
  await this.preload();
  const wasOpen=this.openState;
  this.openState=true;this.shade.visible=this.panel.visible=true;
  this.layout(!wasOpen);
  this.highlight(focus??null);
  if(focus)this.scrollTo(focus,wasOpen);
  if(!wasOpen){this.lastTick=0;cancelAnimationFrame(this.frame);const tick=(now:number)=>{if(!this.openState)return;this.update(now);this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
 }
 open(v:boolean){
  if(v){void this.show();return;}
  if(!this.openState)return;
  this.openState=false;this.shade.visible=this.panel.visible=false;this.press=null;this.velocity=0;this.target=null;
  cancelAnimationFrame(this.frame);
  this.o.onClose?.();
 }
 toggle(focus?:TreeNodeId){if(this.openState)this.open(false);else void this.show(focus);}
 private axis(p:Pt){return this.vertical?p.y:p.x;}
 private inView(x:number,y:number){const v=this.view;return x>=v.x&&y>=v.y&&x<=v.x+v.width&&y<=v.y+v.height;}

 // Layout: the region the HUD leaves free decides the panel; the panel height (landscape) or width (portrait) decides u.
 private layout(force=false){
  const f=this.frames;if(!f)return;
  const W=innerWidth,H=innerHeight,{rect,vertical}=this.o.region();
  const key=[W,H,rect.x,rect.y,rect.width,rect.height,vertical].map(n=>Math.round(+n)).join();
  if(!force&&key===this.layoutKey)return;
  const keepFocus=this.layoutKey!==''&&this.highlighted;
  this.layoutKey=key;this.vertical=vertical;this.rect=rect;
  this.shade.clear().rect(0,0,W,H).fill({color:0x04050a,alpha:.55});
  this.panel.position.set(Math.round(rect.x),Math.round(rect.y));
  this.panel.hitArea=new Rectangle(0,0,rect.width,rect.height);
  const compact=rect.width<520||rect.height<420;
  const header=compact?52:64,inset=compact?11:20,bar=compact?10:12;
  // Frame, corner ornaments, title rule, finial and close button.
  this.frameArt?.destroy({children:true});this.frameArt=this.panel.addChildAt(f.frame('panel-frame',rect.width,rect.height),0);
  this.ornaments.removeChildren().forEach(c=>c.destroy());
  const cs=Math.min(140,rect.width*.32,rect.height*.32);
  for(const [x,y] of [[inset,header],[rect.width-inset-cs,rect.height-inset-cs]] as const){const s=this.ornaments.addChild(f.frame('panel-compass',cs,cs));s.position.set(x,y);s.alpha=.32;}
  const titleSize=compact?24:30;
  this.title.destroy();this.title=this.panel.addChild(new MsdfText(TITLE_ROLE,'Skill Tree',{size:titleSize}));
  this.title.place(rect.width/2,header*.5+titleSize*.36,.5);
  this.rule?.destroy();this.rule=this.panel.addChild(f.frame('panel-title-rule',Math.min(rect.width-140,560),20));this.rule.position.set((rect.width-this.rule.width)/2,header-12);
  this.finial?.destroy();this.finial=this.panel.addChild(f.frame('panel-finial',44,26));this.finial.position.set(rect.width/2-22,-13);
  this.close?.destroy({children:true});
  const cb=compact?40:46,close=this.close=this.panel.addChild(new Container());
  close.addChild(f.frame('button-close',cb,cb));close.position.set(rect.width-cb-(compact?8:12),(header-cb)/2+(compact?1:2));
  close.eventMode='static';close.cursor='pointer';close.hitArea=new Rectangle(-6,-6,cb+12,cb+12);close.label='skill-tree-close';
  close.on('pointertap',e=>{e.stopPropagation();this.open(false);});
  // Scroll viewport below the header; the scrollbar runs along the right (portrait) or the bottom (landscape).
  this.view=vertical?{x:inset,y:header,width:rect.width-inset*2-bar-4,height:rect.height-header-inset}
   :{x:inset,y:header,width:rect.width-inset*2,height:rect.height-header-inset-bar-6};
  const v=this.view;
  this.viewport.position.set(v.x,v.y);this.viewport.hitArea=new Rectangle(0,0,v.width,v.height);
  this.clip.clear().rect(0,0,v.width,v.height).fill(0xffffff);
  this.view={x:rect.x+v.x,y:rect.y+v.y,width:v.width,height:v.height};
  // u: portrait fits the four columns across; landscape fits the tallest column (Tier I/II: four nodes) down.
  this.u=vertical?Math.min(84,v.width/5.2):Math.min(118,v.height/5.95);
  this.build(f);
  // Edge fades, chevrons and the scrollbar sit over the content.
  for(const c of [this.fadeA,this.fadeB,this.chevronA,this.chevronB,this.track,this.thumb])c?.destroy();
  const fadeLen=Math.min(56,(vertical?v.height:v.width)*.14);
  this.fadeA=this.viewport.addChild(vertical?f.frame('fade-v',v.width,fadeLen):f.frame('fade-h',fadeLen,v.height));
  this.fadeB=this.viewport.addChild(vertical?f.frame('fade-v',v.width,fadeLen):f.frame('fade-h',fadeLen,v.height));
  // The fade art is dark at its top (fade-v) or right (fade-h) edge: A sits at the forward edge, B mirrored at the root end.
  if(vertical){this.fadeB.scale.y=-1;this.fadeB.position.set(0,v.height);}
  else{this.fadeA.position.set(v.width-fadeLen,0);this.fadeB.scale.x=-1;this.fadeB.position.set(fadeLen,0);}
  const chev=(name:string)=>{const s=new Sprite(f.texture(name));s.anchor.set(.5);s.eventMode='static';s.cursor='pointer';this.viewport.addChild(s);return s;};
  if(vertical){
   this.chevronA=chev('chevron-up');this.chevronA.position.set(v.width/2,14);
   this.chevronB=chev('chevron-up');this.chevronB.rotation=Math.PI;this.chevronB.position.set(v.width/2,v.height-14);
  }else{
   this.chevronA=chev('chevron-right');this.chevronA.position.set(v.width-14,v.height/2);
   this.chevronB=chev('chevron-right');this.chevronB.rotation=Math.PI;this.chevronB.position.set(14,v.height/2);
  }
  // Chevron A points to the rest of the tree (up the trunk / to the right); B points back toward Rift Bolt.
  const page=()=>(vertical?v.height:v.width)*.7;
  this.chevronA.on('pointertap',e=>{e.stopPropagation();this.target=Math.max(0,Math.min(this.maxScroll,this.scroll+(vertical?-page():page())));});
  this.chevronB.on('pointertap',e=>{e.stopPropagation();this.target=Math.max(0,Math.min(this.maxScroll,this.scroll+(vertical?page():-page())));});
  if(vertical){
   this.track=this.panel.addChild(f.frame('scroll-track-v',10,v.height-16));this.track.position.set(rect.width-inset-bar+2,header+8);
   this.thumb=this.panel.addChild(f.frame('scroll-thumb-v',10,40));
  }else{
   this.track=this.panel.addChild(f.frame('scroll-track-h',v.width-16,10));this.track.position.set(inset+8,rect.height-inset-bar+2);
   this.thumb=this.panel.addChild(f.frame('scroll-thumb-h',40,10));
  }
  // Portrait starts at the root (bottom), landscape at the left; a resize keeps the highlighted node in view.
  this.maxScroll=Math.max(0,(vertical?this.size.height-v.height:this.size.width-v.width));
  this.scroll=vertical?this.maxScroll:0;
  if(keepFocus)this.scrollTo(keepFocus,false);
  this.applyScroll();
 }

 // Places every node and connector in content space (px), with the tree's padded bounding box at (0, 0).
 private build(f:FrameSet){
  this.lines.removeChildren().forEach(c=>c.destroy({children:true}));
  this.nodesLayer.removeChildren().forEach(c=>c.destroy({children:true}));
  this.views.clear();this.stateKey='';
  const u=this.u,vt=this.vertical;
  const raw=new Map(TREE_NODES.map(n=>[n.id,vt?{x:n.v[0]*u,y:-n.v[1]*u}:{x:n.h[0]*u,y:n.h[1]*u}]));
  const r=(n:NodeDef)=>SIZE[n.kind]*u/2*(n.id==='rift-bolt'?1.12:1);
  // Extents: rings reach their studs (r·1.12) above; labels and pips hang below, about .25 em per character to a side.
  const nameSize=Math.max(12,u*.18);
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const n of TREE_NODES){const p=raw.get(n.id)!,rr=r(n),half=Math.max(rr*1.12,n.name.length*nameSize*.25);x0=Math.min(x0,p.x-half);x1=Math.max(x1,p.x+half);y0=Math.min(y0,p.y-rr*1.14);y1=Math.max(y1,p.y+rr+u*.42);}
  const pad=u*.28,ox=-x0+pad,oy=-y0+pad;
  // Centre a tree that is smaller than the viewport along its cross axis (and its scroll axis when it fits).
  const w=x1-x0+pad*2,h=y1-y0+pad*2,vw=this.view.width,vh=this.view.height;
  const cx=Math.max(0,(vw-w)/2),cy=Math.max(0,(vh-h)/2);
  this.size={width:Math.max(w,vw),height:Math.max(h,vh)};
  const at=(id:TreeNodeId)=>{const p=raw.get(id)!;return {x:p.x+ox+cx,y:p.y+oy+cy};};
  const node=(id:TreeNodeId)=>TREE_NODES.find(n=>n.id===id)!;
  // Connectors: 9-sliced gold rails meeting at right angles, diamond junctions where a tier leaves the trunk.
  const lw=Math.max(5,u*.075);
  const hLine=(xa:number,xb:number,y:number)=>{if(Math.abs(xb-xa)<1)return;const s=this.lines.addChild(f.frame('line-h',Math.abs(xb-xa)+lw*.5,lw));s.position.set(Math.min(xa,xb)-lw*.25,y-lw/2);};
  const vLine=(x:number,ya:number,yb:number)=>{if(Math.abs(yb-ya)<1)return;const s=this.lines.addChild(f.frame('line-v',lw,Math.abs(yb-ya)+lw*.5));s.position.set(x-lw/2,Math.min(ya,yb)-lw*.25);};
  const gem=(name:string,x:number,y:number,d:number)=>{const s=this.lines.addChild(f.frame(name,d,d));s.position.set(x-d/2,y-d/2);};
  const root=at('rift-bolt'),cap=at('ascendant-star');
  // Edge of a node facing the trunk side its connector comes from: top (portrait) or left (landscape).
  const edge=(id:TreeNodeId)=>{const n=node(id),rr=r(n);return n.kind==='passive'?rr*.82:rr*1.06;};
  if(vt)vLine(root.x,root.y-edge('rift-bolt'),cap.y+edge('ascendant-star'));
  else hLine(root.x+edge('rift-bolt'),cap.x-edge('ascendant-star'),root.y);
  for(const tier of TIERS){
   const pts=tier.map(id=>({id,...at(id)}));
   if(vt){
    const y=Math.min(...pts.map(p=>p.y-r(node(p.id))))-u*.2,xs=pts.map(p=>p.x);
    hLine(Math.min(...xs,root.x),Math.max(...xs,root.x),y);
    for(const p of pts){vLine(p.x,y,p.y-edge(p.id));if(Math.abs(p.x-root.x)>1)gem('line-stud',p.x,y,u*.15);}
    gem('line-junction',root.x,y,u*.26);
   }else{
    const x=Math.min(...pts.map(p=>p.x-r(node(p.id))))-u*.28,ys=pts.map(p=>p.y);
    vLine(x,Math.min(...ys,root.y),Math.max(...ys,root.y));
    for(const p of pts){hLine(x,p.x-edge(p.id),p.y);if(Math.abs(p.y-root.y)>1)gem('line-stud',x,p.y,u*.15);}
    gem('line-junction',x,root.y,u*.26);
   }
  }
  if(!vt)gem('line-stud',cap.x-edge('ascendant-star')-u*.04,cap.y,u*.15);
  // Nodes.
  for(const n of TREE_NODES){
   const p=at(n.id),rr=r(n),d=rr*2,box=this.nodesLayer.addChild(new Container());
   box.position.set(p.x,p.y);box.label=`skill-node-${n.id}`;
   const glow=box.addChild(new Sprite(f.texture('node-glow')));glow.anchor.set(.5);glow.width=glow.height=d*GLOW;glow.visible=false;
   const icon=box.addChild(new Sprite(f.texture(`icon-${n.id}-dim`)));icon.anchor.set(.5);
   icon.width=icon.height=n.kind==='passive'?d:d*ICON_IN_RING;
   let ring:Sprite|undefined;
   if(n.kind!=='passive'){ring=box.addChild(new Sprite(f.texture(n.evolution?'ring-evolution':'ring-active')));ring.anchor.set(.5);ring.width=ring.height=d;}
   const plateW=Math.max(44,u*.56),plateH=Math.max(18,u*.22);
   const plate=box.addChild(f.frame(LEVEL_PLATE,plateW,plateH));
   const plateY=n.kind==='passive'?rr*.62:rr*.9;
   plate.position.set(-plateW/2,plateY-plateH/2);
   const level=box.addChild(new MsdfText(LEVEL_ROLE,'Lv. 1',{size:Math.max(11.5,u*.15)}));
   const name=box.addChild(new MsdfText(NAME_ROLE,n.name,{size:nameSize}));
   const nameY=(n.kind==='passive'?rr*.95:rr*1.08)+nameSize*.92;
   name.place(0,nameY,.5);
   const pips:Sprite[]=[];
   if(n.kind!=='passive'){
    const ps=Math.max(9,u*.13),gap=ps*1.32;
    for(let i=0;i<MAX_PIPS;i++){const s=box.addChild(new Sprite(f.texture('pip-off')));s.anchor.set(.5);s.width=s.height=ps;s.position.set((i-(MAX_PIPS-1)/2)*gap,nameY+ps*.95);pips.push(s);}
   }
   let badge:Sprite|undefined;
   if(n.kind==='active'){badge=box.addChild(new Sprite(f.texture('slot-1')));badge.anchor.set(.5);badge.width=badge.height=Math.max(22,u*.3);badge.position.set(rr*.74,-rr*.74);badge.visible=false;}
   this.views.set(n.id,{def:n,root:box,glow,icon,ring,plate,level,name,pips,badge,x:p.x,y:p.y,r:rr,state:''});
  }
  this.refresh(true);
 }

 // Learned nodes are in colour with their level plate; unlearned ones are grey and dim. Equipped actives show 1/2/3.
 private refresh(force=false){
  const f=this.frames;if(!f||!this.views.size)return;
  const run=this.o.run(),slots=run.slots??[];
  const rank=(n:NodeDef)=>!n.game?0:n.game==='star'?run.stars??0:Math.max(0,run.skills?.[n.game]??(slots.includes(n.game)?1:0));
  const key=TREE_NODES.map(n=>`${rank(n)}:${n.game?slots.indexOf(n.game):-1}`).join('|');
  if(!force&&key===this.stateKey)return;
  this.stateKey=key;
  for(const v of this.views.values()){
   const n=v.def,lv=rank(n),learned=lv>0,slot=n.game?slots.indexOf(n.game):-1,state=`${lv}:${slot}`;
   if(!force&&state===v.state)continue;
   v.state=state;
   v.icon.texture=f.texture(learned?`icon-${n.id}`:`icon-${n.id}-dim`);
   v.icon.tint=learned?0xffffff:0x8c8680;
   if(v.ring)v.ring.tint=learned?0xffffff:0x9c8a74;
   v.plate.visible=v.level.visible=learned;
   if(learned){v.level.text=`Lv. ${lv}`;v.level.place(0,v.plate.y+v.plate.height/2+v.level.size*.36,.5);}
   v.name.alpha=learned?1:.62;
   v.pips.forEach((p,i)=>{p.texture=f.texture(i<Math.min(MAX_PIPS,lv)?'pip-on':'pip-off');p.alpha=learned?1:.7;});
   if(v.badge){v.badge.visible=slot>=0&&slot<3;if(v.badge.visible)v.badge.texture=f.texture(`slot-${slot+1}`);}
  }
 }

 private highlight(id:TreeNodeId|null){
  const prev=this.highlighted&&this.views.get(this.highlighted);
  if(prev)prev.glow.visible=false;
  this.highlighted=id;this.pulse=0;
  const v=id&&this.views.get(id);
  if(v){v.glow.visible=true;this.nodesLayer.setChildIndex(v.root,this.nodesLayer.children.length-1);}
 }
 // Centres the node along the scroll axis (clamped to the tree's ends).
 private scrollTo(id:TreeNodeId,animate:boolean){
  const v=this.views.get(id);if(!v)return;
  const want=this.vertical?v.y-this.view.height/2:v.x-this.view.width/2;
  const t=Math.max(0,Math.min(this.maxScroll,want));
  if(animate)this.target=t;else{this.target=null;this.setScroll(t);}
 }
 private setScroll(s:number){this.scroll=Math.max(0,Math.min(this.maxScroll,s));this.applyScroll();}
 private applyScroll(){
  if(this.vertical)this.content.position.set(0,-this.scroll);else this.content.position.set(-this.scroll,0);
  const m=this.maxScroll,canBack=this.scroll>1,canFwd=this.scroll<m-1;
  // Portrait: forward (more tree) is up, i.e. scroll above 0; back toward the root is down.
  const moreA=this.vertical?canBack:canFwd,moreB=this.vertical?canFwd:canBack;
  if(this.chevronA)this.chevronA.visible=moreA;
  if(this.chevronB)this.chevronB.visible=moreB;
  if(this.fadeA)this.fadeA.visible=moreA;
  if(this.fadeB)this.fadeB.visible=moreB;
  if(this.track&&this.thumb){
   const vt=this.vertical,len=vt?this.track.height:this.track.width,viewLen=vt?this.view.height:this.view.width,total=viewLen+m;
   const tl=Math.max(28,len*viewLen/Math.max(1,total)),pos=m?this.scroll/m*(len-tl):0;
   this.track.visible=this.thumb.visible=m>0;
   if(vt){this.thumb.height=tl;this.thumb.position.set(this.track.x,this.track.y+pos);}
   else{this.thumb.width=tl;this.thumb.position.set(this.track.x+pos,this.track.y);}
  }
 }
 private tap(x:number,y:number){
  if(!this.inView(x,y))return;
  const p=this.content.toLocal({x,y});
  for(const v of this.views.values())if(Math.hypot(p.x-v.x,p.y-v.y)<=v.r*1.05){this.highlight(v.def.id);return;}
 }
 private update(now:number){
  const dt=this.lastTick?Math.min(64,now-this.lastTick):16;this.lastTick=now;
  this.layout();this.refresh();
  if(this.target!=null){
   const d=this.target-this.scroll;
   if(Math.abs(d)<.5){this.setScroll(this.target);this.target=null;}else this.setScroll(this.scroll+d*Math.min(1,dt/90));
  }else if(!this.press&&Math.abs(this.velocity)>.2){this.setScroll(this.scroll+this.velocity);this.velocity*=Math.pow(.92,dt/16);}
  const v=this.highlighted&&this.views.get(this.highlighted);
  if(v){
   this.pulse+=dt;
   const k=.5+.5*Math.sin(this.pulse/1000*Math.PI*2/1.1),d=v.r*2*GLOW;
   v.glow.alpha=.55+.45*k;v.glow.width=v.glow.height=d*(.96+.08*k);
  }
 }
 // For tests and the verify script: what is on screen, in CSS px.
 snapshot(){
  const nodes=[...this.views.values()].map(v=>{
   const g=this.content.toGlobal({x:v.x,y:v.y});
   return {id:v.def.id,name:v.def.name,kind:v.def.kind,placeholder:!v.def.game,learned:v.plate.visible,level:v.plate.visible?Number(v.level.text.replace(/\D+/g,'')):0,
    pips:v.pips.filter(p=>p.texture===this.frames?.texture('pip-on')).length,slot:v.badge?.visible?this.slotOf(v):0,
    screen:{x:+g.x.toFixed(1),y:+g.y.toFixed(1),r:+v.r.toFixed(1)},inView:this.inView(g.x,g.y),highlighted:this.highlighted===v.def.id};
  });
  const c=this.close?.getBounds();
  return {open:this.openState,vertical:this.vertical,u:+this.u.toFixed(1),panel:{...this.rect},view:{...this.view},close:c?{x:c.x+c.width/2,y:c.y+c.height/2}:null,scroll:+this.scroll.toFixed(1),maxScroll:+this.maxScroll.toFixed(1),highlighted:this.highlighted,nodes};
 }
 private slotOf(v:NodeView){const s=this.o.run().slots??[];return v.def.game?s.indexOf(v.def.game)+1:0;}
}
