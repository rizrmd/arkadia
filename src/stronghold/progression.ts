export type ActiveSkillId='rift-bolt'|'rift-dash'|'rift-trap'|'flame-fan'|'cinder-step'|'ember-snare'|'cleave'|'shockwave';
export type HeroKind='rift-runner'|'ember-warden';
export type Progression={
 level:number;
 xp:number;
 gold:number;
 pending:number;
 offers:string[];
 skills:Record<string,number>;
 stars:number;
 slots:string[];
 autoCasts?:number;
 trinityCasts?:number;
 lastCast?:string[];
};
export type HitRoll={damage:number;display:number;crit:boolean;multiplier:number};
export type CardDef={
 name:string;
 description:string;
 kind:'active'|'passive';
 badge:string;
 icon:string;
 hero?:HeroKind|'shared';
 cooldownMs?:number;
};

export const MAX_SKILL_SLOTS=3;
export const AOE_CAST_RADIUS_TILES=2.2;

export const DEFAULT_HERO_SKILL:Record<HeroKind,ActiveSkillId>={
 'rift-runner':'rift-bolt',
 'ember-warden':'flame-fan'
};

export const HERO_ACTIVE_POOL:Record<HeroKind,ActiveSkillId[]>={
 'rift-runner':['rift-bolt','rift-dash','rift-trap','cleave','shockwave'],
 'ember-warden':['flame-fan','cinder-step','ember-snare','cleave','shockwave']
};

export const ACTIVE_SKILL_IDS:ActiveSkillId[]=['rift-bolt','rift-dash','rift-trap','flame-fan','cinder-step','ember-snare','cleave','shockwave'];
export const PASSIVE_BLESSING_IDS=['might','nova','haste','leech','star','vitality','heal'] as const;

export const isActiveSkill=(id:string):id is ActiveSkillId=>(ACTIVE_SKILL_IDS as string[]).includes(id);

const HERO_SKILL_SWAP:Record<string,Record<HeroKind,ActiveSkillId>>={
 'rift-bolt':{'rift-runner':'rift-bolt','ember-warden':'flame-fan'},
 'flame-fan':{'rift-runner':'rift-bolt','ember-warden':'flame-fan'},
 'rift-dash':{'rift-runner':'rift-dash','ember-warden':'cinder-step'},
 'cinder-step':{'rift-runner':'rift-dash','ember-warden':'cinder-step'},
 'rift-trap':{'rift-runner':'rift-trap','ember-warden':'ember-snare'},
 'ember-snare':{'rift-runner':'rift-trap','ember-warden':'ember-snare'}
};

export const cards:Record<string,CardDef>={
 // Active Skill Blessings (Slot 1 default at Lv.1; Slot 2 & Slot 3 unlocked via level-up blessings; duplicates upgrade Rank)
 'rift-bolt':{
  name:'Rift Bolt',
  description:'Auto-cast piercing arcane bolts at foes inside AoE. Each Rank adds bolt volleys, +25% skill damage, and -8% cooldown.',
  kind:'active',
  badge:'BOLT',
  icon:'⚡',
  hero:'rift-runner',
  cooldownMs:1400
 },
 'flame-fan':{
  name:'Flame Fan',
  description:'Auto-cast a blazing fan of fireballs at foes inside AoE. Each Rank adds fireballs, +25% skill damage, and -8% cooldown.',
  kind:'active',
  badge:'FAN',
  icon:'🔥',
  hero:'ember-warden',
  cooldownMs:1400
 },
 'rift-dash':{
  name:'Rift Dash',
  description:'Auto-unleash warp afterimages and a phase slash across foes in AoE. Each Rank adds +25% damage, wider AoE, and -8% cooldown.',
  kind:'active',
  badge:'DASH',
  icon:'💨',
  hero:'rift-runner',
  cooldownMs:1400
 },
 'cinder-step':{
  name:'Cinder Step',
  description:'Auto-ignite molten cinder rings and scorching strikes inside AoE. Each Rank adds +25% damage, wider AoE, and -8% cooldown.',
  kind:'active',
  badge:'STEP',
  icon:'☄️',
  hero:'ember-warden',
  cooldownMs:1400
 },
 'rift-trap':{
  name:'Rift Trap',
  description:'Auto-detonate a 2:1 isometric dimensional rune trap under foes in AoE. Each Rank adds +25% damage, +18% radius, and -8% cooldown.',
  kind:'active',
  badge:'TRAP',
  icon:'🔮',
  hero:'rift-runner',
  cooldownMs:2800
 },
 'ember-snare':{
  name:'Ember Snare',
  description:'Auto-erupt a 2:1 isometric volcanic snare beneath foes in AoE. Each Rank adds +25% damage, +18% radius, and -8% cooldown.',
  kind:'active',
  badge:'SNARE',
  icon:'🌋',
  hero:'ember-warden',
  cooldownMs:2800
 },
 cleave:{
  name:'Astral Cleave',
  description:'Auto-sweep a wide crescent cleave cone across foes in AoE. Each Rank widens cone arc, adds +25% damage, and -8% cooldown.',
  kind:'active',
  badge:'ARC',
  icon:'🌙',
  hero:'shared',
  cooldownMs:2100
 },
 shockwave:{
  name:'Seismic Slam',
  description:'Auto-detonate a ground-shattering shockwave ring inside AoE. Each Rank expands radius by +20%, adds +25% damage, and -8% cooldown.',
  kind:'active',
  badge:'SLAM',
  icon:'💥',
  hero:'shared',
  cooldownMs:2800
 },
 // Passive Blessings
 might:{name:'Titan Strike',description:'+0.5 attack damage and +4% critical chance per rank.',kind:'passive',badge:'MIGHT',icon:'⚔️'},
 nova:{name:'Arc Nova',description:'Unlock a wider AoE detection & slash arc. Each rank adds 20% reach.',kind:'passive',badge:'REACH',icon:'🌀'},
 haste:{name:'Chrono Surge',description:'Reduce all auto-cast skill cooldowns by 12% per rank.',kind:'passive',badge:'HASTE',icon:'⏱️'},
 leech:{name:'Soul Feast',description:'Restore 2 health per rank on each kill.',kind:'passive',badge:'LEECH',icon:'🩸'},
 star:{name:'Ascendant Star',description:'+0.25 damage, +10 maximum health, and +4% critical chance.',kind:'passive',badge:'STAR',icon:'⭐'},
 vitality:{name:'Vitality',description:'+20 maximum health and restore 20 health.',kind:'passive',badge:'VITAL',icon:'🛡️'},
 heal:{name:'Second Wind',description:'Restore 35% of maximum health.',kind:'passive',badge:'HEAL',icon:'✨'}
};

export function fresh(hero:HeroKind='rift-runner'):Progression{
 const defaultSkill=DEFAULT_HERO_SKILL[hero]??'rift-bolt';
 return {
  level:1,
  xp:0,
  gold:0,
  pending:0,
  offers:[],
  skills:{[defaultSkill]:1},
  stars:0,
  slots:[defaultSkill],
  autoCasts:0,
  trinityCasts:0,
  lastCast:[]
 };
}

export function inferHero(p:Progression,fallback:HeroKind='rift-runner'):HeroKind{
 for(const s of p.slots??[]){
  if(s==='flame-fan'||s==='cinder-step'||s==='ember-snare')return 'ember-warden';
  if(s==='rift-bolt'||s==='rift-dash'||s==='rift-trap')return 'rift-runner';
 }
 return fallback;
}

export function syncHeroLoadout(p:Progression,hero:HeroKind):Progression{
 if(!Array.isArray(p.slots))p.slots=[];
 if(!p.skills)p.skills={};
 if(p.slots.length===0){
  const def=DEFAULT_HERO_SKILL[hero]??'rift-bolt';
  p.slots=[def];
  if(!p.skills[def])p.skills[def]=1;
 }
 p.slots=p.slots.slice(0,MAX_SKILL_SLOTS).map(id=>{
  const mapped=HERO_SKILL_SWAP[id]?.[hero]??id;
  if(mapped!==id){
   const prevRank=p.skills[id]??1;
   p.skills[mapped]=Math.max(p.skills[mapped]??0,prevRank);
   delete p.skills[id];
  }else if(!p.skills[mapped]){
   p.skills[mapped]=1;
  }
  return mapped;
 });
 if(Array.isArray(p.offers)&&p.offers.length){
  p.offers=p.offers.map(id=>HERO_SKILL_SWAP[id]?.[hero]??id);
 }
 return p;
}

export const threshold=(p:Progression)=>20+(p.level-1)*10;
export const xpPercent=(p:Progression)=>Math.max(0,Math.min(100,Math.round(p.xp/Math.max(1,threshold(p))*100)));

export function eligibleActiveSkills(p:Progression,hero?:HeroKind):ActiveSkillId[]{
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 if(p.slots.length>=MAX_SKILL_SLOTS){
  return p.slots.slice(0,MAX_SKILL_SLOTS).filter(isActiveSkill);
 }
 return [...HERO_ACTIVE_POOL[h]];
}

export function roll(p:Progression,random:()=>number,hero?:HeroKind){
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 const activePool=[...eligibleActiveSkills(p,h)];
 const passivePool=[...PASSIVE_BLESSING_IDS];
 const chosen:string[]=[];
 const take=(pool:string[])=>{
  const avail=pool.filter(id=>!chosen.includes(id));
  if(!avail.length)return;
  const idx=Math.floor(random()*avail.length);
  chosen.push(avail[idx]);
 };
 // Always include at least 1 Active Skill Blessing (new slot unlock or rank upgrade) and 1 Passive Blessing,
 // plus a 3rd card from the combined eligible pool. When slots < 3, prioritize offering at least one new active skill.
 if(p.slots.length<MAX_SKILL_SLOTS){
  const unequipped=activePool.filter(id=>!p.slots.includes(id));
  take(unequipped.length?unequipped:activePool);
 }else{
  take(activePool);
 }
 take(passivePool);
 take([...activePool,...passivePool]);
 while(chosen.length<3){
  take([...activePool,...passivePool]);
 }
 // Deterministic Fisher-Yates shuffle of the 3 offered blessing cards
 for(let i=chosen.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  const tmp=chosen[i];chosen[i]=chosen[j];chosen[j]=tmp;
 }
 p.offers=chosen;
}

export function reward(p:Progression,random:()=>number,hero?:HeroKind){
 p.gold+=5;
 p.xp+=10;
 while(p.xp>=threshold(p)){
  p.xp-=threshold(p);
  p.level++;
  p.pending++;
 }
 if(p.pending&&!p.offers.length)roll(p,random,hero);
}

export function choose(p:Progression,id:string,random:()=>number,hero?:HeroKind){
 if(!p.pending||!p.offers.includes(id))return false;
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 if(isActiveSkill(id)){
  if(p.slots.includes(id)){
   p.skills[id]=(p.skills[id]??1)+1;
  }else if(p.slots.length<MAX_SKILL_SLOTS){
   p.slots.push(id);
   p.skills[id]=Math.max(1,(p.skills[id]??0)+1);
  }else{
   return false;
  }
 }else if(id==='star'){
  p.stars++;
 }else if(id!=='heal'){
  p.skills[id]=(p.skills[id]??0)+1;
 }
 p.pending--;
 p.offers=[];
 if(p.pending)roll(p,random,h);
 return true;
}

export const skillRank=(p:Progression,id:string)=>Math.max(0,p.skills?.[id]??(p.slots?.includes(id)?1:0));
export const skillDamageMultiplier=(p:Progression,id:string)=>1+Math.max(0,skillRank(p,id)-1)*.25;
export const skillAreaMultiplier=(p:Progression,id:string)=>1+Math.max(0,skillRank(p,id)-1)*.18;
export function skillCooldownMs(p:Progression,id:string):number{
 const base=cards[id]?.cooldownMs??2000;
 const rank=Math.max(1,skillRank(p,id));
 const haste=p.skills?.haste??0;
 const factor=Math.max(.45,Math.pow(.92,rank-1)*Math.pow(.88,haste));
 return Math.round(base*factor);
}

export const damage=(p:Progression)=>1+(p.skills.might??0)*.5+p.stars*.25;
export const reach=(p:Progression)=>1+(p.skills.nova??0)*.2;
export const aoeCastRadius=(p:Progression)=>AOE_CAST_RADIUS_TILES*reach(p);
export const health=(p:Progression)=>(p.skills.vitality??0)*20+p.stars*10;
// Ragnarok Online style critical hit stats: base 15% critical rate, scaling with blessings/skills, and 1.5x..2.0x critical damage multiplier.
export const critChance=(p:Progression)=>Math.min(.75,.15+(p.skills.crit??0)*.1+(p.skills.might??0)*.04+p.stars*.04);
export const critMultiplier=(p:Progression)=>Math.min(2,1.5+(p.skills.crit??0)*.12+(p.skills.might??0)*.05+p.stars*.05);

export function rollHit(p:Progression,random:()=>number,forceCrit?:boolean,scale=1):HitRoll{
 const crit=forceCrit??(random()<critChance(p)),multiplier=crit?critMultiplier(p):1;
 const raw=+(damage(p)*scale*multiplier).toFixed(2);
 // RO-style readable integer combat numbers (e.g. 10 normal -> 15..20 critical at base, scaling with might/stars).
 const display=Math.max(1,Math.round(raw*10));
 return {damage:raw,display,crit,multiplier};
}
