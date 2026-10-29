import {project} from '../isometric';
import type {AnimalRecord,Point,Species} from './gathering-rules';
export const WILDLIFE_DIRECTIONS=['N','NE','E','SE','S','SW','W','NW'] as const;
// Quantize the projected movement, rather than tile axes, into screen compass sectors.
export function wildlifeDirection(du:number,dv:number,previous=4){
 const {x,y}=project(du,dv);
 if(Math.hypot(x,y)<1e-6)return previous;
 return (Math.round(Math.atan2(x,-y)/(Math.PI/4))+8)%8;
}
// Waypoints are transient; the animal's actual position stays in the gathering save.
export type Roam={home:Point;goal:Point|null;wait:number;moving:boolean;facing:number};
export const wildlifeReach=(tiles:number,metersPerTile:number)=>tiles*metersPerTile+.75;
export function moveWildlife(a:AnimalRecord,species:Species,roam:Roam,dt:number,metersPerTile:number,hero:Point,clear:(p:Point)=>boolean,pathClear:(a:Point,b:Point)=>boolean,random:()=>number){
 roam.moving=false;
 if(a.status!=='alive'){roam.goal=null;return;}
 // Hold still while a nearby hero winds up a melee swing; moving prey must remain huntable.
 if(Math.hypot(a.u-hero.u,a.v-hero.v)*metersPerTile<=3){roam.goal=null;return;}
 roam.wait=Math.max(0,roam.wait-dt);if(roam.wait>0)return;
 if(!roam.goal){for(let n=0;n<24;n++){const angle=random()*Math.PI*2,r=(1+random()*5)/metersPerTile,p={u:roam.home.u+Math.cos(angle)*r,v:roam.home.v+Math.sin(angle)*r};if(Math.hypot(p.u-a.u,p.v-a.v)*metersPerTile>.5&&clear(p)&&pathClear(a,p)){roam.goal=p;break;}}if(!roam.goal){roam.wait=300;return;}}
 const du=roam.goal.u-a.u,dv=roam.goal.v-a.v,d=Math.hypot(du,dv);
 if(d<.02){roam.goal=null;roam.wait=300+random()*1200;return;}
 const speed=(species==='deer'?1.2:.65)/metersPerTile,step=Math.min(d,speed*dt/1000),p={u:a.u+du/d*step,v:a.v+dv/d*step};
 if(!clear(p)||!pathClear(a,p)){roam.goal=null;roam.wait=150;return;}
 a.u=p.u;a.v=p.v;roam.moving=true;roam.facing=wildlifeDirection(du,dv,roam.facing);
}
