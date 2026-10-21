import {unproject} from '../isometric';
import {COURT} from './terrain';
// The court remains enclosed except for the front gateway. Beyond its approach,
// the hero can explore the snow; the masonry still has physical footprints.
export function walkableGround(x:number,y:number){
 const g=unproject(x-COURT.x,y-COURT.y),edge=.5;
 const court=g.x>=edge&&g.y>=edge&&g.x<=COURT.size-edge&&g.y<=COURT.size-edge;
 // The apron reaches the visible tower bases; masonry, rather than an invisible
 // courtyard boundary, stops the hero on either side of the arch.
 const passage=Math.abs(x-577)<=145&&y>=710;
 const outside=g.x>=16.5||g.y>=16.5;
 return court||passage||outside;
}
let gateOpen=false;
export const setGateOpen=(open:boolean)=>{gateOpen=open;};
export const gatePassageColumn=(x:number)=>gateOpen&&Math.abs(x-577)<35;
