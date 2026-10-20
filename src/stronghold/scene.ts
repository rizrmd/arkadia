import type {Building} from './economy';
import {modularEnclosure} from './terrain';
import {groundCalibration,project,unproject} from '../isometric';

// 3:2 is the canvas aspect ratio, not the ground projection. Ground is 2:1.
export const WORLD = {width:1155,height:770};
export const slots:Record<Building,{x:number;y:number;width:number;pivot:number;asset:string}>= {
 forge:{x:235,y:348,width:345,pivot:.95,asset:'stronghold/forge'},
 barracks:{x:600,y:270,width:300,pivot:.95,asset:'stronghold/barracks'},
 altar:{x:950,y:390,width:245,pivot:.95,asset:'stronghold/altar'},
 mage:{x:245,y:605,width:225,pivot:.95,asset:'stronghold/mage'},
 expedition:{x:565,y:500,width:270,pivot:.95,asset:'stronghold/expedition'},
 mine:{x:905,y:620,width:330,pivot:.95,asset:'stronghold/mine'},
 gate:{x:577,y:790,width:270,pivot:.97,asset:'stronghold/gate'}
};
export function ground(){return '';}
export function enclosure(){return modularEnclosure();}
// Source-pixel landmarks on masonry bases/table edges, never roof diagonals.
// Each pair is [left endpoint, right endpoint]. Keep these auditable: the old
// hand-entered slopes missed the Barracks facade (~-.35, rather than -.43).
export const groundEdges = {
 forge: {rising:[[278,420],[510,296]],falling:[[27,285],[278,420]]},
 barracks: {rising:[[228,386],[555,269]],falling:[[20,305],[216,399]]},
 altar: {rising:[[362,621],[615,522]],falling:[[12,497],[362,621]]},
 mage: {rising:[[304,631],[380,604]],falling:[[272,617],[304,631]]},
 expedition: {rising:[[291,371],[602,231]],falling:[[153,288],[291,371]]},
 mine: {rising:[[393,402],[499,363]],falling:[[245,282],[466,402]]},
 // Standalone gate sprite; ground facade measured from its generated base.
 gate: {rising:[[0,1],[2,0]],falling:[[0,0],[2,1]]}
} as const;
function slope(edge:readonly [readonly [number,number],readonly [number,number]]) {
 return (edge[1][1]-edge[0][1])/(edge[1][0]-edge[0][0]);
}
function axes(b:Building):readonly [number,number] {const e=groundEdges[b];return [slope(e.rising),slope(e.falling)];}
export const groundAxes:Record<Building,readonly [number,number]>={
 forge:axes('forge'),barracks:axes('barracks'),altar:axes('altar'),mage:axes('mage'),
 expedition:axes('expedition'),mine:axes('mine'),gate:axes('gate')
};
export function calibration(b:Building){return groundCalibration(...groundAxes[b]);}
export function placement(b:Building){const s=slots[b],grid=unproject(s.x,s.y),p=project(grid.x,grid.y),c=calibration(b);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;--iso-shear:${c.shear};--iso-vertical:${c.vertical};z-index:${Math.round(p.y)}`;}
