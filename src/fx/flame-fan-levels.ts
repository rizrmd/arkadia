import type {FxHandle,FxStage} from './stage';
import {yawOfScreenAngle} from './space';
/** Shared rank contract: one forward area, no projectiles at any rank. */
export function flameFanLevel(rank:number){
 const level=Math.max(1,Math.min(5,Math.round(rank)||1));
 return {level,area:1+(level-1)*.18,radius:4.4*(1+(level-1)*.18),spread:Math.PI*.6,
  damage:1+(level-1)*.25,cooldownMs:Math.round(1400*Math.pow(.92,level-1)),
  name:['Ember fan','Widening flame','Blazing fan','Furnace fan','Incandescent fan'][level-1]};
}
export const FLAME_FAN_TIMING={release:.42,travel:.55,duration:2.6};
export function createFlameFanAnimation(stage:FxStage,rank:number,origin={u:20,v:20}){
 const spec=flameFanLevel(rank),yaw=yawOfScreenAngle(0),handles:FxHandle[]=[];
 let time=0,released=false,disposed=false;
 const play=(phase:string,scale:number)=>{const h=stage.play('ember-warden/flame-fan.'+phase,{...origin,yaw,scale,seed:390+spec.level});if(h)handles.push(h);};
 play('cast',1);play('cast.ground',1);
 return {spec,advance(dt:number){if(disposed)return;time+=dt;
  if(!released&&time>=FLAME_FAN_TIMING.release){released=true;play('area',spec.area);}
 },get time(){return time;},
 get phase(){return time<FLAME_FAN_TIMING.release?'Casting':time<FLAME_FAN_TIMING.release+FLAME_FAN_TIMING.travel?'Flame area':time<FLAME_FAN_TIMING.duration?'Dissipating':'Complete';},
 get complete(){return time>=FLAME_FAN_TIMING.duration;},dispose(){handles.forEach(h=>h.release());disposed=true;}};
}
