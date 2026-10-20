import type {Building} from './economy';
import {wallSources} from '../wall-sources';
// One world unit system: tile top diamonds are 128 × 64, never CSS-skewed.
export const TILE = {width:128,height:64};
export const WORLD = {width:1280,height:900};
export const project=(u:number,v:number)=>({x:640+(u-v)*64,y:220+(u+v)*32});
// Ground contact pivots measured against the extracted PNGs, independent of image box height.
export const slots:Record<Building,{u:number;v:number;width:number;pivot:number;asset:string}>= {
 mine:{u:4.5,v:2.8,width:175,pivot:.95,asset:'stronghold/mine'},
 altar:{u:3.6,v:-.1,width:145,pivot:.95,asset:'stronghold/altar'},
 barracks:{u:.7,v:-.4,width:175,pivot:.95,asset:'stronghold/barracks'},
 forge:{u:-.5,v:2.7,width:185,pivot:.95,asset:'stronghold/forge'},
 mage:{u:-.6,v:4.5,width:130,pivot:.95,asset:'stronghold/mage'},
 expedition:{u:2,v:4.2,width:145,pivot:.95,asset:'stronghold/expedition'},
 gate:{u:5.9,v:2,width:165,pivot:.95,asset:'stronghold/gate'}
};
const diamond=(u:number,v:number,r=.5)=>{const p=[project(u-r,v-r),project(u+r,v-r),project(u+r,v+r),project(u-r,v+r)];return p.map(q=>`${q.x},${q.y}`).join(' ');};
// Continuous meadow with feathered dirt and paving transitions; no tile borders.
export function ground(){
 const boundary=[[-3,-1.8],[-2.4,-3],[1,-3.3],[4,-2.8],[6.5,-1.5],[7,1],[7.3,4],[6,6.8],[3.5,7.3],[0,7],[-2,5.6],[-3.2,2]].map(([u,v])=>{const p=project(u,v);return `${p.x},${p.y}`;}).join(' ');
 const route=(points:number[][])=>points.map(([u,v],i)=>{const p=project(u,v);return `${i?'L':'M'}${p.x} ${p.y}`;}).join(' ');
 const trails=[[[2,2],[.7,2.8],[0,2.7]],[[2,2],[3.7,3.4],[4.4,4.8]],[[4,2],[5.1,3],[5.6,3.9]],[[2,0],[1,-.7],[.2,-.8]],[[2,4],[1.8,5.2],[1,6.5]],[[4,2],[4,1.2],[4,.4]]];
 let paths=trails.map(p=>`<path class="dirt-trail" d="${route(p)}" fill="none" stroke="#9b8155" stroke-width="32" stroke-linecap="round" filter="url(#soft-soil)" opacity=".65"/><path d="${route(p)}" fill="none" stroke="#b29769" stroke-width="12" stroke-linecap="round" filter="url(#soft-soil)" opacity=".3"/>`).join('');
 let paving='';for(let u=-2;u<=6;u++)for(let v=-2;v<=6;v++)if(u===2||v===2||(u>=1&&u<=3&&v>=1&&v<=3)){
 const {x,y}=project(u,v),id=`tile-${u+2}-${v+2}`;
 paving+=`<clipPath id="${id}"><polygon points="${diamond(u,v)}"/></clipPath><image href="/assets/limestone.png" x="${x-65}" y="${y-33}" width="130" height="67" preserveAspectRatio="none" clip-path="url(#${id})"/>`;
 }
 return `<svg class="ground" viewBox="0 0 1280 900" aria-hidden="true"><defs><clipPath id="land"><polygon points="${boundary}"/></clipPath><filter id="soft-soil" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter><filter id="earth-noise"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="4" seed="8"/><feColorMatrix type="matrix" values=".25 0 0 0 .5  0 .25 0 0 .5  0 0 .25 0 .5  0 0 0 0 1"/><feBlend in="SourceGraphic" mode="multiply"/></filter><radialGradient id="meadow"><stop stop-color="#566044"/><stop offset=".65" stop-color="#3f5035"/><stop offset="1" stop-color="#293d2c"/></radialGradient></defs><g clip-path="url(#land)"><polygon points="${boundary}" fill="url(#meadow)" filter="url(#earth-noise)"/>${Array.from({length:24},(_,i)=>{const p=project(-2+(i*7%23)/2.7,-2+(i*11%29)/3.3);return `<ellipse cx="${p.x}" cy="${p.y}" rx="${40+i%4*16}" ry="${18+i%3*9}" fill="${i%2?'#80704b':'#69804b'}" opacity=".22" filter="url(#soft-soil)"/>`;}).join('')}${paths}<path d="${route([[-2,2],[6.5,2]])} ${route([[2,-2],[2,6.5]])}" fill="none" stroke="#8f7d58" stroke-width="76" opacity=".65" filter="url(#soft-soil)"/>${paving}</g></svg>`;
}
// Decorative objects share the same ground-contact sorting as interactive buildings.
export function village(){
 const prop=(u:number,v:number,body:string)=>{const p=project(u,v);return `<svg class="village-prop" style="left:${p.x}px;top:${p.y}px;z-index:${Math.round(p.y)}" viewBox="-75 -140 150 160" aria-hidden="true">${body}</svg>`;};
 let html='';
 for(const [u,v] of [[-1.3,-.7],[-1.2,2],[-1.5,5.6],[.7,6.6],[4.8,-1],[6,1],[6.3,6],[3.3,6.6]])html+=prop(u,v,`<image href="/village/oak.png" x="-60" y="-137" width="120" height="145" preserveAspectRatio="xMidYMax meet"/>`);
 for(const [u,v] of [[-.6,.6],[.8,-.7],[4.1,5.4],[5.9,4.5]])html+=prop(u,v,`<image href="/village/cottage.png" x="-57" y="-106" width="114" height="114" preserveAspectRatio="xMidYMax meet"/>`);
 // Painted grass has the same organic detail and ground-Y sorting as the oaks.
 for(let i=0;i<100;i++){
 const u=-2.5+(i*37%101)/11,v=-2.5+(i*61%103)/11;
 if(u-v>8||v-u>8||u+v>12||Math.abs(u-2)<.6||Math.abs(v-2)<.6||Object.values(slots).some(s=>Math.hypot(s.u-u,s.v-v)<.85)||(u>3.2&&u<4.9&&v>-.1&&v<1.6))continue;
 const p=project(u,v),w=24+i%4*5;
 html+=`<img class="meadow-clump" src="/village/meadow-clump.png" alt="" style="left:${p.x}px;top:${p.y}px;width:${w}px;z-index:${Math.round(p.y)};opacity:${.6+i%3*.13}"/>`;
 }
 // Compact rice clumps in soft soil beds rather than isolated square plots.
 for(let i=0;i<5;i++)for(let j=0;j<7;j++){const u=3.5+i*.26,v=.1+j*.19,p=project(u,v);html+=`<svg class="crop" style="z-index:${Math.round(p.y)}" viewBox="0 0 1280 900" aria-hidden="true"><ellipse cx="${p.x}" cy="${p.y}" rx="17" ry="8" fill="#655036" opacity=".55"/><image href="/village/rice-clump.png" x="${p.x-14}" y="${p.y-24}" width="28" height="29" preserveAspectRatio="xMidYMax meet"/></svg>`;}
 return html;
}
export function placement(b:Building){const s=slots[b],p=project(s.u,s.v);return `left:${p.x}px;top:${p.y}px;--sprite-width:${s.width}px;--pivot:${s.pivot*100}%;z-index:${Math.round(p.y)}`;}

// Reuse the calibrated two-direction wall kit; walls share the buildings' ground-Y depth.
export function enclosure(){
 let html='';
 for(const side of ['backLeft','backRight'])for(let i=0;i<3;i++){
 const left=side.endsWith('Left'),front=side.startsWith('front');
 const u=left?(front?5.9:-1.5):i*2-.5,v=left?i*2-.5:(front?5.9:-1.5);
 // Leave a real opening around the run gate.
 if(front&&left&&i===2)continue;
 const p=project(u,v),source=left?wallSources['wall-left']:wallSources['wall-a'];
 const [[x0,y0],[x1,y1]]=source.feet,scale=128/(x1-x0),slope=left?-.5:.5;
 const shear=(128*slope-scale*(y1-y0))/(x1-x0),mx=(x0+x1)/2,my=(y0+y1)/2;
 html+=`<svg class="wall-piece" style="z-index:${Math.round(p.y)}" viewBox="0 0 1280 900" aria-hidden="true"><image href="${source.file}" width="${source.size[0]}" height="${source.size[1]}" transform="matrix(${scale} ${shear} 0 ${scale} ${p.x-scale*mx} ${p.y-shear*mx-scale*my})"/></svg>`;
 }
 const p=project(2,2);return html+`<img class="sanctuary-relic" src="/assets/relic.png" alt="" style="left:${p.x}px;top:${p.y}px;z-index:${p.y}"/>`;
}
