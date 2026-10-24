import {tilePoint} from './terrain';
import {PX_PER_METER,type ReliefFeature} from '../world/relief';

// Multi-Layer Isometric Stamp Kit coordinates in public/terrain-height/natural/cliff-strip-v2.webp (1536x2048):
// Master Hill Reference Frame: RX0 = 135, RY0 = 18, RW = 1510, RH = 832
// - Row 0 (y: 0..512): Continuous fissured cliff & snow lip strip (1536x512)
// - Row 1 (y: 512..832): 4 discrete 3D-angled stepped rock buttress modules B0..B3 (384x320 each)
// - Row 2 (y: 832..1024): 4 thick rounded snow lip overhang modules O0..O3 (384x192 each)
// - Row 3 (y: 1024..1280): Walkable splat trail spine (x: 0..768, 768x256) + 4 skirt/talus props T0,T1,S0,S1 (192x256 each)
// - Row 4 (y: 1280..2048): Organic hill core underlay stamp (1536x768)

const RX0=135,RY0=18,RW=1510,RH=832;

type StampSpec={
 atlas:{x:number;y:number;w:number;h:number};
 ref:{x:number;y:number;w:number;h:number};
 alpha:number;
};

const BUTTRESS_SPECS:readonly StampSpec[]=[
 // B0: Upper-shoulder 3D stepped rock buttress (inside upper-left cliff barrier)
 {atlas:{x:0,y:512,w:384,h:320},ref:{x:585,y:135,w:290,h:210},alpha:0.94},
 // B1: Mid/lower inner-shoulder stepped ramp rock buttresses (inside left ramp shoulder barrier)
 {atlas:{x:384,y:512,w:384,h:320},ref:{x:255,y:325,w:300,h:235},alpha:0.94},
 // B2: Main high cliff 3D faceted granite buttress (inside front-right / front-left cliff barrier)
 {atlas:{x:768,y:512,w:384,h:320},ref:{x:1085,y:250,w:455,h:335},alpha:0.96},
 // B3: Outer-shoulder stepped ramp rock buttresses (inside outer ramp shoulder barrier)
 {atlas:{x:1152,y:512,w:384,h:320},ref:{x:610,y:470,w:450,h:320},alpha:0.95},
];

const OVERHANG_SPECS:readonly StampSpec[]=[
 // O0: Upper-left shoulder snow lip overhang
 {atlas:{x:0,y:832,w:384,h:192},ref:{x:625,y:120,w:250,h:130},alpha:0.90},
 // O1: Main cliff thick rounded snow lip overhang
 {atlas:{x:384,y:832,w:384,h:192},ref:{x:1130,y:255,w:315,h:135},alpha:0.92},
 // O2: Ramp shoulder snow lip overhang
 {atlas:{x:768,y:832,w:384,h:192},ref:{x:835,y:410,w:275,h:140},alpha:0.90},
 // O3: Far cliff corner snow lip overhang
 {atlas:{x:1152,y:832,w:384,h:192},ref:{x:1265,y:135,w:225,h:135},alpha:0.88},
];

const PROP_SPECS:readonly StampSpec[]=[
 // T0: Inner ramp foot talus boulder & shrub cluster
 {atlas:{x:768,y:1024,w:192,h:256},ref:{x:165,y:460,w:200,h:160},alpha:0.92},
 // T1: Outer ramp foot talus boulder & gravel cluster
 {atlas:{x:960,y:1024,w:192,h:256},ref:{x:485,y:640,w:280,h:160},alpha:0.92},
 // S0: Plateau rim winter shrubs & dry alpine brush
 {atlas:{x:1152,y:1024,w:192,h:256},ref:{x:780,y:55,w:215,h:135},alpha:0.90},
 // S1: Cliff snowdrift skirt & winter pine shrub
 {atlas:{x:1344,y:1024,w:192,h:256},ref:{x:1215,y:185,w:210,h:125},alpha:0.90},
];

const TRAIL_ATLAS={x:0,y:1024,w:768,h:256} as const;
const HILL_BASE_ATLAS={x:0,y:1280,w:1536,h:768} as const;

function drawAlignedSpec(
 c:CanvasRenderingContext2D,
 rock:HTMLImageElement,
 spec:StampSpec,
 centerX:number,
 centerY:number,
 spanX:number,
 spanY:number,
 flipX:number
){
 const nu=(spec.ref.x-RX0)/RW;
 const nv=(spec.ref.y-RY0)/RH;
 const nw=spec.ref.w/RW;
 const nh=spec.ref.h/RH;
 const cx=centerX+flipX*(nu+nw*0.5-0.5)*spanX;
 const cy=centerY+(nv+nh*0.5-0.5)*spanY;
 const dw=nw*spanX;
 const dh=nh*spanY;
 c.save();
 c.globalAlpha=spec.alpha;
 c.translate(cx,cy);
 if(flipX<0)c.scale(-1,1);
 c.drawImage(rock,spec.atlas.x,spec.atlas.y,spec.atlas.w,spec.atlas.h,-dw*0.5,-dh*0.5,dw,dh);
 c.restore();
}

export function naturalHillArt(f:ReliefFeature,snow:HTMLImageElement,rock:HTMLImageElement){
 const isU=f.ascend==='-u';
 const flipX=isU?-1:1;
 const ring=f.outline!.map(([u,v])=>{
  const g=tilePoint(u,v);
  const vh=f.topM!*Math.max(0,Math.min(1,isU?(f.u1-u)/(f.u1-f.rampStartU!):(f.v1-v)/(f.v1-f.rampStartV!)));
  const h=vh*PX_PER_METER;
  // Lift only the northern back plateau rim so summit actors at v~f.v0 (and behind-ridge at [25.5,4.5]) are covered,
  // while the front cliff, left/right shoulders, and ramp foot match the ground collision polygon p.g.
  const backT=isU
   ?Math.max(0,Math.min(1,(f.u0+2.2-u)/1.6))*Math.max(0,Math.min(1,(f.v1-1.2-v)/1.0))
   :Math.max(0,Math.min(1,(f.v0+2.2-v)/1.6))*Math.max(0,Math.min(1,(u-f.u0-0.2)/0.8));
  return {u,v,g,h,t:{x:g.x,y:g.y-h},hull:{x:g.x,y:g.y-h*backT}};
 });
 const pad=32;
 const gMinX=Math.min(...ring.map(p=>p.g.x));
 const gMaxX=Math.max(...ring.map(p=>p.g.x));
 const gMinY=Math.min(...ring.map(p=>p.g.y));
 const gMaxY=Math.max(...ring.map(p=>p.g.y));
 const hullMinY=Math.min(...ring.map(p=>p.hull.y));

 const left=Math.floor(gMinX)-pad;
 const right=Math.ceil(gMaxX)+pad;
 const top=Math.floor(hullMinY)-pad;
 const bottom=Math.ceil(gMaxY)+pad;

 const canvas=document.createElement('canvas');
 canvas.width=(right-left)*2;
 canvas.height=(bottom-top)*2;
 (canvas as unknown as {src:string}).src='relief:'+f.id;

 const c=canvas.getContext('2d')!;
 c.scale(2,2);
 c.translate(-left,-top);

 // Span of the organic hill stamp fitted directly to the ground collision polygon G
 const spanX=gMaxX-gMinX;
 const spanY=gMaxY-gMinY;
 const centerX=(gMinX+gMaxX)*0.5;
 const centerY=(gMinY+gMaxY)*0.5;

 // Hard outer clip to hull so zero rock pixels can ever bleed outside the ground collision boundary
 const outerClip=new Path2D();
 ring.forEach((p,i)=>i?outerClip.lineTo(p.hull.x,p.hull.y):outerClip.moveTo(p.hull.x,p.hull.y));
 outerClip.closePath();
 c.save();
 c.clip(outerClip);

 const hasFullKit=rock.naturalHeight>=1800;
 if(!hasFullKit){
  const pat=c.createPattern(snow,'repeat');
  if(pat){c.fillStyle=pat;c.fillRect(left,top,right-left,bottom-top);}
  c.fillStyle='rgba(235,242,250,0.65)';
  c.fillRect(left,top,right-left,bottom-top);
  c.drawImage(rock,0,0,rock.naturalWidth,rock.naturalHeight,centerX-spanX*0.48,centerY-spanY*0.35,spanX*0.96,spanY*0.7);
  c.restore();
  return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
 }

 // ==========================================================================
 // 1. Organic Snow Mound & Base Skirt Layer (fills the lifted back rim & ground footprint)
 // ==========================================================================
 const fullHeight=gMaxY-hullMinY;
 const fullCenterY=(hullMinY+gMaxY)*0.5;
 c.save();
 c.translate(centerX,fullCenterY);
 if(flipX<0)c.scale(-1,1);
 c.drawImage(rock,HILL_BASE_ATLAS.x,HILL_BASE_ATLAS.y,HILL_BASE_ATLAS.w,HILL_BASE_ATLAS.h,-spanX*0.54,-fullHeight*0.54,spanX*1.08,fullHeight*1.08);
 c.restore();

 // ==========================================================================
 // 2. Walkable Splat Trail Layer (muddy/stony worn snow spine from foot to crest)
 // ==========================================================================
 const footNu=(355-RX0)/RW,footNv=(700-RY0)/RH;
 const crestNu=(1060-RX0)/RW,crestNv=(355-RY0)/RH;
 const fx=centerX+flipX*(footNu-0.5)*spanX,fy=centerY+(footNv-0.5)*spanY;
 const kx=centerX+flipX*(crestNu-0.5)*spanX,ky=centerY+(crestNv-0.5)*spanY;
 const dx=(kx-fx)*flipX,dy=ky-fy;
 const trailLen=Math.hypot(dx,dy);
 const trailW=(250/RH)*spanY;
 const trailAngle=Math.atan2(dy,dx);
 c.save();
 c.globalAlpha=0.88;
 c.translate((fx+kx)*0.5,(fy+ky)*0.5);
 if(flipX<0)c.scale(-1,1);
 c.rotate(trailAngle);
 c.drawImage(rock,TRAIL_ATLAS.x,TRAIL_ATLAS.y,TRAIL_ATLAS.w,TRAIL_ATLAS.h,-trailLen*0.5,-trailW*0.5,trailLen,trailW);
 c.restore();

 // ==========================================================================
 // 3. Stepped 3D Rock Buttresses (stepping down topM -> 0 along cliff & ramp)
 // ==========================================================================
 const sortedButtresses=[...BUTTRESS_SPECS].sort((a,b)=>(a.ref.y+a.ref.h*0.5)-(b.ref.y+b.ref.h*0.5));
 for(const spec of sortedButtresses){
  drawAlignedSpec(c,rock,spec,centerX,centerY,spanX,spanY,flipX);
 }

 // ==========================================================================
 // 4. Thick Rounded Snow Lip Overhangs (draping over cliff & ramp crests)
 // ==========================================================================
 for(const spec of OVERHANG_SPECS){
  drawAlignedSpec(c,rock,spec,centerX,centerY,spanX,spanY,flipX);
 }

 // ==========================================================================
 // 5. Depth-Sorted Skirt & Talus Props (boulders, gravel, snowdrifts, shrubs)
 // ==========================================================================
 const sortedProps=[...PROP_SPECS].sort((a,b)=>(a.ref.y+a.ref.h)-(b.ref.y+b.ref.h));
 for(const spec of sortedProps){
  drawAlignedSpec(c,rock,spec,centerX,centerY,spanX,spanY,flipX);
 }

 c.restore();

 // Soft inward feather along the collision perimeter so snow skirts blend seamlessly into court snow
 const mask=document.createElement('canvas');
 mask.width=canvas.width;
 mask.height=canvas.height;
 const mc=mask.getContext('2d')!;
 mc.scale(2,2);
 mc.translate(-left,-top);
 mc.filter='blur(2.5px)';
 mc.fillStyle='#fff';
 mc.beginPath();
 ring.forEach((p,i)=>{
  const vx=p.hull.x-centerX,vy=p.hull.y-fullCenterY,len=Math.hypot(vx,vy)||1;
  const ix=p.hull.x-(vx/len)*2.5,iy=p.hull.y-(vy/len)*2.5;
  if(i)mc.lineTo(ix,iy);else mc.moveTo(ix,iy);
 });
 mc.closePath();
 mc.fill();

 c.save();
 c.setTransform(1,0,0,1,0,0);
 c.globalCompositeOperation='destination-in';
 c.drawImage(mask,0,0);
 c.restore();

 return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
}
