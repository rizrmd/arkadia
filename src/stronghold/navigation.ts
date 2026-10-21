import {unproject} from '../isometric';
import {COURT} from './terrain';
// The court remains enclosed except for the front gateway. Beyond its approach,
// the hero can explore the snow; the masonry still has physical footprints.
export function walkableGround(x:number,y:number){
 const g=unproject(x-COURT.x,y-COURT.y),edge=.5;
 const court=g.x>=edge&&g.y>=edge&&g.x<=COURT.size-edge&&g.y<=COURT.size-edge;
 // Through the arch the passage joins court and snow; beside it only the apron in front of the towers is open.
 // The strip from the court edge back to the tower fronts is wall masonry: walkable, it let the hero stand on
 // top of the front wall beside each tower, drawn over it.
 const d=Math.abs(x-577),passage=y>=710&&(d<36||d<=135&&y>=gateTowerFront(d));
 const outside=g.x>=16.5||g.y>=16.5;
 return court||passage||outside;
}
// Ground line of a gate tower's front face, d px either side of the arch centre (36 to 135).
export const gateTowerFront=(d:number)=>d<86?774+(d-36)*.42:795-(d-86)*.62;
let gateOpen=false;
export const setGateOpen=(open:boolean)=>{gateOpen=open;};
export const gatePassageColumn=(x:number)=>gateOpen&&Math.abs(x-577)<35;
