import type {Building} from './economy';
import {groundCalibration,project,unproject} from '../isometric';

// 3:2 is the canvas aspect ratio, not the ground projection. Ground is 2:1.
export const WORLD = {width:1155,height:770};
export const slots:Record<Building,{x:number;y:number;width:number;pivot:number;asset:string}>= {
 forge:{x:235,y:348,width:350,pivot:.95,asset:'stronghold/forge'},
 barracks:{x:600,y:270,width:300,pivot:.95,asset:'stronghold/barracks'},
 altar:{x:960,y:394,width:250,pivot:.95,asset:'stronghold/altar'},
 mage:{x:245,y:605,width:245,pivot:.95,asset:'stronghold/mage'},
 expedition:{x:560,y:500,width:270,pivot:.95,asset:'stronghold/expedition'},
 mine:{x:935,y:665,width:355,pivot:.95,asset:'stronghold/mine'},
 gate:{x:550,y:760,width:240,pivot:.95,asset:'stronghold/gate'}
};
export function ground(){return '<img class="courtyard-art" src="/fortress-ui/courtyard-v2.webp" alt="" draggable="false">';}
export function enclosure(){return '';}
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
 // The gate belongs to the background plate; its separate sprite is hidden.
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
