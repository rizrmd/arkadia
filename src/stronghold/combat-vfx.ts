import {tilePoint} from './terrain';
import {rollHit,reach,skillRank,skillDamageMultiplier,skillAreaMultiplier,skillCooldownMs,type Progression} from './progression';
import type {Fighter} from '../characters/combat';
import type {HeroId} from './heroes';

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
 id:number;kind:ProjectileKind;u:number;v:number;vx:number;vy:number;
 radius:number;range:number;traveled:number;damageScale:number;forceCrit?:boolean;
 trail:{u:number;v:number}[];age:number;alive:boolean;hitIds:Set<object>;
};
export type AoEKind='rift-trap'|'ember-snare'|'shockwave'|'cleave-cone'|'flame-cone';
export type AoETelegraph={
 id:number;kind:AoEKind;shape:'circle'|'cone';u:number;v:number;
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
 layer:HTMLElement;
 heroCanvas:HTMLCanvasElement;
 backLayer:HTMLElement;
 frontLayer:HTMLElement;
 getHero:()=>{u:number;v:number;facing:number;back:boolean;vertical:boolean;heroId:HeroId};
 getRun:()=>Progression;
 getFoes:()=>Fighter[];
 onKill:(f:Fighter)=>void;
 random:()=>number;
}){
 // Ground under-foot layer (2:1 isometric AoE telegraphs, Level-Up rune rings, Cinder Step scorch marks, Trinity Resonance rings)
 const groundCanvas=document.createElement('canvas');
 groundCanvas.id='world-vfx-ground';
 groundCanvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
 o.backLayer.before(groundCanvas);

 // Over-character layer (slash arcs, hit sparks, projectiles, AoE impact bursts, Level-Up light pillar, RO floating numbers)
 const overCanvas=document.createElement('canvas');
 overCanvas.id='world-vfx-over';
 overCanvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3';
 o.frontLayer.after(overCanvas);

 const gc=groundCanvas.getContext('2d')!,oc=overCanvas.getContext('2d')!;
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
 let lastComboBannerMs=0;

 function addFloat(kind:FloatKind,text:string,u:number,v:number,subtext?:string){
  const spread=(o.random()-.5)*38;
  const vy=kind==='crit'?-112:kind==='banner'?-54:kind==='heal'?-68:-92;
  const vx=kind==='banner'||kind==='heal'?spread*.25:spread;
  const duration=kind==='crit'?1150:kind==='banner'?1650:kind==='heal'?980:860;
  const scale=kind==='crit'?1.42:kind==='banner'?1.35:1;
  floats.push({id:nextId++,kind,text,subtext,u,v,ox:(o.random()-.5)*10,oy:0,vx,vy,age:0,duration,scale});
 }

 function addSpark(kind:SparkKind,u:number,v:number,angle=0,radius=26){
  sparks.push({id:nextId++,kind,u,v,angle,age:0,duration:kind==='crit'?380:270,radius});
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
 }

 function triggerLevelUp(level:number,u?:number,v?:number){
  const h=o.getHero(),tu=u??h.u,tv=v??h.v;
  totalLevelUps++;
  levelUps.push({id:nextId++,u:tu,v:tv,level,age:0,duration:1750});
  addFloat('banner',`LEVEL UP!`,tu,tv,`LV. ${level}`);
 }

 function spawnProjectile(opts:{
  kind?:ProjectileKind;u?:number;v?:number;angle?:number;speed?:number;
  range?:number;radius?:number;damageScale?:number;forceCrit?:boolean;
 }={}){
  const h=o.getHero(),u=opts.u??h.u,v=opts.v??h.v;
  const angle=opts.angle??facingScreenAngle(h);
  const dir=tileVec(Math.cos(angle),Math.sin(angle));
  const speed=opts.speed??6.8;
  const kind=opts.kind??(h.heroId==='ember-warden'?'flame-bolt':'rift-bolt');
  totalProjectiles++;
  const p:Projectile={
   id:nextId++,kind,u,v,vx:dir.u*speed,vy:dir.v*speed,
   radius:opts.radius??.38,range:opts.range??4.8,traveled:0,
   damageScale:opts.damageScale??.85,forceCrit:opts.forceCrit,
   trail:[{u,v}],age:0,alive:true,hitIds:new Set()
  };
  projectiles.push(p);
  return p;
 }

 function spawnAoE(opts:{
  kind?:AoEKind;shape?:'circle'|'cone';u?:number;v?:number;
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
  const aoe:AoETelegraph={
   id:nextId++,kind,shape,u,v,
   radius:opts.radius??1.45*reach(o.getRun()),
   angle,spread:opts.spread??(shape==='cone'?Math.PI*.62:Math.PI*2),
   age:0,duration:opts.duration??680,
   damageScale:opts.damageScale??1.15,forceCrit:opts.forceCrit,detonated:false
  };
  aoes.push(aoe);
  return aoe;
 }

 function detonateAoE(a:AoETelegraph){
  if(a.detonated)return;
  a.detonated=true;
  impacts.push({id:nextId++,kind:a.kind,u:a.u,v:a.v,radius:a.radius,angle:a.angle,age:0,duration:580});
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

 function castSkill(id:SkillId,opts:{targetU?:number;targetV?:number;forceCrit?:boolean;comboScale?:number}={}):boolean{
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

  switch(id){
   case 'rift-bolt':{
    spawnSlash(h.u,h.v,angle,false);
    const offsets=rank>=3?[-0.22,0,0.22]:rank===2?[-0.12,0.12]:[0];
    for(const off of offsets){
     spawnProjectile({
      kind:'rift-bolt',
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
      kind:'flame-bolt',
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
     kind:id==='cinder-step'?'flame-cone':'cleave-cone',
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
   combos.push({id:nextId++,u:h.u,v:h.v,count:unique.length,skills:unique,age:0,duration:960});
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
     p.alive=false;
     break;
    }
   }
   if(!p.alive||p.traveled>=p.range){
    if(p.alive)addSpark(p.kind==='flame-bolt'?'fire':'arcane',p.u,p.v,angle,22);
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

 function drawSpikyBadge(c:CanvasRenderingContext2D,cx:number,cy:number,rx:number,ry:number,points:number){
  c.beginPath();
  for(let i=0;i<points*2;i++){
   const a=(i*Math.PI)/points-Math.PI/2;
   const r=i%2===0?1:(i%4===1?.56:.68);
   const px=cx+Math.cos(a)*rx*r,py=cy+Math.sin(a)*ry*r;
   i===0?c.moveTo(px,py):c.lineTo(px,py);
  }
  c.closePath();
 }

 function render(){
  const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight,k=origin.scale;
  for(const canvas of [groundCanvas,overCanvas]){
   const pw=Math.max(1,Math.floor(w*dpr)),ph=Math.max(1,Math.floor(h*dpr));
   if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  }
  gc.setTransform(dpr,0,0,dpr,0,0);gc.clearRect(0,0,w,h);
  oc.setTransform(dpr,0,0,dpr,0,0);oc.clearRect(0,0,w,h);

  const heroPos=o.getHero();

  // 0. GROUND LAYER: Trinity / Dual Simultaneous Auto-Cast Resonance Rings
  for(const cb of combos){
   const p=toScreen(heroPos.u,heroPos.v),t=Math.min(1,cb.age/cb.duration);
   const alpha=t<.15?t/.15:Math.max(0,1-(t-.15)/.85);
   const baseR=(cb.count>=3?76:58)*k*reach(o.getRun());
   gc.save();
   gc.translate(p.x,p.y);
   gc.scale(1,.5);
   gc.globalAlpha=alpha;
   const ringColors=cb.count>=3?['#ffe066','#5ce1e6','#ff6b35']:['#ffe066','#5ce1e6'];
   for(let idx=0;idx<ringColors.length;idx++){
    const rt=Math.min(1,Math.max(0,t*1.25-idx*.12));
    const r=baseR*(.35+rt*.85);
    gc.beginPath();gc.arc(0,0,r,0,Math.PI*2);
    gc.lineWidth=(1-rt)*4+1.6;
    gc.strokeStyle=ringColors[idx];
    gc.stroke();
   }
   gc.rotate(-cb.age*.004);
   const spokes=cb.count>=3?9:6;
   gc.strokeStyle='#fff3b0';gc.lineWidth=1.8;
   for(let i=0;i<spokes;i++){
    const ang=(i*Math.PI*2)/spokes;
    gc.beginPath();
    gc.moveTo(Math.cos(ang)*baseR*.25,Math.sin(ang)*baseR*.25);
    gc.lineTo(Math.cos(ang)*baseR*.95,Math.sin(ang)*baseR*.95);
    gc.stroke();
   }
   gc.restore();
  }

  // 1. GROUND LAYER: 2:1 Isometric AoE Telegraphs (under character feet)
  for(const a of aoes){
   const p=toScreen(a.u,a.v),progress=Math.min(1,Math.max(0,a.age/a.duration));
   const rx=a.radius*64*k;
   const isFire=a.kind==='ember-snare'||a.kind==='flame-cone';
   const isSeismic=a.kind==='shockwave'||a.kind==='cleave-cone';
   const stroke=isFire?'#ff6b2b':isSeismic?'#f5c453':'#4be3ff';
   const fill=isFire?'rgba(255,88,28,0.24)':isSeismic?'rgba(245,196,83,0.22)':'rgba(75,227,255,0.22)';
   const innerFill=isFire?'rgba(255,168,52,0.46)':isSeismic?'rgba(255,226,122,0.44)':'rgba(142,118,255,0.46)';

   gc.save();
   gc.translate(p.x,p.y);
   // 2:1 isometric ground plane projection
   gc.scale(1,.5);
   if(a.shape==='cone'){
    const start=a.angle-a.spread/2,end=a.angle+a.spread/2;
    gc.beginPath();gc.moveTo(0,0);gc.arc(0,0,rx,start,end);gc.closePath();
    gc.fillStyle=fill;gc.fill();
    gc.lineWidth=2.4;gc.strokeStyle=stroke;gc.stroke();

    gc.beginPath();gc.moveTo(0,0);gc.arc(0,0,rx*progress,start,end);gc.closePath();
    gc.fillStyle=innerFill;gc.fill();
   }else{
    // Outer telegraph boundary ellipse (circle in 2:1 scaled space)
    gc.beginPath();gc.arc(0,0,rx,0,Math.PI*2);
    gc.fillStyle=fill;gc.fill();
    gc.lineWidth=2.5;gc.strokeStyle=stroke;gc.stroke();

    // Animated fill progress disk
    gc.beginPath();gc.arc(0,0,rx*progress,0,Math.PI*2);
    gc.fillStyle=innerFill;gc.fill();

    // Inner rotating geometric rune ring
    gc.rotate(a.age*.0035);
    gc.strokeStyle=stroke;gc.lineWidth=1.5;gc.setLineDash([6,5]);
    gc.beginPath();gc.arc(0,0,rx*.72,0,Math.PI*2);gc.stroke();
    gc.setLineDash([]);
    for(let i=0;i<6;i++){
     const ang=(i*Math.PI)/3;
     gc.beginPath();
     gc.moveTo(Math.cos(ang)*rx*.42,Math.sin(ang)*rx*.42);
     gc.lineTo(Math.cos(ang)*rx*.95,Math.sin(ang)*rx*.95);
     gc.stroke();
    }
   }
   gc.restore();
  }

  // 2. GROUND LAYER: Level-Up Expanding Isometric Rune Aura Rings (under hero feet)
  for(const lv of levelUps){
   const p=toScreen(heroPos.u,heroPos.v),t=Math.min(1,lv.age/lv.duration);
   const alpha=t<.15?t/.15:Math.max(0,1-(t-.15)/.85);
   const baseR=48*k;
   gc.save();
   gc.translate(p.x,p.y);
   gc.scale(1,.5);
   gc.globalAlpha=alpha;
   // Expanding concentric shockwave rings
   for(let ring=0;ring<3;ring++){
    const rt=(t*1.35-ring*.18);if(rt<=0||rt>1)continue;
    const r=baseR*(.45+rt*1.45);
    gc.beginPath();gc.arc(0,0,r,0,Math.PI*2);
    gc.lineWidth=(1-rt)*4.5+1;
    gc.strokeStyle=ring%2===0?'#ffe27a':'#7ce8ff';
    gc.stroke();
   }
   // Rotating 8-point RO blessing rune circle
   gc.rotate(lv.age*.0025);
   const runeR=baseR*(.85+.12*Math.sin(lv.age*.008));
   gc.fillStyle='rgba(255,224,112,0.22)';
   gc.beginPath();gc.arc(0,0,runeR,0,Math.PI*2);gc.fill();
   gc.lineWidth=2.4;gc.strokeStyle='#ffd859';gc.stroke();
   for(let i=0;i<8;i++){
    const a=(i*Math.PI)/4;
    gc.beginPath();
    gc.moveTo(Math.cos(a)*runeR*.35,Math.sin(a)*runeR*.35);
    gc.lineTo(Math.cos(a)*runeR,Math.sin(a)*runeR);
    gc.stroke();
   }
   gc.restore();
  }

  // 3. GROUND LAYER: Dash / Cinder Step Ground Trails
  for(const g of ghosts){
   if(g.age<0)continue;
   const p=toScreen(g.u,g.v),t=g.age/g.duration,alpha=Math.max(0,1-t);
   gc.save();
   gc.translate(p.x,p.y);
   gc.scale(1,.5);
   gc.globalAlpha=alpha*.75;
   const r=22*k*(1+t*.4);
   gc.beginPath();gc.arc(0,0,r,0,Math.PI*2);
   gc.fillStyle=g.kind==='cinder-step'?'rgba(255,102,24,0.45)':'rgba(90,224,255,0.4)';
   gc.fill();
   gc.lineWidth=2;gc.strokeStyle=g.kind==='cinder-step'?'#ffbc42':'#7be3ff';gc.stroke();
   gc.restore();
  }

  // 4. OVER LAYER: Dash Afterimage Silhouettes
  for(const g of ghosts){
   if(g.age<0)continue;
   const p=toScreen(g.u,g.v),t=g.age/g.duration,alpha=Math.max(0,(1-t)*.7);
   oc.save();
   oc.translate(p.x,p.y-28*k);
   oc.globalAlpha=alpha;
   const grad=oc.createRadialGradient(0,0,2*k,0,0,26*k);
   if(g.kind==='cinder-step'){
    grad.addColorStop(0,'#fff3b0');grad.addColorStop(.5,'#ff6b2b');grad.addColorStop(1,'rgba(255,50,0,0)');
   }else{
    grad.addColorStop(0,'#e0fbff');grad.addColorStop(.5,'#48cae4');grad.addColorStop(1,'rgba(114,9,183,0)');
   }
   oc.fillStyle=grad;
   oc.beginPath();oc.ellipse(0,0,14*k,26*k,0,0,Math.PI*2);oc.fill();
   oc.restore();
  }

  // 5. OVER LAYER: Directional Weapon Swing Slash Arc Trails (scaling with Arc Nova rank)
  for(const s of slashes){
   const p=toScreen(s.u,s.v),t=s.age/s.duration,alpha=Math.max(0,1-t*t);
   const radius=(38*s.reachScale+(s.crit?10:0))*k;
   const sweep=(Math.PI*.72+Math.min(Math.PI*.48,s.novaRank*.18));
   const start=s.angle-sweep*.5,end=s.angle+sweep*.5;

   oc.save();
   oc.translate(p.x,p.y-24*k);
   oc.globalAlpha=alpha;
   // Primary crescent slash arc
   oc.beginPath();
   oc.arc(0,0,radius,start,end);
   oc.arc(0,0,radius*.58,end,start,true);
   oc.closePath();
   const primaryColor=s.crit?'#ffd644':s.hero==='ember-warden'?'#ff7b29':'#66e3ff';
   const coreColor=s.crit?'#fff9d2':s.hero==='ember-warden'?'#ffe299':'#e6fcff';
   oc.fillStyle=primaryColor;oc.fill();
   oc.lineWidth=(s.crit?3.5:2.4)*k;oc.strokeStyle=coreColor;oc.stroke();

   // Secondary Arc Nova outer wave when Arc Nova rank > 0 or crit
   if(s.novaRank>0||s.crit){
    const outerR=radius*1.24;
    oc.beginPath();
    oc.arc(0,0,outerR,start-.12,end+.12);
    oc.lineWidth=(2.5+s.novaRank*.8)*k;
    oc.strokeStyle=s.crit?'#ff3b30':s.hero==='ember-warden'?'#ffba49':'#a984ff';
    oc.stroke();
   }
   oc.restore();
  }

  // 6. OVER LAYER: Projectiles (with directional rotation & glowing trail)
  for(const p of projectiles){
   const cur=toScreen(p.u,p.v);
   const sv=screenVec(p.vx,p.vy),angle=Math.atan2(sv.y,sv.x);
   const isFire=p.kind==='flame-bolt';
   // Trail ribbon
   if(p.trail.length>1){
    oc.save();
    for(let i=1;i<p.trail.length;i++){
     const a=toScreen(p.trail[i-1].u,p.trail[i-1].v),b=toScreen(p.trail[i].u,p.trail[i].v);
     const frac=i/p.trail.length;
     oc.beginPath();oc.moveTo(a.x,a.y-22*k);oc.lineTo(b.x,b.y-22*k);
     oc.lineWidth=frac*7*k;
     oc.strokeStyle=isFire?`rgba(255,115,35,${frac*.75})`:`rgba(82,229,255,${frac*.75})`;
     oc.lineCap='round';oc.stroke();
    }
    oc.restore();
   }
   // Projectile head rotated along flight vector
   oc.save();
   oc.translate(cur.x,cur.y-22*k);
   oc.rotate(angle);
   const len=18*k,wid=7*k;
   // Outer glow
   oc.fillStyle=isFire?'rgba(255,94,19,0.5)':'rgba(72,219,251,0.5)';
   oc.beginPath();oc.ellipse(0,0,len*1.25,wid*1.4,0,0,Math.PI*2);oc.fill();
   // Spear/Bolt crystal body
   oc.beginPath();
   oc.moveTo(len,0);oc.lineTo(-len*.45,-wid);oc.lineTo(-len*.85,0);oc.lineTo(-len*.45,wid);oc.closePath();
   oc.fillStyle=isFire?'#ff9f1c':'#72efdd';oc.fill();
   oc.lineWidth=1.8*k;oc.strokeStyle='#ffffff';oc.stroke();
   oc.restore();
  }

  // 7. OVER LAYER: AoE Detonation Impact Bursts
  for(const imp of impacts){
   const p=toScreen(imp.u,imp.v),t=imp.age/imp.duration,alpha=Math.max(0,1-t);
   const rx=imp.radius*64*k;
   const isFire=imp.kind==='ember-snare'||imp.kind==='flame-cone';
   const isSeismic=imp.kind==='shockwave'||imp.kind==='cleave-cone';
   oc.save();
   oc.translate(p.x,p.y);
   oc.globalAlpha=alpha;
   // Vertical eruption pillar / dome
   const pillarH=(isFire?115:isSeismic?70:95)*k*(.5+t*.65);
   const pillarW=rx*(.75-t*.25);
   const grad=oc.createLinearGradient(0,0,0,-pillarH);
   if(isFire){
    grad.addColorStop(0,'rgba(255,230,128,0.92)');grad.addColorStop(.5,'rgba(255,92,24,0.75)');grad.addColorStop(1,'rgba(255,30,0,0)');
   }else if(isSeismic){
    grad.addColorStop(0,'rgba(255,238,153,0.9)');grad.addColorStop(.5,'rgba(217,155,56,0.65)');grad.addColorStop(1,'rgba(120,85,40,0)');
   }else{
    grad.addColorStop(0,'rgba(212,252,255,0.92)');grad.addColorStop(.5,'rgba(114,9,183,0.72)');grad.addColorStop(1,'rgba(58,12,163,0)');
   }
   oc.fillStyle=grad;
   oc.beginPath();
   oc.moveTo(-pillarW,0);oc.lineTo(-pillarW*.65,-pillarH);oc.lineTo(pillarW*.65,-pillarH);oc.lineTo(pillarW,0);
   oc.closePath();oc.fill();

   // Expanding over-character shockwave ring
   oc.save();
   oc.scale(1,.5);
   oc.beginPath();oc.arc(0,0,rx*(.4+t*.75),0,Math.PI*2);
   oc.lineWidth=(1-t)*5*k+1.5;
   oc.strokeStyle=isFire?'#ffbe3b':isSeismic?'#ffe17d':'#7df9ff';
   oc.stroke();
   oc.restore();

   // Radial impact rays
   const rays=8;
   oc.strokeStyle='#ffffff';oc.lineWidth=2*k;
   for(let i=0;i<rays;i++){
    const a=(i*Math.PI*2)/rays+t*.5;
    const r0=rx*.18*t,r1=rx*(.45+t*.55);
    oc.beginPath();
    oc.moveTo(Math.cos(a)*r0,Math.sin(a)*r0*.5-14*k);
    oc.lineTo(Math.cos(a)*r1,Math.sin(a)*r1*.5-32*k*t);
    oc.stroke();
   }
   oc.restore();
  }

  // 8. OVER LAYER: Hit Spark Sprites (Normal & RO-Style Critical)
  for(const sp of sparks){
   const p=toScreen(sp.u,sp.v),t=sp.age/sp.duration,alpha=Math.max(0,1-t);
   const r=sp.radius*k*(.45+t*.75);
   oc.save();
   oc.translate(p.x,p.y-28*k);
   oc.globalAlpha=alpha;
   if(sp.kind==='crit'){
    // Sharp RO-style critical twin cross-slash + crimson/gold shock burst
    oc.lineWidth=3.2*k*(1-t*.5);
    oc.strokeStyle='#ff2a2a';
    for(const ang of [Math.PI/4,-Math.PI/4]){
     oc.beginPath();
     oc.moveTo(Math.cos(ang)*-r*1.25,Math.sin(ang)*-r*1.25);
     oc.lineTo(Math.cos(ang)*r*1.25,Math.sin(ang)*r*1.25);
     oc.stroke();
    }
    oc.lineWidth=2*k;oc.strokeStyle='#fff38a';
    for(let i=0;i<8;i++){
     const a=(i*Math.PI)/4+sp.angle;
     oc.beginPath();oc.moveTo(Math.cos(a)*r*.2,Math.sin(a)*r*.2);oc.lineTo(Math.cos(a)*r,Math.sin(a)*r);oc.stroke();
    }
    oc.beginPath();oc.arc(0,0,r*.65,0,Math.PI*2);
    oc.strokeStyle='#ffd23f';oc.lineWidth=2.2*k;oc.stroke();
   }else{
    const color=sp.kind==='incoming'?'#ff5252':sp.kind==='fire'?'#ff9233':sp.kind==='arcane'?'#66e3ff':'#fff5cc';
    oc.strokeStyle=color;oc.lineWidth=2.2*k*(1-t*.4);
    for(let i=0;i<6;i++){
     const a=(i*Math.PI)/3+sp.angle;
     oc.beginPath();oc.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);oc.lineTo(Math.cos(a)*r,Math.sin(a)*r);oc.stroke();
    }
   }
   oc.restore();
  }

  // 9. OVER LAYER: Level-Up Vertical Light Pillar + Rising Motes
  for(const lv of levelUps){
   const p=toScreen(heroPos.u,heroPos.v),t=Math.min(1,lv.age/lv.duration);
   const alpha=t<.12?t/.12:Math.max(0,1-(t-.12)/.88);
   const pillarW=36*k*(1-.18*t),pillarH=195*k;
   oc.save();
   oc.translate(p.x,p.y);
   oc.globalAlpha=alpha;
   const grad=oc.createLinearGradient(0,6*k,0,-pillarH);
   grad.addColorStop(0,'rgba(255,244,184,0.95)');
   grad.addColorStop(.35,'rgba(255,214,92,0.75)');
   grad.addColorStop(.75,'rgba(122,232,255,0.42)');
   grad.addColorStop(1,'rgba(122,232,255,0)');
   oc.fillStyle=grad;
   oc.beginPath();
   oc.moveTo(-pillarW,0);oc.lineTo(-pillarW*.7,-pillarH);oc.lineTo(pillarW*.7,-pillarH);oc.lineTo(pillarW,0);
   oc.closePath();oc.fill();

   // Inner bright core beam
   const coreGrad=oc.createLinearGradient(0,0,0,-pillarH*.9);
   coreGrad.addColorStop(0,'rgba(255,255,255,0.95)');
   coreGrad.addColorStop(.6,'rgba(255,245,190,0.65)');
   coreGrad.addColorStop(1,'rgba(255,255,255,0)');
   oc.fillStyle=coreGrad;
   oc.fillRect(-pillarW*.32,-pillarH*.9,pillarW*.64,pillarH*.9);

   // Rising golden motes / angel sparks
   for(let i=0;i<10;i++){
    const mt=(t*1.6+i*.11)%1;
    const mx=Math.sin(i*2.1+t*5)*pillarW*.75,my=-mt*pillarH*.85;
    oc.fillStyle=i%2===0?'#fff7b2':'#9bf6ff';
    oc.beginPath();oc.arc(mx,my,2.6*k*(1-mt*.5),0,Math.PI*2);oc.fill();
   }
   oc.restore();
  }

  // 10. OVER LAYER: RO-Style Floating Combat Text & Level-Up / Trinity Combo Banner
  for(const fl of floats){
   const base=toScreen(fl.u,fl.v),t=fl.age/fl.duration;
   const alpha=t<.72?1:Math.max(0,1-(t-.72)/.28);
   // Pop-in scale for criticals and banners (1.4x -> 1.0x)
   const pop=fl.kind==='crit'||fl.kind==='banner'
    ?(t<.18?1.42-(t/.18)*.42:1+Math.sin((t-.18)*Math.PI*2)*.04*Math.max(0,1-t))
    :1;
   const yLift=fl.kind==='banner'?86:fl.kind==='heal'?66:50;
   const x=base.x+fl.ox*k,y=base.y-yLift*k+fl.oy*k;

   oc.save();
   oc.translate(x,y);
   oc.scale(pop,pop);
   oc.globalAlpha=alpha;
   oc.textAlign='center';
   oc.textBaseline='middle';

   if(fl.kind==='crit'){
    // Signature Ragnarok Online spiky red/gold burst badge behind larger yellow/gold numbers
    drawSpikyBadge(oc,0,0,42,25,12);
    oc.fillStyle='#d61f1f';oc.fill();
    oc.lineWidth=2.2;oc.strokeStyle='#240404';oc.stroke();

    drawSpikyBadge(oc,0,0,34,19,12);
    oc.fillStyle='#ff9f1c';oc.fill();

    if(fl.subtext){
     oc.font='800 9px Georgia, serif';
     oc.lineWidth=3;oc.strokeStyle='#1c0404';
     oc.strokeText(fl.subtext,0,-13);
     oc.fillStyle='#fff6b3';oc.fillText(fl.subtext,0,-13);
    }
    oc.font='900 20px Georgia, serif';
    oc.lineWidth=4.5;oc.strokeStyle='#1c0404';
    oc.strokeText(fl.text,0,2);
    const numGrad=oc.createLinearGradient(0,-9,0,11);
    numGrad.addColorStop(0,'#fff9b0');numGrad.addColorStop(.55,'#ffd43b');numGrad.addColorStop(1,'#ff8800');
    oc.fillStyle=numGrad;oc.fillText(fl.text,0,2);
   }else if(fl.kind==='banner'){
    const hasSub=Boolean(fl.subtext);
    const bw=hasSub?Math.max(168,Math.min(248,(fl.subtext?.length??0)*5.6+26)):136;
    const bh=hasSub?36:28;
    oc.fillStyle='rgba(14, 24, 34, 0.94)';
    oc.strokeStyle='#ffd452';oc.lineWidth=2;
    oc.beginPath();oc.roundRect(-bw/2,-bh/2,bw,bh,8);oc.fill();oc.stroke();
    oc.font='800 12px Georgia, serif';
    oc.lineWidth=3.5;oc.strokeStyle='#090d12';
    oc.strokeText(fl.text,0,hasSub?-5:1);
    oc.fillStyle='#ffe680';oc.fillText(fl.text,0,hasSub?-5:1);
    if(fl.subtext){
     oc.font='700 9px Georgia, serif';
     oc.lineWidth=2.8;oc.strokeStyle='#090d12';
     oc.strokeText(fl.subtext,0,9);
     oc.fillStyle='#9bf6ff';oc.fillText(fl.subtext,0,9);
    }
   }else if(fl.kind==='incoming'){
    oc.font='800 15px Georgia, serif';
    oc.lineWidth=3.8;oc.strokeStyle='#1f0404';
    oc.strokeText(fl.text,0,0);
    oc.fillStyle='#ff5454';oc.fillText(fl.text,0,0);
   }else if(fl.kind==='heal'){
    oc.font='800 14px Georgia, serif';
    oc.lineWidth=3.6;oc.strokeStyle='#051c10';
    oc.strokeText(fl.text,0,0);
    oc.fillStyle='#5ef29b';oc.fillText(fl.text,0,0);
   }else{
    // Crisp white normal damage number with strong dark outline
    oc.font='800 15px Georgia, serif';
    oc.lineWidth=3.8;oc.strokeStyle='#120b07';
    oc.strokeText(fl.text,0,0);
    oc.fillStyle='#ffffff';oc.fillText(fl.text,0,0);
   }
   oc.restore();
  }

  // Expose live state on dataset for automated verification
  overCanvas.dataset.floats=String(floats.length);
  overCanvas.dataset.projectiles=String(projectiles.length);
  overCanvas.dataset.aoes=String(aoes.length);
  overCanvas.dataset.impacts=String(impacts.length);
  overCanvas.dataset.levelups=String(levelUps.length);
  overCanvas.dataset.slashes=String(slashes.length);
  overCanvas.dataset.combos=String(combos.length);
  overCanvas.dataset.totalCrits=String(totalCrits);
  overCanvas.dataset.totalNormals=String(totalNormals);
  overCanvas.dataset.totalAutoCasts=String(totalAutoCasts);
  overCanvas.dataset.totalSimultaneousCasts=String(totalSimultaneousCasts);
  overCanvas.dataset.totalTrinityCasts=String(totalTrinityCasts);
  overCanvas.dataset.lastSkill=lastSkill;
  overCanvas.dataset.lastSimultaneous=lastSimultaneousSkills.join(',');
 }

 return {
  step,
  render,
  place(x:number,y:number,scale:number){origin={x,y,scale};},
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
   activeFloats:floats.map(f=>({kind:f.kind,text:f.text,subtext:f.subtext,u:+f.u.toFixed(2),v:+f.v.toFixed(2),scale:+f.scale.toFixed(2)})),
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
   lastSimultaneousSkills:[...lastSimultaneousSkills]
  })
 };
}
