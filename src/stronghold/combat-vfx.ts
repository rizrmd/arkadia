import {Container} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {tilePoint} from './terrain';
import {rollHit,reach,skillRank,skillDamageMultiplier,skillAreaMultiplier,skillCooldownMs,type Progression} from './progression';
import type {Fighter} from '../characters/combat';
import type {HeroId} from './heroes';
import {createFxStage,playCue,type CueContext,type FxHandle} from '../fx';

export type FloatKind='normal'|'crit'|'incoming'|'heal'|'banner';
export type FloatingText={
 id:number;kind:FloatKind;text:string;subtext?:string;
 u:number;v:number;ox:number;oy:number;vx:number;vy:number;
 age:number;duration:number;scale:number;
};
export type SparkKind='normal'|'crit'|'incoming'|'arcane'|'fire'|'seismic';
export type HitSpark={
 id:number;kind:SparkKind;u:number;v:number;angle:number;
 age:number;duration:number;radius:number;
};
export type SlashTrail={
 id:number;u:number;v:number;angle:number;reachScale:number;novaRank:number;
 hero:HeroId|'knight';crit:boolean;age:number;duration:number;
};
export type ProjectileKind='rift-bolt'|'flame-bolt'|'arcane-orb';
export type Projectile={
 id:number;kind:ProjectileKind;skill:SkillId;u:number;v:number;vx:number;vy:number;
 radius:number;range:number;traveled:number;damageScale:number;forceCrit?:boolean;
 trail:{u:number;v:number}[];age:number;alive:boolean;hitIds:Set<object>;fx:FxHandle[];
};
export type AoEKind='rift-trap'|'ember-snare'|'shockwave'|'cleave-cone'|'flame-cone';
export type AoETelegraph={
 id:number;kind:AoEKind;skill:SkillId;shape:'circle'|'cone';u:number;v:number;
 radius:number;angle:number;spread:number;age:number;duration:number;
 damageScale:number;forceCrit?:boolean;detonated:boolean;
};
export type AoEImpact={
 id:number;kind:AoEKind;u:number;v:number;radius:number;angle:number;
 age:number;duration:number;
};
export type LevelUpVfx={
 id:number;u:number;v:number;level:number;age:number;duration:number;
};
export type DashGhost={
 id:number;kind:'rift-dash'|'cinder-step';u:number;v:number;angle:number;
 age:number;duration:number;
};
export type ComboBurstVfx={
 id:number;u:number;v:number;count:number;skills:SkillId[];age:number;duration:number;
};
export type SkillId='rift-bolt'|'rift-dash'|'rift-trap'|'flame-fan'|'cinder-step'|'ember-snare'|'cleave'|'shockwave';
export type SkillDef={id:SkillId;name:string;key:string;cooldownMs:number;hero:HeroId|'shared';badge:string;icon:string};

export const SKILL_CATALOG:Record<SkillId,SkillDef>={
 'rift-bolt':{id:'rift-bolt',name:'Rift Bolt',key:'1',cooldownMs:1400,hero:'rift-runner',badge:'BOLT',icon:'⚡'},
 'rift-dash':{id:'rift-dash',name:'Rift Dash',key:'2',cooldownMs:1400,hero:'rift-runner',badge:'DASH',icon:'💨'},
 'rift-trap':{id:'rift-trap',name:'Rift Trap',key:'3',cooldownMs:2800,hero:'rift-runner',badge:'TRAP',icon:'🔮'},
 'flame-fan':{id:'flame-fan',name:'Flame Fan',key:'1',cooldownMs:1400,hero:'ember-warden',badge:'FAN',icon:'🔥'},
 'cinder-step':{id:'cinder-step',name:'Cinder Step',key:'2',cooldownMs:1400,hero:'ember-warden',badge:'STEP',icon:'☄️'},
 'ember-snare':{id:'ember-snare',name:'Ember Snare',key:'3',cooldownMs:2800,hero:'ember-warden',badge:'SNARE',icon:'🌋'},
 cleave:{id:'cleave',name:'Astral Cleave',key:'4',cooldownMs:2100,hero:'shared',badge:'ARC',icon:'🌙'},
 shockwave:{id:'shockwave',name:'Seismic Slam',key:'4',cooldownMs:2800,hero:'shared',badge:'SLAM',icon:'💥'}
};

// The skill whose FX an AoE plays when the caller does not say (Rift Dash also uses the cleave cone).
const AOE_SKILL:Record<AoEKind,SkillId>={'rift-trap':'rift-trap','ember-snare':'ember-snare',shockwave:'shockwave','cleave-cone':'cleave','flame-cone':'cinder-step'};

export const HERO_SKILLS:Record<HeroId,SkillDef[]>={
 'rift-runner':[
  SKILL_CATALOG['rift-bolt'],
  SKILL_CATALOG['rift-dash'],
  SKILL_CATALOG['rift-trap'],
  SKILL_CATALOG.cleave,
  SKILL_CATALOG.shockwave
 ],
 'ember-warden':[
  SKILL_CATALOG['flame-fan'],
  SKILL_CATALOG['cinder-step'],
  SKILL_CATALOG['ember-snare'],
  SKILL_CATALOG.shockwave,
  SKILL_CATALOG.cleave
 ]
};

const screenVec=(du:number,dv:number)=>({x:(du-dv)*64,y:(du+dv)*32});
const tileVec=(sx:number,sy:number)=>{const u=(sx/64+sy/32)*.5,v=(sy/32-sx/64)*.5;const l=Math.hypot(u,v)||1;return {u:u/l,v:v/l};};

export function facingScreenAngle(f:{facing:number;back:boolean;vertical:boolean}):number{
 if(f.vertical)return f.back?-Math.PI/2:Math.PI/2;
 const sx=f.facing>=0?1:-1,sy=f.back?-.6:.6;
 return Math.atan2(sy,sx);
}

export function createCombatVfx(o:{
 layer:Container;
 heroCanvas:HTMLCanvasElement;
 backLayer:Container;
 frontLayer:Container;
 getHero:()=>{u:number;v:number;facing:number;back:boolean;vertical:boolean;heroId:HeroId};
 occlusionAt?:(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean)=>number;
 getRun:()=>Progression;
 getFoes:()=>Fighter[];
 onKill:(f:Fighter)=>void;
 random:()=>number;
}){
 // Skill FX are NixieFX particle effects (src/fx, authored in vfx/) on two planes of this Pixi scene: rune circles,
 // scorch and shock rings flat on the snow under every figure, sparks, flames and smoke over them. This module
 // decides when and where (cues such as "flame-fan.cast", "hit.crit"); the hero's FX profile (src/fx/heroes)
 // decides how it looks.
 const groundFx=new Container(),worldFx=new Container();
 groundFx.zIndex=22;worldFx.zIndex=38;
 o.layer.addChild(groundFx,worldFx);
 const fx=createFxStage({
  host:{ground:groundFx,world:worldFx},
  depthLayers:{back:o.backLayer,front:o.frontLayer},
  getHeroWorld:()=>{const h=o.getHero();return tilePoint(h.u,h.v);},
  occlusionAt:o.occlusionAt,
 });
 // Live counts for automated verification (scripts read snapshot()).
 const vfxStats:Record<string,string>={};

 // Pixi MSDF floating combat text & banner layer (frameless / bubble-free)
 const floatsLayer=new Container();
 floatsLayer.zIndex=45;
 o.layer.addChild(floatsLayer);
 type FloatView={root:Container;main:MsdfText;sub?:MsdfText;kind:FloatKind;text:string;subtext?:string};
 const floatViews=new Map<number,FloatView>(),floatViewPool=new Map<string,FloatView[]>();

 let nextId=1,origin={x:0,y:0,scale:1};
 const floats:FloatingText[]=[],sparks:HitSpark[]=[],slashes:SlashTrail[]=[];
 const projectiles:Projectile[]=[],aoes:AoETelegraph[]=[],impacts:AoEImpact[]=[];
 const levelUps:LevelUpVfx[]=[],ghosts:DashGhost[]=[],combos:ComboBurstVfx[]=[];
 const shakes=new Map<object,{amp:number;age:number;duration:number;seed:number}>();
 const cooldowns:Partial<Record<SkillId,number>>={};
 let totalCrits=0,totalNormals=0,totalProjectiles=0,totalAoEs=0,totalLevelUps=0;
 let totalAutoCasts=0,totalSimultaneousCasts=0,totalTrinityCasts=0;
 let lastSkill:SkillId|''='';
 let lastSimultaneousSkills:SkillId[]=[];
 let lastComboBannerMs=0,fxDtMs=0;
 const SPARK_CUE:Record<SparkKind,string>={normal:'hit.normal',crit:'hit.crit',incoming:'hit.incoming',arcane:'hit.arcane',fire:'hit.fire',seismic:'hit.seismic'};
 const yawOf=(du:number,dv:number)=>Math.atan2(dv,du);
 const heroAt=()=>{const h=o.getHero();return {u:h.u,v:h.v};};
 function cue(key:string,c:CueContext){return playCue(fx,o.getHero().heroId,key,c);}

 function addFloat(kind:FloatKind,text:string,u:number,v:number,subtext?:string){
  const spread=(o.random()-.5)*38;
  const vy=kind==='crit'?-112:kind==='banner'?-54:kind==='heal'?-68:-92;
  const vx=kind==='banner'||kind==='heal'?spread*.25:spread;
  const duration=kind==='crit'?1150:kind==='banner'?1650:kind==='heal'?980:860;
  const scale=kind==='crit'?1.42:kind==='banner'?1.35:1;
  floats.push({id:nextId++,kind,text,subtext,u,v,ox:(o.random()-.5)*10,oy:0,vx,vy,age:0,duration,scale});
 }

 function addSpark(kind:SparkKind,u:number,v:number,angle=0,radius=26){
  let sameFrameSparks=0;
  for(let i=sparks.length-1;i>=0;i--){if(sparks[i].age===0)sameFrameSparks++;else break;}
  sparks.push({id:nextId++,kind,u,v,angle,age:0,duration:kind==='crit'?380:270,radius});
  if(sameFrameSparks<4)cue(SPARK_CUE[kind],{u,v,yaw:angle});
 }

 function addShake(target:object,amp=5.5,duration=190){
  shakes.set(target,{amp,age:0,duration,seed:o.random()*Math.PI*2});
 }

 function shakeOffset(target:object):{dx:number;dy:number}{
  const s=shakes.get(target);if(!s||s.age>=s.duration)return {dx:0,dy:0};
  const decay=1-s.age/s.duration,phase=s.age*.09+s.seed;
  return {dx:Math.cos(phase)*s.amp*decay,dy:Math.sin(phase*1.3)*s.amp*.6*decay};
 }

 function spawnSlash(u:number,v:number,angle:number,crit=false){
  const run=o.getRun(),novaRank=run.skills.nova??0,reachScale=reach(run);
  const {heroId}=o.getHero();
  slashes.push({id:nextId++,u,v,angle,reachScale,novaRank,hero:heroId,crit,age:0,duration:crit?340:260});
  const d=tileVec(Math.cos(angle),Math.sin(angle));
  cue('attack.swing',{u,v,yaw:yawOf(d.u,d.v),radius:reachScale});
 }

 function applyHitToFoe(f:Fighter,opts:{scale?:number;forceCrit?:boolean;sparkKind?:SparkKind;angle?:number}={}){
  if(!f.alive)return {killed:false,crit:false,display:0,damage:0};
  const run=o.getRun(),roll=rollHit(run,o.random,opts.forceCrit,opts.scale??1);
  const killed=f.damage(roll.damage);
  if(roll.crit){
   totalCrits++;
   addFloat('crit',`${roll.display}!`,f.x,f.y,'CRITICAL');
   addSpark('crit',f.x,f.y,opts.angle??0,38);
   addShake(f,6,210);
  }else{
   totalNormals++;
   addFloat('normal',String(roll.display),f.x,f.y);
   addSpark(opts.sparkKind??'normal',f.x,f.y,opts.angle??0,26);
   addShake(f,2.2,110);
  }
  if(killed)o.onKill(f);
  return {killed,crit:roll.crit,display:roll.display,damage:roll.damage};
 }

 function recordCoopEnemyDamage(f:Fighter,deltaHp:number){
  const run=o.getRun(),crit=deltaHp>=1.5||deltaHp>=1.35*(1+(run.skills.might??0)*.5+run.stars*.25);
  const display=Math.max(10,Math.round(deltaHp*10));
  if(crit){
   totalCrits++;
   addFloat('crit',`${display}!`,f.x,f.y,'CRITICAL');
   addSpark('crit',f.x,f.y,o.random()*Math.PI*2,38);
   addShake(f,6,210);
  }else{
   totalNormals++;
   addFloat('normal',String(display),f.x,f.y);
   addSpark('normal',f.x,f.y,o.random()*Math.PI*2,26);
   addShake(f,2.2,110);
  }
 }

 function recordHeroDamage(amount:number,u:number,v:number){
  const val=Math.max(1,Math.round(amount));
  addFloat('incoming',`-${val}`,u,v);
  addSpark('incoming',u,v,0,28);
 }

 function recordHeroHeal(amount:number,u:number,v:number,label?:string){
  const val=Math.max(1,Math.round(amount));
  addFloat('heal',`+${val} HP`,u,v,label);
  cue('heal',{u,v,follow:heroAt});
 }

 function triggerLevelUp(level:number,u?:number,v?:number){
  const h=o.getHero(),tu=u??h.u,tv=v??h.v;
  totalLevelUps++;
  levelUps.push({id:nextId++,u:tu,v:tv,level,age:0,duration:1750});
  cue('level-up',{u:tu,v:tv,follow:heroAt});
  addFloat('banner',`LEVEL UP!`,tu,tv,`LV. ${level}`);
 }

 function spawnProjectile(opts:{
  kind?:ProjectileKind;skill?:SkillId;u?:number;v?:number;angle?:number;speed?:number;
  range?:number;radius?:number;damageScale?:number;forceCrit?:boolean;
 }={}){
  const h=o.getHero(),u=opts.u??h.u,v=opts.v??h.v;
  const angle=opts.angle??facingScreenAngle(h);
  const dir=tileVec(Math.cos(angle),Math.sin(angle));
  const speed=opts.speed??6.8;
  const kind=opts.kind??(h.heroId==='ember-warden'?'flame-bolt':'rift-bolt');
  const skill=opts.skill??(kind==='flame-bolt'?'flame-fan':'rift-bolt');
  totalProjectiles++;
  const p:Projectile={
   id:nextId++,kind,skill,u,v,vx:dir.u*speed,vy:dir.v*speed,
   radius:opts.radius??.38,range:opts.range??4.8,traveled:0,
   damageScale:opts.damageScale??.85,forceCrit:opts.forceCrit,
   trail:[{u,v}],age:0,alive:true,hitIds:new Set(),
   // The bolt effect stays anchored where it was fired, turned along the flight; the game slides its emitter
   // along the path, so its fire wake stays behind in the world.
   fx:cue(`${skill}.bolt`,{u,v,yaw:yawOf(dir.u,dir.v)})
  };
  projectiles.push(p);
  return p;
 }

 function spawnAoE(opts:{
  kind?:AoEKind;skill?:SkillId;shape?:'circle'|'cone';u?:number;v?:number;
  radius?:number;angle?:number;spread?:number;duration?:number;
  damageScale?:number;forceCrit?:boolean;
 }={}){
  const h=o.getHero(),angle=opts.angle??facingScreenAngle(h);
  const dir=tileVec(Math.cos(angle),Math.sin(angle));
  const kind=opts.kind??(h.heroId==='ember-warden'?'ember-snare':'rift-trap');
  const shape=opts.shape??(kind==='cleave-cone'||kind==='flame-cone'?'cone':'circle');
  const offset=shape==='cone'?.35:.95;
  const u=opts.u??(h.u+dir.u*offset),v=opts.v??(h.v+dir.v*offset);
  totalAoEs++;
  const skill=opts.skill??AOE_SKILL[kind];
  const aoe:AoETelegraph={
   id:nextId++,kind,skill,shape,u,v,
   radius:opts.radius??1.45*reach(o.getRun()),
   angle,spread:opts.spread??(shape==='cone'?Math.PI*.62:Math.PI*2),
   age:0,duration:opts.duration??680,
   damageScale:opts.damageScale??1.15,forceCrit:opts.forceCrit,detonated:false
  };
  aoes.push(aoe);
  cue(`${skill}.telegraph`,{u,v,yaw:yawOf(dir.u,dir.v),radius:aoe.radius});
  return aoe;
 }

 function detonateAoE(a:AoETelegraph){
  if(a.detonated)return;
  a.detonated=true;
  impacts.push({id:nextId++,kind:a.kind,u:a.u,v:a.v,radius:a.radius,angle:a.angle,age:0,duration:580});
  const d=tileVec(Math.cos(a.angle),Math.sin(a.angle));
  cue(`${a.skill}.detonate`,{u:a.u,v:a.v,yaw:yawOf(d.u,d.v),radius:a.radius});
  const sparkKind:SparkKind=a.kind==='ember-snare'||a.kind==='flame-cone'?'fire':a.kind==='shockwave'||a.kind==='cleave-cone'?'seismic':'arcane';
  for(const f of o.getFoes()){
   if(!f.alive)continue;
   const du=f.x-a.u,dv=f.y-a.v,dist=Math.hypot(du,dv);
   if(dist>a.radius+.38)continue;
   if(a.shape==='cone'&&dist>1e-4){
    const s=screenVec(du,dv),fa=Math.atan2(s.y,s.x);
    let diff=fa-a.angle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>a.spread*.55)continue;
   }
   applyHitToFoe(f,{scale:a.damageScale,forceCrit:a.forceCrit,sparkKind,angle:a.angle});
  }
 }

 function castSkill(id:SkillId,opts:{targetU?:number;targetV?:number;forceCrit?:boolean;comboScale?:number;skipCastCue?:boolean}={}):boolean{
  const h=o.getHero(),run=o.getRun();
  let angle=facingScreenAngle(h);
  let targetU=opts.targetU,targetV=opts.targetV;
  if(targetU!==undefined&&targetV!==undefined){
   const s=screenVec(targetU-h.u,targetV-h.v);
   if(Math.hypot(s.x,s.y)>1e-3)angle=Math.atan2(s.y,s.x);
  }else{
   // Aim toward nearest living foe if within 6 tiles
   let best:Fighter|null=null,bestD=6;
   for(const f of o.getFoes()){const d=Math.hypot(f.x-h.u,f.y-h.v);if(f.alive&&d<bestD){bestD=d;best=f;}}
   if(best){
    targetU=best.x;targetV=best.y;
    const s=screenVec(best.x-h.u,best.y-h.v);
    if(Math.hypot(s.x,s.y)>1e-3)angle=Math.atan2(s.y,s.x);
   }
  }
  const rank=Math.max(1,skillRank(run,id));
  const dmgMult=skillDamageMultiplier(run,id)*(opts.comboScale??1);
  const areaMult=skillAreaMultiplier(run,id);
  lastSkill=id;
  cooldowns[id]=skillCooldownMs(run,id);
  const dir=tileVec(Math.cos(angle),Math.sin(angle));
  if(!opts.skipCastCue)cue(`${id}.cast`,{u:h.u,v:h.v,yaw:yawOf(dir.u,dir.v),target:targetU!==undefined&&targetV!==undefined?{u:targetU,v:targetV}:undefined,follow:heroAt,radius:1.55*reach(run)*areaMult});

  switch(id){
   case 'rift-bolt':{
    spawnSlash(h.u,h.v,angle,false);
    const offsets=rank>=3?[-0.22,0,0.22]:rank===2?[-0.12,0.12]:[0];
    for(const off of offsets){
     spawnProjectile({
      kind:'rift-bolt',skill:'rift-bolt',
      u:h.u+dir.u*.24,
      v:h.v+dir.v*.24,
      angle:angle+off,
      speed:7.5,
      range:5.2,
      damageScale:1.0*dmgMult,
      forceCrit:opts.forceCrit
     });
    }
    return true;
   }
   case 'flame-fan':{
    spawnSlash(h.u,h.v,angle,false);
    const offsets=rank>=3?[-0.44,-0.22,0,0.22,0.44]:rank===2?[-0.36,-0.12,0.12,0.36]:[-0.34,0,0.34];
    for(const offset of offsets){
     spawnProjectile({
      kind:'flame-bolt',skill:'flame-fan',
      u:h.u+dir.u*.22,
      v:h.v+dir.v*.22,
      angle:angle+offset,
      speed:6.4,
      range:4.4,
      damageScale:.78*dmgMult,
      forceCrit:opts.forceCrit
     });
    }
    return true;
   }
   case 'rift-dash':
   case 'cinder-step':{
    const kind=id;
    const ghostCount=Math.min(5,3+(rank-1));
    for(let i=0;i<ghostCount;i++){
     ghosts.push({id:nextId++,kind,u:h.u+dir.u*(i*.3),v:h.v+dir.v*(i*.3),angle,age:-i*40,duration:480});
    }
    addSpark(id==='cinder-step'?'fire':'arcane',h.u+dir.u*.6,h.v+dir.v*.6,angle,36);
    spawnSlash(h.u+dir.u*.5,h.v+dir.v*.5,angle,!!opts.forceCrit);
    spawnAoE({
     kind:id==='cinder-step'?'flame-cone':'cleave-cone',skill:id,
     shape:'cone',
     u:h.u+dir.u*.2,
     v:h.v+dir.v*.2,
     angle,
     radius:1.35*reach(run)*areaMult,
     spread:Math.PI*.68,
     duration:260,
     damageScale:1.1*dmgMult,
     forceCrit:opts.forceCrit
    });
    return true;
   }
   case 'rift-trap':
    spawnAoE({
     kind:'rift-trap',
     shape:'circle',
     u:targetU,
     v:targetV,
     angle,
     radius:1.45*reach(run)*areaMult,
     duration:640,
     damageScale:1.25*dmgMult,
     forceCrit:opts.forceCrit
    });
    return true;
   case 'ember-snare':
    spawnAoE({
     kind:'ember-snare',
     shape:'circle',
     u:targetU,
     v:targetV,
     angle,
     radius:1.5*reach(run)*areaMult,
     duration:640,
     damageScale:1.25*dmgMult,
     forceCrit:opts.forceCrit
    });
    return true;
   case 'cleave':
    spawnSlash(h.u,h.v,angle,true);
    spawnAoE({
     kind:'cleave-cone',
     shape:'cone',
     u:h.u,
     v:h.v,
     angle,
     radius:1.55*reach(run)*areaMult,
     spread:Math.min(Math.PI*1.15,Math.PI*.75+(rank-1)*.12),
     duration:320,
     damageScale:1.2*dmgMult,
     forceCrit:opts.forceCrit
    });
    return true;
   case 'shockwave':
    spawnAoE({
     kind:'shockwave',
     shape:'circle',
     u:h.u,
     v:h.v,
     angle,
     radius:1.65*reach(run)*areaMult,
     duration:460,
     damageScale:1.3*dmgMult,
     forceCrit:opts.forceCrit
    });
    return true;
  }
 }

 function castSimultaneous(ids:SkillId[],opts:{targetU?:number;targetV?:number;forceCrit?:boolean}={}):SkillId[]{
  const unique=[...new Set(ids.filter(id=>Boolean(SKILL_CATALOG[id])))];
  if(!unique.length)return [];
  const h=o.getHero();
  const comboScale=unique.length>=3?1.3:unique.length===2?1.15:1.0;
  totalAutoCasts++;
  if(unique.length>=2){
   totalSimultaneousCasts++;
   if(unique.length>=3)totalTrinityCasts++;
   const hasRecentCombo=combos.some(c=>c.age<180);
   combos.push({id:nextId++,u:h.u,v:h.v,count:unique.length,skills:unique,age:0,duration:960});
   if(!hasRecentCombo)cue(unique.length>=3?'combo.trinity':'combo.dual',{u:h.u,v:h.v,follow:heroAt});
   if(lastComboBannerMs<=0){
    lastComboBannerMs=1100;
    const label=unique.length>=3?'TRINITY AUTO-CAST!':'DUAL AUTO-CAST!';
    const sub=unique.map(id=>SKILL_CATALOG[id].name.toUpperCase()).join(' + ');
    addFloat('banner',label,h.u,h.v,sub);
   }
  }
  lastSimultaneousSkills=unique;
  for(const id of unique){
   castSkill(id,{...opts,comboScale,skipCastCue:unique.length>=2});
  }
  return unique;
 }

 function resetCooldowns(ids?:SkillId[]){
  if(ids?.length){
   for(const id of ids)cooldowns[id]=0;
   return;
  }
  for(const k of Object.keys(cooldowns) as SkillId[])cooldowns[k]=0;
 }

 function step(dt:number){
  fxDtMs+=dt;
  lastComboBannerMs=Math.max(0,lastComboBannerMs-dt);
  for(const k of Object.keys(cooldowns) as SkillId[]){
   cooldowns[k]=Math.max(0,(cooldowns[k]??0)-dt);
  }
  for(let i=floats.length-1;i>=0;i--){
   const f=floats[i];f.age+=dt;
   const s=dt/1000;
   f.ox+=f.vx*s;f.oy+=f.vy*s;
   if(f.kind==='normal'||f.kind==='crit'||f.kind==='incoming')f.vy+=240*s;
   else f.vy*=.96;
   if(f.age>=f.duration)floats.splice(i,1);
  }
  for(let i=sparks.length-1;i>=0;i--){sparks[i].age+=dt;if(sparks[i].age>=sparks[i].duration)sparks.splice(i,1);}
  for(let i=slashes.length-1;i>=0;i--){slashes[i].age+=dt;if(slashes[i].age>=slashes[i].duration)slashes.splice(i,1);}
  for(let i=impacts.length-1;i>=0;i--){impacts[i].age+=dt;if(impacts[i].age>=impacts[i].duration)impacts.splice(i,1);}
  for(let i=levelUps.length-1;i>=0;i--){levelUps[i].age+=dt;if(levelUps[i].age>=levelUps[i].duration)levelUps.splice(i,1);}
  for(let i=ghosts.length-1;i>=0;i--){ghosts[i].age+=dt;if(ghosts[i].age>=ghosts[i].duration)ghosts.splice(i,1);}
  for(let i=combos.length-1;i>=0;i--){combos[i].age+=dt;if(combos[i].age>=combos[i].duration)combos.splice(i,1);}
  for(const [target,s] of shakes){s.age+=dt;if(s.age>=s.duration)shakes.delete(target);}

  // Step projectiles & collide with living revenants
  const foes=o.getFoes();
  for(let i=projectiles.length-1;i>=0;i--){
   const p=projectiles[i];p.age+=dt;
   const stepU=p.vx*dt/1000,stepV=p.vy*dt/1000,dist=Math.hypot(stepU,stepV);
   p.u+=stepU;p.v+=stepV;p.traveled+=dist;
   p.trail.push({u:p.u,v:p.v});if(p.trail.length>8)p.trail.shift();
   const s=screenVec(p.vx,p.vy),angle=Math.atan2(s.y,s.x);
   for(const f of foes){
    if(!f.alive||p.hitIds.has(f))continue;
    if(Math.hypot(f.x-p.u,f.y-p.v)<=p.radius+.42){
     p.hitIds.add(f);
     applyHitToFoe(f,{scale:p.damageScale,forceCrit:p.forceCrit,sparkKind:p.kind==='flame-bolt'?'fire':'arcane',angle});
     impacts.push({id:nextId++,kind:p.kind==='flame-bolt'?'ember-snare':'rift-trap',u:p.u,v:p.v,radius:.65,angle,age:0,duration:340});
     cue(`${p.skill}.impact`,{u:p.u,v:p.v,yaw:yawOf(p.vx,p.vy)});
     p.alive=false;
     break;
    }
   }
   for(const h of p.fx)h.setLocal(p.traveled);
   if(!p.alive||p.traveled>=p.range){
    if(p.alive)addSpark(p.kind==='flame-bolt'?'fire':'arcane',p.u,p.v,angle,22);
    for(const h of p.fx)h.release();
    projectiles.splice(i,1);
   }
  }

  // Step AoE ground telegraphs & detonate when fill reaches 100%
  for(let i=aoes.length-1;i>=0;i--){
   const a=aoes[i];a.age+=dt;
   if(a.age>=a.duration){
    detonateAoE(a);
    aoes.splice(i,1);
   }
  }
 }

 function toScreen(u:number,v:number){
  const w=tilePoint(u,v);
  return {x:origin.x+w.x*origin.scale,y:origin.y+w.y*origin.scale};
 }

 function render(){
  fx.frame(fxDtMs/1000);fxDtMs=0;
  const k=origin.scale;

  // MSDF Floating Combat Text & Level-Up / Trinity Combo Text (frameless, no bubble/badge)
  const activeFloatIds=new Set<number>();
  for(const fl of floats){
   activeFloatIds.add(fl.id);
   let fv=floatViews.get(fl.id);
   if(!fv){
    const poolKey=`${fl.kind}:${fl.subtext?1:0}`;
    const pooled=floatViewPool.get(poolKey)?.pop();
    if(pooled){
     fv=pooled;
     fv.root.visible=true;
     fv.text=fl.text;
     fv.subtext=fl.subtext;
     fv.main.text=fl.text;
     if(fv.sub&&fl.subtext!==undefined)fv.sub.text=fl.subtext;
    }else{
     const root=floatsLayer.addChild(new Container());
     const role=fl.kind==='crit'?'combat-crit':fl.kind==='banner'?'combat-banner':fl.kind==='incoming'?'combat-incoming':fl.kind==='heal'?'combat-heal':'combat-hit';
     const main=root.addChild(new MsdfText(role,fl.text,fl.kind==='banner'?{size:20}:{size:fl.kind==='crit'?26:19}));
     let sub:MsdfText|undefined;
     if(fl.subtext){
      sub=root.addChild(new MsdfText(fl.kind==='crit'?'combat-crit-label':'combat-banner-sub',fl.subtext,fl.kind==='banner'?{size:13}:{size:11}));
     }
     fv={root,main,sub,kind:fl.kind,text:fl.text,subtext:fl.subtext};
    }
    if(fl.kind==='crit'){
     if(fv.sub)fv.sub.place(0,-12,0.5);
     fv.main.place(0,8,0.5);
    }else if(fl.kind==='banner'){
     fv.main.place(0,fv.sub?-2:6,0.5);
     if(fv.sub)fv.sub.place(0,14,0.5);
    }else if(fl.kind==='heal'&&fv.sub){
     fv.sub.place(0,-9,0.5);
     fv.main.place(0,7,0.5);
    }else{
     fv.main.place(0,6,0.5);
    }
    floatViews.set(fl.id,fv);
   }
   const base=toScreen(fl.u,fl.v),t=fl.age/fl.duration;
   const alpha=t<.72?1:Math.max(0,1-(t-.72)/.28);
   const pop=fl.kind==='crit'||fl.kind==='banner'
    ?(t<.18?1.42-(t/.18)*.42:1+Math.sin((t-.18)*Math.PI*2)*.04*Math.max(0,1-t))
    :1;
   const yLift=fl.kind==='banner'?86:fl.kind==='heal'?66:50;
   const x=base.x+fl.ox*k,y=base.y-yLift*k+fl.oy*k;
   fv.root.position.set(x,y);
   fv.root.scale.set(pop);
   fv.root.alpha=alpha;
  }
  for(const [id,fv] of floatViews){
   if(!activeFloatIds.has(id)){
    floatViews.delete(id);
    const poolKey=`${fv.kind}:${fv.sub?1:0}`;
    const list=floatViewPool.get(poolKey)??[];
    if(list.length<16){
     fv.root.visible=false;
     list.push(fv);
     floatViewPool.set(poolKey,list);
    }else{
     fv.root.destroy({children:true});
    }
   }
  }


  // Expose live state on dataset for automated verification
  vfxStats.floats=String(floats.length);
  vfxStats.projectiles=String(projectiles.length);
  vfxStats.aoes=String(aoes.length);
  vfxStats.impacts=String(impacts.length);
  vfxStats.levelups=String(levelUps.length);
  vfxStats.slashes=String(slashes.length);
  vfxStats.combos=String(combos.length);
  vfxStats.totalCrits=String(totalCrits);
  vfxStats.totalNormals=String(totalNormals);
  vfxStats.totalAutoCasts=String(totalAutoCasts);
  vfxStats.totalSimultaneousCasts=String(totalSimultaneousCasts);
  vfxStats.totalTrinityCasts=String(totalTrinityCasts);
  vfxStats.lastSkill=lastSkill;
  vfxStats.lastSimultaneous=lastSimultaneousSkills.join(',');
  const fs=fx.stats();vfxStats.fx=fs.ready?'ready':fs.failed?'failed':'loading';vfxStats.fxParticles=String(fs.particles);vfxStats.fxLive=String(fs.live);
 }

 return {
  step,
  render,
  place(x:number,y:number,scale:number){origin={x,y,scale};fx.place(x,y,scale);},
  fx,
  spawnSlash,
  applyHitToFoe,
  recordCoopEnemyDamage,
  recordHeroDamage,
  recordHeroHeal,
  triggerLevelUp,
  spawnProjectile,
  spawnAoE,
  castSkill,
  castSimultaneous,
  resetCooldowns,
  shakeOffset,
  cooldown:(id:SkillId)=>Math.max(0,cooldowns[id]??0),
  snapshot:()=>({
   activeFloats:floats.map(f=>{const fv=floatViews.get(f.id);const hasBubbleOrFrame=Boolean(fv&&fv.root.children.some(c=>!(c instanceof MsdfText)));return {kind:f.kind,text:f.text,subtext:f.subtext,u:+f.u.toFixed(2),v:+f.v.toFixed(2),scale:+f.scale.toFixed(2),frameless:!hasBubbleOrFrame};}),
   activeProjectiles:projectiles.map(p=>({id:p.id,kind:p.kind,u:+p.u.toFixed(2),v:+p.v.toFixed(2),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),traveled:+p.traveled.toFixed(2)})),
   activeAoEs:aoes.map(a=>({id:a.id,kind:a.kind,shape:a.shape,u:+a.u.toFixed(2),v:+a.v.toFixed(2),radius:+a.radius.toFixed(2),progress:+(a.age/a.duration).toFixed(2)})),
   activeImpacts:impacts.map(i=>({id:i.id,kind:i.kind,u:+i.u.toFixed(2),v:+i.v.toFixed(2),radius:+i.radius.toFixed(2)})),
   activeLevelUps:levelUps.map(l=>({level:l.level,u:+l.u.toFixed(2),v:+l.v.toFixed(2),progress:+(l.age/l.duration).toFixed(2)})),
   activeCombos:combos.map(c=>({id:c.id,count:c.count,skills:c.skills,progress:+(c.age/c.duration).toFixed(2)})),
   activeSlashes:slashes.length,
   activeSparks:sparks.length,
   totals:{
    crits:totalCrits,
    normals:totalNormals,
    projectiles:totalProjectiles,
    aoes:totalAoEs,
    levelUps:totalLevelUps,
    autoCasts:totalAutoCasts,
    simultaneousCasts:totalSimultaneousCasts,
    trinityCasts:totalTrinityCasts
   },
   lastSkill,
   lastSimultaneousSkills:[...lastSimultaneousSkills],
   fx:fx.stats()
  })
 };
}
