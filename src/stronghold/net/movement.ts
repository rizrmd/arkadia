import {unproject} from '../../isometric';
import {walkableGround,gateTowerFront} from '../navigation';
import type {Walk} from '../controls';
// The hero's walking rule, shared by the solo hero (hero.ts) and co-op prediction, and mirrored step for step by
// the server (server/internal/sim/world.go WalkStep): server and client must land on the same foot position.
// SPEED is screen px/s along a tile edge (the W+D walk); up/down and across keep the same ground pace.
export const SPEED=105,RADIUS=9;
export const ground=(sx:number,sy:number)=>{const g=unproject(sx,sy);return Math.sqrt(g.x*g.x+g.y*g.y);},PACE=ground(2,1)/Math.sqrt(5);
// One step of dt ms: slide along whatever blocks the full step; a hero already overlapping a footprint may walk out.
// Returns the new foot and the screen px walked along the direction (the stride clock).
export function walkStep(blocked:(x:number,y:number)=>boolean,x:number,y:number,d:Walk,dt:number){
 const m=Math.sqrt(d.x*d.x+d.y*d.y);if(!m)return {x,y,progress:0};
 const g=ground(d.x,d.y),v=SPEED*dt/1000*m*PACE/g,dx=d.x*v,dy=d.y*v,stuck=blocked(x,y);
 for(const [mx,my] of [[dx,dy],[dx,0],[0,dy]])if(mx||my){if(stuck||!blocked(x+mx,y+my))return {x:x+mx,y:y+my,progress:(mx*d.x+my*d.y)*g/(m*m*PACE)};}
 return {x,y,progress:0};
}
// Co-op collision: the footprints the server embeds (public/coop/nav.json, scripts/export-coop-nav.mjs) plus the
// gateway's towers and, until the server says the leaves are 80% open, its doors. Bucketed by 32 px of x.
export type Column={x:number;w:number;back:number;front:number};
const BUCKET=32;
function buckets(cols:Column[]){const m=new Map<number,Column[]>();for(const c of cols){const r=c.w/2+RADIUS;for(let k=Math.floor((c.x-r)/BUCKET);k<=Math.floor((c.x+r)/BUCKET);k++){let list=m.get(k);if(!list)m.set(k,list=[]);list.push(c);}}return m;}
function gateColumns(passable:boolean){const cols:Column[]=[];for(const side of [-1,1])for(let d=36;d<=135;d+=3){const front=gateTowerFront(d);cols.push({x:577+side*d,w:3,back:front-34,front});}
 if(!passable)for(let d=-35;d<=35;d+=3)cols.push({x:577+d,w:3,back:763,front:775});return cols;}
export function navBlocker(columns:Column[]){
 const fixed=buckets(columns),open=buckets(gateColumns(true)),closed=buckets(gateColumns(false));
 const hits=(m:Map<number,Column[]>,x:number,y:number)=>{for(const b of m.get(Math.floor(x/BUCKET))||[])if(Math.abs(x-b.x)<b.w/2+RADIUS&&y>b.back-RADIUS*.5&&y<b.front+RADIUS*.5)return true;return false;};
 return (x:number,y:number,passable:boolean)=>!walkableGround(x,y)||hits(fixed,x,y)||hits(passable?open:closed,x,y);
}
