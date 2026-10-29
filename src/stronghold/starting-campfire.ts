import {CORE_CENTER,CORE_SLOT,coreComposition} from './core-placement';

// Original imagegen RGBA, 1774 × 887. Pivot is the stone ring's ground centre,
// not the smoke or the snowy decal edge. The existing hero spawn is 100 px south.
export const CAMPFIRE_FILE='/buildings/starting-campfire/campfire-v1.png';
export const CAMPFIRE_SLOT={...CORE_CENTER,width:320,pivot:545/887,asset:'starting-campfire'};
export const usesStartingCampfire=(completedCoreLevel:number)=>completedCoreLevel===1;
// Only the hot stone ring blocks walking; thawed earth and snow remain walkable.
export function campfireColumns(){
 const cols=[];
 for(let dx=-39;dx<=39;dx+=3){const half=22*Math.sqrt(Math.max(0,1-(dx/42)**2));cols.push({x:CORE_CENTER.x+dx,w:3,back:CORE_CENTER.y-half,front:CORE_CENTER.y+half,height:24});}
 return cols;
}

// One persisted Core (legacy expedition ID), with level-specific art registration.
export function coreVisual(level:number){const composition=coreComposition(level);return {composition,slot:usesStartingCampfire(level)?CAMPFIRE_SLOT:CORE_SLOT,file:usesStartingCampfire(level)?CAMPFIRE_FILE:'/buildings/stronghold-core/painted/'+composition.sprite};}
