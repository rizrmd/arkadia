// Reversible release configuration. Change to false and deploy to restore finite costs.
// Never write this display/testing policy or Infinity into a player save.
export const INFINITE_WOOD_FOOD = true;
export const resourceIsFree=(name:string,enabled=INFINITE_WOOD_FOOD)=>enabled&&(name==='wood'||name==='food');
export function resourceLabel(value:number,name:'wood'|'food',enabled=INFINITE_WOOD_FOOD){
 return `${enabled?'∞':Math.max(0,Math.floor(value)).toLocaleString('en-US')} ${name==='wood'?'Wood':'Food'}`;
}
export type ResourceCost={gold:number;wood?:number;food?:number;mana?:number;souls?:number};
export function canPay(cost:ResourceCost,balance:ResourceCost,enabled=INFINITE_WOOD_FOOD){
 return (['gold','wood','food','mana','souls'] as const).every(k=>resourceIsFree(k,enabled)||(balance[k]??0)>=(cost[k]??0));
}
export function deductCost(cost:ResourceCost,balance:ResourceCost,enabled=INFINITE_WOOD_FOOD){
 if(!canPay(cost,balance,enabled))throw Error('Insufficient resources.');
 for(const k of ['gold','wood','food','mana','souls'] as const)if(!resourceIsFree(k,enabled)&&cost[k])balance[k]=(balance[k]??0)-cost[k]!;
}
