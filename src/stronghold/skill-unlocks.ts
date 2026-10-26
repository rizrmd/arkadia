import {fresh,HERO_ACTIVE_POOL,DEFAULT_HERO_SKILL,MAX_LEARNED_ACTIVES,MAX_SKILL_SLOTS,type HeroKind,type Progression} from './progression';

// A separate, versioned per-hero record: never serialize combat stats or economy here.
export const SKILL_UNLOCK_KEYS:Record<HeroKind,string>={
 'rift-runner':'arkodia.skills.rift-runner.v1',
 'ember-warden':'arkodia.skills.ember-warden.v1',
};
type SkillSave={version:1;learned:string[];slots:string[]};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>;
export const SKILL_SAVE_ERROR='Skill progress could not be saved. Free browser storage and try again. Your choice has been kept.';
function read(raw:string|null,hero:HeroKind):SkillSave{
 const root=DEFAULT_HERO_SKILL[hero];
 if(raw===null)return {version:1,learned:[root],slots:[root]};
 const s=JSON.parse(raw) as SkillSave;
 const valid=(a:unknown,max:number):a is string[]=>Array.isArray(a)&&a.length>0&&a.length<=max&&new Set(a).size===a.length&&a.every(id=>HERO_ACTIVE_POOL[hero].includes(id));
 if(!s||s.version!==1||!valid(s.learned,MAX_LEARNED_ACTIVES)||!s.learned.includes(root)||!valid(s.slots,MAX_SKILL_SLOTS)||s.slots.some(id=>!s.learned.includes(id)))throw Error('Invalid skill save. Original retained; restore a valid backup or reset progression in Settings.');
 return s;
}
export function restoreSkillUnlocks(storage:Storage,hero:HeroKind):Progression{
 const s=read(storage.getItem(SKILL_UNLOCK_KEYS[hero]),hero),p=fresh(hero);
 p.skills=Object.fromEntries(s.learned.map(id=>[id,1]));
 p.slots=[...s.slots];
 // Free starting ranks must not count as cards spent toward temporary run tiers.
 p.retainedSkills=[...s.learned];
 return p;
}
export function saveSkillUnlocks(storage:Storage,hero:HeroKind,p:Progression){
 const key=SKILL_UNLOCK_KEYS[hero],raw=storage.getItem(key),old=read(raw,hero);
 // Merge previously saved unlocks so another tab's progress is not erased by an older run.
 const learned=[...new Set([...old.learned,...HERO_ACTIVE_POOL[hero].filter(id=>(p.skills[id]??0)>0)])];
 const next:SkillSave={version:1,learned,slots:[...p.slots]};
 read(JSON.stringify(next),hero); // Validate before the single atomic write; no partial save on failure.
 const serialized=JSON.stringify(next);
 if(serialized!==raw)storage.setItem(key,serialized);
}
