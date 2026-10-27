import {drawSkillHex,skillHexPoints} from '../typography/skill-hex';
import {Container,Graphics,Rectangle,Sprite,type Texture} from 'pixi.js';
import {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';
import {ROLES} from '../typography/tokens';
import {cards,inferHero,EMBER_MAX_ACTIVE_RANK,skillRank,skillCooldownMs,skillDamageMultiplier,skillAreaMultiplier,damage,health,reach,critChance,type Progression} from './progression';

export type Inspection={id:string;name:string;kind:string;game?:string;locked:string;icon:Texture};
type Rect={width:number;height:number};
// Compare the same progression functions used by combat, with exactly one additional rank.
export function inspectionData(n:Inspection,p:Progression){
 const id=n.game,rank=id?(id==='star'?p.stars:skillRank(p,id)):0;
 const next:Progression={...p,skills:{...p.skills},stars:p.stars+(id==='star'?1:0)};
 if(id)next.skills[id]=rank+1;
 const rows:{label:string;current:string;next:string}[]=[];
 const add=(label:string,a:number,b:number,unit='',digits=2)=>rows.push({label,current:rank?`${+a.toFixed(digits)}${unit}`:'—',next:`${+b.toFixed(digits)}${unit}`});
 if(id&&cards[id]?.kind==='active'){
  add('Cooldown',skillCooldownMs(p,id)/1000,skillCooldownMs(next,id)/1000,' s');
  if(id==='rift-dash')add('Max distance',1.5,1.5,' tiles');
  const base:Record<string,number>={'rift-bolt':1,'rift-dash':1.1,'rift-trap':1.25,cleave:1.2,shockwave:1.3};
  add('Damage scale',(base[id]??1)*skillDamageMultiplier(p,id),(base[id]??1)*skillDamageMultiplier(next,id),'×');
  if(id!=='rift-bolt')add('Area scale',skillAreaMultiplier(p,id)*reach(p),skillAreaMultiplier(next,id)*reach(next),'×');
  if(id==='rift-bolt')add('Projectiles',rank>=3?3:Math.max(1,rank),rank+1>=3?3:rank+1,'',0);
 }else if(id){
  if(id==='might'||id==='star')add('Attack damage',damage(p),damage(next));
  if(id==='vitality'||id==='star')add('Bonus health',health(p),health(next));
  if(id==='nova')add('Detection reach',reach(p),reach(next),'×');
  if(id==='haste')add('Cooldown factor',Math.max(.45,Math.pow(.88,rank)),Math.max(.45,Math.pow(.88,rank+1)),'×');
  if(id==='leech')add('Health per kill',rank*2,(rank+1)*2);
  if(id==='might'||id==='star')add('Critical chance',critChance(p)*100,critChance(next)*100,'%');
  if(id==='heal')add('Instant recovery',35,35,'% max HP');
 }
 const description=id==='vitality'?'Gain 20 maximum health per rank.':id&&cards[id]?cards[id].description:'This skill is a concept and is not available in the game yet.';
 return {rank,description,rows,maxRank:inferHero(p)==='ember-warden'&&rank>=EMBER_MAX_ACTIVE_RANK&&cards[id??'']?.kind==='active'};
}

const PREVIEW_SIZE=340;

export class SkillInspection{
 readonly preview=new Container();readonly modal=new Container();
 private rect:Rect={width:0,height:0};
 private selected?:Inspection;private details=false;private hidden=false;private key='';
 private position?:{x:number;y:number};
 private drag?:{id:number;x:number;y:number;startX:number;startY:number};
 private controls:Record<string,{x:number;y:number;width:number;height:number}>={};
 constructor(private f:FrameSet,private parent:Container,private o:{run:()=>Progression;slot:()=>number|null;equip:(id:string)=>void}){
  this.preview.on('pointertap',e=>e.stopPropagation());
  this.preview.on('pointerdown',e=>{e.stopPropagation();const h=this.preview.toLocal(e.global);if(h.y>100||h.x>PREVIEW_SIZE-48)return;const p=this.parent.toLocal(e.global);this.drag={id:e.pointerId,x:p.x,y:p.y,startX:this.preview.x,startY:this.preview.y};this.preview.cursor='grabbing';});
  this.preview.on('globalpointermove',e=>{const d=this.drag;if(!d||e.pointerId!==d.id)return;const p=this.parent.toLocal(e.global);this.movePreview(d.startX+p.x-d.x,d.startY+p.y-d.y);});
  const end=()=>{this.drag=undefined;this.preview.cursor='default';};
  this.preview.on('pointerup',end);this.preview.on('pointerupoutside',end);this.preview.on('pointercancel',end);
  parent.addChild(this.preview,this.modal);this.preview.label='skill-inspection-preview';this.modal.label='skill-details-modal';
 }
 select(n:Inspection){if(this.selected?.id!==n.id)this.hidden=false;this.selected=n;this.key='';}
 reveal(){this.hidden=false;this.render(this.rect,true);}
 dismiss(){this.drag=undefined;this.hidden=true;this.details=false;this.render(this.rect,true);}
 isVisible(){return !!this.selected&&!this.hidden;}
 contains(x:number,y:number){return this.isVisible()&&this.preview.getBounds().containsPoint(x,y);}
 close(){this.details=false;this.key='';this.render(this.rect,true);}
 isModal(){return this.details;}
 private movePreview(x:number,y:number){
  const k=this.preview.scale.x,size=PREVIEW_SIZE*k;
  x=Math.max(8,Math.min(this.rect.width-size-8,x));y=Math.max(8,Math.min(this.rect.height-size-8,y));
  const dx=x-this.preview.x,dy=y-this.preview.y;this.position={x,y};this.preview.position.set(x,y);
  for(const id of ['preview-close','preview-drag','skill-details','skill-equip']){const c=this.controls[id];if(c){c.x+=dx;c.y+=dy;}}
 }
 private text(c:Container,value:string,x:number,y:number,size:number,width?:number,color=0xf6e1ae,center=false){
  const t=c.addChild(new MsdfText({...ROLES['panel-body'],fill:color},value,{size}));if(width)t.setWrapWidth(width);t.place(x,y,center ? .5 : 0);return t;
 }
 private button(c:Container,id:string,label:string,x:number,y:number,w:number,h:number,fn:()=>void,primary=false,enabled=true){
  const b=c.addChild(new Container());b.position.set(x,y);b.label=id;
  const art=b.addChild(this.f.frame(primary?(enabled?'primary':'primary-disabled'):'secondary',w,h));
  this.text(b,label,w/2,h/2+5,Math.min(18,w/13),undefined,primary&&enabled?0x211006:0xf6e1ae,true);
  b.eventMode='static';b.cursor=enabled?'pointer':'default';b.hitArea=new Rectangle(0,0,w,h);b.alpha=enabled?1:.6;
  if(enabled){
   const state=(suffix:string)=>{if(primary)(art as unknown as {texture:Texture}).texture=this.f.texture('primary'+suffix);else art.alpha=suffix==='-pressed'?.75:1;};
   b.on('pointertap',e=>{e.stopPropagation();fn();});b.on('pointerover',()=>state('-hover'));b.on('pointerout',()=>state(''));b.on('pointerdown',e=>{e.stopPropagation();state('-pressed');});b.on('pointerup',()=>state(''));b.on('pointerupoutside',()=>state(''));
  }
  this.controls[id]={x:x+w/2,y:y+h/2,width:w,height:h};return b;
 }
 render(rect:Rect,force=false){
  this.rect=rect;
  const n=this.selected,p=this.o.run(),slot=this.o.slot()??0,slots=p.slots??[];
  const key=JSON.stringify([rect,n?.id,n?.locked,this.details,this.hidden,slot,slots,p.skills,p.stars]);if(!force&&key===this.key)return;this.key=key;
  for(const c of [this.preview,this.modal])c.removeChildren().forEach(v=>v.destroy({children:true}));this.controls={};
  this.preview.visible=!!n&&!this.hidden;this.modal.visible=!!n&&this.details&&!this.hidden;if(!n||this.hidden)return;
  const portrait=rect.width<600,w=PREVIEW_SIZE,ph=PREVIEW_SIZE,kp=Math.min(1,(rect.width-24)/w,(rect.height-24)/ph);
  const px=Math.max(8,Math.min(rect.width-w*kp-8,this.position?.x??rect.width-w*kp-16)),py=Math.max(8,Math.min(rect.height-ph*kp-8,this.position?.y??rect.height-ph*kp-16));
  this.preview.position.set(px,py);this.preview.scale.set(kp);this.preview.eventMode='static';this.preview.hitArea=new Rectangle(0,0,w,ph);
  this.preview.addChild(this.f.frame('details-frame',w,ph));
  const handle=this.preview.addChild(new Graphics().rect(8,8,w-48,92).fill({color:0xffffff,alpha:.001}));handle.eventMode='static';handle.cursor='grab';handle.label='preview-drag';
  this.controls['preview-drag']={x:px+w*.45*kp,y:py+45*kp,width:(w-48)*kp,height:92*kp};
  const dismiss=this.preview.addChild(this.f.frame('close',32,32));dismiss.position.set(w-42,10);dismiss.eventMode='static';dismiss.cursor='pointer';dismiss.on('pointerdown',e=>e.stopPropagation());dismiss.on('pointertap',e=>{e.stopPropagation();this.dismiss();});
  this.controls['preview-close']={x:px+(w-26)*kp,y:py+26*kp,width:32*kp,height:32*kp};
  const d=inspectionData(n,p),at=n.game?slots.indexOf(n.game):-1;
  const status=n.locked?`Locked · Requires ${n.locked}`:n.kind==='passive'?(d.rank?'Passive · Learned':'Passive · Not learned'):at>=0?`Equipped · Slot ${at+1}`:d.rank?'Not Equipped':'Not learned';
  const valid=!!n.game&&n.kind!=='passive'&&d.rank>0&&!n.locked&&at!==slot;
  const notice=!n.game?'Concept only':n.locked?`Requires ${n.locked}`:!d.rank?'Learn through level-up blessings':n.kind==='passive'?'Passive skills do not use a slot':at===slot?`Equipped in Slot ${slot+1}`:slots[slot]?`Replaces ${cards[slots[slot]]?.name||slots[slot]} in Slot ${slot+1}`:`Uses Slot ${Math.min(slot,slots.length)+1}`;
  const icon=this.preview.addChild(new Sprite(n.icon));icon.position.set(20,24);icon.width=icon.height=64;
  if(n.id==='rift-dash'){const mask=this.preview.addChild(new Graphics().poly(skillHexPoints(52,56,27.5)).fill(0xffffff));icon.mask=mask;drawSkillHex(this.preview.addChild(new Graphics()),52,56,32);}
  this.text(this.preview,n.name,100,46,23,w-150);
  this.text(this.preview,status,20,119,14,w-40,at>=0?0xf4c957:0x6ae6ff);
  this.text(this.preview,'Drag header to move',100,84,12,w-145,0xcab990);
  const excerptLimit=150;
  this.text(this.preview,d.description.length>excerptLimit?d.description.slice(0,excerptLimit-3)+'…':d.description,20,154,15,w-40);
  this.button(this.preview,'skill-details','Skill Details',20,ph-116,w-40,38,()=>{this.details=true;this.key='';this.render(this.rect,true);});
  this.button(this.preview,'skill-equip',`Equip to Slot ${slot+1}`,20,ph-71,w-40,38,()=>this.o.equip(n.game!),true,valid);
  this.text(this.preview,notice,w/2,ph-15,11,w-40,0xcab990,true);
  for(const id of ['skill-details','skill-equip']){const c=this.controls[id];c.x=px+c.x*kp;c.y=py+c.y*kp;c.width*=kp;c.height*=kp;}
  if(!this.details)return;
  const landscape=rect.height<450;
  const aw=landscape?innerWidth:rect.width,ah=landscape?innerHeight:rect.height,offX=landscape?-this.parent.x:0,offY=landscape?-this.parent.y:0;
  this.modal.position.set(offX,offY);
  this.modal.eventMode='static';this.modal.hitArea=new Rectangle(0,0,aw,ah);
  const veil=this.modal.addChild(new Graphics().rect(0,0,aw,ah).fill({color:0x000000,alpha:.7}));veil.eventMode='static';veil.on('pointertap',e=>{e.stopPropagation();this.close();});
  const mw=landscape?760:Math.min(760,rect.width-16),mh=landscape?420:Math.min(rect.height-16,portrait?550:490),k=landscape?Math.min((aw-16)/mw,(ah-16)/mh):1,mx=(aw-mw*k)/2,my=(ah-mh*k)/2;
  const c=this.modal.addChild(new Container());c.position.set(mx,my);c.scale.set(k);c.eventMode='static';c.on('pointertap',e=>e.stopPropagation());c.addChild(this.f.frame('details-frame',mw,mh));
  this.text(c,'Skill Details',mw/2,40,portrait?25:32,undefined,0xffd979,true);
  const close=c.addChild(this.f.frame('close',36,36));close.position.set(mw-48,12);close.eventMode='static';close.cursor='pointer';close.on('pointertap',()=>this.close());this.controls['details-close']={x:mw-30,y:30,width:36,height:36};
  const im=c.addChild(new Sprite(n.icon));const iy=landscape?52:62,is=landscape?56:portrait?64:88;im.position.set(24,iy);im.width=im.height=is;
  if(n.id==='rift-dash'){const mask=c.addChild(new Graphics().poly(skillHexPoints(24+is/2,iy+is/2,is*.43)).fill(0xffffff));im.mask=mask;drawSkillHex(c.addChild(new Graphics()),24+is/2,iy+is/2,is/2);}
  this.text(c,n.name,portrait?100:132,83,portrait?21:27,mw-(portrait?120:150));
  this.text(c,`${n.kind==='passive'?'Passive Skill':'Active Skill'} · ${status}`,portrait?100:132,109,12,mw-(portrait?120:150),0x6ae6ff);
  this.text(c,d.description,24,landscape?128:portrait?153:178,portrait?13:16,mw-48);
  const tableY=landscape?190:portrait?244:240;
  c.addChild(this.f.frame('divider',mw-48,2)).position.set(24,tableY-30);
  this.text(c,'Next Level',24,tableY-7,21);
  this.text(c,d.maxRank?'Maximum rank':`Current${d.rank?` · Lv. ${d.rank}`:''}`,mw*.55,tableY+22,12,undefined,0xf6e1ae,true);
  this.text(c,d.maxRank?'—':`Next · Lv. ${d.rank+1}`,mw*.83,tableY+22,12,undefined,0x6ae6ff,true);
  if(!n.game)this.text(c,'No progression data available.',24,tableY+55,14,mw-48);
  d.rows.forEach((r,i)=>{const y=tableY+53+i*(landscape?23:29);this.text(c,r.label,24,y,13);this.text(c,r.current,mw*.55,y,15,undefined,0xf6e1ae,true);this.text(c,d.maxRank?'—':r.next,mw*.83,y,15,undefined,0x6ae6ff,true);});
  const footer=mh-78,gap=12,bw2=(mw-48-gap)/2;
  c.addChild(this.f.frame('divider',mw-48,2)).position.set(24,footer-14);
  this.button(c,'back-to-tree','Back to Tree',24,footer,bw2,42,()=>this.close());
  this.button(c,'details-equip',`Equip to Slot ${slot+1}`,24+bw2+gap,footer,bw2,42,()=>this.o.equip(n.game!),true,valid);
  this.text(c,notice,mw/2,mh-13,11,mw-40,0xcab990,true);
  for(const id of ['back-to-tree','details-equip','details-close']){this.controls[id].x=offX+mx+this.controls[id].x*k;this.controls[id].y=offY+my+this.controls[id].y*k;}
 }
 snapshot(){return {selected:this.selected?.id??null,visible:this.isVisible(),preview:this.preview.visible?{x:this.preview.x,y:this.preview.y,width:PREVIEW_SIZE*this.preview.scale.x,height:PREVIEW_SIZE*this.preview.scale.y}:null,details:this.details,data:this.selected?inspectionData(this.selected,this.o.run()):null,controls:this.controls};}
 destroy(){this.preview.destroy({children:true});this.modal.destroy({children:true});}
}
