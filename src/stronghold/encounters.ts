import {Container,Graphics,Rectangle} from 'pixi.js';
import {createCanvasSprite} from '../app/loader';
import type {FrameSet} from '../typography/frames';
import {Hud,type HudCallbacks,type HudSkillState} from '../typography/hud';
import {MsdfText} from '../typography/text';
import {fresh,reward,roll,choose,cards,reach,aoeCastRadius,health,threshold,thresholdForLevel,xpPercent,critChance,critMultiplier,syncHeroLoadout,isActiveSkill,skillRank,skillCooldownMs,revenantMaxHp,revenantDamage,revenantXpReward,MAX_SKILL_SLOTS,type Progression} from './progression';
import {unproject} from '../isometric';
import {Fighter,STATS,inReach,swingTargets,turn} from '../characters/combat';
import type {CharacterMeta} from '../characters/sprites';
import {COURT,tilePoint} from './terrain';
import {GATE,SPAWN_DISTANCE_M,METERS_PER_TILE,fromGate,fromCenter,inSafeZone,spawnPoint,meters,type Tile} from './safe-zone';
import {DISPLAY,cutOut,drawFigureShadow,prewarmAtlasAlpha,type Placed,type Pose} from './hero';
import type {Sun} from './daylight';
import type {Walk} from './controls';
import {loadImage} from '../app/loader';
import type {Net} from './net/client';
import {characters,DEFAULT_HERO,heroInfo,type HeroId} from './heroes';
import {createCombatVfx,facingScreenAngle,SKILL_CATALOG,type SkillId} from './combat-vfx';
import {measureTracelogPhase} from './tracelog';

const SCALE=DISPLAY/1.1;
const HERO_REACH=STATS.hero.reach*SCALE,ENEMY_REACH=STATS.revenant.reach*SCALE,SIDE=.35*SCALE,SPACING=.72*SCALE;
const ENEMY_SPEED=105/Math.hypot(64,32)*.55,ENEMY_STRIDE=76*DISPLAY/1.1;
const VEER=[.4,.8,1.2,1.6,2,2.4],AGGRO=13,ENGAGE=2,MAX_ENEMIES=8,PACK=3,SPAWN_EVERY=2000,REGEN=8,HERO_RESPAWN=3500,CORPSE=4400;
const SIMULTANEOUS_SYNC_WINDOW_MS=340;
type Foe=Fighter&{home:Tile;wander:Tile|null;age:number;side:number;level:number;maxHp:number};
type Hero={
 canvas:HTMLCanvasElement;
 position():{x:number;y:number};face(sx:number,sy:number):void;respawn():void;teleport(x:number,y:number):boolean;
 blocked(x:number,y:number):boolean;occluders(x:number,y:number,box:number[]):Placed[];
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
 worldStage:Container;
 uiStage:Container;
 frames:FrameSet;
 hudCallbacks?:HudCallbacks;
 showCoop?:boolean;
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
 let run=fresh(currentHeroId()),baseHp=100,levelUpPulseMs=0,comboHighlightMs=0,regenAccum=0,lastCoopAutoCasts=0;
 const local:Foe[]=[],spawns:{u:number;v:number;m:number}[]=[];let foes=local,online=false,heroPlays=-1;

 // Ground AoE ring + Revenant back/front layers + Overhead bars layer inside worldStage
 const aoe=document.createElement('canvas'),aoeCtx=aoe.getContext('2d')!;
 const aoeView=createCanvasSprite(aoe);
 aoeView.sprite.zIndex=20;
 aoeView.sprite.visible=false;
 const back=new Container();back.zIndex=24;back.sortableChildren=true;
 const front=new Container();front.zIndex=34;front.sortableChildren=true;
 const bars=new Container();bars.zIndex=40;
 o.worldStage.addChild(aoeView.sprite,back,front,bars);

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
   time:'06:27',
   zone:'Safe Zone',
   xp:0,
   xpMax:20,
   coopLabel:o.showCoop?'Co-op':undefined,
   skills:[
    {name:'Flame Fan',level:1,art:'skill-flame-fan',stateLabel:'Auto'},
    {name:'Empty Slot',level:0,art:'skill-empty',stateLabel:'Locked',locked:true},
    {name:'Empty Slot',level:0,art:'skill-empty',stateLabel:'Locked',locked:true},
   ],
  },
  {},
  {
   ...o.hudCallbacks,
   onSkillClick:(idx)=>{
    const sid=run.slots[idx] as SkillId|undefined;
    if(sid&&!run.pending&&h.alive)vfx.castSkill(sid);
   },
  },
 );
 hud.zIndex=10;
 o.uiStage.addChild(hud);

 // Level-Up Blessing Modal in Pixi
 const blessingModal=new Container();
 blessingModal.zIndex=55;
 blessingModal.visible=false;
 o.uiStage.addChild(blessingModal);
 const blessingBackdrop=blessingModal.addChild(new Graphics());
 blessingBackdrop.eventMode='static';
 const blessingStage=blessingModal.addChild(new Container());

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

 function onKill(f?:Foe){
  if(online)return;
  kills++;
  const prevLevel=run.level;
  reward(run,random,currentHeroId(),f?.level??run.level);
  if(run.level>prevLevel){
   syncFoeLevels();
   levelUpPulseMs=1200;
   vfx.triggerLevelUp(run.level,h.x,h.y);
  }
  if(run.pending)h.immune=200;
  const leech=(run.skills.leech??0)*2;
  if(leech>0){
   const before=h.hp;h.hp=Math.min(maxHp,h.hp+leech);
   if(h.hp>before)vfx.recordHeroHeal(h.hp-before,h.x,h.y,'SOUL FEAST');
  }
 }

 const vfx=createCombatVfx({
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
    const stateLabel=ready?(foeInAoe?'Firing':'Auto'):`${(cd/1000).toFixed(1)}s`;
    skills.push({
     name:def.name,
     level:rank,
     art:SKILL_ART[sid]??'skill-flame-fan',
     stateLabel,
     locked:false,
     cooldownRatio:ready?0:ratio,
    });
   }else{
    skills.push({
     name:'Empty Slot',
     level:0,
     art:'skill-empty',
     stateLabel:'Locked',
     locked:true,
     cooldownRatio:0,
    });
   }
  }
  const sig=skills.map(s=>`${s.name}:${s.level}:${s.art}:${s.stateLabel}:${(s.cooldownRatio??0).toFixed(2)}`).join('|');
  if(sig!==lastSkillSig){
   lastSkillSig=sig;
   hud.setSkills(skills);
  }
 }

 window.addEventListener('keydown',e=>{
  if(!h.alive||e.repeat)return;
  const tag=(e.target as HTMLElement|null)?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
  const idx=['1','2','3'].indexOf(e.key);
  if(idx<0)return;
  if(run.pending&&run.offers[idx]){
   select(run.offers[idx]);
   return;
  }
  const sid=run.slots[idx] as SkillId|undefined;
  if(sid&&!run.pending)vfx.castSkill(sid);
 });

 let offerKey='';
 let localOfferOverride=false;
 function select(id:string){
  if(online&&!localOfferOverride){o.net?.chooseCard(id,run.level);return;}
  const hid=currentHeroId();
  if(!choose(run,id,random,hid))return;
  if(isActiveSkill(id)){
   vfx.resetCooldowns();
  }
  const beforeMax=maxHp,beforeHp=h.hp;
  maxHp=baseHp+health(run);
  h.hp=Math.min(maxHp,h.hp+Math.max(0,maxHp-beforeMax)+(id==='heal'?maxHp*.35:0));
  if(h.hp>beforeHp)vfx.recordHeroHeal(h.hp-beforeHp,h.x,h.y,cards[id]?.name.toUpperCase());
 }

 function layoutBlessingModal(){
  if(!blessingModal.visible)return;
  const w=innerWidth,hScreen=innerHeight,portrait=w<760;
  blessingBackdrop.clear().rect(0,0,w,hScreen).fill({color:0x080604,alpha:0.68});
  const refW=portrait?420:960,refH=portrait?740:470;
  const s=Math.min(1.08,Math.min((w-20)/refW,(hScreen-20)/refH));
  blessingStage.scale.set(s);
  blessingStage.position.set(Math.round((w-refW*s)/2),Math.round((hScreen-refH*s)/2));
 }

 function rebuildBlessingModal(){
  blessingStage.removeChildren().forEach(c=>c.destroy({children:true}));
  if(!run.pending)return;
  const w=innerWidth,portrait=w<760;
  const refW=portrait?420:960,refH=portrait?740:470;
  blessingStage.addChild(o.frames.frame('panel-bronze',refW,refH));

  const header=blessingStage.addChild(new MsdfText('label-wide','ASCENDANT BLESSING',{size:portrait?13:15,letterSpacing:3.2}));
  header.place(refW/2,38,0.5);
  const title=blessingStage.addChild(new MsdfText('display-title',`Level ${run.level} — Choose a Blessing`,{size:portrait?22:34}));
  title.place(refW/2,74,0.5);

  const slotHint=run.slots.length<MAX_SKILL_SLOTS
   ?`Slots ${run.slots.length}/${MAX_SKILL_SLOTS} equipped · New active skills unlock Slot ${run.slots.length+1}`
   :`All ${MAX_SKILL_SLOTS}/${MAX_SKILL_SLOTS} slots equipped · Active blessings upgrade Rank`;
  const sub=blessingStage.addChild(new MsdfText('panel-muted',`${run.pending} choice remaining · ${slotHint}`,{size:portrait?11.5:14}));
  sub.place(refW/2,102,0.5);

  run.offers.forEach((id,idx)=>{
   const card=cards[id];if(!card)return;
   const active=isActiveSkill(id);
   const cw=portrait?372:284,ch=portrait?182:316;
   const cx=portrait?24:32+idx*300;
   const cy=portrait?122+idx*194:124;

   const item=blessingStage.addChild(new Container());
   item.position.set(cx,cy);
   item.eventMode='static';
   item.cursor='pointer';
   item.hitArea=new Rectangle(0,0,cw,ch);
   item.on('pointertap',()=>select(id));

   item.addChild(o.frames.frame(active?'card-blessing-active':'card-blessing',cw,ch));

   let kindTag='';
   let rankTitle='';
   if(active){
    const slotIdx=run.slots.indexOf(id);
    const r=skillRank(run,id);
    if(slotIdx>=0){
     kindTag=`ACTIVE SKILL · SLOT ${slotIdx+1} UPGRADE`;
     rankTitle=`${card.name} · Lv. ${r} → Lv. ${r+1}`;
    }else{
     const nextSlot=Math.min(MAX_SKILL_SLOTS,run.slots.length+1);
     kindTag=`NEW AUTO-CAST SKILL · SLOT ${nextSlot}`;
     rankTitle=`${card.name} · Unlock Lv. 1`;
    }
   }else{
    const r=run.skills[id]??0;
    kindTag=id==='star'?'STAR UPGRADE':r?'PASSIVE UPGRADE':'PASSIVE BLESSING';
    rankTitle=`${card.name}${r?' · Rank '+(r+1):''}`;
   }

   const artName=SKILL_ART[id]??'skill-blessing';
   if(portrait){
    const icon=item.addChild(o.frames.frame(artName,78,78));
    icon.position.set(18,22);
    const ring=item.addChild(o.frames.frame('skill-ring',82,82));
    ring.position.set(16,20);
    const tagTxt=item.addChild(new MsdfText('panel-label',kindTag,{size:11,letterSpacing:1.3}));
    tagTxt.place(110,36);
    const nameTxt=item.addChild(new MsdfText('blessing-title',rankTitle,{size:18}));
    nameTxt.place(110,64);
    const descTxt=item.addChild(new MsdfText('blessing-desc',card.description,{size:14,lineHeight:18,align:'left',wrapWidth:cw-126}));
    descTxt.place(110,92);
   }else{
    const tagTxt=item.addChild(new MsdfText('panel-label',kindTag,{size:11.5,letterSpacing:1.4}));
    tagTxt.place(cw/2,34,0.5);
    const icon=item.addChild(o.frames.frame(artName,88,88));
    icon.position.set((cw-88)/2,48);
    const ring=item.addChild(o.frames.frame('skill-ring',92,92));
    ring.position.set((cw-92)/2,46);
    const nameTxt=item.addChild(new MsdfText('blessing-title',rankTitle,{size:18}));
    nameTxt.place(cw/2,164,0.5);
    const descTxt=item.addChild(new MsdfText('blessing-desc',card.description,{size:14.5,lineHeight:19,align:'center',wrapWidth:cw-36}));
    descTxt.place(cw/2,194,0.5);
    const keyHint=item.addChild(new MsdfText('panel-muted',`Press [${idx+1}] or Click`,{size:13}));
    keyHint.place(cw/2,ch-22,0.5);
   }
  });
  layoutBlessingModal();
 }

 let lastHudHero='';
 function drawProgress(){
  const hid=currentHeroId();
  syncHeroLoadout(run,hid);
  if(hid!==lastHudHero){
   lastHudHero=hid;
   const info=heroInfo(hid);
   hud.setHero(info.name,hid==='rift-runner'?'portrait-rift-runner':'portrait-ember-warden');
  }
  const nextXp=threshold(run),expRatio=Math.max(0,Math.min(1,run.xp/Math.max(1,nextXp)));
  const shownRatio=levelUpPulseMs>600?1:expRatio;
  hud.setLevel(run.level);
  hud.setXp(shownRatio*nextXp,nextXp);
  hud.setGold(`${run.gold} Gold`);

  const expBar=heroExpFill.children[0] as Container;
  expBar.visible=shownRatio>0.01;
  if(shownRatio>0.01)expBar.width=Math.max(6,Math.round(42*shownRatio));

  blessingModal.visible=Boolean(run.pending&&run.offers.length);
  if(!run.pending||!run.offers.length)return;
  const key=JSON.stringify([online,run.level,run.pending,run.offers,run.skills,run.slots,innerWidth<760]);
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
  const veer=(a:number)=>[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a),Math.sign(a)];
  for(const [mx,my,side=0] of [[dx,dy],[dx,0],[0,dy],...[1,-1].flatMap(t=>VEER.map(a=>veer(a*t*f.side)))]){
   const next={u:f.x+mx,v:f.y+my};if(Math.hypot(mx,my)<v*.4||inSafeZone(next)||!stuck&&!walkable(next))continue;if(side)f.side=side;
   f.x=next.u;f.y=next.v;const m=screen(mx,my);turn(f,m.x,m.y);f.stride+=Math.hypot(m.x,m.y)/ENEMY_STRIDE;f.play('move');return true;}
  const s=screen(du,dv);turn(f,s.x,s.y);f.play('idle');return false;
 }

 function steer(input:Walk):Walk{
  if(run.pending)return {x:0,y:0};
  if(online||input.x||input.y||!h.alive||h.state!=='idle')return input;
  const r=reach(run),f=nearest(Math.max(ENGAGE,HERO_REACH*r+.8));if(!f||Math.hypot(f.x-h.x,f.y-h.y)<=HERO_REACH*r*.8)return input;
  const s=screen(f.x-h.x,f.y-h.y),l=Math.hypot(s.x,s.y);return {x:s.x/l,y:s.y/l};
 }

 function autoCastInAoE(forceAll=false):SkillId[]{
  if(!h.alive||run.pending||inSafeZone(tileOf(h)))return [];
  syncHeroLoadout(run,currentHeroId());
  const aoeTarget=nearest(aoeCastRadius(run));
  if(!aoeTarget)return [];
  const equipped=run.slots.slice(0,MAX_SKILL_SLOTS).filter((id):id is SkillId=>Boolean(SKILL_CATALOG[id as SkillId]));
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
   if(fired.length>=2)comboHighlightMs=900;
  }
  return fired;
 }

 function heroStep(dt:number,steering:boolean){
  if(!h.alive){h.deadFor+=dt;if(h.deadFor>HERO_RESPAWN){o.hero.respawn();const p=o.hero.position(),t=toTile(p.x,p.y);Object.assign(h,{x:t.u,y:t.v,hp:maxHp});h.play('idle');}return;}
  h.recover();
  if(run.pending){h.immune=200;return;}
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
   if(run.level>prevLevel){levelUpPulseMs=1200;vfx.triggerLevelUp(run.level,h.x,h.y);}
   const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;h.tick(dt);
   if((run.autoCasts??0)>lastCoopAutoCasts){
    lastCoopAutoCasts=run.autoCasts??0;
    const castIds=(run.lastCast?.length?run.lastCast:run.slots).filter((id):id is SkillId=>Boolean(SKILL_CATALOG[id as SkillId]));
    if(castIds.length){
     vfx.castSimultaneous(castIds);
     if(castIds.length>=2)comboHighlightMs=900;
    }
   }
  }
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
 }
 function step(dt:number){
  levelUpPulseMs=Math.max(0,levelUpPulseMs-dt);
  comboHighlightMs=Math.max(0,comboHighlightMs-dt);
  vfx.step(dt);
  const net=!!o.net?.active();
  if(net!==online){run=fresh(currentHeroId());online=net;mirrors.clear();local.length=0;foes=local;spawnTimer=0;heroPlays=-1;lastCoopAutoCasts=0;if(!net){h.play('idle');h.hp=maxHp;}}
  if(online){netStep(dt);return;}
  const input=o.direction(),steering=!!(input.x||input.y);
  for(const f of [h,...foes])f.tick(dt);
  if(h.alive&&h.state==='idle'){const p=o.hero.position(),t=toTile(p.x,p.y);h.x=t.u;h.y=t.v;}
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
  if(f.flash>0){cc.globalCompositeOperation='source-atop';cc.fillStyle='rgba(255,140,110,.55)';cc.fillRect(0,0,cell.width,cell.height);}
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
  hp:string;
 };
 const views=new Map<Foe,View>();
 function view(f:Foe){
  let v=views.get(f);if(v)return v;
  const el=document.createElement('canvas');
  const canvasView=createCanvasSprite(el);
  const bar=bars.addChild(new Container());
  bar.visible=false;
  const barTrack=bar.addChild(o.frames.frame('overhead-bar',44,8));
  barTrack.position.set(-22,-8);
  const fill=bar.addChild(new Container());
  fill.position.set(-19.5,-6);
  fill.addChild(o.frames.frame('hp-fill',39,4));
  const lv=bar.addChild(new MsdfText('tag-foe','Lv. 1'));
  lv.place(0,-13.5,0.5);
  v={el,g:el.getContext('2d')!,canvasView,bar,lv,fill,look:'',hp:''};
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
  const hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  for(const [f,v] of views){
   if(!v.canvasView.sprite.visible)continue;
   const w=tilePoint(f.x,f.y),s=at(w.x,w.y),shk=vfx.shakeOffset(f);
   v.canvasView.sprite.width=(lastBox[2]-lastBox[0])*k;
   v.canvasView.sprite.height=(lastBox[3]-lastBox[1])*k;
   v.canvasView.sprite.position.set(s.x+lastBox[0]*k+shk.dx,s.y+lastBox[1]*k+shk.dy);
   if(v.bar.visible){
    v.bar.scale.set(Math.max(0.58,Math.min(1,k)));
    v.bar.position.set(s.x+shk.dx,s.y-80*k+shk.dy);
   }
  }
  const s=at(hp.x,hp.y),rMult=reach(run),aoeRx=Math.round(HERO_REACH*rMult*64*Math.SQRT2),aoeRy=Math.round(aoeRx*.52),aoePadX=aoeRx+6,aoePadY=aoeRy+6;
  if(aoeView.sprite.visible){
   aoeView.sprite.position.set(s.x-aoePadX*k,s.y-2*k-aoePadY*k);
   aoeView.sprite.width=aoePadX*2*k;
   aoeView.sprite.height=aoePadY*2*k;
  }
  if(heroOverhead.visible){
   heroOverhead.scale.set(Math.max(0.58,Math.min(1,k)));
   heroOverhead.position.set(s.x,s.y-80*k);
  }
 }
 function render(){
  hasRendered=true;
  const sw=innerWidth,sh=innerHeight,sizeKey=`${sw}x${sh}`;
  if(sizeKey!==lastHudSize){
   lastHudSize=sizeKey;
   hud.layout(sw,sh);
   layoutBlessingModal();
  }
  drawProgress();
  syncSkillBar();
  const dpr=Math.min(devicePixelRatio||1,2),hp=o.hero.position(),k=origin.scale,at=(x:number,y:number)=>({x:origin.x+x*k,y:origin.y+y*k});
  const shown=foes.filter(f=>{if(f.deadFor>CORPSE-500&&!f.alive)return false;const w=tilePoint(f.x,f.y),s=at(w.x,w.y);return s.x>-80&&s.x<innerWidth+80&&s.y>-40&&s.y<innerHeight+120;});
  const live=new Set<Foe>();
  if(shown.length){
   const sun=o.hero.sun(),r=Math.round(Math.min(2.25,Math.max(0.75,k*dpr))*4)/4,half=Math.max(pivot.x,meta.cell.w-pivot.x)*DISPLAY,top=-pivot.y*DISPLAY,H0=(meta.cell.h+18)*DISPLAY,bottom=(meta.cell.h-pivot.y)*DISPLAY+8;
   const ends=[-half,half].flatMap(w=>[0,H0].flatMap(h=>[[w+h*sun.dx,h*sun.dy],[w*sun.wx+h*sun.dx,w*sun.wy+h*sun.dy]])),sxs=[-half,half,...ends.map(e=>e[0])],sys=[top,bottom,...ends.map(e=>e[1]-12),...ends.map(e=>e[1]+12)];
   const box=[Math.floor(Math.min(...sxs))-8,Math.floor(Math.min(...sys))-8,Math.ceil(Math.max(...sxs))+8,Math.ceil(Math.max(...sys))+8];
   lastBox=box;
   const light=[ambient,sun.alpha,sun.dx,sun.dy,sun.wx,sun.wy,r,box].join();
   for(const f of shown.sort((a,b)=>tilePoint(a.x,a.y).y-tilePoint(b.x,b.y).y)){
    const w=tilePoint(f.x,f.y),s=at(w.x,w.y),shk=vfx.shakeOffset(f);
    const alpha=Math.min(1,f.age/500)*(f.alive?1:Math.max(0,1-(f.deadFor-3500)/900));if(alpha<=0)continue;
    const v=view(f),hidden=o.hero.occluders(w.x,w.y,box);live.add(f);
    const targetParent=w.y<hp.y?back:front;
    if(v.canvasView.sprite.parent!==targetParent)targetParent.addChild(v.canvasView.sprite);
    v.canvasView.sprite.zIndex=w.y;
    v.canvasView.sprite.visible=true;
    const baseLook=[f.clip.frames[f.frame()],f.vertical?0:f.facing,f.flash>0,light].join('|');
    const look=hidden.length?`${baseLook}|${hidden.map(p=>p.x+':'+p.y).join()}@${Math.round(w.x*.5)},${Math.round(w.y*.5)}`:baseLook;
    if(look!==v.look){
     v.look=look;
     compose(f,v,w.x,w.y,box,sun,r,hidden,baseLook,(box[2]-box[0])*k,(box[3]-box[1])*k);
    }
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
    v.canvasView.sprite.destroy();
    v.bar.destroy({children:true});
    views.delete(f);
   }
  }
  vfx.render();

  // Hero overhead bar and ground AoE reach indicator
  const s=at(hp.x,hp.y),ratio=Math.max(0,Math.min(1,h.hp/Math.max(1,maxHp))),inZone=inSafeZone(tileOf(h)),show=h.alive&&(ratio<.999||!inZone||run.xp>0||run.level>1);
  const rMult=reach(run),aoeRx=Math.round(HERO_REACH*rMult*64*Math.SQRT2),aoeRy=Math.round(aoeRx*.52),aoePadX=aoeRx+6,aoePadY=aoeRy+6,showAoe=h.alive;
  aoeView.sprite.visible=showAoe;
  if(showAoe){
   const aoeHidden=o.hero.occluders(hp.x,hp.y,[-aoePadX,-aoePadY-2,aoePadX,aoePadY-2]);
   const aoeOccKey=aoeHidden.length?aoeHidden.map(p=>p.x+':'+p.y+':'+(p.occluder?.dataset.frame??'')).join()+'@'+Math.round(hp.x*.5)+','+Math.round(hp.y*.5):'';
   const aoeKey=`pixel-v3:${rMult.toFixed(2)}:${dpr}:${h.state==='attack'?1:0}:${comboHighlightMs>0?1:0}:${aoeOccKey}`;
   if(aoe.dataset.key!==aoeKey){
    aoe.dataset.key=aoeKey;aoe.dataset.reach=rMult.toFixed(2);aoe.dataset.radiusPx=String(aoeRx);
    const wpx=aoePadX*2,hpx=aoePadY*2,aw=Math.ceil(wpx*dpr),ah=Math.ceil(hpx*dpr);if(aoe.width!==aw||aoe.height!==ah){aoe.width=aw;aoe.height=ah;}
    aoeCtx.setTransform(dpr,0,0,dpr,aoePadX*dpr,aoePadY*dpr);aoeCtx.clearRect(-aoePadX,-aoePadY,wpx,hpx);
    aoeCtx.imageSmoothingEnabled=false;
    const pulse=(h.state==='attack'?.08:0)+(comboHighlightMs>0?.12:0);
    // Isometric dotted grid inside ground AoE reach + crisp dotted outer boundary (no continuous vector stroke)
    const stepX=12,stepY=6;
    for(let gy=-aoeRy+4;gy<=aoeRy-4;gy+=stepY){
     const rowIdx=Math.round(gy/stepY);
     for(let gx=-aoeRx+4;gx<=aoeRx-4;gx+=stepX){
      const colIdx=Math.round(gx/stepX);
      if(((rowIdx+colIdx)&1)!==0)continue;
      const dist=Math.hypot(gx,gy/.52);
      if(dist>aoeRx-5||dist<14)continue;
      aoeCtx.fillStyle=comboHighlightMs>0
       ?'rgba(108,224,255,0.45)'
       :`rgba(255,186,96,${(.34+pulse).toFixed(2)})`;
      aoeCtx.fillRect(gx-1,gy-1,2,2);
     }
    }
    const beadCount=Math.max(44,Math.round(aoeRx*.85));
    for(let i=0;i<beadCount;i++){
     const ang=(i/beadCount)*Math.PI*2;
     const rx=Math.round(Math.cos(ang)*(aoeRx-2)),ry=Math.round(Math.sin(ang)*(aoeRy-1));
     const major=i%2===0,ps=major?3:2;
     aoeCtx.fillStyle=comboHighlightMs>0
      ?(major?'rgba(168,244,255,0.92)':'rgba(102,227,255,0.72)')
      :(major?`rgba(255,232,162,${(.82+pulse).toFixed(2)})`:`rgba(255,168,78,${(.62+pulse).toFixed(2)})`);
     aoeCtx.fillRect(rx-1,ry-1,ps,ps);
     if(major){aoeCtx.fillStyle='rgba(255,252,232,0.92)';aoeCtx.fillRect(rx,ry,1,1);}
    }
    if(aoeHidden.length)cutOut(aoeCtx,aoeHidden,hp.x,hp.y-2);
    aoeView.sync(wpx*k,hpx*k);
   }
   aoeView.sprite.position.set(s.x-aoePadX*k,s.y-2*k-aoePadY*k);
   aoeView.sprite.width=aoePadX*2*k;
   aoeView.sprite.height=aoePadY*2*k;
  }

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
 const loop=(now:number)=>{let dt=last?Math.min(now-last,120):16;last=now;frameAt=now;measureTracelogPhase('encountersStep',()=>{for(;dt>0;dt-=34)step(Math.min(dt,34));});measureTracelogPhase('encountersRender',render);requestAnimationFrame(loop);};
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
 const api={
  hud,
  isModalOpen:()=>blessingModal.visible,
  combatants:()=>[o.hero.position(),...foes.filter(f=>f.alive).map(f=>tilePoint(f.x,f.y))],
  steer,
  reach:()=>reach(run),
  pose:():Pose|null=>h.state==='idle'||h.state==='move'?null:{clip:h.state,t:h.t},
  place(x:number,y:number,scale:number){origin={x,y,scale};vfx.place(x,y,scale);if(!hasRendered)render();else placeSprites();},
  start(){requestAnimationFrame(loop);},
  setAmbient(rgb:readonly number[]){ambient=rgb.map(v=>Math.min(255,Math.round(v*32)*8)).join();},
  setMaxHp(n:number){baseHp=n;if(online)return;n+=health(run);if(n===maxHp)return;h.hp=Math.min(n,h.hp+Math.max(0,n-maxHp));maxHp=n;},
  snapshot:()=>({spawnDistanceM:SPAWN_DISTANCE_M,gate:GATE,metersPerTile:METERS_PER_TILE,
   hero:{hp:h.hp,maxHp,state:h.state,u:+h.x.toFixed(2),v:+h.y.toFixed(2),meters:+meters(fromCenter(tileOf(h))).toFixed(1),safe:inSafeZone(tileOf(h)),reach:+reach(run).toFixed(2),aoeRadiusPx:Math.round(HERO_REACH*reach(run)*64*Math.SQRT2),aoeCastRadiusTiles:+aoeCastRadius(run).toFixed(2),critChance:+critChance(run).toFixed(2),critMultiplier:+critMultiplier(run).toFixed(2)},
   foes:foes.map(f=>{const lv=Math.max(1,f.level||1),mHp=f.maxHp||revenantMaxHp(lv);return {u:+f.x.toFixed(2),v:+f.y.toFixed(2),level:lv,hp:f.hp,maxHp:mHp,damage:revenantDamage(lv),xpReward:revenantXpReward(lv),label:`Lv. ${lv}`,state:f.state,safe:inSafeZone(tileOf(f)),clear:walkable(tileOf(f)),gateMeters:+meters(fromGate(tileOf(f))).toFixed(1)};}),
   run:structuredClone(run),
   loadout:buildLoadoutSnapshot(),
   reach:+reach(run).toFixed(2),
   scale:+origin.scale.toFixed(4),
   expBar:{level:run.level,xp:run.xp,nextXp:threshold(run),percent:xpPercent(run),pulsing:levelUpPulseMs>0},
   xpCurve:[1,2,3,4,5,6].map(lv=>({level:lv,nextXp:thresholdForLevel(lv),delta:lv>1?thresholdForLevel(lv)-thresholdForLevel(lv-1):0})),
   vfx:vfx.snapshot(),
   kills,spawns:[...spawns],minSpawnMeters:spawns.length?Math.min(...spawns.map(s=>s.m)):null,minFoeMeters:foes.length?Math.min(...foes.map(f=>meters(fromGate(tileOf(f))))):null}),
  teleport(u:number,v:number){const w=tilePoint(u,v);if(!o.hero.teleport(w.x,w.y))return false;h.x=u;h.y=v;return true;},
  clear:(u:number,v:number)=>walkable({u,v}),
  summon(u:number,v:number,level?:number){const at={u,v};if(inSafeZone(at)||!walkable(at))return -1;const lv=Math.max(1,Math.floor(level??run.level)),fMaxHp=revenantMaxHp(lv);const f:Foe=Object.assign(new Fighter('revenant',meta.clips,u,v),{home:at,wander:null,age:500,side:1,level:lv,maxHp:fMaxHp,hp:fMaxHp});f.play('idle');return foes.push(f)-1;},
  offer(offers?:string[]){localOfferOverride=true;if(run.pending<=0){run.level++;run.pending=1;syncFoeLevels();}if(offers?.length)run.offers=[...offers];else if(!run.offers.length)roll(run,random,currentHeroId());offerKey='';render();return structuredClone(run);},
  choose:(id:string)=>{select(id);render();return structuredClone(run);},
  castSkill:(id:SkillId,opts?:{targetU?:number;targetV?:number;forceCrit?:boolean})=>vfx.castSkill(id,opts),
  castSimultaneous:(ids?:SkillId[],opts?:{targetU?:number;targetV?:number;forceCrit?:boolean})=>{
   const list=(ids?.length?ids:run.slots.slice(0,MAX_SKILL_SLOTS)) as SkillId[];
   const fired=vfx.castSimultaneous(list,opts);
   if(fired.length>=2)comboHighlightMs=900;
   render();
   return fired;
  },
  resetCooldowns:()=>{vfx.resetCooldowns();render();},
  autoCastNow:()=>{const fired=autoCastInAoE(true);render();return fired;},
  spawnProjectile:vfx.spawnProjectile,
  spawnAoE:vfx.spawnAoE,
  triggerLevelUp:(level?:number)=>{const lv=level??run.level;if(!online&&lv>run.level){run.level=lv;syncFoeLevels();}levelUpPulseMs=1200;vfx.triggerLevelUp(lv,h.x,h.y);render();},
  hitFoe:(index:number,forceCrit?:boolean)=>{const f=foes[index];if(!f)return null;const r=vfx.applyHitToFoe(f,{forceCrit});render();return r;},
  fxStage:vfx.fx,
  occlusionAt:o.hero.occlusionAt,
  blocked:o.hero.blocked,
  traceWallRay:o.hero.traceWallRay,
 };
 (window as any).__STRONGHOLD_COMBAT__=api;
 return api;
}
