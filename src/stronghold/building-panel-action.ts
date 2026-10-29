import type {Sprite} from 'pixi.js';
import {buildingEligibility,type BuildingFunds} from './building-panel-policy';
import type {ConstructionKind} from './construction-rules';
export function wireBuildingAction(button:Sprite,kind:ConstructionKind,recipe:{gold:number;wood:number},requirements:{satisfied:boolean}[],funds:()=>BuildingFunds,redraw:()=>void,current=true){
 const eligibility=()=>buildingEligibility(recipe,requirements,funds(),kind,current);
 const enabled=eligibility().operationAvailable;button.label=`${kind} ${enabled?'start construction':'unavailable'}`;button.eventMode=enabled?'static':'none';button.cursor=enabled?'pointer':'default';button.tint=enabled?0xffffff:0x999999;
 button.on('pointertap',e=>{e.stopPropagation();if(!eligibility().operationAvailable)return;button.eventMode='none';void funds().start!(kind).catch(error=>{console.error('Construction could not be saved',error);button.label=String(error.message);}).finally(redraw);});
}
