import {coreUpgradeRecipe,farmRecipe,lumberRecipe,kitchenRecipe,wallsRecipe,mineRecipe} from './building-recipes';
import {canPay,deductCost,INFINITE_WOOD_FOOD} from './resource-mode';
import type {State} from './economy';
export const CONSTRUCTION_KINDS=['core','farm','lumber','kitchen','walls','mine'] as const;
export type ConstructionKind=typeof CONSTRUCTION_KINDS[number];
export type ConstructionJob={kind:ConstructionKind;from:number;to:number;startedAt:number;readyAt:number};
const keys={core:'strongholdCore',farm:'farm',lumber:'lumberMill',kitchen:'kitchen',walls:'walls',mine:'mine'} as const;
const recipes={core:coreUpgradeRecipe,farm:farmRecipe,lumber:lumberRecipe,kitchen:kitchenRecipe,walls:wallsRecipe,mine:mineRecipe};
export function constructionLevel(s:State,kind:ConstructionKind):number{return s[keys[kind]]?.completedLevel??(kind==='core'?1:0);}
export function validateConstruction(s:State){
 for(const kind of CONSTRUCTION_KINDS){const value=s[keys[kind]];if(value!==undefined&&(!value||!Number.isInteger(value.completedLevel)||value.completedLevel<(kind==='core'?1:0)||value.completedLevel>30))throw Error('Invalid building save. Original retained.');}
 const job=s.construction;if(job===undefined)return;
 if(!job||!CONSTRUCTION_KINDS.includes(job.kind)||!Number.isInteger(job.from)||job.from!==constructionLevel(s,job.kind)||job.to!==job.from+1||job.to>30||![job.startedAt,job.readyAt].every(Number.isSafeInteger)||job.startedAt<0||job.readyAt!==job.startedAt+recipes[job.kind](job.from)!.minutes*60000)throw Error('Invalid construction timer. Original retained.');
}
export function constructionStatus(s:State,kind:ConstructionKind,enabled=INFINITE_WOOD_FOOD,online=false){
 const level=constructionLevel(s,kind),recipe=recipes[kind](level),core=constructionLevel(s,'core');
 const requirementsMet=kind==='core'||!!recipe&&core>=recipe.level&&(kind!=='kitchen'||constructionLevel(s,'farm')>=recipe.level);
 const balance={gold:s.gold,mana:s.mana,souls:s.souls,wood:s.resources?.storedWood??0,food:s.resources?.food??0};
 const affordable=!!recipe&&canPay(recipe,balance,enabled);
 const reason=online?'Construction is available in solo play.':!recipe?'Maximum level reached.':s.construction?`Construction in progress until ${new Date(s.construction.readyAt).toLocaleTimeString('en-US')}.`:!requirementsMet?'Building requirements not met.':s.gold<recipe.gold?'Not Enough Gold':!affordable?'Not Enough Wood (Log)':'';
 return {level,recipe,requirementsMet,affordable,operationAvailable:!reason,reason};
}
export function startConstruction(s:State,kind:ConstructionKind,now=Date.now(),enabled=INFINITE_WOOD_FOOD,online=false){
 validateConstruction(s);if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid construction time.');
 const status=constructionStatus(s,kind,enabled,online);if(!status.operationAvailable)throw Error(status.reason);
 const r=status.recipe!,balance={gold:s.gold,wood:s.resources?.storedWood??0,food:s.resources?.food??0};
 deductCost(r,balance,enabled);s.gold=balance.gold;if(s.resources){s.resources.storedWood=balance.wood;s.resources.food=balance.food;}
 s.construction={kind,from:status.level,to:r.level,startedAt:now,readyAt:now+r.minutes*60000};return s.construction;
}
export function settleConstruction(s:State,now=Date.now()){
 validateConstruction(s);const job=s.construction;if(!job||now<job.readyAt)return false;
 s[keys[job.kind]]={...s[keys[job.kind]],completedLevel:job.to};
 // Mine belongs to the original playable building roster. Keep its existing presence flag.
 if(job.kind==='mine')s.built=[...new Set([...(s.built??['expedition','gate'] as const),'mine' as const])];
 delete s.construction;return true;
}
