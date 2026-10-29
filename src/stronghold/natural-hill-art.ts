import {tilePoint} from './terrain';
import {PX_PER_METER,hillArtBounds,type ReliefFeature} from '../world/relief';

// The core atlas region is a complete, alpha-feathered hill with its own trail,
// snow caps and rock shoulders. Compositing the extracted modules over that core
// duplicates landmarks and introduces different perspective/texture scales.
const HILL_BASE_ATLAS={x:0,y:1280,w:1536,h:768} as const;

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
 const bounds=hillArtBounds(f),origin=tilePoint(0,0);
 const gMinX=bounds.left+origin.x;
 const gMaxX=bounds.right+origin.x;
 const gMinY=Math.min(...ring.map(p=>p.g.y));
 const gMaxY=bounds.bottom+origin.y;
 const hullMinY=bounds.top+origin.y;

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

 const hasFullKit=rock.naturalHeight>=1800;
 if(!hasFullKit){
  // Legacy strip fallback still needs a surface boundary; it has no alpha skirt.
  c.save();c.beginPath();
  ring.forEach((p,i)=>i?c.lineTo(p.hull.x,p.hull.y):c.moveTo(p.hull.x,p.hull.y));
  c.closePath();c.clip();
  const pat=c.createPattern(snow,'repeat');
  if(pat){c.fillStyle=pat;c.fillRect(left,top,right-left,bottom-top);}
  c.fillStyle='rgba(235,242,250,0.65)';
  c.fillRect(left,top,right-left,bottom-top);
  c.drawImage(rock,0,0,rock.naturalWidth,rock.naturalHeight,centerX-spanX*0.48,centerY-spanY*0.35,spanX*0.96,spanY*0.7);
  c.restore();
  return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
 }

 // Keep the coherent core's original silhouette and alpha skirt. A collision
 // outline describes where feet can stand; clipping artwork to that polygon cuts
 // cliff tops and snowbanks into straight edges, especially on the mirrored hill.
 // The small transparent skirt is visual snow blending, not additional walkable land.
 const fullHeight=gMaxY-hullMinY;
 const fullCenterY=(hullMinY+gMaxY)*0.5;
 c.save();
 c.translate(centerX,fullCenterY);
 if(flipX<0)c.scale(-1,1);
 c.drawImage(rock,HILL_BASE_ATLAS.x,HILL_BASE_ATLAS.y,HILL_BASE_ATLAS.w,HILL_BASE_ATLAS.h,-spanX*0.5,-fullHeight*0.5,spanX,fullHeight);
 c.restore();

 return {feature:f,canvas,left,top,width:right-left,height:bottom-top,bottom};
}
