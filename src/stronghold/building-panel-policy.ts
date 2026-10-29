import {canPay} from './resource-mode';
import type {ConstructionKind} from './construction-rules';
export const BUILDING_CONTEXT_RADIUS=160;
export const BUILDING_PANEL_SCALE=.75;
export const buildingPanelScale=(w:number,h:number,height:number)=>BUILDING_PANEL_SCALE*Math.min(1,(w-24)/540,(h-90)/height);
export type BuildingFunds={gold:number;wood:number;food?:number;queueUntil?:number;coreLevel?:number;status?:(kind:ConstructionKind)=>{reason:string;operationAvailable:boolean};start?:(kind:ConstructionKind)=>Promise<unknown>};
export function buildingEligibility(recipe:{gold:number;wood:number;food?:number}|null,requirements:{satisfied:boolean}[],funds:BuildingFunds,kind?:ConstructionKind,current=true){
 const requirementsMet=requirements.every(r=>r.satisfied),affordable=!!recipe&&canPay(recipe,funds);
 const runtime=kind?funds.status?.(kind):undefined;
 const reason=!recipe?'Maximum level reached.':!current?'Return to current operation to build or upgrade.':!requirementsMet?'Building requirements not met.':funds.gold<recipe.gold?'Not Enough Gold':!affordable?'Not Enough Wood (Log)':runtime?.reason??'Construction is unavailable in this preview.';
 return {requirementsMet,affordable,operationAvailable:!reason&&!!funds.start,reason};
}
