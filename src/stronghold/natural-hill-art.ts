import {tilePoint} from './terrain';
import {featureHeight,PX_PER_METER,type ReliefFeature} from '../world/relief';

// Multi-Layer Isometric Stamp Kit coordinates in public/terrain-height/natural/cliff-strip.webp (1536x2048):
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
 // B0: Upper-shoulder 3D stepped rock buttress
 {atlas:{x:0,y:512,w:384,h:320},ref:{x:560,y:90,w:330,h:265},alpha:0.92},
 // B1: Mid/lower inner-shoulder stepped ramp rock buttresses
 {atlas:{x:384,y:512,w:384,h:320},ref:{x:340,y:270,w:365,h:275},alpha:0.92},
 // B2: Main high cliff 3D faceted granite buttress
 {atlas:{x:768,y:512,w:384,h:320},ref:{x:1090,y:230,w:500,h:410},alpha:0.95},
 // B3: Outer-shoulder stepped ramp rock buttresses
 {atlas:{x:1152,y:512,w:384,h:320},ref:{x:640,y:425,w:515,h:360},alpha:0.94},
];

const OVERHANG_SPECS:readonly StampSpec[]=[
 // O0: Upper-left shoulder snow lip overhang
 {atlas:{x:0,y:832,w:384,h:192},ref:{x:630,y:80,w:280,h:145},alpha:0.90},
 // O1: Main cliff thick rounded snow lip overhang
 {atlas:{x:384,y:832,w:384,h:192},ref:{x:1150,y:255,w:340,h:155},alpha:0.92},
 // O2: Ramp shoulder snow lip overhang
 {atlas:{x:768,y:832,w:384,h:192},ref:{x:865,y:380,w:300,h:155},alpha:0.90},
 // O3: Far cliff corner snow lip overhang
 {atlas:{x:1152,y:832,w:384,h:192},ref:{x:1280,y:110,w:245,h:155},alpha:0.88},
];

const PROP_SPECS:readonly StampSpec[]=[
 // T0: Inner ramp foot talus boulder & shrub cluster
 {atlas:{x:768,y:1024,w:192,h:256},ref:{x:175,y:495,w:245,h:190},alpha:0.92},
 // T1: Outer ramp foot talus boulder & gravel cluster
 {atlas:{x:960,y:1024,w:192,h:256},ref:{x:455,y:660,w:335,h:175},alpha:0.92},
 // S0: Plateau rim winter shrubs & dry alpine brush
 {atlas:{x:1152,y:1024,w:192,h:256},ref:{x:760,y:40,w:230,h:145},alpha:0.90},
 // S1: Cliff snowdrift skirt & winter pine shrub
 {atlas:{x:1344,y:1024,w:192,h:256},ref:{x:1235,y:170,w:225,h:135},alpha:0.90},
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

export function naturalHillArt(f:ReliefFeature,_snow:HTMLImageElement,rock:HTMLImageElement){
 const ring=f.outline!.map(([u,v])=>{
  const g=tilePoint(u,v),h=featureHeight(f,u,v)*PX_PER_METER;
  return {u,v,g,h,t:{x:g.x,y:g.y-h}};
 });
 const pad=56;
 const ringMinX=Math.min(...ring.map(p=>p.g.x));
 const ringMaxX=Math.max(...ring.map(p=>p.g.x));
 const ringMinY=Math.min(...ring.map(p=>p.t.y));
 const ringMaxY=Math.max(...ring.map(p=>p.g.y));

 const left=Math.floor(ringMinX)-pad;
 const right=Math.ceil(ringMaxX)+pad;
 const top=Math.floor(ringMinY)-pad;
 const bottom=Math.ceil(ringMaxY)+pad;

 const canvas=document.createElement('canvas');
 canvas.width=(right-left)*2;
 canvas.height=(bottom-top)*2;
 (canvas as unknown as {src:string}).src='relief:'+f.id;

 const c=canvas.getContext('2d')!;
 c.scale(2,2);
 c.translate(-left,-top);

 const isU=f.ascend==='-u';
 const flipX=isU?-1:1;

 // Span of the organic hill stamp covering the collision ring + soft talus skirt margin
 const spanX=(ringMaxX-ringMinX)*1.12;
 const spanY=(ringMaxY-ringMinY)*1.13;
 const centerX=(ringMinX+ringMaxX)*0.5+flipX*spanX*0.01;
 const centerY=(ringMinY+ringMaxY)*0.5+spanY*0.005;

 const hasFullKit=rock.naturalHeight>=1800;
 if(!hasFullKit)return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};

 // ==========================================================================
 // 1. Organic Snow Mound & Base Skirt Layer
 // ==========================================================================
 c.save();
 c.translate(centerX,centerY);
 if(flipX<0)c.scale(-1,1);
 c.drawImage(rock,HILL_BASE_ATLAS.x,HILL_BASE_ATLAS.y,HILL_BASE_ATLAS.w,HILL_BASE_ATLAS.h,-spanX*0.5,-spanY*0.5,spanX,spanY);
 c.restore();

 // ==========================================================================
 // 2. Walkable Splat Trail Layer (muddy/stony worn snow spine from foot to crest)
 // Exact spine endpoints in reference space: foot (230, 745) -> crest (1160, 145)
 // ==========================================================================
 const footNu=(230-RX0)/RW,footNv=(745-RY0)/RH;
 const crestNu=(1160-RX0)/RW,crestNv=(145-RY0)/RH;
 const fx=centerX+flipX*(footNu-0.5)*spanX,fy=centerY+(footNv-0.5)*spanY;
 const kx=centerX+flipX*(crestNu-0.5)*spanX,ky=centerY+(crestNv-0.5)*spanY;
 const dx=(kx-fx)*flipX,dy=ky-fy;
 const trailLen=Math.hypot(dx,dy);
 const trailW=(280/RH)*spanY;
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
 // Sorted in back-to-front painter's order by screen y
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

 return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
}
