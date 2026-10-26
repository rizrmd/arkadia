import {createBurnSoilClock,BURN_SOIL} from '../fx/burn-soil';
import {createGameplayFlameFan} from '../fx/flame-fan-gameplay';
import {playSkillSound} from '../app/game-audio';
import {gameSettings} from '../app/settings-state';
import {Container,type Renderer} from 'pixi.js';
import {createCanvasSprite} from '../app/loader';
import {MsdfText} from '../typography/text';
import {COURT,tilePoint} from './terrain';
import {unproject} from '../isometric';
import {rollHit,reach,skillRank,skillDamageMultiplier,skillAreaMultiplier,skillCooldownMs,type Progression} from './progression';
import type {Fighter} from '../characters/combat';
import type {HeroId} from './heroes';
import {cutOut,type Placed} from './hero';
import {notifyHeroCast} from './hero-3d';
import {createFxStage,playCue,cueKeys,resolveCue,type CueContext,type FxHandle} from '../fx';

export type FloatKind='normal'|'crit'|'incoming'|'heal'|'xp'|'banner';
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
 id:number;kind:AoEKind;shape?:'circle'|'cone';u:number;v:number;radius:number;angle:number;spread?:number;
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
  {...SKILL_CATALOG.cleave,name:'Molten Cleave',icon:'🔥'}
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
 renderer?:Renderer;
 layer:Container;
 heroCanvas:HTMLCanvasElement;
 backLayer:Container;
 frontLayer:Container;
 getHero:()=>{u:number;v:number;facing:number;back:boolean;vertical:boolean;heroId:HeroId};
 occlusionAt?:(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean,anchorY?:number)=>number;
 occluders?:(px:number,py:number,box:number[])=>Placed[];
 blocked?:(px:number,py:number)=>boolean;
 traceWallRay?:(x0:number,y0:number,x1:number,y1:number)=>{hit:boolean;x:number;y:number;t:number};
 getRun:()=>Progression;
 getFoes:()=>Fighter[];
 isOnline?:()=>boolean;
 onKill:(f:Fighter)=>void;
 random:()=>number;
}){
 // Skill FX are NixieFX particle effects (src/fx, authored in vfx/) on two planes of this Pixi scene: rune circles,
 // scorch and shock rings flat on the snow under every figure, sparks, flames and smoke over them. This module
 // decides when and where (cues such as "flame-fan.cast", "hit.crit"); the hero's FX profile (src/fx/heroes)
 // decides how it looks.
 const groundZonesLayer=new Container();
 groundZonesLayer.zIndex=21;
 const groundFx=new Container(),worldFx=new Container();
 const flameSheets=createGameplayFlameFan(groundFx,o.traceWallRay,o.occlusionAt,o.renderer);
 groundFx.zIndex=22;worldFx.zIndex=38;
 o.layer.addChild(groundZonesLayer,groundFx,worldFx);
 type ZoneView={el:HTMLCanvasElement;ctx:CanvasRenderingContext2D;view:ReturnType<typeof createCanvasSprite>;key:string};
 const zoneViews=new Map<number,ZoneView>(),zonePool:ZoneView[]=[],zoneBaseCache=new Map<string,HTMLCanvasElement>();
 const fx=createFxStage({
  renderer:o.renderer,
  prepareExtra:()=>o.getHero().heroId==='ember-warden'?flameSheets.prepare():Promise.resolve(),
  host:{ground:groundFx,world:worldFx},
  effectKeys:()=>cueKeys(o.getHero().heroId).flatMap(key=>resolveCue(o.getHero().heroId,key)?.cue.layers.map(l=>l.effect)??[]),
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
 const burnSoils:{area:AoETelegraph;clock:ReturnType<typeof createBurnSoilClock>}[]=[];
 let totalBurnSoilTicks=0;
 const lingeringFx:{fx:FxHandle[];age:number;duration:number}[]=[];
 const levelUps:LevelUpVfx[]=[],ghosts:DashGhost[]=[],combos:ComboBurstVfx[]=[];
 const shakes=new Map<object,{amp:number;age:number;duration:number;seed:number}>();
 const cooldowns:Partial<Record<SkillId,number>>={};
 let totalCrits=0,totalNormals=0,totalProjectiles=0,totalAoEs=0,totalLevelUps=0,totalWallHits=0;
 let totalAutoCasts=0,totalSimultaneousCasts=0,totalTrinityCasts=0;
 let lastSkill:SkillId|''='';
 let lastSimultaneousSkills:SkillId[]=[];
 let lastComboBannerMs=0,fxDtMs=0;
 const SPARK_CUE:Record<SparkKind,string>={normal:'hit.normal',crit:'hit.crit',incoming:'hit.incoming',arcane:'hit.arcane',fire:'hit.fire',seismic:'hit.seismic'};
 const yawOf=(du:number,dv:number)=>Math.atan2(dv,du);
 const heroAt=()=>{const h=o.getHero();return {u:h.u,v:h.v};};
 const worldToTile=(wx:number,wy:number)=>{const g=unproject(wx-COURT.x,wy-COURT.y);return {u:g.x,v:g.y};};
 const clampTargetToWall=(u0:number,v0:number,u1:number,v1:number)=>{
  if(!o.traceWallRay)return {hit:false,u:u1,v:v1,t:1};
  const p0=tilePoint(u0,v0),p1=tilePoint(u1,v1);
  const r=o.traceWallRay(p0.x,p0.y,p1.x,p1.y);
  if(!r.hit)return {hit:false,u:u1,v:v1,t:1};
  const t=worldToTile(r.x,r.y);
  return {hit:true,u:t.u,v:t.v,t:r.t};
 };
 function cue(key:string,c:CueContext){if(key.includes('cast'))playSkillSound();return playCue(fx,o.getHero().heroId,key,c);}

 function addFloat(kind:FloatKind,text:string,u:number,v:number,subtext?:string){
  const spread=(o.random()-.5)*38;
  const vy=kind==='crit'?-112:kind==='banner'?-54:kind==='heal'?-68:kind==='xp'?-76:-92;
  const vx=kind==='banner'||kind==='heal'||kind==='xp'?spread*.25:spread;
  const duration=kind==='crit'?1150:kind==='banner'?1650:kind==='heal'?980:kind==='xp'?1050:860;
  const scale=kind==='crit'?1.42:kind==='banner'?1.35:1;
  floats.push({id:nextId++,kind,text,subtext,u,v,ox:(o.random()-.5)*10,oy:0,vx,vy,age:0,duration,scale});
 }

 function addSpark(kind:SparkKind,u:number,v:number,angle=0,radius=26,fxScale=1){
  let sameFrameSparks=0;
  for(let i=sparks.length-1;i>=0;i--){if(sparks[i].age===0)sameFrameSparks++;else break;}
  sparks.push({id:nextId++,kind,u,v,angle,age:0,duration:kind==='crit'?380:270,radius});
  if(sameFrameSparks<4){if(fxScale!==1)fx.play('shared/'+SPARK_CUE[kind],{u,v,yaw:angle,scale:fxScale});else cue(SPARK_CUE[kind],{u,v,yaw:angle});}
 }

 function addShake(target:object,amp=5.5,duration=190){
  shakes.set(target,{amp,age:0,duration,seed:o.random()*Math.PI*2});
 }

 function shakeOffset(target:object):{dx:number;dy:number}{
  if(!gameSettings.get().screenShake)return {dx:0,dy:0};
  const s=shakes.get(target);if(!s||s.age>=s.duration)return {dx:0,dy:0};
  const decay=1-s.age/s.duration,phase=s.age*.09+s.seed;
  return {dx:Math.cos(phase)*s.amp*decay,dy:Math.sin(phase*1.3)*s.amp*.6*decay};
 }

 function spawnSlash(u:number,v:number,angle:number,crit=false,skipCue=false){
  const run=o.getRun(),novaRank=run.skills.nova??0,reachScale=reach(run);
  const {heroId}=o.getHero();
  const hasSameFrameSlash=slashes.length>0&&slashes[slashes.length-1].age===0;
  slashes.push({id:nextId++,u,v,angle,reachScale,novaRank,hero:heroId,crit,age:0,duration:crit?340:260});
  if(!hasSameFrameSlash&&!skipCue){
   const d=tileVec(Math.cos(angle),Math.sin(angle));
   cue('attack.swing',{u,v,yaw:yawOf(d.u,d.v),radius:reachScale});
  }
 }

 function applyHitToFoe(f:Fighter,opts:{scale?:number;forceCrit?:boolean;sparkKind?:SparkKind;angle?:number;fxScale?:number}={}){
  if(!f.alive)return {killed:false,crit:false,display:0,damage:0};
  if(o.isOnline?.()){
   addSpark(opts.sparkKind??'normal',f.x,f.y,opts.angle??0,26,opts.fxScale??1);
   addShake(f,2.2,110);
   return {killed:false,crit:false,display:0,damage:0};
  }
  const run=o.getRun(),roll=rollHit(run,o.random,opts.forceCrit,opts.scale??1);
  const killed=f.damage(roll.damage);
  if(roll.crit){
   totalCrits++;
   addFloat('crit',`${roll.display}!`,f.x,f.y,'CRITICAL');
   addSpark('crit',f.x,f.y,opts.angle??0,38,opts.fxScale??1);
   addShake(f,6,210);
  }else{
   totalNormals++;
   addFloat('normal',String(roll.display),f.x,f.y);
   addSpark(opts.sparkKind??'normal',f.x,f.y,opts.angle??0,26,opts.fxScale??1);
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

 function recordHeroXp(amount:number,u:number,v:number){
  const val=Math.max(1,Math.round(amount));
  addFloat('xp',`+${val} XP`,u,v);
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
  if(clampTargetToWall(h.u,h.v,u,v).hit)totalWallHits++;
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
  impacts.push({id:nextId++,kind:a.kind,shape:a.shape,u:a.u,v:a.v,radius:a.radius,angle:a.angle,spread:a.spread,age:0,duration:640});
  const d=tileVec(Math.cos(a.angle),Math.sin(a.angle));
  if(a.skill==='flame-fan'){
   const rank=Math.max(1,skillRank(o.getRun(),'flame-fan'));
   flameSheets.spawn(a.u,a.v,yawOf(d.u,d.v),a.radius,rank,-fxDtMs/1000+Math.max(0,a.age-a.duration)/1000);
   if(rank>=3){const clock=createBurnSoilClock(rank,(_at,damage)=>{
    totalBurnSoilTicks++;
    // No rollHit/minimum-one fallback while balance is unresolved.
    if(damage===null||o.isOnline?.())return;
    for(const f of o.getFoes())if(f.alive&&inBurnSoil(a,f)){
     if(f.damage(damage))o.onKill(f);
     addSpark('fire',f.x,f.y,a.angle,12,.28);
    }
   });clock.advance(Math.max(0,a.age-a.duration));burnSoils.push({area:{...a},clock});}
  }
  else cue(`${a.skill}.detonate`,{u:a.u,v:a.v,yaw:yawOf(d.u,d.v),radius:a.radius});
  const sparkKind:SparkKind=a.kind==='ember-snare'||a.kind==='flame-cone'||(a.kind==='cleave-cone'&&o.getHero().heroId==='ember-warden')?'fire':a.kind==='shockwave'?'seismic':'arcane';
  for(const f of o.getFoes()){
   if(!f.alive)continue;
   const du=f.x-a.u,dv=f.y-a.v,dist=Math.hypot(du,dv);
   if(dist>a.radius+.38)continue;
   if(a.shape==='cone'&&dist>1e-4){
    const s=screenVec(du,dv),fa=Math.atan2(s.y,s.x);
    const aim=tileVec(Math.cos(a.angle),Math.sin(a.angle));
    let diff=a.skill==='flame-fan'?Math.atan2(dv,du)-yawOf(aim.u,aim.v):fa-a.angle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    if(Math.abs(diff)>a.spread*(a.skill==='flame-fan'?.5:.55))continue;
   }
   if(clampTargetToWall(a.u,a.v,f.x,f.y).hit)continue;
   applyHitToFoe(f,{scale:a.damageScale,forceCrit:a.forceCrit,sparkKind,angle:a.angle,fxScale:a.skill==='flame-fan'?.28:1});
  }
 }

 function inBurnSoil(a:AoETelegraph,f:Fighter){
  const du=f.x-a.u,dv=f.y-a.v,aim=tileVec(Math.cos(a.angle),Math.sin(a.angle));
  let diff=Math.atan2(dv,du)-yawOf(aim.u,aim.v);while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
  return Math.hypot(du,dv)<=a.radius+.38&&Math.abs(diff)<=a.spread*.5&&!clampTargetToWall(a.u,a.v,f.x,f.y).hit;
 }
 function castSkill(id:SkillId,opts:{targetU?:number;targetV?:number;forceCrit?:boolean;comboScale?:number;dashDistance?:number;skipCastCue?:boolean}={}):boolean{
  notifyHeroCast(1050);
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
    spawnSlash(h.u,h.v,angle,false,true);
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
    spawnSlash(h.u,h.v,angle,false,true);
    spawnAoE({kind:'flame-cone',skill:id,shape:'cone',u:h.u,v:h.v,angle,
     radius:4.4*areaMult,spread:Math.PI*.6,duration:420,
     damageScale:.78*dmgMult,forceCrit:opts.forceCrit});
    return true;
   }
   case 'rift-dash':
   case 'cinder-step':{
    const kind=id;
    const ghostCount=Math.min(5,3+(rank-1));
    const dashDistance=id==='rift-dash'?(opts.dashDistance??1.5):1.5;
    for(let i=0;i<ghostCount;i++){
     ghosts.push({id:nextId++,kind,u:h.u+dir.u*(i*(id==='rift-dash'?dashDistance/ghostCount:.3)),v:h.v+dir.v*(i*(id==='rift-dash'?dashDistance/ghostCount:.3)),angle,age:-i*40,duration:480});
    }
    if(id==='rift-dash')addSpark('arcane',h.u+dir.u*.6,h.v+dir.v*.6,angle,36);
    spawnSlash(h.u+dir.u*.5,h.v+dir.v*.5,angle,!!opts.forceCrit,true);
    spawnAoE({
     kind:id==='cinder-step'?'flame-cone':'cleave-cone',skill:id,
     shape:'cone',
     u:h.u+dir.u*(id==='rift-dash'?dashDistance:.2),
     v:h.v+dir.v*(id==='rift-dash'?dashDistance:.2),
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
    spawnSlash(h.u,h.v,angle,true,true);
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
  notifyHeroCast(1150);
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
   castSkill(id,{...opts,comboScale});
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
  for(let i=lingeringFx.length-1;i>=0;i--){
   lingeringFx[i].age+=dt;
   if(lingeringFx[i].age>=lingeringFx[i].duration){
    for(const h of lingeringFx[i].fx)h.release();
    lingeringFx.splice(i,1);
   }
  }
  for(const [target,s] of shakes){s.age+=dt;if(s.age>=s.duration)shakes.delete(target);}

  // Step projectiles & collide with walls/buildings or living revenants
  const foes=o.getFoes();
  for(let i=projectiles.length-1;i>=0;i--){
   const p=projectiles[i];p.age+=dt;
   const prevU=p.u,prevV=p.v;
   const stepU=p.vx*dt/1000,stepV=p.vy*dt/1000,dist=Math.hypot(stepU,stepV);
   const nextU=prevU+stepU,nextV=prevV+stepV;
   const s=screenVec(p.vx,p.vy),angle=Math.atan2(s.y,s.x);
   const wallRay=clampTargetToWall(prevU,prevV,nextU,nextV);
   if(wallRay.hit||(o.blocked&&o.blocked(tilePoint(nextU,nextV).x,tilePoint(nextU,nextV).y))){
    p.u=wallRay.u;p.v=wallRay.v;p.traveled+=dist*wallRay.t;
    p.trail.push({u:p.u,v:p.v});if(p.trail.length>8)p.trail.shift();
    totalWallHits++;
    addSpark(p.kind==='flame-bolt'?'fire':'arcane',p.u,p.v,angle,18);
    p.alive=false;
   }else{
    p.u=nextU;p.v=nextV;p.traveled+=dist;
    p.trail.push({u:p.u,v:p.v});if(p.trail.length>8)p.trail.shift();
    for(const f of foes){
     if(!f.alive||p.hitIds.has(f))continue;
     if(Math.hypot(f.x-p.u,f.y-p.v)<=p.radius+.42){
      p.hitIds.add(f);
      if(p.kind==='rift-bolt'||p.kind==='flame-bolt'){
       const hitDist=Math.hypot(f.x-p.u,f.y-p.v);
       p.u=f.x;p.v=f.y;p.traveled+=hitDist;
      }
      let sameFrameImpacts=0;
      for(let k=sparks.length-1;k>=0;k--){if(sparks[k].age===0)sameFrameImpacts++;else break;}
      applyHitToFoe(f,{scale:p.damageScale,forceCrit:p.forceCrit,sparkKind:p.kind==='flame-bolt'?'fire':'arcane',angle});
      if(sameFrameImpacts<3){
       cue(`${p.skill}.impact`,{u:p.u,v:p.v,yaw:yawOf(p.vx,p.vy)});
      }
      p.alive=false;
      break;
     }
    }
   }
   for(const h of p.fx)h.setLocal(p.traveled);
   if(!p.alive||p.traveled>=p.range){
    if(p.alive)addSpark(p.kind==='flame-bolt'?'fire':'arcane',p.u,p.v,angle,22);
    if((p.kind==='rift-bolt'||p.kind==='flame-bolt')&&!p.alive)lingeringFx.push({fx:p.fx,age:0,duration:p.kind==='rift-bolt'?220:180});
    else for(const h of p.fx)h.release();
    projectiles.splice(i,1);
   }
  }

  for(let i=burnSoils.length-1;i>=0;i--){const b=burnSoils[i];b.clock.advance(dt);if(b.clock.complete)burnSoils.splice(i,1);}

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
  flameSheets.frame(fxDtMs/1000,origin);fx.frame(fxDtMs/1000);fxDtMs=0;
  const k=origin.scale,dpr=Math.min(devicePixelRatio||1,2);

  // Dotted ground AoE telegraphs & active impact zones (with wall/building cutOut occlusion)
  const activeZoneIds=new Set<number>();
  const zonePalette=(kind:AoEKind)=>{
   if(kind==='ember-snare'||kind==='flame-cone')return {major:'rgba(255,112,24,0.96)',minor:'rgba(208,36,8,0.92)',grid:'rgba(68,14,4,0.90)',core:'rgba(255,216,84,0.98)'};
   if(kind==='shockwave')return {major:'rgba(255,124,28,0.96)',minor:'rgba(196,40,10,0.92)',grid:'rgba(58,12,4,0.90)',core:'rgba(255,224,104,0.98)'};
   if(kind==='cleave-cone')return {major:'rgba(84,118,255,0.96)',minor:'rgba(56,28,168,0.94)',grid:'rgba(28,8,88,0.90)',core:'rgba(136,236,255,0.98)'};
   return {major:'rgba(108,52,235,0.96)',minor:'rgba(68,22,180,0.94)',grid:'rgba(34,8,100,0.90)',core:'rgba(164,114,255,0.98)'};
  };
  const renderZone=(id:number,kind:AoEKind,shape:'circle'|'cone',u:number,v:number,radius:number,angle:number,spread:number,age:number,duration:number,isImpact:boolean)=>{
   activeZoneIds.add(id);
   const w=tilePoint(u,v),s=toScreen(u,v);
   const zDpr=1;
   const rx=Math.max(24,Math.round(radius*64*Math.SQRT2/2)*2),ry=Math.max(12,Math.round(rx*.52));
   const padX=rx+8,padY=ry+8,wpx=padX*2,hpx=padY*2;
   const qAngle=shape==='circle'?0:Math.round(angle/(Math.PI/8))*(Math.PI/8);
   const baseKey=`${kind}:${shape}:${rx}:${qAngle.toFixed(2)}:${spread.toFixed(2)}:${zDpr}`;
   const zKey=baseKey;
   let zv=zoneViews.get(id);
   if(!zv){
    const matchIdx=zonePool.findIndex(p=>p.key===zKey);
    zv=matchIdx>=0?zonePool.splice(matchIdx,1)[0]:zonePool.pop();
    if(zv){zv.view.sprite.visible=true;}
    else{
     const el=document.createElement('canvas');
     const view=createCanvasSprite(el);
     groundZonesLayer.addChild(view.sprite);
     zv={el,ctx:el.getContext('2d')!,view,key:''};
    }
    zoneViews.set(id,zv);
   }
   if(zv.key!==zKey){
    zv.key=zKey;
    const aw=Math.ceil(wpx*zDpr),ah=Math.ceil(hpx*zDpr);
    let baseCan=zoneBaseCache.get(baseKey);
    if(!baseCan){
     if(zoneBaseCache.size>=32)zoneBaseCache.delete(zoneBaseCache.keys().next().value!);
     baseCan=document.createElement('canvas');
     baseCan.width=aw;baseCan.height=ah;
     const bctx=baseCan.getContext('2d')!;
     bctx.setTransform(zDpr,0,0,zDpr,padX*zDpr,padY*zDpr);
     bctx.imageSmoothingEnabled=false;
     const pal=zonePalette(kind);
     const halfSpread=Math.max(0.28,spread*.55);
     const hash=(n:number)=>(((Math.imul(n,1664525)+1013904223)>>>0)&0xffff)/0xffff;
     const drawIrregularDashedArc=(rBase:number,a0:number,a1:number,seed:number,isOuter:boolean)=>{
      const span=Math.max(0.1,a1-a0);
      const arcPx=rBase*span*.78;
      const steps=Math.max(64,Math.round(arcPx/1.4));
      let inDash=true,segRemain=6+Math.floor(hash(seed)*4),segIdx=0;
      for(let i=0;i<=steps;i++){
       if(--segRemain<=0){
        segIdx++;
        inDash=!inDash;
        // 6..10 tiny closely-spaced pixel dots per dash, 5..8 steps per gap
        segRemain=inDash?(6+Math.floor(hash(seed+segIdx*17)*5)):(5+Math.floor(hash(seed+segIdx*31)*4));
       }
       if(!inDash)continue;
       const t=i/steps,ang=a0+t*span;
       const wave=Math.sin(ang*5+seed)*2.2+Math.cos(ang*11-seed*1.7)*1.4+Math.sin(ang*19+seed*2.3)*.8;
       const jitR=(hash(seed+i*23)-.5)*1.3,jitT=(hash(seed+i*41)-.5)*.9;
       const rCur=Math.max(6,rBase+wave+jitR);
       const tx=-Math.sin(ang)*jitT,ty=Math.cos(ang)*jitT*.52;
       const px=Math.round(Math.cos(ang)*rCur+tx),py=Math.round(Math.sin(ang)*rCur*.52+ty);
       const hot=isOuter?(i%2===0):(i%3===0);
       const ps=(i%4===0)?2:1;
       bctx.fillStyle=hot?(isOuter?pal.major:pal.minor):pal.grid;
       bctx.fillRect(px,py,ps,ps);
       if(hot&&isOuter&&(i%5===0)){
        bctx.fillStyle=pal.core;
        bctx.fillRect(px,py,1,1);
       }
      }
     };
     if(shape==='cone'){
      drawIrregularDashedArc(rx*.95,qAngle-halfSpread,qAngle+halfSpread,11,true);
      drawIrregularDashedArc(rx*.68,qAngle-halfSpread*.94,qAngle+halfSpread*.94,37,false);
      drawIrregularDashedArc(rx*.42,qAngle-halfSpread*.88,qAngle+halfSpread*.88,73,false);
      for(const side of [-1,1]){
       const ang=qAngle+side*halfSpread;
       const ca=Math.cos(ang),sa=Math.sin(ang),nx=-sa,ny=ca;
       const rSteps=Math.max(36,Math.round((rx*.94-10)/1.45));
       let inDash=true,segRemain=6,segIdx=0;
       const seed=side<0?101:203;
       for(let i=0;i<=rSteps;i++){
        if(--segRemain<=0){
         segIdx++;inDash=!inDash;
         segRemain=inDash?(6+Math.floor(hash(seed+segIdx*19)*4)):(5+Math.floor(hash(seed+segIdx*29)*3));
        }
        if(!inDash)continue;
        const rFrac=i/rSteps,d=10+rFrac*(rx*.95-10);
        const perp=Math.sin(rFrac*11+seed)*2.2+Math.cos(rFrac*21-seed)*1.2+(hash(seed+i*37)-.5)*1.3;
        const px=Math.round(ca*d+nx*perp),py=Math.round((sa*d+ny*perp)*.52);
        const hot=i%2===0,ps=(i%4===0)?2:1;
        bctx.fillStyle=hot?pal.major:pal.minor;
        bctx.fillRect(px,py,ps,ps);
       }
      }
     }else{
      drawIrregularDashedArc(rx*.95,0,Math.PI*2,19,true);
      drawIrregularDashedArc(rx*.68,0,Math.PI*2,53,false);
      drawIrregularDashedArc(rx*.40,0,Math.PI*2,89,false);
     }
     zoneBaseCache.set(baseKey,baseCan);
    }
    if(zv.el.width!==aw||zv.el.height!==ah){zv.el.width=aw;zv.el.height=ah;}
    const ctx=zv.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalCompositeOperation='copy';
    ctx.drawImage(baseCan,0,0);
    ctx.globalCompositeOperation='source-over';
    zv.view.sync(wpx*k,hpx*k);
   }
   const t=age/Math.max(1,duration);
   const alpha=isImpact?(t<.65?0.95:Math.max(0,0.95*(1-(t-.65)/.35))):Math.min(0.95,0.45+t*0.5);
   zv.view.sprite.position.set(s.x-padX*k,s.y-padY*k);
   zv.view.sprite.width=wpx*k;
   zv.view.sprite.height=hpx*k;
   zv.view.sprite.alpha=alpha;
  };
  const skipHeroZones=fx.playable()&&(o.getHero().heroId==='ember-warden'||o.getHero().heroId==='rift-runner');
  if(!skipHeroZones){
   for(const a of aoes){
    renderZone(a.id,a.kind,a.shape,a.u,a.v,a.radius,a.angle,a.spread,a.age,a.duration,false);
   }
   for(const imp of impacts){
    renderZone(imp.id,imp.kind,imp.shape??'circle',imp.u,imp.v,imp.radius,imp.angle,imp.spread??Math.PI*2,imp.age,imp.duration,true);
   }
  }
  for(const [id,zv] of zoneViews){
   if(!activeZoneIds.has(id)){
    zoneViews.delete(id);
    zv.view.sprite.visible=false;
    if(zonePool.length<16)zonePool.push(zv);
    else zv.view.sprite.destroy();
   }
  }

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
     const role=fl.kind==='crit'?'combat-crit':fl.kind==='banner'?'combat-banner':fl.kind==='incoming'?'combat-incoming':fl.kind==='heal'?'combat-heal':fl.kind==='xp'?'combat-xp':'combat-hit';
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
  const fxState=fx.ready()?'ready':fx.failed()?'failed':'loading';
  const fxPart=fx.particleCount(),fxLv=fx.liveCount();
  const nextStatsKey=`${floats.length}|${projectiles.length}|${aoes.length}|${impacts.length}|${levelUps.length}|${slashes.length}|${combos.length}|${totalCrits}|${totalNormals}|${totalAutoCasts}|${totalSimultaneousCasts}|${totalTrinityCasts}|${lastSkill}|${lastSimultaneousSkills.length}|${fxState}|${fxPart}|${fxLv}`;
  if(vfxStats._statsKey!==nextStatsKey){
   vfxStats._statsKey=nextStatsKey;
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
   vfxStats.fx=fxState;vfxStats.fxParticles=String(fxPart);vfxStats.fxLive=String(fxLv);
  }
 }

 return {
  step,
  render,
  place(x:number,y:number,scale:number){origin={x,y,scale};fx.place(x,y,scale);},
  setFloatsVisible(visible:boolean){floatsLayer.visible=visible;},
  fx,
  spawnSlash,
  applyHitToFoe,
  recordCoopEnemyDamage,
  recordHeroDamage,
  recordHeroHeal,
  recordHeroXp,
  triggerLevelUp,
  spawnProjectile,
  spawnAoE,
  castSkill,
  castSimultaneous,
  resetCooldowns,
  shakeOffset,
  cooldown:(id:SkillId)=>Math.max(0,cooldowns[id]??0),
  snapshot:()=>({
   flameSheets:flameSheets.snapshot(),
   activeFloats:floats.map(f=>{const fv=floatViews.get(f.id);const hasBubbleOrFrame=Boolean(fv&&fv.root.children.some(c=>!(c instanceof MsdfText)));return {kind:f.kind,text:f.text,subtext:f.subtext,u:+f.u.toFixed(2),v:+f.v.toFixed(2),scale:+f.scale.toFixed(2),frameless:!hasBubbleOrFrame};}),
   activeProjectiles:projectiles.map(p=>({id:p.id,kind:p.kind,u:+p.u.toFixed(2),v:+p.v.toFixed(2),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),traveled:+p.traveled.toFixed(2)})),
   burnSoil:{damagePerTick:BURN_SOIL.damagePerTick,balancePending:true,totalTicks:totalBurnSoilTicks,zones:burnSoils.map(b=>({elapsedMs:b.clock.elapsedMs,ticks:b.clock.emitted,u:b.area.u,v:b.area.v}))},
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
    wallHits:totalWallHits,
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
