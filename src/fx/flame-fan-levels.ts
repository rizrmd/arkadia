import type {FxHandle,FxStage} from './stage';
import {yawOfScreenAngle} from './space';
/** Existing combat-vfx.ts offsets, range/speed and progression.ts rank scaling.
 * This preview is rendering only; it never changes combat balance or applies hits. */
export function flameFanLevel(rank:number){
 const level=Math.max(1,Math.min(5,Math.round(rank)||1));
 return {level,offsets:level>=3?[-.44,-.22,0,.22,.44]:level===2?[-.36,-.12,.12,.36]:[-.34,0,.34],
  area:1+(level-1)*.18,damage:1+(level-1)*.25,cooldownMs:Math.round(1400*Math.pow(.92,level-1)),
  // Small impact intensity increase communicates damage, without implying a larger damage radius.
  impactScale:1+(level-1)*.045,
  name:['Ember fan','Fourfold flame','Fivefold flame','Furnace fan','Incandescent fan'][level-1]};
}
export const FLAME_FAN_TIMING={release:.42,travel:4.4/6.4,duration:2.6};
export function createFlameFanAnimation(stage:FxStage,rank:number,origin={u:20,v:20}){
 const spec=flameFanLevel(rank),yaw=yawOfScreenAngle(0),handles:FxHandle[]=[],bolts:FxHandle[]=[];
 let time=0,released=false,impacted=false,disposed=false;
 const play=(phase:string,u:number,v:number,heading:number,scale:number)=>{
  const h=stage.play('ember-warden/flame-fan.'+phase,{u,v,yaw:heading,scale,seed:390+spec.level});
  if(h)handles.push(h);return h;
 };
 play('cast',origin.u,origin.v,yaw,spec.area);
 play('cast.ground',origin.u,origin.v,yaw,spec.area);
 return {
  spec,
  advance(dt:number){
   if(disposed)return;
   time+=dt;
   if(!released&&time>=FLAME_FAN_TIMING.release){
    released=true;
    for(const off of spec.offsets){const h=play('bolt',origin.u,origin.v,yawOfScreenAngle(off),1);if(h)bolts.push(h);}
   }
   if(released){
    const distance=Math.min(4.4,(time-FLAME_FAN_TIMING.release)*6.4);
    bolts.forEach(h=>h.setLocal(distance));
    if(!impacted&&distance>=4.4){
     impacted=true;
     spec.offsets.forEach(off=>{const y=yawOfScreenAngle(off),u=origin.u+Math.cos(y)*4.4,v=origin.v+Math.sin(y)*4.4;
      play('impact',u,v,y,spec.impactScale);play('impact.ground',u,v,y,1);});
     bolts.forEach(h=>h.release());
    }
   }
  },
  get time(){return time;},
  get phase(){return time<FLAME_FAN_TIMING.release?'Casting':time<FLAME_FAN_TIMING.release+FLAME_FAN_TIMING.travel?'Projectile travel':time<FLAME_FAN_TIMING.duration?'Impact':'Complete';},
  get complete(){return time>=FLAME_FAN_TIMING.duration;},
  dispose(){handles.forEach(h=>h.release());disposed=true;},
 };
}
