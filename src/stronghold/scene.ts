import type {Building} from './economy';
import {wallSources} from '../wall-sources';
// One world unit system: tile top diamonds are 128 × 64, never CSS-skewed.
export const TILE = {width:128,height:64};
export const WORLD = {width:1060,height:730};
export const project=(u:number,v:number)=>({x:480+(u-v)*64,y:150+(u+v)*32});
// Ground contact pivots measured against the extracted PNGs, independent of image box height.
export const slots:Record<Building,{u:number;v:number;width:number;pivot:number;asset:string}>= {
 mine:{u:4,v:2.5,width:175,pivot:.95,asset:'stronghold/mine'},
 altar:{u:3.6,v:-.1,width:145,pivot:.95,asset:'stronghold/altar'},
 barracks:{u:1,v:0,width:190,pivot:.95,asset:'stronghold/barracks'},
 forge:{u:0,v:2.7,width:185,pivot:.95,asset:'stronghold/forge'},
 mage:{u:-.3,v:4,width:130,pivot:.95,asset:'stronghold/mage'},
 expedition:{u:2,v:3.8,width:145,pivot:.95,asset:'stronghold/expedition'},
 gate:{u:5.6,v:4.2,width:240,pivot:.95,asset:'stronghold/gate'}
};
export function ground(){let tiles='';for(let u=-1;u<=5;u++)for(let v=-1;v<=5;v++){
 const {x,y}=project(u,v);const id=`tile-${u+1}-${v+1}`;
 // Opaque diamond backing closes the source's irregular transparent contour. The
 // source is a single tile, not an atlas: clip its top plane to remove thick sides.
 tiles+=`<clipPath id="${id}"><path d="M${x} ${y-32}l64 32-64 32-64-32Z"/></clipPath><path d="M${x} ${y-32}l64 32-64 32-64-32Z" fill="#575749"/><image href="/assets/limestone.png" x="${x-65}" y="${y-33}" width="130" height="67" preserveAspectRatio="none" clip-path="url(#${id})"/><path d="M${x} ${y-32}l64 32-64 32-64-32Z" fill="none" stroke="#363c36" stroke-width=".65"/>`;
 }return `<svg class="ground" viewBox="0 0 960 650" aria-hidden="true"><path d="M32 310L480 534 928 310V326L480 550 32 326Z" fill="#262e2c"/>${tiles}</svg>`;}
export function placement(b:Building){const s=slots[b],p=project(s.u,s.v);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;z-index:${Math.round(p.y)}`;}

// Reuse the calibrated two-direction wall kit; walls share the buildings' ground-Y depth.
export function enclosure(){
 let html='';
 for(const side of ['backLeft','backRight','frontLeft','frontRight'])for(let i=0;i<3;i++){
 const left=side.endsWith('Left'),front=side.startsWith('front');
 const u=left?(front?5.9:-1.5):i*2-.5,v=left?i*2-.5:(front?5.9:-1.5);
 // Leave a real opening around the run gate.
 if(front&&left&&i===2)continue;
 const p=project(u,v),source=left?wallSources['wall-left']:wallSources['wall-a'];
 const [[x0,y0],[x1,y1]]=source.feet,scale=128/(x1-x0),slope=left?-.5:.5;
 const shear=(128*slope-scale*(y1-y0))/(x1-x0),mx=(x0+x1)/2,my=(y0+y1)/2;
 html+=`<svg class="wall-piece" style="z-index:${Math.round(p.y)}" viewBox="0 0 960 650" aria-hidden="true"><image href="${source.file}" width="${source.size[0]}" height="${source.size[1]}" transform="matrix(${scale} ${shear} 0 ${scale} ${p.x-scale*mx} ${p.y-shear*mx-scale*my})"/></svg>`;
 }
 const p=project(2,2);return html+`<img class="sanctuary-relic" src="/assets/relic.png" alt="" style="left:${p.x}px;top:${p.y}px;z-index:${p.y}"/>`;
}
