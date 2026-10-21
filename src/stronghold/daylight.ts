// Stronghold day clock. Pure and deterministic: time of day derives only from
// Date.now(), so it is independent of saves and safe to unit test with node.
export const DAY_MS=24*60*1000;
export type Mode='dynamic'|'day'|'night';
export type Phase='Dawn'|'Day'|'Dusk'|'Night';
export type Lighting={t:number;phase:Phase;ambient:[number,number,number];lights:number;glow:number};
// t: 0 = midnight, .5 = noon. Night takes a third of the day, 20:00 to 04:00, centred on midnight;
// dawn and dusk sit inside the sunlit two thirds. Ambient is the sRGB multiply colour for the world.
export const NIGHT=1/3,SUNRISE=NIGHT/2,SUNSET=1-NIGHT/2;
export const KEYFRAMES:{t:number;ambient:string;lights:number;glow:number}[]=[
 {t:0,ambient:'#384575',lights:1,glow:.9},
 {t:SUNRISE,ambient:'#384575',lights:1,glow:.9},
 {t:.22,ambient:'#8f7393',lights:.7,glow:.5},
 {t:.28,ambient:'#ffe9d2',lights:.1,glow:0},
 {t:.36,ambient:'#ffffff',lights:0,glow:0},
 {t:.64,ambient:'#ffffff',lights:0,glow:0},
 {t:.72,ambient:'#ffd6ad',lights:.3,glow:.2},
 {t:.78,ambient:'#8f759e',lights:.75,glow:.55},
 {t:SUNSET,ambient:'#384575',lights:1,glow:.9},
 {t:1,ambient:'#384575',lights:1,glow:.9}
];
// Night may be dark, never unreadable: minimum Rec. 601 luma of the ambient.
export const AMBIENT_FLOOR=.22;
const wrap=(t:number)=>t-Math.floor(t);
export function timeOfDay(now:number,dayMs=DAY_MS){return wrap(now/dayMs);}
export function phaseOf(t:number):Phase{t=wrap(t);return t<SUNRISE||t>=SUNSET?'Night':t<.3?'Dawn':t<.7?'Day':'Dusk';}
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
// A manual time from the in-game clock wins over the mode, but not over ?time.
export function resolveTime(mode:Mode,now:number,query='',manual:number|null=null){
 const q=new URLSearchParams(query),fixed=q.get('time'),speed=Number(q.get('daySpeed'))||1;
 if(fixed!==null&&Number.isFinite(Number(fixed)))return wrap(Number(fixed));
 if(manual!==null&&Number.isFinite(manual))return wrap(manual);
 if(mode==='day')return .5;if(mode==='night')return 0;
 return timeOfDay(now,DAY_MS/speed);
}
// ?lighting=day|night|dynamic picks the mode; the world-only view has no menu, so it is remembered.
export function modeFrom(query:string,stored:unknown):Mode{const m=new URLSearchParams(query).get('lighting')??stored;return m==='day'||m==='night'?m:'dynamic';}
// Sun for cast shadows: up from 04:00 to 20:00, exactly while it is not night. The sprites are painted lit from the upper left, so at
// noon the sun stands there and shadows fall short toward the lower right; the sun's azimuth then turns
// 180 degrees through the day, so shadows reach long to the right after sunrise and long to the left
// before sunset. dx/dy is the screen ground offset per screen pixel of height on the 2:1 ground (depth
// halves, and a screen pixel of height is 1/cos 30 deg of world height); alpha fades shadows in after
// sunrise and out before sunset, so the night has none.
export const SHADOW_ALPHA=.4,NOON_HEADING=60,MAX_ELEVATION=60,MAX_SHADOW=1.7;
export type Sun={alpha:number;dx:number;dy:number;elevation:number};
export function sunAt(t:number):Sun{
 const s=(wrap(t)-SUNRISE)/(SUNSET-SUNRISE);if(s<=0||s>=1)return {alpha:0,dx:0,dy:0,elevation:0};
 const arc=Math.sin(Math.PI*s),elevation=arc*MAX_ELEVATION*Math.PI/180,length=Math.min(MAX_SHADOW,1/Math.cos(Math.PI/6)/Math.tan(Math.max(elevation,.01)));
 // Heading on the unsquashed ground, clockwise from screen right: -30 deg at sunrise, 60 at noon, 150 at sunset.
 const heading=(NOON_HEADING+180*(s-.5))*Math.PI/180,fade=Math.min(1,arc/.35),alpha=SHADOW_ALPHA*fade*fade*(3-2*fade);
 return {alpha,dx:Math.cos(heading)*length,dy:Math.sin(heading)*length*.5,elevation};
}
