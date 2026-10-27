import {environmentBlocked} from '../environment/model';
import {reliefBlocked} from '../world/relief';
import {unproject} from '../isometric';
import {COURT} from './terrain';
import {STRONGHOLD} from './prefabs/stronghold';
const {court:{walkInset,openSnowFrom},gate:G}=STRONGHOLD;
// The court remains enclosed except for the front gateway. Beyond its approach,
// the hero can explore the snow; the masonry still has physical footprints.
export function walkableGround(x:number,y:number){
 if(environmentBlocked(x,y)||reliefBlocked(x,y))return false;
 const g=unproject(x-COURT.x,y-COURT.y),edge=walkInset;
 const court=g.x>=edge&&g.y>=edge&&g.x<=COURT.size-edge&&g.y<=COURT.size-edge;
 // Through the arch the passage joins court and snow; beside it only the apron in front of the towers is open.
 // The strip from the court edge back to the tower fronts is wall masonry: walkable, it let the hero stand on
 // top of the front wall beside each tower, drawn over it.
 const d=Math.abs(x-G.x),passage=y>=G.passageFromY&&(d<G.archHalfWidth||d<=G.towerHalfSpan&&y>=gateTowerFront(d));
 // Snow surrounds the enclosure on all four sides. The old one-sided check
 // only opened the gate-facing (south/east) edge, leaving the rear of the
 // stronghold unreachable even after walking around either flank.
 const outside=g.x<=-1.5||g.y<=-1.5||g.x>=openSnowFrom||g.y>=openSnowFrom;
 return court||passage||outside;
}
// Ground line of a gate tower's front face, d px either side of the arch centre (archHalfWidth to towerHalfSpan).
const F=G.towerFront;
export const gateTowerFront=(d:number)=>d<F.knee?F.base+(d-G.archHalfWidth)*F.rise:F.peak-(d-F.knee)*F.fall;
let gateOpen=false;
export const setGateOpen=(open:boolean)=>{gateOpen=open;};
export const gatePassageColumn=(x:number)=>gateOpen&&Math.abs(x-G.x)<G.doors.halfWidth;
