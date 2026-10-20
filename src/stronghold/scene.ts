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
// Measured base/step/tabletop directions, independent of sloping roofs.
// Original painted pixels are retained; only the runtime ground camera is fitted.
export const groundAxes:Record<Building,readonly [number,number]>={
 forge:[-.50,.55],barracks:[-.43,.50],altar:[-.42,.40],
 mage:[-.46,.49],expedition:[-.50,.50],mine:[-.30,.50],gate:[-.50,.50]
};
export function calibration(b:Building){return groundCalibration(...groundAxes[b]);}
export function placement(b:Building){const s=slots[b],grid=unproject(s.x,s.y),p=project(grid.x,grid.y),c=calibration(b);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;--iso-shear:${c.shear};--iso-vertical:${c.vertical};z-index:${Math.round(p.y)}`;}
