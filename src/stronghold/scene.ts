import type {Building} from './economy';

// The art plate and all contact pivots share the reference's 3:2 camera.
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
export function placement(b:Building){const s=slots[b];return `left:${s.x}px;top:${s.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;z-index:${Math.round(s.y)}`;}
