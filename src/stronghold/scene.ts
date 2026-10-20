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
 barracks:{u:1,v:0,width:175,pivot:.95,asset:'stronghold/barracks'},
 forge:{u:0,v:2.7,width:185,pivot:.95,asset:'stronghold/forge'},
 mage:{u:-.3,v:4,width:130,pivot:.95,asset:'stronghold/mage'},
 expedition:{u:2,v:3.8,width:145,pivot:.95,asset:'stronghold/expedition'},
 gate:{u:5.9,v:2,width:165,pivot:.95,asset:'stronghold/gate'}
};
const diamond=(u:number,v:number,r=.5)=>{const p=[project(u-r,v-r),project(u+r,v-r),project(u+r,v+r),project(u-r,v+r)];return p.map(q=>`${q.x},${q.y}`).join(' ');};
export function ground(){let tiles='';for(let u=-2;u<=6;u++)for(let v=-2;v<=6;v++){
 const {x,y}=project(u,v),id=`tile-${u+2}-${v+2}`;
 // Only the village lanes and central square are paved; gardens remain soil/grass.
 const paved=(u===2||v===2||(u>=1&&u<=3&&v>=1&&v<=3));
 tiles+=`<clipPath id="${id}"><polygon points="${diamond(u,v)}"/></clipPath><polygon points="${diamond(u,v)}" ${paved?'':'filter="url(#meadow-texture)"'} fill="${paved?'#66634c':(['#3d4b32','#3a482e','#414d33'][(u+v+4)%3])}"/>${paved?`<image href="/assets/limestone.png" x="${x-65}" y="${y-33}" width="130" height="67" preserveAspectRatio="none" clip-path="url(#${id})"/>`: ''}`;
 if(!paved)for(let i=0;i<12;i++){const q=project(u+((i*17%23)/23-.5)*.8,v+((i*7%19)/19-.5)*.8);tiles+=`<path d="M${q.x-2} ${q.y}l-1-4m1 4 3-5" stroke="${i%3?'#607345':'#8a9055'}" stroke-width="1"/>`;}
 }return `<svg class="ground" viewBox="0 0 960 650" aria-hidden="true"><defs><filter id="meadow-texture"><feTurbulence type="fractalNoise" baseFrequency=".38" numOctaves="3" seed="8"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs>${tiles}</svg>`;}
// Decorative objects share the same ground-contact sorting as interactive buildings.
export function village(){
 const prop=(u:number,v:number,body:string)=>{const p=project(u,v);return `<svg class="village-prop" style="left:${p.x}px;top:${p.y}px;z-index:${Math.round(p.y)}" viewBox="-75 -140 150 160" aria-hidden="true">${body}</svg>`;};
 let html='';
 for(const [u,v] of [[-1.3,-.7],[-1.2,2],[-1,5],[1,5.8],[4.8,-1],[6,1],[6,5.6],[3.6,5.8]])html+=prop(u,v,`<image href="/village/oak.png" x="-60" y="-137" width="120" height="145" preserveAspectRatio="xMidYMax meet"/>`);
 for(const [u,v] of [[-.6,.6],[.8,-.7],[4.4,4.8],[5.6,3.9]])html+=prop(u,v,`<image href="/village/cottage.png" x="-57" y="-106" width="114" height="114" preserveAspectRatio="xMidYMax meet"/>`);
 // Tilled rows and crops beside the mine give the economy a visible farm.
 for(let i=0;i<5;i++)for(let j=0;j<7;j++){const u=3.5+i*.23,v=.3+j*.16,p=project(u,v);html+=`<svg class="crop" style="z-index:${Math.round(p.y)}" viewBox="0 0 960 650" aria-hidden="true"><polygon points="${diamond(u,v,.13)}" fill="#594b32"/><path d="M${p.x} ${p.y}v-9m0 5-5-5m5 2 5-5" fill="none" stroke="${i%2?'#a3a354':'#7f9144'}" stroke-width="2"/></svg>`;}
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
 html+=`<svg class="wall-piece" style="z-index:${Math.round(p.y)}" viewBox="0 0 960 650" aria-hidden="true"><image href="${source.file}" width="${source.size[0]}" height="${source.size[1]}" transform="matrix(${scale} ${shear} 0 ${scale} ${p.x-scale*mx} ${p.y-shear*mx-scale*my})"/></svg>`;
 }
 const p=project(2,2);return html+`<img class="sanctuary-relic" src="/assets/relic.png" alt="" style="left:${p.x}px;top:${p.y}px;z-index:${p.y}"/>`;
}
