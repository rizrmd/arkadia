import {TORCHES,TORCH_FRAMES,TORCH_GEOMETRY} from './torches';
import type {ShadowSurface} from './shadow-surfaces';

// Same physical placement as drawTorches: W=24,H=39,TOP=15.75.
// The unlit frame contains the solid sconce; animated flame/glow is emissive.
// Two world pixels of camera-depth thickness prevent a vertical paper proxy
// collapsing at a horizontal sun. This is an explicit small-object proxy.
const poles=new Map<number,HTMLCanvasElement>();
export function torchShadowSurfaces():ShadowSurface[]{
 const source=TORCH_FRAMES[3];if(!source.complete||!source.naturalWidth)return [];
 const surfaces:ShadowSurface[]=[];
 for(const [index,t] of TORCHES.entries()){
  const {width,height:bodyHeight,top,postStart,postWidth}=TORCH_GEOMETRY,pivot=(t.lift+top)/bodyHeight;
  surfaces.push({key:'torch-body:'+index,source,sourceWidth:source.naturalWidth,sourceHeight:source.naturalHeight,x:t.x,y:t.y,width,height:bodyHeight,pivot:[.5,pivot],ground:[pivot],geometryModel:'unlit original-alpha sconce; authored anchor and two-pixel camera-depth shell',heightInterval:(_u,v)=>{const near=Math.max(0,(pivot-v)*bodyHeight);return {near,far:Math.max(0,near-2)};}});
  if(t.wall)continue;
  const height=t.lift-postStart;let pole=poles.get(index);
  if(!pole){pole=document.createElement('canvas');pole.width=12;pole.height=Math.ceil(height*3);const c=pole.getContext('2d')!;c.scale(3,pole.height/height);c.strokeStyle='#3b2a20';c.lineWidth=postWidth;c.beginPath();c.moveTo(2,0);c.lineTo(2,height);c.stroke();poles.set(index,pole);}
  surfaces.push({key:'torch-post:'+index,source:pole,sourceWidth:pole.width,sourceHeight:pole.height,x:t.x,y:t.y,width:4,height,pivot:[.5,1],ground:[1],geometryModel:'procedural 3.75px support stroke; two-pixel camera-depth shell',heightInterval:(_u,v)=>{const near=Math.max(0,(1-v)*height);return {near,far:Math.max(0,near-2)};}});
 }
 return surfaces;
}
