import {encodeGeometry,fieldBounds,makeField,type ShadowBounds,type ShadowPixels,type ShadowSample,type ShadowSun} from './shadow-field';
export type PackedShadowMap={bounds:ShadowBounds;pixels:Uint8ClampedArray};
export function packMap(map:ShadowPixels):PackedShadowMap{
 const pixels=new Uint8ClampedArray(map.depth.length*4);for(let k=0;k<map.depth.length;k++)pixels.set(encodeGeometry(map.depth[k],map.owner?.[k]??0,map.coverage[k]),k*4);return {bounds:map.bounds,pixels};
}
export function receiverMap(samples:ShadowSample[],step=3){
 const b=fieldBounds(samples,{dx:0,dy:-1,alpha:1},step),n=b.width*b.height,depth=new Float32Array(n),coverage=new Uint8Array(n),owner=new Uint16Array(n);
 for(const p of samples){if(p.alpha<.5)continue;const x=Math.floor((p.x-b.left)/b.step),y=Math.floor((p.y-p.z-b.top)/b.step);for(let j=0;j<2;j++)for(let i=0;i<2;i++){const xx=x+i,yy=y+j;if(xx<0||yy<0||xx>=b.width||yy>=b.height)continue;const k=yy*b.width+xx;depth[k]=p.z;coverage[k]=255;owner[k]=p.owner??0;}}
 return packMap({bounds:b,depth,coverage,owner});
}
export function casterMaps(samples:ShadowSample[],sun:ShadowSun,step=3){const field=makeField(samples,sun,step);return {depth:packMap(field),second:packMap({bounds:field.bounds,depth:field.secondDepth!,coverage:field.secondCoverage!,owner:field.secondOwner})};}

export type ShadowView={left:number;top:number;right:number;bottom:number;step:number};
export function clippedScene(all:ShadowSample[],casters:ShadowSample[],sun:ShadowSun,view?:ShadowView){
 if(!view)return {receivers:all,casters};
 const receivers=all.filter(p=>p.x>=view.left&&p.x<=view.right&&p.y-p.z>=view.top&&p.y-p.z<=view.bottom);let height=0;for(const p of receivers)height=Math.max(height,p.z);
 const left=view.left+Math.min(0,sun.dx*height)-8,right=view.right+Math.max(0,sun.dx*height)+8,top=view.top+Math.min(0,(1+sun.dy)*height)-8,bottom=view.bottom+Math.max(0,(1+sun.dy)*height)+8;
 const selected=casters.filter(p=>{const x=p.x+sun.dx*p.z,y=p.y+sun.dy*p.z;return x>=left&&x<=right&&y>=top&&y<=bottom;});return {receivers,casters:selected};
}
