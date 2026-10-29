import {canPay,deductCost,INFINITE_WOOD_FOOD} from './resource-mode';
import type {HeroId} from './heroes';
import type {State} from './economy';
export const BUILDING_BRANCHES={
 'rift-runner':{name:'Stormshade',hero:'Rift Runner',defense:'watchtower',label:'Watchtower'},
 'ember-warden':{name:'Runeseekers',hero:'Amber Warden',defense:'arcane-tower',label:'Runetower'},
} as const;
export type Defense='watchtower'|'arcane-tower';
export type DefenseSave=Partial<Record<HeroId,Defense>>;
export const DEFENSE_MIN_CORE_LEVEL=12;
export function completedCoreLevel(s:State){return s.strongholdCore?.completedLevel??1;}
export const DEFENSE_COST={gold:100,wood:25};
// One fixed emplacement per hero, inside the fortress beside the front gate.
export const DEFENSE_SITE={u:12.5,v:10.5};
export const DEFENSE_COMBAT={damage:10,range:12,interval:1500};
export function buildingBranch(hero:unknown){return hero==='rift-runner'||hero==='ember-warden'?BUILDING_BRANCHES[hero]:null;}
export function allowedDefense(hero:unknown,defense:unknown):defense is Defense{const c=buildingBranch(hero);return !!c&&c.defense===defense;}
export function readDefenses(value:unknown):DefenseSave{
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([hero,defense])=>!allowedDefense(hero,defense)))throw Error('Invalid building defenses. Original save retained.');
 return {...value} as DefenseSave;
}
export function constructionReason(s:State,hero:unknown,defense:unknown,online=false,enabled=INFINITE_WOOD_FOOD):string{
 if(online)return 'Fortress construction is available in solo play.';
 if(!allowedDefense(hero,defense))return 'Your faction cannot construct this advanced building.';
 if(readDefenses(s.careerDefenses)[hero as HeroId])return 'Your fortress defense is already built.';
 if(completedCoreLevel(s)<DEFENSE_MIN_CORE_LEVEL)return 'Requires completed Stronghold Core level 12.';
 if(!canPay(DEFENSE_COST,{gold:s.gold,wood:s.resources?.wood??0},enabled))return 'Requires 100 Gold and 25 Wood (Log).';
 return '';
}
export function constructDefense(s:State,hero:HeroId,defense:unknown,online=false,enabled=INFINITE_WOOD_FOOD){
 const reason=constructionReason(s,hero,defense,online,enabled);if(reason)throw Error(reason);
 // Validation precedes every mutation; callers commit with the economy Web Lock.
 const next=readDefenses(s.careerDefenses);next[hero]=defense as Defense;
 const balance={gold:s.gold,wood:s.resources?.wood??0};deductCost(DEFENSE_COST,balance,enabled);s.gold=balance.gold;if(s.resources)s.resources.wood=balance.wood;s.careerDefenses=next;
}
export function defenseTarget<T extends {x:number;y:number;alive:boolean}>(foes:readonly T[]):T|undefined{
 return foes.filter(f=>f.alive&&Math.hypot(f.x-DEFENSE_SITE.u,f.y-DEFENSE_SITE.v)<=DEFENSE_COMBAT.range)
 .sort((a,b)=>Math.hypot(a.x-DEFENSE_SITE.u,a.y-DEFENSE_SITE.v)-Math.hypot(b.x-DEFENSE_SITE.u,b.y-DEFENSE_SITE.v))[0];
}
