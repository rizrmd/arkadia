// Screen-world light-space depth field. All heights are explicit geometry units;
// alpha controls coverage only. No colour channel is ever interpreted as height.
export type ShadowSun={dx:number;dy:number;alpha:number};
export type ShadowSample={x:number;y:number;z:number;alpha:number;owner?:number};
export type ShadowBounds={left:number;top:number;step:number;width:number;height:number};
export type ShadowPixels={bounds:ShadowBounds;depth:Float32Array;coverage:Uint8Array;owner?:Uint16Array;secondDepth?:Float32Array;secondCoverage?:Uint8Array;secondOwner?:Uint16Array};
export function lightPoint(p:ShadowSample,s:ShadowSun){return {x:p.x+s.dx*p.z,y:p.y+s.dy*p.z};}
export function receiverPoint(screenX:number,screenY:number,height:number){return {x:screenX,y:screenY+height,z:height,alpha:1};}
export function fieldBounds(samples:readonly ShadowSample[],sun:ShadowSun,step=3,pad=8):ShadowBounds{
 let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
 for(const p of samples){const q=lightPoint(p,sun);l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.x);b=Math.max(b,q.y);}
 if(!samples.length)return {left:0,top:0,step,width:1,height:1};
 // Keep depth+coverage+GPU RGBA storage bounded on mobile and old WebGL devices.
 step=Math.max(step,Math.max(r-l,b-t)/4090,Math.sqrt((r-l)*(b-t)/3_000_000));
 const left=Math.floor(l/step)*step-pad*step,top=Math.floor(t/step)*step-pad*step;
 return {left,top,step,width:Math.ceil((r-left)/step)+pad+1,height:Math.ceil((b-top)/step)+pad+1};
}
export function makeField(samples:readonly ShadowSample[],sun:ShadowSun,step=3):ShadowPixels{
 const bounds=fieldBounds(samples,sun,step),{left,top,width,height}=bounds,n=width*height;
 const depth=new Float32Array(n).fill(-1),coverage=new Uint8Array(n),owner=new Uint16Array(n),secondDepth=new Float32Array(n).fill(-1),secondCoverage=new Uint8Array(n),secondOwner=new Uint16Array(n);
 for(const p of samples){if(p.alpha<=0||p.z<0)continue;const q=lightPoint(p,sun),fx=(q.x-left)/bounds.step,fy=(q.y-top)/bounds.step,x=Math.floor(fx),y=Math.floor(fy),a=Math.round(p.alpha*255);
  // Conservative texel footprint. Pixel-centre samples carry the original alpha;
  // overlap uses max depth/coverage, never additive shadow darkness.
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){const xx=x+i,yy=y+j;if(xx<0||yy<0||xx>=width||yy>=height)continue;const k=yy*width+xx;const id=p.owner??1;
   if(owner[k]===id){if(p.z>depth[k]+.01){depth[k]=p.z;coverage[k]=a;}else if(Math.abs(p.z-depth[k])<=.01)coverage[k]=Math.max(coverage[k],a);}
   else if(p.z>depth[k]+.01){secondDepth[k]=depth[k];secondCoverage[k]=coverage[k];secondOwner[k]=owner[k];depth[k]=p.z;coverage[k]=a;owner[k]=id;}
   else if(p.z>secondDepth[k]+.01){secondDepth[k]=p.z;secondCoverage[k]=a;secondOwner[k]=id;}
   else if(secondOwner[k]===id&&Math.abs(p.z-secondDepth[k])<=.01)secondCoverage[k]=Math.max(secondCoverage[k],a);}
 }
 return {bounds,depth,coverage,owner,secondDepth,secondCoverage,secondOwner};
}
export function visibilityAt(field:ShadowPixels,p:ShadowSample,sun:ShadowSun,bias=3){
 const q=lightPoint(p,sun),b=field.bounds,x=Math.floor((q.x-b.left)/b.step),y=Math.floor((q.y-b.top)/b.step);
 if(x<0||y<0||x>=b.width||y>=b.height)return 0;
 const k=y*b.width+x,own=p.owner&&field.owner?.[k]===p.owner,z=own?field.secondDepth?.[k]??-1:field.depth[k],a=own?field.secondCoverage?.[k]??0:field.coverage[k];return z>p.z+bias?a/255:0;
}
// Millimetre-like precision in world px (1/16 px), up to 4095 px height. Texture
// sources use nearest sampling: interpolation must never cross packed-byte wraps.
export function encodeDepth(depth:number,coverage=255){const n=Math.max(0,Math.min(65535,Math.round(Math.max(0,depth)*16)));return [n>>8,n&255,coverage,255] as const;}
export const decodeDepth=(r:number,g:number)=>(r*256+g)/16;

// One RGB texel: 12-bit instance owner and 12-bit half-world-pixel height.
// Alpha retains silhouette coverage. Owner 0 is terrain/background/no surface.
export function encodeGeometry(z:number,owner:number,coverage=255){
 if(z>2047.5||owner>4095)throw Error('Shadow geometry exceeds packed texture contract');
 const h=Math.round(Math.max(0,z)*2);return [owner>>4,(owner&15)*16+(h>>8),h&255,coverage] as const;
}
export function decodeGeometry(r:number,g:number,b:number){return {owner:r*16+(g>>4),z:((g&15)*256+b)/2};}
