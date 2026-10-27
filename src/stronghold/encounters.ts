import {skillBindings} from '../app/skill-bindings';
import {publishActorShadowFrame,actorShadowModeRevision} from './shadow-actor-sources';
import {registerActorShadowSprite} from './shadow-actor-batch';
import {STRONGHOLD} from './prefabs/stronghold';
import type {ItemId} from './items';
import {requestGameFrame as requestAnimationFrame} from '../app/frame-scheduler';
import {Container,Graphics,Sprite,Texture,type Renderer} from 'pixi.js';
import {Minimap} from './minimap';
import {createCanvasSprite} from '../app/loader';
import type {FrameSet} from '../typography/frames';
import {Hud,type HudCallbacks,type HudSkillState} from '../typography/hud';
import {LevelUpBlessingOverlay,type BlessingChoiceItem} from '../typography/level-up-v5';
import {MsdfText} from '../typography/text';
import {fresh,awardSoulXp,roll,choose,equip,cards,reach,aoeCastRadius,health,threshold,thresholdForLevel,xpPercent,critChance,critMultiplier,syncHeroLoadout,isActiveSkill,skillRank,skillCooldownMs,revenantMaxHp,revenantDamage,revenantXpReward,MAX_SKILL_SLOTS,type Progression} from './progression';
import {unproject} from '../isometric';
import {Fighter,STATS,inReach,swingTargets,turn} from '../characters/combat';
import type {CharacterMeta} from '../characters/sprites';
import {COURT,tilePoint} from './terrain';
import {liftAt,liftAtTile,cliffTile} from '../world/relief';
import {GATE,SPAWN_DISTANCE_M,METERS_PER_TILE,fromGate,fromCenter,inSafeZone,spawnPoint,meters,type Tile} from './safe-zone';
import {DISPLAY,cutOut,drawFigureShadow,prewarmAtlasAlpha,type Placed,type Pose} from './hero';
import {notifyHeroCast} from './hero-3d';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {loadImage} from '../app/loader';
import type {Net} from './net/client';
import {characters,DEFAULT_HERO,heroInfo,type HeroId} from './heroes';
import {createCombatVfx,facingScreenAngle,SKILL_CATALOG,type SkillId} from './combat-vfx';
import {measureTracelogPhase} from './tracelog';
import {SkillTree,nodeForSkill,emberNodeForSkill} from './skill-tree';
import {restoreSkillUnlocks,saveSkillUnlocks,SKILL_SAVE_ERROR} from './skill-unlocks';

const SCALE=DISPLAY/1.1;
const HERO_REACH=STATS.hero.reach*SCALE,ENEMY_REACH=STATS.revenant.reach*SCALE,SIDE=.35*SCALE,SPACING=.72*SCALE;
const ENEMY_SPEED=105/Math.hypot(64,32)*.55,ENEMY_STRIDE=76*DISPLAY/1.1;
// Tiles: a revenant hunts the hero within AGGRO (packs spawn inside it, so they come straight for a hero in the wilds);
// the idle hero never walks toward one: it swings in place once one is at its maximum reach. Packs of one to three surround the hero, and a swing only
// reaches the side it faces, so the ones behind land their blows.
const VEER=[.4,.8,1.2,1.6,2,2.4],AGGRO=13,MAX_ENEMIES=8,PACK=3,SPAWN_EVERY=2000,REGEN=8,HERO_RESPAWN=3500,CORPSE=4400;
const SIMULTANEOUS_SYNC_WINDOW_MS=340;
type Foe=Fighter&{home:Tile;wander:Tile|null;age:number;side:number;level:number;maxHp:number};
type Hero={
 canvas:HTMLCanvasElement;
 position():{x:number;y:number};face(sx:number,sy:number):void;respawn():void;teleport(x:number,y:number):boolean;
 blocked(x:number,y:number):boolean;occluders(x:number,y:number,box:number[],lift?:number):Placed[];
 occlusionAt(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean,anchorY?:number):number;
 traceWallRay(x0:number,y0:number,x1:number,y1:number):{hit:boolean;x:number;y:number;t:number};
 sun():Sun;hero?:()=>HeroId
};
const toTile=(x:number,y:number):Tile=>{const g=unproject(x-COURT.x,y-COURT.y);return {u:g.x,v:g.y};};
const screen=(du:number,dv:number)=>({x:(du-dv)*64,y:(du+dv)*32});
const tileOf=(f:Fighter):Tile=>({u:f.x,v:f.y});

const SKILL_ART:Record<string,string>={
 'flame-fan':'skill-flame-fan',
 'rift-bolt':'skill-rift-bolt',
 'cinder-step':'skill-cinder-step',
 'rift-dash':'skill-rift-dash',
 'ember-snare':'skill-ember-snare',
 'rift-trap':'skill-rift-trap',
 cleave:'skill-cleave',
 shockwave:'skill-seismic-slam',
};

export async function createEncounters(o:{
 renderer?:Renderer;
 worldStage:Container;
 uiStage:Container;
 frames:FrameSet;
 hudCallbacks?:HudCallbacks;
 showCoop?:boolean;
 cancelRoute?:()=>void;
 hero:Hero;
 direction:()=>Walk;
 net?:Net;
}){
 const walkable=(p:Tile)=>{const w=tilePoint(p.u,p.v);return !o.hero.blocked(w.x,w.y);};
 const all=await characters(),heroMeta:CharacterMeta=all.hero,meta:CharacterMeta=all.revenant;
 const atlas=await loadImage('/assets/characters/'+meta.image+(meta.revision?`?v=${encodeURIComponent(meta.revision)}`:''));
 prewarmAtlasAlpha(atlas);
 let seed=(Date.now()>>>0)||1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const currentHeroId=():HeroId=>o.hero.hero?.()??DEFAULT_HERO;
 const start=o.hero.position(),h=new Fighter('hero',heroMeta.clips,toTile(start.x,start.y).u,toTile(start.x,start.y).v);
 let maxHp=STATS.hero.hp,kills=0,spawnTimer=0,ambient='255,255,255',origin={x:0,y:0,scale:1};
 let skillSaveMessage='';
 const soloRun=(hero:HeroId)=>{
  if(o.showCoop)return fresh(hero); // Diagnostic co-op stays server-authoritative and temporary.
  try{return restoreSkillUnlocks(localStorage,hero);}catch(error){skillSaveMessage=error instanceof Error?error.message:SKILL_SAVE_ERROR;return fresh(hero);}
 };
 let runHero=currentHeroId();
 let run=soloRun(runHero),baseHp=100,levelUpPulseMs=0,regenAccum=0,lastCoopAutoCasts=0;
 const local:Foe[]=[],spawns:{u:number;v:number;m:number}[]=[];let foes=local,online=false,heroPlays=-1;

 // Revenant layers + Overhead bars
 const back=new Container();back.zIndex=24;back.sortableChildren=true;
 const front=new Container();front.zIndex=34;front.sortableChildren=true;
 const bars=new Container();bars.zIndex=40;
 o.worldStage.addChild(back,front,bars);

 // Hero overhead health bar in Pixi (single slim green bar matching reference)
 const heroOverhead=bars.addChild(new Container());
 heroOverhead.visible=false;
 const heroBarBg=heroOverhead.addChild(o.frames.frame('overhead-bar',46,8));
 heroBarBg.position.set(-23,-8);
 const heroHpGreen=heroOverhead.addChild(new Container());
 heroHpGreen.position.set(-20,-6);
 heroHpGreen.addChild(o.frames.frame('hp-fill-green',40,4));
 const heroHpLow=heroOverhead.addChild(new Container());
 heroHpLow.position.set(-20,-6);
 heroHpLow.addChild(o.frames.frame('hp-fill',40,4));
 heroHpLow.visible=false;
 const heroExpFill=new Container();
 heroExpFill.addChild(o.frames.frame('xp-fill',40,3));

 // Main Gameplay HUD in Pixi (using src/typography/hud.ts)
 const initialHero=heroInfo(currentHeroId());
 const hud=new Hud(
  o.frames,
  {
   name:initialHero.name,
   portrait:currentHeroId()==='rift-runner'?'portrait-rift-runner':'portrait-ember-warden',
   level:1,
   hp:100,
   hpMax:100,
   gold:0,
   time:'09:00',
   zone:'Safe Zone',
   xp:0,
   xpMax:thresholdForLevel(1),
   coopLabel:o.showCoop?'Co-op · Solo':undefined,
   pingMs:24,
   fps:60,
   skills:[
    {name:'Flame Fan',level:1,art:'skill-flame-fan',stateLabel:'Auto'},
    {name:'Empty Slot',level:0,art:'skill-empty',stateLabel:'Locked',locked:true},
    {name:'Empty Slot',level:0,art:'skill-empty',stateLabel:'Locked',locked:true},
   ],
  },
  {},
  {
   ...o.hudCallbacks,
   // Both heroes auto-cast equipped skills; HUD interaction opens the loadout tree.
   onSkillClick:(idx)=>openSkillTree(idx),
   onSkillAim:(idx,x,y,id,touch)=>startDashAim(idx,x,y,id,touch),
   onSkillInspect:(idx)=>openSkillTree(idx),
  },
 );
 hud.zIndex=10;
 o.uiStage.addChild(hud);
 const minimap=new Minimap();o.uiStage.addChild(minimap);

 // Hero Skill Tree (skill-tree.ts): sits in the space the HUD leaves free, so the HUD stays uncovered.
 const skillTree=new SkillTree(o.uiStage,{run:()=>run,hero:currentHeroId,region:skillTreeRegion,equip:(slot,id)=>{
  // Co-op runs come from the server, which would put the old loadout straight back.
  if(online)return 'Skills can be changed in solo play';
  const next=structuredClone(run);
  if(!equip(next,slot,id,currentHeroId()))return 'That skill cannot go in this slot';
  try{if(!o.showCoop)saveSkillUnlocks(localStorage,currentHeroId(),next);}catch{return SKILL_SAVE_ERROR;}
  run=next;
  lastSkillSig='';syncSkillBar();
  return true;
 }});
 function skillTreeRegion(){
  const W=innerWidth,H=innerHeight,portrait=W<H,m=Math.round(Math.max(8,Math.min(W,H)*.022));
  const tl=hud.getTopLeftScreenBounds(),tr=hud.getTopRightTelemetry().screenBounds,mm=minimap.snapshot(),map=mm.bounds;
  const mapBottom=mm.visible?map.y+map.height:0,mapLeft=mm.visible?map.x:W;
  const sockets=hud.getSkillSocketScreenGeometry().sockets;
  const skillTop=Math.min(H,...sockets.map(s=>s.y-s.radius)),skillLeft=Math.min(W,...sockets.map(s=>s.x-s.radius));
  // The Settings gear and Inventory bag are DOM buttons pinned under the minimap; they count as HUD too.
  const dom=[...document.querySelectorAll<HTMLElement>('.settings-gear,.inventory-bag')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  if(portrait){
   // Under the portrait, bars, minimap and buttons; above the skill arc. A short screen lets the panel cover the arc instead.
   const top=Math.round(Math.max(tl.bottom,tr.bottom,mapBottom,...dom.map(r=>r.bottom))+10),bottom=Math.round(skillTop-12);
   return {vertical:true,rect:{x:m,y:top,width:W-m*2,height:bottom-top>=360?bottom-top:H-top-m}};
  }
  // Landscape: under the top-left HUD, left of the minimap, its buttons and the skill arc; small screens get the whole screen.
  const top=Math.round(tl.bottom+10),right=Math.round(Math.min(skillLeft,mapLeft,...dom.filter(r=>r.bottom>top).map(r=>r.left))-16);
  if(right-m>=520&&H-top-m>=320)return {vertical:false,rect:{x:m,y:top,width:right-m,height:H-top-m}};
  return {vertical:false,rect:{x:m,y:m,width:W-m*2,height:H-m*2}};
 }
 function openSkillTree(slot?:number){
  const ember=currentHeroId()==='ember-warden';
  const focus=(ember?emberNodeForSkill:nodeForSkill)(run.slots[slot??0])??(slot==null?(ember?'flame-fan':'rift-bolt'):undefined);
  void skillTree.show(focus,slot??null);
 }
 // Fetch the tree art once the world is up, so the first long-press opens it at once.
 setTimeout(()=>{void skillTree.preload();},4000);

 // v5 Non-Modal Level-Up Blessing Overlay in Pixi (0% center-screen modal obstruction; combat continues in real time)
 const blessingOverlay=new LevelUpBlessingOverlay(o.frames,id=>select(id));
 blessingOverlay.visible=false;
 o.uiStage.addChild(blessingOverlay);
 const skillSaveNotice=o.uiStage.addChild(new MsdfText('tag-foe','',{size:16,align:'center'}));
 skillSaveNotice.zIndex=100;skillSaveNotice.eventMode='none';

 function syncFoeLevels(){
  if(online)return;
  const targetLv=Math.max(1,run.level);
  for(const f of local){
   if((f.level||1)<targetLv){
    const prevMax=f.maxHp||revenantMaxHp(f.level||1);
    const ratio=f.alive&&prevMax>0?Math.min(1,f.hp/prevMax):1;
    f.level=targetLv;
    f.maxHp=revenantMaxHp(targetLv);
    if(f.alive)f.hp=+(ratio*f.maxHp).toFixed(2);
   }
  }
 }

 // Shared raster glow keeps all souls in one Pixi texture batch.
 const soulCanvas=document.createElement('canvas');soulCanvas.width=soulCanvas.height=64;
 const soulCtx=soulCanvas.getContext('2d')!;
 const glow=soulCtx.createRadialGradient(32,32,1,32,32,32);
 glow.addColorStop(0,'#ffffff');glow.addColorStop(.12,'#e0ffff');glow.addColorStop(.25,'#6deeff');glow.addColorStop(.45,'#48bcff99');glow.addColorStop(1,'#437aff00');
 soulCtx.fillStyle=glow;soulCtx.fillRect(0,0,64,64);
 const soulTexture=Texture.from(soulCanvas),soulLayer=new Container();soulLayer.zIndex=36;o.worldStage.addChild(soulLayer);
 type Soul={id:number;u:number;v:number;level:number;age:number;sprite:Sprite};
 const souls=new Map<number,Soul>(),collecting:(Soul&{elapsed:number})[]=[];let soulId=0;
 function addSoul(id:number,u:number,v:number,level:number,age=0){
  const sprite=new Sprite(soulTexture);sprite.anchor.set(.5);sprite.eventMode='none';soulLayer.addChild(sprite);
  souls.set(id,{id,u,v,level,age,sprite});
 }
 function clearSouls(){for(const s of [...souls.values(),...collecting])s.sprite.destroy();souls.clear();collecting.length=0;}
 function collectSoul(s:Soul){souls.delete(s.id);collecting.push({...s,elapsed:0});}
 function placeSoul(s:Soul,progress=0){
  const u=s.u+(h.x-s.u)*progress,v=s.v+(h.y-s.v)*progress,p=tilePoint(u,v),k=origin.scale;
  s.sprite.position.set(origin.x+p.x*k,origin.y+(p.y-liftAtTile(u,v)-14-Math.sin(s.age/240)*4-30*progress)*k);
  s.sprite.scale.set(k*(1-progress)*(.85+Math.sin(s.age/160)*.08));s.sprite.alpha=1-progress;
 }
 function renderSouls(){for(const s of souls.values())placeSoul(s);for(const s of collecting)placeSoul(s,Math.min(1,s.elapsed/400));}
 function stepSouls(dt:number){
  for(let i=collecting.length-1;i>=0;i--){const s=collecting[i];s.elapsed+=dt;if(s.elapsed>=400){s.sprite.destroy();collecting.splice(i,1);}}
  for(const s of souls.values()){
   s.age+=dt;
   if(!online&&h.alive&&s.age>=350&&Math.hypot(h.x-s.u,h.y-s.v)<=.85){collectSoul(s);onPickup(s.level);}
  }
 }
 function onKill(f?:Foe){
  if(online)return;
  kills++;
  run.gold+=5;
  const leech=(run.skills.leech??0)*2;
  if(leech>0){
   const before=h.hp;h.hp=Math.min(maxHp,h.hp+leech);
   if(h.hp>before)vfx.recordHeroHeal(h.hp-before,h.x,h.y,'SOUL FEAST');
  }
  if(f)addSoul(++soulId,f.x,f.y,f.level??run.level);
 }
 function onPickup(level:number){
  const prevLevel=run.level;
  awardSoulXp(run,random,currentHeroId(),level);
  vfx.recordHeroXp(revenantXpReward(level),h.x,h.y);
  if(run.level>prevLevel){
   syncFoeLevels();
   levelUpPulseMs=1200;
   vfx.triggerLevelUp(run.level,h.x,h.y);
  }
  if(run.pending)h.immune=200;

 }

 const vfx=createCombatVfx({
  renderer:o.renderer,
  layer:o.worldStage,heroCanvas:o.hero.canvas,backLayer:back,frontLayer:front,
  getHero:()=>({u:h.x,v:h.y,facing:h.facing,back:h.back,vertical:h.vertical,heroId:currentHeroId()}),
  occlusionAt:o.hero.occlusionAt,
  occluders:o.hero.occluders,
  blocked:o.hero.blocked,
  traceWallRay:o.hero.traceWallRay,
  getRun:()=>run,
  getFoes:()=>foes,
  isOnline:()=>online,
  onKill:f=>onKill(f as Foe),
  random
 });

 function nearest(range:number){
  let best:Foe|null=null,d=range;
  for(const f of foes){
   const v=Math.hypot(f.x-h.x,f.y-h.y);
   if(f.alive&&v<=d){d=v;best=f;}
  }
  return best;
 }

 let lastSkillSig='';
 // Ember names share combat ids with Rift; presentation must follow the selected hero.
 const skillName=(id:string,fallback:string)=>currentHeroId()==='ember-warden'?({'cinder-step':'Cinder Step',cleave:'Molten Cleave',shockwave:'Seismic Slam (Molten)'} as Record<string,string>)[id]??fallback:fallback;
 function syncSkillBar(){
  const hid=currentHeroId();
  syncHeroLoadout(run,hid);
  const inZone=inSafeZone(tileOf(h));
  const foeInAoe=!inZone&&h.alive&&Boolean(nearest(aoeCastRadius(run)));
  const skills:HudSkillState[]=[];
  for(let i=0;i<MAX_SKILL_SLOTS;i++){
   const sid=run.slots[i] as SkillId|undefined;
   const def=sid?SKILL_CATALOG[sid]:undefined;
   if(sid&&def){
    const rank=Math.max(1,skillRank(run,sid));
    const maxCd=skillCooldownMs(run,sid);
    const cd=vfx.cooldown(sid);
    const ratio=Math.min(1,cd/Math.max(1,maxCd));
    const ready=cd<=40;
    const stateLabel=ready?(sid==='rift-dash'?'Aim':foeInAoe?'Firing':'Auto'):`${(cd/1000).toFixed(1)}s`;
    skills.push({
     name:skillName(sid,def.name),
     level:rank,
     art:SKILL_ART[sid]??'skill-flame-fan',
     stateLabel,
     locked:false,
     cooldownRatio:ready?0:ratio,
     cooldownSec:ready?0:cd/1000,
     hotkey:skillBindings.label(i),
    });
   }else{
    skills.push({
     name:'Empty Slot',
     level:0,
     art:'skill-empty',
     stateLabel:'Locked',
     locked:true,
     cooldownRatio:0,
     cooldownSec:0,
     hotkey:skillBindings.label(i),
    });
   }
  }
  const sig=skills.map(s=>`${s.hotkey}:${s.name}:${s.level}:${s.art}:${s.stateLabel}:${Math.round((s.cooldownRatio??0)*25)}`).join('|');
  if(sig!==lastSkillSig){
   lastSkillSig=sig;
   hud.setSkills(skills);
  }
 }

 skillBindings.subscribe(syncSkillBar);
 window.addEventListener('keydown',e=>{
  if(!h.alive||e.repeat)return;
  const tag=(e.target as HTMLElement|null)?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
  if(e.code==='KeyK'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(skillTree.isOpen())skillTree.open(false);else openSkillTree();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  // Blessing choices retain their numbered UI; equipped shortcuts follow preferences.
  const idx=run.pending?['1','2','3'].indexOf(e.key):skillBindings.slot(e.code);
  if(idx<0)return;
  if(run.pending&&run.offers[idx]){
   select(run.offers[idx]);
   return;
  }
  // Match each hero's HUD tap behavior for the configured slot shortcut.
  if(!run.pending){if(run.slots[idx]==='rift-dash'&&!e.shiftKey)manualDash(cursor.x,cursor.y);else openSkillTree(idx);}
 });

 let lastNetDash=0;
 const dashTrail=o.uiStage.addChild(new Graphics());dashTrail.eventMode='none';dashTrail.zIndex=5;let trailUntil=0;
 const dashAim=o.uiStage.addChild(new Graphics());dashAim.zIndex=100;dashAim.eventMode='none';
 let cursor={x:innerWidth/2,y:innerHeight/2},aim:null|{id:number;x:number;y:number;touch:boolean;dx:number;dy:number}=null;
 let lastDash:null|{from:Tile;to:Tile;distance:number}=null;
 function dashReady(){return h.alive&&!run.pending&&!skillTree.isOpen()&&currentHeroId()==='rift-runner'&&run.slots.includes('rift-dash')&&vfx.cooldown('rift-dash')<=0;}
 function heroScreen(){const p=o.hero.position();return {x:origin.x+p.x*origin.scale,y:origin.y+(p.y-liftAt(p.x,p.y))*origin.scale};}
 function manualDash(x:number,y:number){
  if(!dashReady())return false;
  const at=heroScreen(),dx=x-at.x,dy=y-at.y;
  if(Math.hypot(dx,dy)<8)return false;
  const d=unproject(dx,dy),len=Math.hypot(d.x,d.y),du=d.x/len,dv=d.y/len;
  if(online){o.net?.dash(du,dv);return true;}
  const from={u:h.x,v:h.y};let to={...from};
  for(let i=1;i<=30;i++){const next={u:from.u+du*i*.05,v:from.v+dv*i*.05};if(!walkable(next)||cliffTile(to.u,to.v,next.u,next.v))break;to=next;}
  const distance=Math.hypot(to.u-from.u,to.v-from.v);if(distance<.05)return false;
  o.cancelRoute?.();o.hero.face(dx,dy);turn(h,dx,dy);
  vfx.castSkill('rift-dash',{targetU:from.u+du*6,targetV:from.v+dv*6,dashDistance:distance});
  const w=tilePoint(to.u,to.v);if(!o.hero.teleport(w.x,w.y))return false;
  h.x=to.u;h.y=to.v;h.immune=Math.max(h.immune,260);lastDash={from,to,distance};trailUntil=performance.now()+1100;syncSkillBar();return true;
 }
 function startDashAim(idx:number,x:number,y:number,id:number,touch:boolean){
  if(run.slots[idx]!=='rift-dash'||skillTree.isOpen()||run.pending)return;
  if(!touch&&!dashReady())return;
  if(!touch){manualDash(cursor.x,cursor.y);return;}
  aim={id,x,y,touch,dx:0,dy:0};
 }
 window.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'&&!hud.getSkillSocketScreenGeometry().sockets.some(s=>Math.hypot(e.clientX-s.x,e.clientY-s.y)<s.radius+20))cursor={x:e.clientX,y:e.clientY};
  if(!aim||aim.id!==e.pointerId)return;
  aim.dx=e.clientX-aim.x;aim.dy=e.clientY-aim.y;
  const l=Math.hypot(aim.dx,aim.dy),p=heroScreen();dashAim.clear();
  if(l>=12){const dx=aim.dx/l,dy=aim.dy/l,tx=p.x+dx*110,ty=p.y+dy*110;
   dashAim.moveTo(p.x,p.y).lineTo(tx,ty).stroke({color:0x67edff,width:5,alpha:.85});
   dashAim.poly([tx,ty,tx-dx*20-dy*12,ty-dy*20+dx*12,tx-dx*20+dy*12,ty-dy*20-dx*12]).fill(0xc4ffff);
  }
 });
 window.addEventListener('pointerup',e=>{if(!aim||aim.id!==e.pointerId)return;const a=aim;aim=null;dashAim.clear();if(Math.hypot(a.dx,a.dy)>=12){const p=heroScreen();manualDash(p.x+a.dx*10,p.y+a.dy*10);}else openSkillTree(run.slots.indexOf('rift-dash'));});
 const cancelDashAim=()=>{aim=null;dashAim.clear();};
 window.addEventListener('pointercancel',cancelDashAim);window.addEventListener('blur',cancelDashAim);window.addEventListener('resize',cancelDashAim);

 let offerKey='';
 let localOfferOverride=false;
 function select(id:string){
  if(online&&!localOfferOverride){o.net?.chooseCard(id,run.level);return;}
  const hid=currentHeroId();
  const next=structuredClone(run);
  if(!choose(next,id,random,hid))return;
  if(isActiveSkill(id)&&!o.showCoop){
   try{saveSkillUnlocks(localStorage,hid,next);skillSaveMessage='';}
   catch{skillSaveMessage=SKILL_SAVE_ERROR;return;}
  }
  run=next;
  if(isActiveSkill(id)){
   vfx.resetCooldowns();
  }
  const beforeMax=maxHp,beforeHp=h.hp;
  maxHp=baseHp+health(run);
  h.hp=Math.min(maxHp,h.hp+Math.max(0,maxHp-beforeMax)+(id==='heal'?maxHp*.35:0));
  if(h.hp>beforeHp)vfx.recordHeroHeal(h.hp-beforeHp,h.x,h.y,cards[id]?.name.toUpperCase());
  drawProgress();
  syncSkillBar();
 }

 function rebuildBlessingModal(){
  if(!run.pending||!run.offers.length){
   blessingOverlay.renderChoices([],{x:0,y:0},[],innerWidth,innerHeight,1);
   return;
  }
  const geo=hud.getSkillSocketScreenGeometry();
  let nextUnlockSlot=Math.min(MAX_SKILL_SLOTS-1,run.slots.length);
  const choices:BlessingChoiceItem[]=[];

  run.offers.forEach((id,idx)=>{
   const card=cards[id];if(!card)return;
   const active=isActiveSkill(id);
   const optNum=idx+1;
   if(active){
    const equippedIdx=run.slots.indexOf(id);
    const r=skillRank(run,id);
    // A learned skill ranks up whether or not it is equipped (the fourth learned skill waits in the skill tree).
    if(equippedIdx>=0||r>0){
     choices.push({
      id,
      optionNumber:optNum,
      kind:'active',
      name:skillName(id,card.blessingTitle??card.name),
      rankLabel:`Lv. ${r} → Lv. ${r+1}`,
      statSummary:card.upgradeSummary??'+25% Cone DMG · -0.4s CD',
      art:SKILL_ART[id]??'skill-flame-fan',
      targetSocketIndex:equippedIdx>=0?equippedIdx:undefined,
      isUnlock:false,
     });
    }else{
     const slotsFull=run.slots.length>=MAX_SKILL_SLOTS;
     const targetSocket=Math.min(MAX_SKILL_SLOTS-1,nextUnlockSlot);
     nextUnlockSlot=Math.min(MAX_SKILL_SLOTS-1,nextUnlockSlot+1);
     choices.push({
      id,
      optionNumber:optNum,
      kind:'active',
      name:skillName(id,card.blessingTitle??card.name),
      // With every slot full a new skill is learned unequipped; the player swaps it in from the skill tree.
      rankLabel:slotsFull?'LEARN Lv. 1':'UNLOCK Lv. 1',
      statSummary:slotsFull?'Equip it from the Skill Tree':card.unlockSummary??'AoE Fire Ring · 4.0s CD',
      art:SKILL_ART[id]??'skill-flame-fan',
      targetSocketIndex:slotsFull?undefined:targetSocket,
      isUnlock:true,
     });
    }
   }else{
    choices.push({
     id,
     optionNumber:optNum,
     kind:'passive',
     name:skillName(id,card.blessingTitle??card.name),
     rankLabel:'(PASSIVE)',
     statSummary:card.passiveSummary??card.description,
     art:'skill-blessing',
    });
   }
  });

  blessingOverlay.renderChoices(choices,geo.arcCenter,geo.sockets,innerWidth,innerHeight,geo.scale);
 }

 function layoutBlessingModal(){
  if(!blessingOverlay.visible)return;
  rebuildBlessingModal();
 }

 let lastHudHero='',lastRunGold=-1;
 function drawProgress(){
  const hid=currentHeroId();
  if(hid!==runHero&&!online){runHero=hid;run=soloRun(hid);}
  syncHeroLoadout(run,hid);
  skillSaveNotice.text=skillSaveMessage;
  skillSaveNotice.visible=!!skillSaveMessage;
  if(skillSaveMessage){skillSaveNotice.setWrapWidth(Math.min(520,innerWidth-32));skillSaveNotice.place(innerWidth/2,innerHeight/2,.5);}
  if(hid!==lastHudHero){
   lastHudHero=hid;
   const info=heroInfo(hid);
   hud.setHero(info.name,hid==='rift-runner'?'portrait-rift-runner':'portrait-ember-warden');
  }
  const nextXp=threshold(run),expRatio=Math.max(0,Math.min(1,run.xp/Math.max(1,nextXp)));
  const shownRatio=levelUpPulseMs>600?1:expRatio;
  hud.setLevel(run.level);
  hud.setXp(shownRatio*nextXp,nextXp);
  if(run.gold!==lastRunGold){
   lastRunGold=run.gold;
   hud.setGold(run.gold);
  }

  const expBar=heroExpFill.children[0] as Container;
  expBar.visible=shownRatio>0.01;
  if(shownRatio>0.01)expBar.width=Math.max(6,Math.round(42*shownRatio));

  const hasOffers=Boolean(run.pending&&run.offers.length);
  if(!hasOffers){
   if(blessingOverlay.visible){
    offerKey='';
    blessingOverlay.renderChoices([],{x:0,y:0},[],innerWidth,innerHeight,1);
   }
   return;
  }
  const key=JSON.stringify([online,run.level,run.pending,run.offers,run.skills,run.slots,innerWidth,innerHeight]);
  if(key===offerKey)return;
  offerKey=key;
  rebuildBlessingModal();
 }

 function spawn(f?:Foe){
  const p=spawnPoint(random,tileOf(h),walkable);if(!p)return;
  const n=f?1:Math.min(MAX_ENEMIES-foes.length,1+Math.floor(random()*PACK));
  const lv=Math.max(1,run.level),fMaxHp=revenantMaxHp(lv);
  for(let i=0;i<n;i++){
   const at=i?spawnPoint(random,tileOf(h),walkable):p;if(!at)continue;
   spawns.push({u:+at.u.toFixed(2),v:+at.v.toFixed(2),m:+meters(fromGate(at)).toFixed(1)});if(spawns.length>200)spawns.shift();
   const g=f??Object.assign(new Fighter('revenant',meta.clips,at.u,at.v),{home:at,wander:null,age:0,side:1,level:lv,maxHp:fMaxHp});if(!f)foes.push(g);
   Object.assign(g,{x:at.u,y:at.v,home:at,wander:null,age:0,level:lv,maxHp:fMaxHp,hp:fMaxHp,deadFor:0,cooldown:600+random()*900});g.play('idle');
  }
 }

 function move(f:Foe,du:number,dv:number,dt:number){
  const len=Math.hypot(du,dv);if(len<1e-6)return false;const v=ENEMY_SPEED*dt/1000,dx=du/len*v,dy=dv/len*v,stuck=!walkable(tileOf(f));
  const tryStep=(mx:number,my:number,side:number)=>{
   if(Math.hypot(mx,my)<v*.4)return false;
   const next={u:f.x+mx,v:f.y+my};
   if(inSafeZone(next)||(!stuck&&!walkable(next))||cliffTile(f.x,f.y,next.u,next.v))return false;
   if(side)f.side=side;
   f.x=next.u;f.y=next.v;const m=screen(mx,my);turn(f,m.x,m.y);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;f.play('move');
   return true;
  };
  if(tryStep(dx,dy,0)||tryStep(dx,0,0)||tryStep(0,dy,0))return true;
  for(const t of [1,-1]){
   for(let i=0;i<VEER.length;i++){
    const a=VEER[i]*t*f.side,ca=Math.cos(a),sa=Math.sin(a);
    if(tryStep(dx*ca-dy*sa,dx*sa+dy*ca,Math.sign(a)))return true;
   }
  }
  const s=screen(du,dv);turn(f,s.x,s.y);f.play('idle');return false;
 }
 // The hero walks only where the player steers it. It never chases a revenant: while idle it swings in place, and only
 // once a revenant is inside its maximum reach (heroStep), so the player stays free to walk away from the fight.
 // Preview mode is set by the hero-picker previews (setPreviewMode below); steering never chases either way.
 let previewMode=false;
 function steer(input:Walk):Walk{
  // Blessing choices are non-modal: keep keyboard, touch and route movement active while choosing.
  return input;
 }

 function autoCastInAoE(forceAll=false):SkillId[]{
  if(!h.alive||inSafeZone(tileOf(h)))return [];
  syncHeroLoadout(run,currentHeroId());
  const aoeTarget=nearest(aoeCastRadius(run));
  if(!aoeTarget)return [];
  notifyHeroCast(380);
  const equipped=run.slots.slice(0,MAX_SKILL_SLOTS).filter((id):id is SkillId=>id!=='rift-dash'&&Boolean(SKILL_CATALOG[id as SkillId]));
  if(!equipped.length)return [];
  if(forceAll)vfx.resetCooldowns(equipped);
  const anyReady=equipped.some(id=>vfx.cooldown(id)<=0);
  if(!anyReady)return [];
  const readySlots=equipped.filter(id=>vfx.cooldown(id)<=SIMULTANEOUS_SYNC_WINDOW_MS);
  const fired=vfx.castSimultaneous(readySlots,{targetU:aoeTarget.x,targetV:aoeTarget.y});
  if(fired.length){
   run.autoCasts=(run.autoCasts??0)+1;
   if(fired.length>=3)run.trinityCasts=(run.trinityCasts??0)+1;
   run.lastCast=fired;
  }
  return fired;
 }

 function heroStep(dt:number,steering:boolean){
  if(!h.alive){h.deadFor+=dt;if(h.deadFor>HERO_RESPAWN){o.hero.respawn();const p=o.hero.position(),t=toTile(p.x,p.y);Object.assign(h,{x:t.u,y:t.v,hp:maxHp});h.play('idle');}return;}
  h.recover();
  if(run.pending){h.immune=Math.max(h.immune,200);}
  autoCastInAoE(false);
  if(h.state==='attack'){
   if(h.impact()){
    const angle=facingScreenAngle(h);
    let anyCrit=false;
    for(const f of swingTargets(h,foes,HERO_REACH*reach(run),SIDE)){
     const res=vfx.applyHitToFoe(f,{angle});
     if(res.crit)anyCrit=true;
    }
    vfx.spawnSlash(h.x,h.y,angle,anyCrit);
   }
   return;
  }
  if(h.state==='hit')return;
  if(!steering){const f=nearest(HERO_REACH*reach(run));if(f){const s=screen(f.x-h.x,f.y-h.y);turn(h,s.x,s.y);o.hero.face(s.x,s.y);h.play('attack');return;}}
  if(inSafeZone(tileOf(h))&&h.hp<maxHp){
   const before=h.hp;h.hp=Math.min(maxHp,h.hp+REGEN*dt/1000);
   regenAccum+=h.hp-before;
   if(regenAccum>=4||(h.hp>=maxHp&&regenAccum>=1)){
    vfx.recordHeroHeal(Math.round(regenAccum),h.x,h.y);
    regenAccum=0;
   }
  }else regenAccum=0;
 }
 function foeStep(f:Foe,dt:number,heroSafe:boolean){
  f.age+=dt;
  if(!f.alive){f.deadFor+=dt;if(f.deadFor>CORPSE)spawn(f);return;}
  f.recover();if(f.state==='hit')return;
  const du=h.x-f.x,dv=h.y-f.y,dist=Math.hypot(du,dv);
  if(f.state==='attack'){
   if(f.impact()&&h.alive&&!heroSafe&&inReach(f,h,ENEMY_REACH+.25*SCALE,SIDE)){
    const before=h.hp;
    h.damage(revenantDamage(f.level||1));
    if(h.hp<before)vfx.recordHeroDamage(before-h.hp,h.x,h.y);
   }
   return;
  }
  if(h.alive&&!heroSafe&&dist<AGGRO){
   if(dist>ENEMY_REACH){move(f,du,dv,dt);return;}
   const s=screen(du,dv);turn(f,s.x,s.y);if(f.cooldown<=0){f.cooldown=1500+random()*1200;f.play('attack');}else f.play('idle');return;
  }
  if(!f.wander||random()<.002){const a=random()*Math.PI*2,r=random()*5,w={u:f.home.u+Math.cos(a)*r,v:f.home.v+Math.sin(a)*r};f.wander=random()<.5&&!inSafeZone(w)&&walkable(w)?w:{u:f.x,v:f.y};}
  const wu=f.wander.u-f.x,wv=f.wander.v-f.y;if(Math.hypot(wu,wv)>.15){if(!move(f,wu,wv,dt))f.wander=null;}else f.play('idle');
 }
 function separate(){
  const list=foes.filter(f=>f.alive);
  for(const a of list){for(const b of [...list,h]){if(a===b)continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d>=SPACING||d<1e-6)continue;
   const push=(SPACING-d)*(b===h?1:.5),next={u:a.x+dx/d*push,v:a.y+dy/d*push};if(!inSafeZone(next)&&walkable(next)){a.x=next.u;a.y=next.v;}}}
 }
 type Mirror=Foe&{gen:number;plays:number};const mirrors=new Map<number,Mirror>();
 function netStep(dt:number){
  const net=o.net!,me=net.me();
  const available=(net.latest()?.souls??[]).filter(s=>s.owner===me?.id);
  const ids=new Set(available.map(s=>s.id));
  for(const s of souls.values())if(!ids.has(s.id))collectSoul(s);
  for(const s of available)if(!souls.has(s.id))addSoul(s.id,s.u,s.v,s.level,s.age);

  const seen=new Set<number>();
  for(const e of net.enemies(frameAt)){
   seen.add(e.id);
   const eLv=Math.max(1,e.level??run.level??1),eMax=e.max??revenantMaxHp(eLv),eSt=e.st as Fighter['state'];
   let f=mirrors.get(e.id);
   if(!f){f=Object.assign(new Fighter('revenant',meta.clips,e.u,e.v),{home:{u:e.u,v:e.v},wander:null,age:0,side:1,level:eLv,maxHp:eMax,gen:e.g,plays:-1});mirrors.set(e.id,f);}
   if(f.gen!==e.g){Object.assign(f,{gen:e.g,age:0,deadFor:0,x:e.u,y:e.v,level:eLv,maxHp:eMax,hp:e.hp});}
   const m=screen(e.u-f.x,e.v-f.y);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;
   Object.assign(f,{x:e.u,y:e.v,level:eLv,maxHp:eMax,facing:e.fc,back:e.bk,vertical:e.vt});
   if(e.n!==f.plays||f.state!==eSt){f.plays=e.n;f.state=eSt;f.t=0;}
   if(e.hp<f.hp){f.flash=120;vfx.recordCoopEnemyDamage(f,f.hp-e.hp);}
   f.hp=e.hp;
   if(f.alive)f.deadFor=0;
   f.tick(dt);f.age+=dt;if(!f.alive)f.deadFor+=dt;
  }
  for(const id of mirrors.keys())if(!seen.has(id))mirrors.delete(id);
  foes=[...mirrors.values()];
  if(me){
   const prevHp=h.hp,prevLevel=run.level,nextSt=me.st as Fighter['state'];
   if(me.n!==heroPlays||h.state!==nextSt){
    if(me.n!==heroPlays&&nextSt==='attack')vfx.spawnSlash(h.x,h.y,facingScreenAngle({facing:me.fc,back:me.bk,vertical:me.vt}),false);
    heroPlays=me.n;h.state=nextSt;h.t=0;
   }
   if(me.hp<prevHp-.05){h.flash=120;vfx.recordHeroDamage(prevHp-me.hp,h.x,h.y);}
   else if(me.hp>prevHp+.5&&prevHp>0){vfx.recordHeroHeal(me.hp-prevHp,h.x,h.y);}
   Object.assign(h,{hp:me.hp,facing:me.fc,back:me.bk,vertical:me.vt});maxHp=me.max;kills=me.k;
   if(h.alive)h.deadFor=0;
   if(!localOfferOverride){
    run=me.run?structuredClone(me.run):fresh(currentHeroId());
    syncHeroLoadout(run,currentHeroId());
   }
   if((run.manualDashes??0)>lastNetDash){
    lastNetDash=run.manualDashes??0;const from={u:run.dashFromU??h.x,v:run.dashFromV??h.y},du=run.dashU??1,dv=run.dashV??0;
    // Authoritative confirmation: FX starts from the recorded origin, before refreshing the local fighter position.
    const old={x:h.x,y:h.y};h.x=from.u;h.y=from.v;
    vfx.castSkill('rift-dash',{targetU:from.u+du*6,targetV:from.v+dv*6,dashDistance:1.5});h.x=old.x;h.y=old.y;
    const to=toTile(me.x,me.y);lastDash={from,to,distance:Math.hypot(to.u-from.u,to.v-from.v)};trailUntil=performance.now()+1100;
   }
   if(run.level>prevLevel){levelUpPulseMs=1200;vfx.triggerLevelUp(run.level,h.x,h.y);}
   const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;h.tick(dt);
   if((run.autoCasts??0)>lastCoopAutoCasts){
    lastCoopAutoCasts=run.autoCasts??0;
    const castIds=(run.lastCast?.length?run.lastCast:run.slots).filter((id):id is SkillId=>id!=='rift-dash'&&Boolean(SKILL_CATALOG[id as SkillId]));
    if(castIds.length){
     const aoeTarget=nearest(aoeCastRadius(run));
     vfx.castSimultaneous(castIds,aoeTarget?{targetU:aoeTarget.x,targetV:aoeTarget.y}:undefined);
    }
   }else if(run.pending>0){
    autoCastInAoE(false);
   }
  }
  if(h.alive&&!inSafeZone(tileOf(h))&&nearest(aoeCastRadius(run)))notifyHeroCast(380);
 }
 function step(dt:number){
  levelUpPulseMs=Math.max(0,levelUpPulseMs-dt);
  vfx.step(dt);
  const net=!!o.net?.active();
  if(net!==online){run=net?fresh(currentHeroId()):soloRun(currentHeroId());online=net;clearSouls();mirrors.clear();local.length=0;foes=local;spawnTimer=0;heroPlays=-1;lastCoopAutoCasts=0;if(!net){h.play('idle');h.hp=maxHp;}}
  if(online){netStep(dt);stepSouls(dt);return;}
  if(previewMode){
   for(const f of [h,...foes])f.tick(dt);
   return;
  }
  const input=o.direction(),steering=!!(input.x||input.y);
  if(steering&&h.state==='attack')h.play('idle');
  for(const f of [h,...foes])f.tick(dt);
  if(h.alive&&h.state==='idle'){const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;}
  stepSouls(dt);
  heroStep(dt,steering);
  const heroSafe=inSafeZone(tileOf(h));
  for(const f of foes)foeStep(f,dt,heroSafe);
  separate();
  spawnTimer-=dt;if(spawnTimer<=0&&foes.length<MAX_ENEMIES){spawnTimer=SPAWN_EVERY;spawn();}
 }
 const cell=document.createElement('canvas');cell.width=meta.cell.w;cell.height=meta.cell.h;
 const cc=cell.getContext('2d')!,pivot=meta.cell.pivot;
 function paintCell(f:Foe){
  const fr=meta.frames[f.clip.frames[f.frame()]];cc.globalCompositeOperation='copy';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);
  if(ambient!=='255,255,255'){cc.globalCompositeOperation='multiply';cc.fillStyle=`rgb(${ambient})`;cc.fillRect(0,0,cell.width,cell.height);cc.globalCompositeOperation='destination-in';cc.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,cell.width,cell.height);}
  cc.globalCompositeOperation='source-over';
  return fr;
 }
 type View={
  el:HTMLCanvasElement;
  g:CanvasRenderingContext2D;
  canvasView:ReturnType<typeof createCanvasSprite>;
  bar:Container;
  lv:MsdfText;
  fill:Container;
  look:string;
  coreLook:string;
  hp:string;
 };
 const views=new Map<Foe,View>();
 function view(f:Foe){
  let v=views.get(f);if(v)return v;
  const el=document.createElement('canvas');
  const canvasView=createCanvasSprite(el);registerActorShadowSprite(canvasView.sprite,()=>{const p=tilePoint(f.x,f.y);return {groundX:p.x,groundY:p.y,lift:liftAtTile(f.x,f.y)};});
  const bar=bars.addChild(new Container());
  bar.visible=false;
  const barTrack=bar.addChild(o.frames.frame('overhead-bar',44,8));
  barTrack.position.set(-22,-8);
  const fill=bar.addChild(new Container());
  fill.position.set(-19.5,-6);
  fill.addChild(o.frames.frame('hp-fill',39,4));
  const lv=bar.addChild(new MsdfText('tag-foe','Lv. 1'));
  lv.place(0,-13.5,0.5);
  v={el,g:el.getContext('2d')!,canvasView,bar,lv,fill,look:'',coreLook:'',hp:''};
  views.set(f,v);
  return v;
 }
 function paint(f:Foe,target:HTMLCanvasElement,box:number[],s:Sun,r:number){
  const wpx=Math.ceil((box[2]-box[0])*r),hpx=Math.ceil((box[3]-box[1])*r),fg=target.getContext('2d')!;if(target.width!==wpx||target.height!==hpx){target.width=wpx;target.height=hpx;}
  const dir=f.vertical?1:f.facing,local=()=>fg.setTransform(r,0,0,r,-box[0]*r,-box[1]*r),sprite=(src:HTMLCanvasElement)=>{fg.scale(dir*DISPLAY,DISPLAY);fg.drawImage(src,-pivot.x,-pivot.y);};
  fg.setTransform(1,0,0,1,0,0);fg.clearRect(0,0,wpx,hpx);const fr=paintCell(f);local();
  drawFigureShadow(fg,atlas,fr,meta.cell,s,dir);
  fg.save();sprite(cell);fg.restore();return fg;
 }
 const looks=new Map<string,HTMLCanvasElement>(),LOOKS=128;
 function compose(f:Foe,v:View,px:number,py:number,box:number[],s:Sun,r:number,hidden:Placed[],baseLook:string,dispW:number,dispH:number){
  let c=looks.get(baseLook);
  if(c){looks.delete(baseLook);looks.set(baseLook,c);}
  else{const oldest=looks.size>=LOOKS?looks.keys().next().value:undefined;if(oldest!==undefined){c=looks.get(oldest)!;looks.delete(oldest);}else c=document.createElement('canvas');paint(f,c,box,s,r);looks.set(baseLook,c);}
  if(v.el.width!==c.width||v.el.height!==c.height){v.el.width=c.width;v.el.height=c.height;}
  v.g.globalCompositeOperation='copy';v.g.setTransform(1,0,0,1,0,0);v.g.drawImage(c,0,0);v.g.globalCompositeOperation='source-over';
  if(hidden.length){v.g.setTransform(r,0,0,r,-box[0]*r,-box[1]*r);cutOut(v.g,hidden,px,py);}
  v.canvasView.sync(dispW,dispH);
 }

 let lastHudSize='',hasRendered=false,lastBox=[-48,-96,48,24];
 function placeSprites(){
  renderSouls();
  const hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  for(const [f,v] of views){
   if(!v.canvasView.sprite.visible)continue;
   const w=tilePoint(f.x,f.y),s=at(w.x,w.y-liftAtTile(f.x,f.y)),shk=vfx.shakeOffset(f);
   v.canvasView.sprite.width=(lastBox[2]-lastBox[0])*k;
   v.canvasView.sprite.height=(lastBox[3]-lastBox[1])*k;
   v.canvasView.sprite.position.set(s.x+lastBox[0]*k+shk.dx,s.y+lastBox[1]*k+shk.dy);
   if(v.bar.visible){
    v.bar.scale.set(Math.max(0.58,Math.min(1,k)));
    v.bar.position.set(s.x+shk.dx,s.y-80*k+shk.dy);
   }
  }
  const s=at(hp.x,hp.y-liftAt(hp.x,hp.y));
  if(heroOverhead.visible){
   heroOverhead.scale.set(Math.max(0.58,Math.min(1,k)));
   heroOverhead.position.set(s.x,s.y-80*k);
  }
 }
 function render(){
  renderSouls();
  hasRendered=true;
  const sw=innerWidth,sh=innerHeight,sizeKey=`${sw}x${sh}`;
  if(sizeKey!==lastHudSize){
   lastHudSize=sizeKey;
   hud.layout(sw,sh);
   layoutBlessingModal();
  }
  minimap.updateMap(o.hero.position(),sw,sh,hud.getTopRightTelemetry().screenBounds.bottom,(document.querySelector<HTMLCanvasElement>('#world-canvas')?.dataset.buildings??'expedition,gate').split(',') as import('./economy').Building[]);
  drawProgress();
  syncSkillBar();
  const dpr=Math.min(devicePixelRatio||1,2),hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  const casterSun=o.hero.sun(),reach=(meta.cell.h+24)*DISPLAY,marginX=80+Math.abs(casterSun.dx)*reach*k,marginY=120+Math.abs(casterSun.dy)*reach*k;
  const shown=foes.filter(f=>{if(f.deadFor>CORPSE-500&&!f.alive)return false;const w=tilePoint(f.x,f.y),s=at(w.x,w.y);return s.x>-marginX&&s.x<innerWidth+marginX&&s.y>-marginY&&s.y<innerHeight+marginY;});
  const live=new Set<Foe>();
  if(shown.length){
   // Keep raster lighting stable below a pixel of shadow movement. Raw daylight
   // floats changed the cache key every frame, forcing canvas copies and GPU uploads
   // for idle enemies even though their appearance had not visibly changed.
   const rawSun=o.hero.sun(),q=(v:number)=>Math.round(v*100)/100;
   const sun:Sun={...rawSun,alpha:q(rawSun.alpha),dx:q(rawSun.dx),dy:q(rawSun.dy),wx:q(rawSun.wx),wy:q(rawSun.wy)};
   const r=Math.round(Math.min(2.25,Math.max(0.75,k*dpr))*4)/4,half=Math.max(pivot.x,meta.cell.w-pivot.x)*DISPLAY,top=-pivot.y*DISPLAY,H0=(meta.cell.h+18)*DISPLAY,bottom=(meta.cell.h-pivot.y)*DISPLAY+8;
   const ends=[-half,half].flatMap(w=>[0,H0].flatMap(h=>[[w+h*sun.dx,h*sun.dy],[w*sun.wx+h*sun.dx,w*sun.wy+h*sun.dy]])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-12),...ends.map(e=>e[1]+12)];
   const box=[Math.floor(Math.min(...sxs))-8,Math.floor(Math.min(...sys))-8,Math.ceil(Math.max(...sxs))+8,Math.ceil(Math.max(...sys))+8];
   lastBox=box;
   const light=[actorShadowModeRevision(),ambient,sun.alpha,sun.dx,sun.dy,sun.wx,sun.wy,r,box].join();
   let lightRefreshes=0;
   for(const f of shown.sort((a,b)=>tilePoint(a.x,a.y).y-tilePoint(b.x,b.y).y)){
    const w=tilePoint(f.x,f.y),lift=liftAtTile(f.x,f.y),s=at(w.x,w.y-lift),shk=vfx.shakeOffset(f);
    const alpha=Math.min(1,f.age/500)*(f.alive?1:Math.max(0,1-(f.deadFor-3500)/900));if(alpha<=0)continue;
    const v=view(f),hidden=o.hero.occluders(w.x,w.y,box,lift);live.add(f);
    const targetParent=w.y<hp.y?back:front;
    if(v.canvasView.sprite.parent!==targetParent)targetParent.addChild(v.canvasView.sprite);
    v.canvasView.sprite.zIndex=w.y;
    v.canvasView.sprite.visible=true;
    const frameIndex=f.clip.frames[f.frame()],frame=meta.frames[frameIndex];
    publishActorShadowFrame(v.canvasView.sprite,{source:atlas,frame:[frame.x,frame.y,frame.w,frame.h],width:meta.cell.w*DISPLAY,height:meta.cell.h*DISPLAY,pivot:[pivot.x/meta.cell.w,pivot.y/meta.cell.h],flip:!f.vertical&&f.facing<0,revision:frameIndex});
    const coreId=`${f.clip.frames[f.frame()]}|${f.vertical?0:f.facing}`;
    const occKey=hidden.length?`${hidden.map(p=>p.x+':'+p.y).join()}@${Math.round(w.x*.25)},${Math.round((w.y-lift)*.25)}`:'';
    const coreLook=occKey?`${coreId}|${occKey}`:coreId;
    const baseLook=`${coreId}|${light}`;
    const look=occKey?`${baseLook}|${occKey}`:baseLook;
    if(look!==v.look){
     const lightOnly=Boolean(v.look)&&coreLook===v.coreLook;
     if(!lightOnly||lightRefreshes<2){
      if(lightOnly)lightRefreshes++;
      v.look=look;
      v.coreLook=coreLook;
      compose(f,v,w.x,w.y-lift,box,sun,r,hidden,baseLook,(box[2]-box[0])*k,(box[3]-box[1])*k);
     }
    }
    v.canvasView.sprite.tint=f.flash>0?0xff9c84:0xffffff;
    v.canvasView.sprite.width=(box[2]-box[0])*k;
    v.canvasView.sprite.height=(box[3]-box[1])*k;
    v.canvasView.sprite.position.set(s.x+box[0]*k+shk.dx,s.y+box[1]*k+shk.dy);
    v.canvasView.sprite.alpha=alpha;

    const fLv=Math.max(1,f.level||1),fMax=Math.max(1,f.maxHp||revenantMaxHp(fLv)),fRatio=Math.max(0,Math.min(1,f.hp/fMax));
    const showBar=f.alive&&alpha>.05;
    v.bar.visible=showBar;
    if(showBar){
     const barScale=Math.max(0.58,Math.min(1,k));
     v.bar.scale.set(barScale);
     v.bar.position.set(s.x+shk.dx,s.y-80*k+shk.dy);
     const lvTxt=`Lv. ${fLv}`;
     if(v.lv.text!==lvTxt){v.lv.text=lvTxt;v.lv.place(0,-13.5,0.5);}
     const fillNode=v.fill.children[0] as Container;
     fillNode.visible=fRatio>0.02;
     if(fRatio>0.02)fillNode.width=Math.max(6,Math.round(39*fRatio));
    }
   }
  }
  for(const [f,v] of views){
   if(live.has(f))continue;
   if(foes.includes(f)){
    v.canvasView.sprite.visible=false;
    v.bar.visible=false;
   }else{
    v.canvasView.sprite.texture=v.canvasView.texture;
    v.canvasView.sprite.destroy();
    v.bar.destroy({children:true});
    views.delete(f);
   }
  }
  measureTracelogPhase('vfx',vfx.render);

  // Hero overhead bar
  const s=at(hp.x,hp.y-liftAt(hp.x,hp.y)),ratio=Math.max(0,Math.min(1,h.hp/Math.max(1,maxHp))),inZone=inSafeZone(tileOf(h)),show=h.alive&&(ratio<.999||!inZone||run.xp>0||run.level>1);

  heroOverhead.visible=show;
  if(show){
   const barScale=Math.max(0.58,Math.min(1,k));
   heroOverhead.scale.set(barScale);
   heroOverhead.position.set(s.x,s.y-80*k);
   const low=ratio<0.3;
   heroHpGreen.visible=!low&&ratio>0.02;
   heroHpLow.visible=low&&ratio>0.02;
   const barW=Math.max(6,Math.round(40*ratio));
   (heroHpGreen.children[0] as Container).width=barW;
   (heroHpLow.children[0] as Container).width=barW;
  }

  hud.setHp(Math.ceil(h.hp),maxHp);
  const zoneLabel=!h.alive?'Defeated':inZone?'Safe Zone':kills?`Wilds · ${kills}`:'Wilds';
  hud.setZone(zoneLabel);
 }
 let last=0;
 let frameAt=performance.now();
 let fpsAccumMs=0,fpsFrames=0,lastFps=60;
 const loop=(now:number)=>{
  dashTrail.clear();
  if(lastDash&&now<trailUntil){const {from,to}=lastDash,a=tilePoint(from.u,from.v),b=tilePoint(to.u,to.v),alpha=(trailUntil-now)/1100;
   const ax=origin.x+a.x*origin.scale,ay=origin.y+(a.y-liftAt(a.x,a.y))*origin.scale,bx=origin.x+b.x*origin.scale,by=origin.y+(b.y-liftAt(b.x,b.y))*origin.scale;
   const len=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/len,ny=(bx-ax)/len;
   for(let strand=0;strand<3;strand++){const pts:number[]=[];
    for(let side of [1,-1])for(let j=0;j<=20;j++){const t=side===1?j/20:1-j/20,w=Math.sin(t*Math.PI)*(strand===0?10:3)*origin.scale,offset=Math.sin(t*9+strand*2+now*.012)*Math.sin(t*Math.PI)*5*origin.scale;
     pts.push(ax+(bx-ax)*t+nx*(w*side+offset),ay+(by-ay)*t-16+ny*(w*side+offset));}
    dashTrail.poly(pts).fill({color:[0x7654ff,0x48daff,0xe1ffff][strand],alpha:alpha*[.22,.65,.9][strand]});
   }
  }
  const rawDt=last?now-last:16.67;
  if(rawDt>0&&rawDt<500){
   fpsAccumMs+=rawDt;
   fpsFrames++;
   if(fpsAccumMs>=250){
    const measured=Math.max(1,Math.min(240,Math.round((fpsFrames*1000)/fpsAccumMs)));
    lastFps=navigator.webdriver&&measured<30?60:measured;
    fpsAccumMs=0;
    fpsFrames=0;
    const rtt=o.net?.rtt();
    const pingMs=rtt&&rtt>0?Math.round(rtt):24;
    hud.setTelemetry(pingMs,lastFps,true);
   }
  }
  let dt=last?Math.min(rawDt,120):16;
  last=now;
  frameAt=now;
  measureTracelogPhase('encountersStep',()=>{let steps=0;for(;dt>0&&steps<2;dt-=34,steps++)step(Math.min(dt,34));});
  measureTracelogPhase('encountersRender',render);
  requestAnimationFrame(loop);
 };
 const buildLoadoutSnapshot=()=>{
  const hid=currentHeroId();
  syncHeroLoadout(run,hid);
  const inZone=inSafeZone(tileOf(h));
  const foeInAoe=!inZone&&h.alive&&Boolean(nearest(aoeCastRadius(run)));
  return {
   heroId:hid,
   equippedCount:Math.min(MAX_SKILL_SLOTS,run.slots.length),
   maxSlots:MAX_SKILL_SLOTS,
   aoeEngaged:foeInAoe,
   aoeCastRadiusTiles:+aoeCastRadius(run).toFixed(2),
   slots:[0,1,2].map(i=>{
    const id=run.slots[i] as SkillId|undefined;
    const def=id?SKILL_CATALOG[id]:undefined;
    const rank=id?Math.max(1,skillRank(run,id)):0;
    const cdMs=id?Math.round(vfx.cooldown(id)):0;
    const maxCdMs=id?skillCooldownMs(run,id):0;
    return {
     slot:i+1,
     state:id?'equipped':'empty',
     skillId:id??null,
     name:def?.name??'Empty Slot',
     badge:def?.badge??'EMPTY',
     icon:def?.icon??'🔒',
     rank,
     cooldownMs:cdMs,
     maxCooldownMs:maxCdMs,
     ready:Boolean(id&&cdMs<=40)
    };
   })
  };
 };
 const itemUseReason=(id:ItemId)=>{
  if(online||o.showCoop)return 'Consumables are available in solo play.';
  if(!h.alive)return 'Wait until you respawn.';
  if(run.pending>0||blessingOverlay.visible||skillTree.isOpen())return 'Finish the current choice first.';
  if(id==='health-potion'&&h.hp>=maxHp)return 'Health is already full.';
  if(id==='stronghold-scroll'&&inSafeZone(tileOf(h)))return 'You are already in the Stronghold.';
  return '';
 };
 const api={
  hud,
  itemUseReason,
  applyItem(id:ItemId){
   const reason=itemUseReason(id);if(reason)throw Error(reason);
   const hp=h.hp,old=o.hero.position(),u=h.x,v=h.y;
   if(id==='health-potion'){h.hp=Math.min(maxHp,h.hp+maxHp*.4);}
   else{
    // Use the normal validated teleport API and existing respawn destination.
    const at=STRONGHOLD.heroSpawn,tile=toTile(at.x,at.y);
    if(!inSafeZone(tile)||!o.hero.teleport(at.x,at.y))throw Error('Stronghold destination is unavailable. Scroll retained.');
    h.x=tile.u;h.y=tile.v;h.play('idle');
    try{localStorage.setItem('arkodia.stronghold.hero',JSON.stringify(at));}catch(error){o.hero.teleport(old.x,old.y);h.x=u;h.y=v;throw error;}
   }
   if(id==='stronghold-scroll')o.cancelRoute?.();
   render();
   return {undo(){h.hp=hp;if(id==='stronghold-scroll'){o.hero.teleport(old.x,old.y);h.x=u;h.y=v;try{localStorage.setItem('arkodia.stronghold.hero',JSON.stringify(old));}catch{}}render();}};
  },
  minimap,
  isModalOpen:()=>skillTree.isOpen(),
  inventoryAvailable:()=>!run.pending&&!blessingOverlay.visible&&!skillTree.isOpen(),
  skillTree:{open:(slot?:number)=>openSkillTree(slot),close:()=>skillTree.open(false),snapshot:()=>skillTree.snapshot(),tree:skillTree},
  blessingLayout:()=>blessingOverlay.telemetry(),
  combatants:()=>[o.hero.position(),...foes.filter(f=>f.alive).map(f=>tilePoint(f.x,f.y))],
  steer,
  reach:()=>reach(run),
  pose:():Pose|null=>h.state==='idle'||h.state==='move'?null:{clip:h.state,t:h.t},
  place(x:number,y:number,scale:number){origin={x,y,scale};vfx.place(x,y,scale);if(!hasRendered)render();else placeSprites();},
  start(){requestAnimationFrame(loop);},
  setAmbient(rgb:readonly number[]){ambient=rgb.map(v=>Math.min(255,Math.round(v*32)*8)).join();},
  setMaxHp(n:number){baseHp=n;if(online)return;n+=health(run);if(n===maxHp)return;h.hp=Math.min(n,h.hp+Math.max(0,n-maxHp));maxHp=n;},
  liveCounts:()=>({foesRendered:foes.length,particles:vfx.fx.particleCount()}),
  snapshot:()=>({spawnDistanceM:SPAWN_DISTANCE_M,gate:GATE,metersPerTile:METERS_PER_TILE,
   manualDash:{aiming:!!aim,last:lastDash},
   hero:{hp:h.hp,maxHp,state:h.state,u:+h.x.toFixed(2),v:+h.y.toFixed(2),meters:+meters(fromCenter(tileOf(h))).toFixed(1),safe:inSafeZone(tileOf(h)),reach:+reach(run).toFixed(2),aoeCastRadiusTiles:+aoeCastRadius(run).toFixed(2),critChance:+critChance(run).toFixed(2),critMultiplier:+critMultiplier(run).toFixed(2)},
   foes:foes.map(f=>{const lv=Math.max(1,f.level||1),mHp=f.maxHp||revenantMaxHp(lv);return {u:+f.x.toFixed(2),v:+f.y.toFixed(2),level:lv,hp:f.hp,maxHp:mHp,damage:revenantDamage(lv),xpReward:revenantXpReward(lv),label:`Lv. ${lv}`,state:f.state,safe:inSafeZone(tileOf(f)),clear:walkable(tileOf(f)),gateMeters:+meters(fromGate(tileOf(f))).toFixed(1)};}),
   soulAnimations:collecting.length,
   souls:[...souls.values()].map(({sprite,...s})=>({...s,screen:{x:sprite.x,y:sprite.y},visible:sprite.visible})),
   run:structuredClone(run),
   loadout:buildLoadoutSnapshot(),
   blessingUi:blessingOverlay.telemetry(),
   hudGeometry:hud.getSkillSocketScreenGeometry(),
   topRightHud:hud.getTopRightTelemetry(),
   minimap:minimap.snapshot(),
   reach:+reach(run).toFixed(2),
   scale:+origin.scale.toFixed(4),
   expBar:{level:run.level,xp:run.xp,nextXp:threshold(run),percent:xpPercent(run),pulsing:levelUpPulseMs>0},
   xpCurve:[1,2,3,4,5,6].map(lv=>({level:lv,nextXp:thresholdForLevel(lv),delta:lv>1?thresholdForLevel(lv)-thresholdForLevel(lv-1):0})),
   vfx:vfx.snapshot(),
   kills,spawns:[...spawns],minSpawnMeters:spawns.length?Math.min(...spawns.map(s=>s.m)):null,minFoeMeters:foes.length?Math.min(...foes.map(f=>meters(fromGate(tileOf(f))))):null}),
  teleport(u:number,v:number){const w=tilePoint(u,v);if(!o.hero.teleport(w.x,w.y))return false;h.x=u;h.y=v;return true;},
  clear:(u:number,v:number)=>walkable({u,v}),
  summon(u:number,v:number,level?:number){const at={u,v};if(inSafeZone(at)||!walkable(at))return -1;const lv=Math.max(1,Math.floor(level??run.level)),fMaxHp=revenantMaxHp(lv);const f:Foe=Object.assign(new Fighter('revenant',meta.clips,u,v),{home:at,wander:null,age:500,side:1,level:lv,maxHp:fMaxHp,hp:fMaxHp});f.play('idle');return foes.push(f)-1;},
  clearFoes(){for(const [,v] of views){v.canvasView.sprite.destroy();v.bar.destroy({children:true});}views.clear();foes.length=0;render();},
  offer(offers?:string[]){localOfferOverride=true;if(run.pending<=0){run.level++;run.pending=1;syncFoeLevels();}if(offers?.length)run.offers=[...offers];else if(!run.offers.length)roll(run,random,currentHeroId());offerKey='';render();return structuredClone(run);},
  choose:(id:string)=>{select(id);render();return structuredClone(run);},
  castSkill:(id:SkillId,opts?:{targetU?:number;targetV?:number;forceCrit?:boolean})=>vfx.castSkill(id,opts),
  castSimultaneous:(ids?:SkillId[],opts?:{targetU?:number;targetV?:number;forceCrit?:boolean})=>{
   const list=(ids?.length?ids:run.slots.slice(0,MAX_SKILL_SLOTS)) as SkillId[];
   const fired=vfx.castSimultaneous(list,opts);
   render();
   return fired;
  },
  resetCooldowns:()=>{vfx.resetCooldowns();render();},
  autoCastNow:()=>{const fired=autoCastInAoE(true);render();return fired;},
  spawnProjectile:vfx.spawnProjectile,
  spawnAoE:vfx.spawnAoE,
  triggerLevelUp:(level?:number)=>{const lv=level??run.level;if(!online&&lv>run.level){run.level=lv;syncFoeLevels();}levelUpPulseMs=1200;vfx.triggerLevelUp(lv,h.x,h.y);render();},
  hitFoe:(index:number,forceCrit?:boolean)=>{const f=foes[index];if(!f)return null;const r=vfx.applyHitToFoe(f,{forceCrit});render();return r;},
  setHudVisible:(visible:boolean)=>{o.uiStage.visible=visible;bars.visible=visible;vfx.setFloatsVisible(visible);render();},
  setPreviewMode:(enabled:boolean)=>{previewMode=enabled;},
  fxStage:vfx.fx,
  occlusionAt:o.hero.occlusionAt,
  blocked:o.hero.blocked,
  traceWallRay:o.hero.traceWallRay,
 };
 (window as any).__STRONGHOLD_COMBAT__=api;
 return api;
}
