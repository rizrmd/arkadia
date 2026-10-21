import {unproject} from '../isometric';
import {COURT} from './terrain';
// The court remains enclosed except for the front gateway. Beyond its approach,
// the hero can explore the snow; the masonry still has physical footprints.
export function walkableGround(x:number,y:number){
 const g=unproject(x-COURT.x,y-COURT.y),edge=.5;
 const court=g.x>=edge&&g.y>=edge&&g.x<=COURT.size-edge&&g.y<=COURT.size-edge;
 const passage=Math.abs(x-577)<=28&&y>=720;
 const outside=g.x>=16.5||g.y>=16.5;
 return court||passage||outside;
}
export const gatePassageColumn=(x:number)=>Math.abs(x-577)<38;
