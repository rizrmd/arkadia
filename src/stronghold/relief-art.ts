import {tilePoint} from './terrain';
import {RELIEF,PX_PER_METER,featureHeight,type ReliefFeature} from '../world/relief';
// Paints each terrain feature (world/relief.ts) once into its own canvas: a snow top lifted by its height, and the
// two cliff faces the camera sees, textured with the cliff-snow rock art (the +u face lit, the +v face in shade) so
// the crest is jagged and snow-capped and rubble lies at the foot. Ramps get a trodden path between kerb stones.
// Seeded, so every client paints the same terrain. World px; RELIEF_RES canvas px per world px.
export const RELIEF_RES=2;
export const CLIFF_ART='/modular-stronghold/v2/cliff-snow.png';
export type ReliefArt={feature:ReliefFeature;canvas:HTMLCanvasElement;left:number;top:number;width:number;height:number;bottom:number};
type P={x:number;y:number};type Corner={g:P;h:number;t:P};
function rng(seed:string){let n=[...seed].reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0)|0,17);return()=>((n=Math.imul(n,1664525)+1013904223|0)>>>0)/4294967296;}
// Corner height in px; a ramp's corners take its slope at the rectangle's edges.
function cornerLift(f:ReliefFeature,u:number,v:number){const e=1e-6;return featureHeight(f,Math.min(f.u1-e,u),Math.min(f.v1-e,v))*PX_PER_METER;}
function corners(f:ReliefFeature){const at=(u:number,v:number):Corner=>{const g=tilePoint(u,v),h=cornerLift(f,u,v);return {g,h,t:{x:g.x,y:g.y-h}};};return {A:at(f.u0,f.v0),B:at(f.u1,f.v0),C:at(f.u1,f.v1),D:at(f.u0,f.v1)};}

// A horizontal band of rock cut from both masses of the cliff art, alternately mirrored so repeats do not read.
const BAND_H=360;let band:HTMLCanvasElement|null=null;
function rockBand(cliff:HTMLImageElement){
 if(band)return band;
 const k=cliff.naturalWidth/1200,crops=[[30,0,530,560],[610,118,580,442]].map(([x,y,w,h])=>[x*k,y*k,w*k,h*k]);
 const parts=[0,1,0,1].map((c,i)=>{const [x,y,w,h]=crops[c],dw=w*BAND_H/h;return {x,y,w,h,dw,flip:i>1};});
 band=document.createElement('canvas');band.width=Math.ceil(parts.reduce((s,p)=>s+p.dw,0)-30*parts.length);band.height=BAND_H;
 const b=band.getContext('2d')!;let at=0;
 for(const p of parts){b.save();b.translate(at+(p.flip?p.dw:0),0);b.scale(p.flip?-1:1,1);b.drawImage(cliff,p.x,p.y,p.w,p.h,0,0,p.dw,BAND_H);b.restore();at+=p.dw-30;}
 return band;
}

// One cliff face between ground points g0 and g1 (left to right on screen) rising h0 and h1 px.
function paintFace(c:CanvasRenderingContext2D,cliff:HTMLImageElement,g0:P,g1:P,h0:number,h1:number,tone:'lit'|'shade',random:()=>number,ramp:boolean){
 const H=Math.max(h0,h1);if(H<2)return;
 const jag=ramp?2:Math.min(16,H*.22),over=ramp?2:5,k=(g1.y-g0.y)/(g1.x-g0.x),len=g1.x-g0.x;
 const layer=document.createElement('canvas');layer.width=c.canvas.width;layer.height=c.canvas.height;
 const l=layer.getContext('2d')!;l.setTransform(c.getTransform());
 // Clip to the face, with room above for the crest's jagged rock tops and below for rubble at the foot.
 l.beginPath();l.moveTo(g0.x,g0.y+over);l.lineTo(g1.x,g1.y+over);l.lineTo(g1.x,g1.y-h1-jag);l.lineTo(g0.x,g0.y-h0-jag);l.closePath();l.clip();
 // Solid rock first, so gaps in the rock art never show the ground through the face.
 l.save();l.beginPath();l.moveTo(g0.x,g0.y+1);l.lineTo(g1.x,g1.y+1);l.lineTo(g1.x,g1.y-h1+1);l.lineTo(g0.x,g0.y-h0+1);l.closePath();
 const base=l.createLinearGradient(0,Math.min(g0.y,g1.y)-H,0,Math.max(g0.y,g1.y));base.addColorStop(0,'#8a857c');base.addColorStop(1,'#5a564f');l.fillStyle=base;l.fill();l.restore();
 const art=rockBand(cliff),s=(H+jag+over)/BAND_H,w=art.width*s;
 l.transform(1,k,0,1,g0.x,g0.y);
 // A lower row of rock fills the face's foot; the top row gives the jagged, snow-capped crest.
 if(!ramp)for(let x=-random()*w;x<len;x+=w)l.drawImage(art,x,-H*.62,w,H*.62+over);
 for(let x=-random()*w;x<len;x+=w)l.drawImage(art,x,-H-jag,w,H+jag+over);
 l.setTransform(c.getTransform());
 l.globalCompositeOperation='source-atop';
 if(tone==='shade'){l.fillStyle='rgba(28,38,60,.42)';l.fillRect(Math.min(g0.x,g1.x)-4,Math.min(g0.y,g1.y)-H-jag-4,Math.abs(len)+8,H+jag+over+Math.abs(g1.y-g0.y)+8);}
 else{l.fillStyle='rgba(255,236,206,.08)';l.fillRect(Math.min(g0.x,g1.x)-4,Math.min(g0.y,g1.y)-H-jag-4,Math.abs(len)+8,H+jag+over+Math.abs(g1.y-g0.y)+8);}
 // Darker toward the foot, where the snow banks against the rock.
 const foot=l.createLinearGradient(0,Math.min(g0.y,g1.y)-H*.5,0,Math.max(g0.y,g1.y));foot.addColorStop(0,'rgba(20,24,34,0)');foot.addColorStop(1,'rgba(20,24,34,.32)');
 l.fillStyle=foot;l.fillRect(Math.min(g0.x,g1.x)-4,Math.min(g0.y,g1.y)-H-jag-4,Math.abs(len)+8,H+jag+over+Math.abs(g1.y-g0.y)+8);
 c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(layer,0,0);c.restore();
}

export function paintRelief(snow:HTMLImageElement,cliff:HTMLImageElement):ReliefArt[]{
 return RELIEF.map(f=>{
  const random=rng(f.id),{A,B,C,D}=corners(f),all=[A,B,C,D],ramp=f.type==='ramp';
  const pad=28,left=Math.floor(Math.min(...all.map(p=>p.g.x)))-pad,right=Math.ceil(Math.max(...all.map(p=>p.g.x)))+pad;
  const top=Math.floor(Math.min(...all.map(p=>p.t.y)))-pad,bottom=Math.ceil(Math.max(...all.map(p=>p.g.y)))+10;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil((right-left)*RELIEF_RES);canvas.height=Math.ceil((bottom-top)*RELIEF_RES);
  // The hero's occlusion masks are cached per image src.
  (canvas as unknown as {src:string}).src='relief:'+f.id;
  const c=canvas.getContext('2d')!;c.scale(RELIEF_RES,RELIEF_RES);c.translate(-left,-top);
  // Top: fresh snow whose grain moves with the lift, so it never lines up with the ground around it.
  const surface=new Path2D();surface.moveTo(A.t.x,A.t.y);surface.lineTo(B.t.x,B.t.y);surface.lineTo(C.t.x,C.t.y);surface.lineTo(D.t.x,D.t.y);surface.closePath();
  const lift=Math.max(...all.map(p=>p.h)),pattern=c.createPattern(snow,'repeat')!,s=.7*1024/snow.width,o=tilePoint(0,0);
  pattern.setTransform(new DOMMatrix([s,s/2,-s,s/2,o.x+37,o.y-lift-11]));
  c.save();c.clip(surface);c.fillStyle=pattern;c.fillRect(left,top,right-left,bottom-top);
  // Fresh, wind-packed snow: whiter than the trodden ground below, shaded toward the far edges for volume.
  c.fillStyle=ramp?'rgba(232,236,242,.42)':'rgba(240,244,249,.62)';c.fillRect(left,top,right-left,bottom-top);
  const vol=c.createLinearGradient(A.t.x,A.t.y,C.t.x,C.t.y);vol.addColorStop(0,'rgba(120,140,175,.28)');vol.addColorStop(.45,'rgba(150,165,195,.06)');vol.addColorStop(1,'rgba(255,255,255,.18)');
  c.fillStyle=vol;c.fillRect(left,top,right-left,bottom-top);
  if(ramp){
   // Slope shading (brighter where it faces the camera most), a trodden path and kerb stones along both sides.
   const hi=[A,B,C,D].reduce((a,b)=>b.h>a.h?b:a),lo=[A,B,C,D].reduce((a,b)=>b.h<a.h?b:a),g=c.createLinearGradient(hi.t.x,hi.t.y,lo.t.x,lo.t.y);
   g.addColorStop(0,'rgba(120,132,160,.18)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(left,top,right-left,bottom-top);
   const across=f.ascend==='-v'||f.ascend==='+v',mid=(a:Corner,b:Corner)=>({x:(a.t.x+b.t.x)/2,y:(a.t.y+b.t.y)/2});
   const [p0,p1]=across?[mid(A,B),mid(D,C)]:[mid(A,D),mid(B,C)];
   for(let i=0;i<=90;i++){const t=i/90,x=p0.x+(p1.x-p0.x)*t+(random()-.5)*18,y=p0.y+(p1.y-p0.y)*t+(random()-.5)*9;c.fillStyle=random()<.5?'rgba(116,104,86,.42)':'rgba(146,134,116,.34)';c.beginPath();c.ellipse(x,y,13+random()*10,5+random()*3,-.46,0,Math.PI*2);c.fill();}
  }
  c.restore();
  // The far edges: a soft dark lip where the top drops away behind.
  c.save();c.lineCap='round';c.strokeStyle='rgba(70,84,110,.45)';c.lineWidth=2.4;c.beginPath();c.moveTo(D.t.x,D.t.y);c.lineTo(A.t.x,A.t.y);c.lineTo(B.t.x,B.t.y);c.stroke();c.restore();
  // Faces: the +v face (D to C) in shade, the +u face (C to B) lit.
  paintFace(c,cliff,D.g,C.g,D.h,C.h,'shade',random,ramp);
  paintFace(c,cliff,C.g,B.g,C.h,B.h,'lit',random,ramp);
  if(ramp){
   // Kerb stones along the ramp's two long edges.
   const across=f.ascend==='-v'||f.ascend==='+v',sides:[Corner,Corner][]=across?[[A,D],[B,C]]:[[A,B],[D,C]];
   for(const [a,b] of sides)for(let i=0;i<=10;i++){const t=i/10,x=a.t.x+(b.t.x-a.t.x)*t,y=a.t.y+(b.t.y-a.t.y)*t,r=4.5+random()*3.5;c.fillStyle='#4f4b45';c.beginPath();c.ellipse(x,y+1,r*1.4,r*.9,0,0,Math.PI*2);c.fill();c.fillStyle='#7c776e';c.beginPath();c.ellipse(x-.6,y-.4,r*1.1,r*.65,0,0,Math.PI*2);c.fill();c.fillStyle='#eef2f6';c.beginPath();c.ellipse(x-1,y-r*.45,r*.8,r*.3,0,0,Math.PI*2);c.fill();}
  }
  return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
 }).sort((a,b)=>a.bottom-b.bottom);
}

// The feature's sun shadow on the ground: its footprint swept by its height along the sun's shadow vector (per px of
// height, as the world's own shadows). Null when the feature casts nothing.
export function paintReliefShadow(f:ReliefFeature,dx:number,dy:number,canvas:HTMLCanvasElement){
 const {A,B,C,D}=corners(f),pts:[number,number][]=[];
 for(const p of [A,B,C,D])pts.push([p.g.x,p.g.y],[p.g.x+p.h*dx,p.g.y+p.h*dy]);
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),chain=(list:[number,number][])=>{const h:[number,number][]=[];for(const q of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],q)<=0)h.pop();h.push(q);}h.pop();return h;};
 const hull=[...chain(pts),...chain([...pts].reverse())],pad=12;
 const left=Math.floor(Math.min(...hull.map(p=>p[0])))-pad,top=Math.floor(Math.min(...hull.map(p=>p[1])))-pad,width=Math.ceil(Math.max(...hull.map(p=>p[0])))+pad-left,height=Math.ceil(Math.max(...hull.map(p=>p[1])))+pad-top;
 canvas.width=width;canvas.height=height;const c=canvas.getContext('2d')!;
 c.translate(-left,-top);c.filter='blur(3px)';c.fillStyle='rgb(20,28,44)';c.beginPath();hull.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 return {left,top,width,height};
}
