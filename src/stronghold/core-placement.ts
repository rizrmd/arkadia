import {STRONGHOLD} from './prefabs/stronghold';
import art from './core-art.json';
// 6 × 6 m reservation = 2 × 2 court tiles. The art pivot is the FRONT
// foundation tip, one tile along each axis from the geometric court center.
const {court}=STRONGHOLD,mid=court.size/2;
export const CORE_CENTER={x:court.origin.x,y:court.origin.y+mid*64};
export const CORE_SLOT={x:CORE_CENTER.x,y:CORE_CENTER.y+64,width:320,pivot:1300/1440,asset:'stronghold-core'};
export const CORE_FILE='/buildings/stronghold-core/painted/level-01.png';
export function coreComposition(level:number){return art.levels[Math.max(1,Math.min(30,Math.floor(level)))-1];}
// Authored stable ground volume; snow, alpha fringes and roofs never drive collision.
export function coreColumns(){const cols=[];for(let dx=-126;dx<=126;dx+=3){const half=64-Math.abs(dx)*.5;cols.push({x:CORE_CENTER.x+dx,w:3,back:CORE_CENTER.y-half,front:CORE_CENTER.y+half,height:140});}return cols;}
