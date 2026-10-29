import type {Container,Renderer} from 'pixi.js';
import type {View} from './space';
/** Fan Flame visuals reset: no assets, sprites, particles, or ground layers.
 * Combat and network snapshot compatibility remain available for the rebuild. */
export function createGameplayFlameFan(_parent:Container,_trace?:unknown,_occlusionAt?:unknown,_renderer?:Renderer,_airParent?:Container){
 return {
  prepare:async()=>{},
  spawn(_u:number,_v:number,_yaw:number,_radius:number,_rank:number,_age=0){},
  frame(_dt:number,_view:View){},
  clear(){},
  snapshot:():{u:number;v:number;yaw:number;radius:number;rank:number;age:number}[]=>[],
 };
}
