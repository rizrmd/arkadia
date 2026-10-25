import type {FxHandle,FxStage} from './stage';
import {yawOfScreenAngle} from './space';
/** Visual-only rank specification. Angles match combat-vfx.ts; area matches progression.ts.
 * Kept independent of combat state so tools and future game adapters can reuse it. */
export function riftBoltLevel(rank:number){
 const level=Math.max(1,Math.min(5,Math.round(rank)||1));
 return {level,offsets:level>=3?[-.22,0,.22]:level===2?[-.12,.12]:[0],area:1+(level-1)*.18,
  name:['Single spear','Twin volley','Triad volley','Expanded rift','Ascendant rift'][level-1]};
}
export const RIFT_BOLT_TIMING={release:.42,travel:5.2/7.5,duration:2.6};
/** Reusable NixieFX animation instance. Advance with simulation time, not wall timers.
 * Rendering only: never applies damage, cooldowns, hit detection or progression changes. */
export function createRiftBoltAnimation(stage:FxStage,rank:number,origin={u:20,v:20}){
 const spec=riftBoltLevel(rank),yaw=yawOfScreenAngle(0),handles:FxHandle[]=[],bolts:FxHandle[][]=[];
 let time=0,released=false,impacted=false,disposed=false;
 const play=(phase:string,u:number,v:number,heading:number,scale:number)=>{
  const h=stage.play('rift-runner/rift-bolt.'+phase,{u,v,yaw:heading,scale,seed:190+spec.level});
  if(h)handles.push(h);return h;
 };
 play('cast',origin.u,origin.v,yaw,spec.area);
 return {
  spec,
  advance(dt:number){
   if(disposed)return;
   time+=dt;
   if(!released&&time>=RIFT_BOLT_TIMING.release){
    released=true;
    for(const off of spec.offsets){const h=play('bolt',origin.u,origin.v,yawOfScreenAngle(off),1);bolts.push(h?[h]:[]);}
   }
   if(released){
    const distance=Math.min(5.2,(time-RIFT_BOLT_TIMING.release)*7.5);
    bolts.forEach(group=>group.forEach(h=>h.setLocal(distance)));
    if(!impacted&&distance>=5.2){
     impacted=true;
     spec.offsets.forEach(off=>{const y=yawOfScreenAngle(off);play('impact',origin.u+Math.cos(y)*5.2,origin.v+Math.sin(y)*5.2,y,1+(spec.level-1)*.045);});
     bolts.flat().forEach(h=>h.release());
    }
   }
  },
  get time(){return time;},
  get phase(){return time<RIFT_BOLT_TIMING.release?'Casting':time<RIFT_BOLT_TIMING.release+RIFT_BOLT_TIMING.travel?'Projectile travel':time<RIFT_BOLT_TIMING.duration?'Impact':'Complete';},
  get complete(){return time>=RIFT_BOLT_TIMING.duration;},
  dispose(){handles.forEach(h=>h.release());disposed=true;},
 };
}
