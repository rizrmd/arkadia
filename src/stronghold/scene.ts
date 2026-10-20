import type {Building} from './economy';
// One world unit system: tile top diamonds are 128 × 64, never CSS-skewed.
export const TILE = {width:128,height:64};
export const WORLD = {width:960,height:650};
export const project=(u:number,v:number)=>({x:480+(u-v)*64,y:150+(u+v)*32});
// Ground contact pivots measured against the extracted PNGs, independent of image box height.
export const slots:Record<Building,{u:number;v:number;width:number;pivot:number;asset:string}>= {
 mine:{u:0,v:4,width:112,pivot:.91,asset:'arch'},
 altar:{u:0,v:2,width:78,pivot:.94,asset:'relic'},
 barracks:{u:0,v:0,width:142,pivot:.91,asset:'wall-a'},
 forge:{u:4,v:1,width:112,pivot:.91,asset:'arch'},
 mage:{u:3,v:-.5,width:86,pivot:.94,asset:'relic'},
 expedition:{u:2,v:4,width:96,pivot:1,asset:'stronghold/table'},
 gate:{u:5,v:5,width:142,pivot:.91,asset:'arch'}
};
export function ground(){let tiles='';for(let u=-1;u<=5;u++)for(let v=-1;v<=5;v++){
 const {x,y}=project(u,v);const id=`tile-${u+1}-${v+1}`;
 // Opaque diamond backing closes the source's irregular transparent contour. The
 // source is a single tile, not an atlas: clip its top plane to remove thick sides.
 tiles+=`<clipPath id="${id}"><path d="M${x} ${y-32}l64 32-64 32-64-32Z"/></clipPath><path d="M${x} ${y-32}l64 32-64 32-64-32Z" fill="#575749"/><image href="/assets/limestone.png" x="${x-65}" y="${y-33}" width="130" height="67" preserveAspectRatio="none" clip-path="url(#${id})"/><path d="M${x} ${y-32}l64 32-64 32-64-32Z" fill="none" stroke="#363c36" stroke-width=".65"/>`;
 }return `<svg class="ground" viewBox="0 0 960 650" aria-hidden="true"><path d="M32 310L480 534 928 310V326L480 550 32 326Z" fill="#262e2c"/>${tiles}</svg>`;}
export function placement(b:Building){const s=slots[b],p=project(s.u,s.v);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;z-index:${Math.round(p.y)}`;}
