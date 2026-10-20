// Stronghold day clock. Pure and deterministic: time of day derives only from
// Date.now(), so it is independent of saves and safe to unit test with node.
export const DAY_MS=24*60*1000;
export type Mode='dynamic'|'day'|'night';
export type Phase='Dawn'|'Day'|'Dusk'|'Night';
export type Lighting={t:number;phase:Phase;ambient:[number,number,number];lights:number;glow:number};
// t: 0 = midnight, .5 = noon. Ambient is the sRGB multiply colour for the world.
export const KEYFRAMES:{t:number;ambient:string;lights:number;glow:number}[]=[
 {t:0,ambient:'#384575',lights:1,glow:.9},
 {t:.22,ambient:'#8f7393',lights:.7,glow:.5},
 {t:.30,ambient:'#ffe9d2',lights:.1,glow:0},
 {t:.40,ambient:'#ffffff',lights:0,glow:0},
 {t:.62,ambient:'#ffffff',lights:0,glow:0},
 {t:.72,ambient:'#ffd6ad',lights:.3,glow:.2},
 {t:.80,ambient:'#8f759e',lights:.75,glow:.55},
 {t:.88,ambient:'#384575',lights:1,glow:.9},
 {t:1,ambient:'#384575',lights:1,glow:.9}
];
// Night may be dark, never unreadable: minimum Rec. 601 luma of the ambient.
export const AMBIENT_FLOOR=.22;
const wrap=(t:number)=>t-Math.floor(t);
export function timeOfDay(now:number,dayMs=DAY_MS){return wrap(now/dayMs);}
export function phaseOf(t:number):Phase{t=wrap(t);return t<.2||t>=.88?'Night':t<.34?'Dawn':t<.7?'Day':'Dusk';}
const hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);
const toLinear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,toSrgb=(v:number)=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
export const luma=([r,g,b]:readonly number[])=>.299*r+.587*g+.114*b;
export function lightingAt(t:number):Lighting{
 t=wrap(t);const i=KEYFRAMES.findIndex((k,n)=>n>0&&t<=k.t),b=KEYFRAMES[Math.max(1,i)],a=KEYFRAMES[Math.max(1,i)-1];
 const x=(t-a.t)/(b.t-a.t||1),s=x*x*(3-2*x),mix=(p:number,q:number)=>p+(q-p)*s;
 // Interpolate in linear light so dusk does not pass through muddy greys.
 const [ca,cb]=[hex(a.ambient),hex(b.ambient)],ambient=ca.map((v,n)=>toSrgb(mix(toLinear(v),toLinear(cb[n])))) as [number,number,number];
 const l=luma(ambient);if(l<AMBIENT_FLOOR)for(let n=0;n<3;n++)ambient[n]=Math.min(1,ambient[n]*AMBIENT_FLOOR/l);
 return {t,phase:phaseOf(t),ambient,lights:mix(a.lights,b.lights),glow:mix(a.glow,b.glow)};
}
export function clockLabel(t:number){const m=Math.floor(wrap(t)*24*60);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
// ?time=0.85 freezes the clock; ?daySpeed=60 runs sixty days per normal day.
export function resolveTime(mode:Mode,now:number,query=''){
 const q=new URLSearchParams(query),fixed=q.get('time'),speed=Number(q.get('daySpeed'))||1;
 if(fixed!==null&&Number.isFinite(Number(fixed)))return wrap(Number(fixed));
 if(mode==='day')return .5;if(mode==='night')return 0;
 return timeOfDay(now,DAY_MS/speed);
}
// ?lighting=day|night|dynamic picks the mode; the world-only view has no menu, so it is remembered.
export function modeFrom(query:string,stored:unknown):Mode{const m=new URLSearchParams(query).get('lighting')??stored;return m==='day'||m==='night'?m:'dynamic';}
