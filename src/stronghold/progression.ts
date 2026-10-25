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
 blessingTitle?:string;
 description:string;
 unlockSummary?:string;
 upgradeSummary?:string;
 passiveSummary?:string;
 kind:'active'|'passive';
 badge:string;
 icon:string;
 hero?:HeroKind|'shared';
 cooldownMs?:number;
};

export const MAX_SKILL_SLOTS=3;
// Learned active skills, Rift Bolt included (Ascension Tree design): three are equipped to Skill 1/2/3 and auto-cast;
// a fourth stays learned and can be swapped into a slot from the skill tree.
export const MAX_LEARNED_ACTIVES=4;
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
  blessingTitle:'Rift Bolt',
  description:'Auto-cast piercing arcane bolts at foes inside AoE. Each Rank adds bolt volleys, +25% skill damage, and -8% cooldown.',
  unlockSummary:'Arcane Bolt Volley · 1.4s CD',
  upgradeSummary:'+25% Bolt DMG · -0.3s CD',
  kind:'active',
  badge:'BOLT',
  icon:'⚡',
  hero:'rift-runner',
  cooldownMs:1400
 },
 'flame-fan':{
  name:'Flame Fan',
  blessingTitle:'Flame Fan',
  description:'Auto-cast a blazing fan of fireballs at foes inside AoE. Each Rank adds fireballs, +25% skill damage, and -8% cooldown.',
  unlockSummary:'Cone Fire Fan · 1.4s CD',
  upgradeSummary:'+25% Cone DMG · -0.4s CD',
  kind:'active',
  badge:'FAN',
  icon:'🔥',
  hero:'ember-warden',
  cooldownMs:1400
 },
 'rift-dash':{
  name:'Rift Dash',
  blessingTitle:'Rift Dash',
  description:'Auto-unleash warp afterimages and a phase slash across foes in AoE. Each Rank adds +25% damage, wider AoE, and -8% cooldown.',
  unlockSummary:'Phase Warp Slash · 1.4s CD',
  upgradeSummary:'+25% Slash DMG · -0.3s CD',
  kind:'active',
  badge:'DASH',
  icon:'💨',
  hero:'rift-runner',
  cooldownMs:1400
 },
 'cinder-step':{
  name:'Cinder Step',
  blessingTitle:'Ember Nova',
  description:'Auto-ignite molten cinder rings and scorching strikes inside AoE. Each Rank adds +25% damage, wider AoE, and -8% cooldown.',
  unlockSummary:'AoE Fire Ring · 4.0s CD',
  upgradeSummary:'+25% Ring DMG · -0.4s CD',
  kind:'active',
  badge:'STEP',
  icon:'☄️',
  hero:'ember-warden',
  cooldownMs:1400
 },
 'rift-trap':{
  name:'Rift Trap',
  blessingTitle:'Rift Trap',
  description:'Auto-detonate a 2:1 isometric dimensional rune trap under foes in AoE. Each Rank adds +25% damage, +18% radius, and -8% cooldown.',
  unlockSummary:'Arcane Rune Trap · 2.8s CD',
  upgradeSummary:'+25% Trap DMG · +18% AoE',
  kind:'active',
  badge:'TRAP',
  icon:'🔮',
  hero:'rift-runner',
  cooldownMs:2800
 },
 'ember-snare':{
  name:'Ember Snare',
  blessingTitle:'Ember Snare',
  description:'Auto-erupt a 2:1 isometric volcanic snare beneath foes in AoE. Each Rank adds +25% damage, +18% radius, and -8% cooldown.',
  unlockSummary:'Volcanic Fire Seal · 2.8s CD',
  upgradeSummary:'+25% Seal DMG · +18% AoE',
  kind:'active',
  badge:'SNARE',
  icon:'🌋',
  hero:'ember-warden',
  cooldownMs:2800
 },
 cleave:{
  name:'Astral Cleave',
  blessingTitle:'Astral Cleave',
  description:'Auto-sweep a wide crescent cleave cone across foes in AoE. Each Rank widens cone arc, adds +25% damage, and -8% cooldown.',
  unlockSummary:'Crescent Cleave Arc · 2.1s CD',
  upgradeSummary:'+25% Cone DMG · -0.3s CD',
  kind:'active',
  badge:'ARC',
  icon:'🌙',
  hero:'shared',
  cooldownMs:2100
 },
 shockwave:{
  name:'Seismic Slam',
  blessingTitle:'Seismic Slam',
  description:'Auto-detonate a ground-shattering shockwave ring inside AoE. Each Rank expands radius by +20%, adds +25% damage, and -8% cooldown.',
  unlockSummary:'Shockwave Ring · 2.8s CD',
  upgradeSummary:'+25% Slam DMG · +20% AoE',
  kind:'active',
  badge:'SLAM',
  icon:'💥',
  hero:'shared',
  cooldownMs:2800
 },
 // Passive Blessings
 might:{name:'Titan Strike',blessingTitle:'Titan Strike',description:'+0.5 attack damage and +4% critical chance per rank.',passiveSummary:'+0.5 ATK · +4% CRIT',kind:'passive',badge:'MIGHT',icon:'⚔️'},
 nova:{name:'Arc Nova',blessingTitle:'Arc Nova',description:'Unlock a wider AoE detection & slash arc. Each rank adds 20% reach.',passiveSummary:'+20% AoE Reach · +12% SPD',kind:'passive',badge:'REACH',icon:'🌀'},
 haste:{name:'Chrono Surge',blessingTitle:'Chrono Surge',description:'Reduce all auto-cast skill cooldowns by 12% per rank.',passiveSummary:'-12% Skill CD · +10% SPD',kind:'passive',badge:'HASTE',icon:'⏱️'},
 leech:{name:'Soul Feast',blessingTitle:'Soul Feast',description:'Restore 2 health per rank on each kill.',passiveSummary:'+2 HP on Kill · +10% Sustain',kind:'passive',badge:'LEECH',icon:'🩸'},
 star:{name:'Ascendant Star',blessingTitle:'Ascendant Star',description:'+0.25 damage, +10 maximum health, and +4% critical chance.',passiveSummary:'+10 Max HP · +4% CRIT',kind:'passive',badge:'STAR',icon:'⭐'},
 vitality:{name:'Furnace Heart',blessingTitle:'Furnace Heart',description:'+25 maximum health and +12% movement speed.',passiveSummary:'+25 Max HP · +12% SPD',kind:'passive',badge:'VITAL',icon:'🛡️'},
 heal:{name:'Second Wind',blessingTitle:'Second Wind',description:'Restore 35% of maximum health.',passiveSummary:'Restore 35% Max HP',kind:'passive',badge:'HEAL',icon:'✨'}
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
 if(Array.isArray(p.lastCast)&&p.lastCast.length){
  p.lastCast=p.lastCast.map(id=>HERO_SKILL_SWAP[id]?.[hero]??id);
 }
 return p;
}

// Proportional XP curve: each level costs a set number of same-level revenant kills, growing by 10 per level
// (Lv.1→2: 10 kills, Lv.5→6: 50, Lv.10→11: 100), so the XP bar fills in steadily longer stretches as foes scale.
export const killsForLevel=(level:number)=>10*Math.max(1,Math.floor(level));
export function thresholdForLevel(level:number):number{
 const lv=Math.max(1,Math.floor(level));
 return killsForLevel(lv)*revenantXpReward(lv);
}
export const threshold=(p:Progression)=>thresholdForLevel(p.level);
export const xpPercent=(p:Progression)=>Math.max(0,Math.min(100,Math.round(p.xp/Math.max(1,threshold(p))*100)));

export const revenantMaxHp=(level=1)=>2+Math.max(0,Math.floor(level)-1);
export const revenantDamage=(level=1)=>4+Math.max(0,Math.floor(level)-1);
export const revenantXpReward=(level=1)=>10+Math.max(0,Math.floor(level)-1)*4;

// Learned actives (equipped or not), in pool order.
export function learnedActives(p:Progression,hero?:HeroKind):ActiveSkillId[]{
 const h=hero??inferHero(p);
 return HERO_ACTIVE_POOL[h].filter(id=>(p.skills?.[id]??0)>0||p.slots?.includes(id));
}

export function eligibleActiveSkills(p:Progression,hero?:HeroKind):ActiveSkillId[]{
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 // Once every learned-active place is taken, active cards only rank up what is learned.
 const learned=learnedActives(p,h);
 if(learned.length>=MAX_LEARNED_ACTIVES)return learned;
 return [...HERO_ACTIVE_POOL[h]];
}

// Rift Runner Ascension Tree gates (Knowledge: "Rift Runner — Ascension Tree Concept", Tiers). A card's tier opens once
// enough points are spent, and every level-up card taken is one point. Rift Bolt is learned at Lv. 1; Ascendant Star is
// the capstone, offered from Lv. 20 only (and as the passive card of the Lv. 20 offer). Ember uses the matching mapping below.
export const RIFT_TIER_POINTS:Record<string,number>={
 'rift-bolt':0,'rift-dash':0,'rift-trap':0,heal:0,might:0,
 cleave:4,shockwave:4,nova:4,leech:4,
 haste:8,vitality:8
};
// Final Ember Stage 1 mapping: the same shared blessings, Ember-specific root and foundations.
export const EMBER_TIER_POINTS:Record<string,number>={
 'flame-fan':0,'cinder-step':0,'ember-snare':0,heal:0,might:0,
 cleave:4,shockwave:4,nova:4,leech:4,haste:8,vitality:8
};
export const EMBER_MAX_ACTIVE_RANK=5;
export function emberCardUnlocked(p:Progression,id:string):boolean{
 if(id==='star')return offerLevel(p)>=CAPSTONE_LEVEL;
 const gate=EMBER_TIER_POINTS[id];
 return gate!=null&&(owned(p,id)||pointsSpent(p)>=gate);
}
// Acquisition gates and rank/learned limits are separate: owned skills bypass tiers, never rank caps.
export function emberCardEligible(p:Progression,id:string):boolean{
 if(!emberCardUnlocked(p,id))return false;
 if(!isActiveSkill(id))return true;
 return (p.skills[id]??0)<EMBER_MAX_ACTIVE_RANK&&
  (owned(p,id)||learnedActives(p,'ember-warden').length<MAX_LEARNED_ACTIVES);
}
export const CAPSTONE_LEVEL=20;
// Points spent = level-up cards taken: every pick adds one rank (Second Wind included) or one star; the free Lv. 1
// skill is not a pick.
export function pointsSpent(p:Progression):number{
 const ranks=Object.values(p.skills??{}).reduce((a,r)=>a+Math.max(0,r|0),0);
 return Math.max(0,ranks+(p.stars??0)-1);
}
// The level the pending pick belongs to (several level-ups at once are picked one by one, lowest first).
export const offerLevel=(p:Progression)=>p.pending>0?p.level-p.pending+1:p.level;
const owned=(p:Progression,id:string)=>id==='star'?(p.stars??0)>0:(p.skills?.[id]??0)>0||p.slots?.includes(id);
// Whether the Rift Runner may be offered card `id`: its tier is open, or it is a rank-up of a skill already owned.
// Ascendant Star is gated by level alone, even if owned.
export function riftCardUnlocked(p:Progression,id:string):boolean{
 if(id==='star')return offerLevel(p)>=CAPSTONE_LEVEL;
 const gate=RIFT_TIER_POINTS[id];
 if(gate==null)return false;
 return owned(p,id)||pointsSpent(p)>=gate;
}

export function roll(p:Progression,random:()=>number,hero?:HeroKind){
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 rollGated(p,random,h);
}

// Both heroes reuse the offer shape: the same 1 passive + 2 active shape, drawn only from open tiers and owned skills. When a
// gated pool runs short, the card is filled from the other gated pool, never from a locked tier and never left blank.
function rollGated(p:Progression,random:()=>number,hero:HeroKind){
 const eligible=(id:string)=>hero==='ember-warden'?emberCardEligible(p,id):riftCardUnlocked(p,id);
 const activePool=eligibleActiveSkills(p,hero).filter(eligible);
 const passivePool=PASSIVE_BLESSING_IDS.filter(eligible);
 const chosen:string[]=[];
 const take=(pool:string[])=>{
  const avail=pool.filter(id=>!chosen.includes(id));
  if(!avail.length)return false;
  chosen.push(avail[Math.floor(random()*avail.length)]);
  return true;
 };
 if(offerLevel(p)===CAPSTONE_LEVEL&&passivePool.includes('star'))chosen.push('star');
 else take(passivePool);
 if(p.slots.length<MAX_SKILL_SLOTS){
  const unequipped=activePool.filter(id=>!p.slots.includes(id));
  take(unequipped.length?unequipped:activePool);
  const equipped=activePool.filter(id=>p.slots.includes(id));
  take(equipped.length?equipped:activePool);
 }else{
  take(activePool);
  take(activePool);
 }
 while(chosen.length<3&&take([...activePool,...passivePool])){}
 p.offers=chosen;
}

export function reward(p:Progression,random:()=>number,hero?:HeroKind,foeLevel?:number){
 const lv=Math.max(1,Math.floor(foeLevel??p.level));
 p.gold+=5;
 awardSoulXp(p,random,hero,lv);
}

export function awardSoulXp(p:Progression,random:()=>number,hero:HeroKind|undefined,foeLevel:number){
 p.xp+=revenantXpReward(foeLevel);
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
 if(h==='ember-warden'&&!emberCardEligible(p,id))return false;
 if(isActiveSkill(id)){
  const learned=learnedActives(p,h);
  if(learned.includes(id)){
   p.skills[id]=Math.max(1,p.skills[id]??1)+1;
  }else if(p.slots.length<MAX_SKILL_SLOTS){
   p.slots.push(id);
   p.skills[id]=Math.max(1,(p.skills[id]??0)+1);
  }else if(learned.length<MAX_LEARNED_ACTIVES){
   // Learned but not equipped: the player swaps it into a slot from the skill tree.
   p.skills[id]=1;
  }else{
   return false;
  }
 }else if(id==='star'){
  p.stars++;
 }else if(id==='heal'){
  // Second Wind heals once when taken; the count only marks it learned in the skill tree.
  p.skills.heal=(p.skills.heal??0)+1;
 }else{
  p.skills[id]=(p.skills[id]??0)+1;
 }
 p.pending--;
 p.offers=[];
 if(p.pending)roll(p,random,h);
 return true;
}

// Puts a learned active skill into Skill slot `slot` (0-2). One already equipped elsewhere swaps places with the
// skill in that slot; one not equipped replaces it (the replaced skill stays learned). Slots stay contiguous.
export function equip(p:Progression,slot:number,id:string,hero?:HeroKind):boolean{
 const h=hero??inferHero(p);
 syncHeroLoadout(p,h);
 if(!isActiveSkill(id)||!learnedActives(p,h).includes(id)||slot<0||slot>=MAX_SKILL_SLOTS)return false;
 const at=Math.min(slot,p.slots.length-(p.slots.includes(id)?1:0));
 const from=p.slots.indexOf(id);
 if(from===at)return false;
 if(from>=0)[p.slots[from],p.slots[at]]=[p.slots[at],p.slots[from]];
 else if(at<p.slots.length)p.slots[at]=id;
 else p.slots.push(id);
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
