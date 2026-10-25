// Screen-world light-space depth field. All heights are explicit geometry units;
// alpha controls coverage only. No colour channel is ever interpreted as height.
export type ShadowSun={dx:number;dy:number;alpha:number};
export type ShadowSample={x:number;y:number;z:number;alpha:number;owner?:number;quad?:Float32Array;receive?:boolean;opaqueProxy?:boolean};
export type ShadowBounds={left:number;top:number;step:number;width:number;height:number};
export type ShadowPixels={bounds:ShadowBounds;depth:Float32Array;coverage:Uint8Array;owner?:Uint16Array;secondDepth?:Float32Array;secondCoverage?:Uint8Array;secondOwner?:Uint16Array};
export function lightPoint(p:ShadowSample,s:ShadowSun){return {x:p.x+s.dx*p.z,y:p.y+s.dy*p.z};}
export function receiverPoint(screenX:number,screenY:number,height:number){return {x:screenX,y:screenY+height,z:height,alpha:1};}
export function fieldBounds(samples:readonly ShadowSample[],sun:ShadowSun,step=3,pad=8):ShadowBounds{
 let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
 for(const p of samples){if(p.quad){for(let i=0;i<12;i+=3){const x=p.quad[i]+sun.dx*p.quad[i+2],y=p.quad[i+1]+sun.dy*p.quad[i+2];l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}}else{const q=lightPoint(p,sun);l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.x);b=Math.max(b,q.y);}}
 if(!samples.length)return {left:0,top:0,step,width:1,height:1};
 // Keep depth+coverage+GPU RGBA storage bounded on mobile and old WebGL devices.
 step=Math.max(step,Math.max(r-l,b-t)/(4096-pad*2-4),Math.sqrt((r-l)*(b-t)/3_000_000));
 const left=Math.floor(l/step)*step-pad*step,top=Math.floor(t/step)*step-pad*step;
 return {left,top,step,width:Math.ceil((r-left)/step)+pad+1,height:Math.ceil((b-top)/step)+pad+1};
}
// Rasterize each source texel's actual projected quad. Fixed-size point splats
// leave periodic holes when sun/shear stretches adjacent samples farther than
// two shadow texels. Shared source-cell corners form a continuous triangle mesh.
const projectedQuad=new Float64Array(12),quadTriangles=[[0,1,2],[0,2,3]] as const;
export function rasterSample(p:ShadowSample,sun:ShadowSun,b:ShadowBounds,write:(index:number,z:number,alpha:number,owner:number)=>void,conservative=true){
 const alpha=Math.round(p.alpha*255),owner=p.owner??1;
 if(!p.quad){const q=lightPoint(p,sun),x=Math.floor((q.x-b.left)/b.step),y=Math.floor((q.y-b.top)/b.step);for(let j=0;j<2;j++)for(let i=0;i<2;i++){const xx=x+i,yy=y+j;if(xx>=0&&yy>=0&&xx<b.width&&yy<b.height)write(yy*b.width+xx,p.z,alpha,owner);}return;}
 const q=p.quad,v=projectedQuad;for(let i=0;i<12;i+=3){v[i]=(q[i]+sun.dx*q[i+2]-b.left)/b.step;v[i+1]=(q[i+1]+sun.dy*q[i+2]-b.top)/b.step;v[i+2]=q[i+2];}
 for(const ids of quadTriangles){const ai=ids[0]*3;let di=ids[1]*3,ci=ids[2]*3;const ax=v[ai],ay=v[ai+1],az=v[ai+2];let area=(v[di]-ax)*(v[ci+1]-ay)-(v[di+1]-ay)*(v[ci]-ax);if(Math.abs(area)<1e-8)continue;if(area<0){[di,ci]=[ci,di];area=-area;}
  const dx=v[di],dy=v[di+1],dz=v[di+2],cx=v[ci],cy=v[ci+1],cz=v[ci+2];
  const x0=Math.max(0,Math.floor(Math.min(ax,dx,cx))),x1=Math.min(b.width-1,Math.floor(Math.max(ax,dx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,dy,cy))),y1=Math.min(b.height-1,Math.floor(Math.max(ay,dy,cy)));
  const A0=dy-cy,B0=cx-dx,C0=(cy-dy)*dx-(cx-dx)*dy,T0=(Math.abs(A0)+Math.abs(B0))*(conservative?.5:0)+1e-6;
  const A1=cy-ay,B1=ax-cx,C1=(ay-cy)*cx-(ax-cx)*cy,T1=(Math.abs(A1)+Math.abs(B1))*(conservative?.5:0)+1e-6;
  const A2=ay-dy,B2=dx-ax,C2=(dy-ay)*ax-(dx-ax)*ay,T2=(Math.abs(A2)+Math.abs(B2))*(conservative?.5:0)+1e-6;
  // Clip each scanline against the triangle's three conservative half-planes.
  // Thin oblique quads then cost covered pixels, not their large bounding box.
  for(let y=y0;y<=y1;y++){const py=y+.5;let lo=x0+.5,hi=x1+.5;
   const n0=-T0-B0*py-C0,n1=-T1-B1*py-C1,n2=-T2-B2*py-C2;
   if(A0>1e-10)lo=Math.max(lo,n0/A0);else if(A0< -1e-10)hi=Math.min(hi,n0/A0);else if(n0>0)continue;
   if(A1>1e-10)lo=Math.max(lo,n1/A1);else if(A1< -1e-10)hi=Math.min(hi,n1/A1);else if(n1>0)continue;
   if(A2>1e-10)lo=Math.max(lo,n2/A2);else if(A2< -1e-10)hi=Math.min(hi,n2/A2);else if(n2>0)continue;
   const start=Math.max(x0,Math.ceil(lo-.5-1e-8)),end=Math.min(x1,Math.floor(hi-.5+1e-8));let w0=A0*(start+.5)+B0*py+C0,w1=A1*(start+.5)+B1*py+C1,w2=A2*(start+.5)+B2*py+C2;
   for(let x=start;x<=end;x++){const u=Math.max(0,w0),v=Math.max(0,w1),w=Math.max(0,w2),sum=u+v+w;write(y*b.width+x,sum?(u*az+v*dz+w*cz)/sum:p.z,alpha,owner);w0+=A0;w1+=A1;w2+=A2;}
  }
 }

}
export function makeField(samples:readonly ShadowSample[],sun:ShadowSun,step=3):ShadowPixels{
 const bounds=fieldBounds(samples,sun,step),{left,top,width,height}=bounds,n=width*height;
 const depth=new Float32Array(n).fill(-1),coverage=new Uint8Array(n),owner=new Uint16Array(n),secondDepth=new Float32Array(n).fill(-1),secondCoverage=new Uint8Array(n),secondOwner=new Uint16Array(n);
 const write=(k:number,z:number,a:number,id:number)=>{
  if(owner[k]===id){if(z>depth[k]+.01){depth[k]=z;coverage[k]=a;}else if(Math.abs(z-depth[k])<=.01)coverage[k]=Math.max(coverage[k],a);}
  else if(z>depth[k]+.01){secondDepth[k]=depth[k];secondCoverage[k]=coverage[k];secondOwner[k]=owner[k];depth[k]=z;coverage[k]=a;owner[k]=id;}
  else if(z>secondDepth[k]+.01){secondDepth[k]=z;secondCoverage[k]=a;secondOwner[k]=id;}
  else if(secondOwner[k]===id&&Math.abs(z-secondDepth[k])<=.01)secondCoverage[k]=Math.max(secondCoverage[k],a);
 };
 for(const p of samples)if(p.alpha>0&&p.z>=0)rasterSample(p,sun,bounds,write);

 return {bounds,depth,coverage,owner,secondDepth,secondCoverage,secondOwner};
}
export function visibilityAt(field:ShadowPixels,p:ShadowSample,sun:ShadowSun,bias=3,aliasOffset=0){
 const q=lightPoint(p,sun),b=field.bounds,x=Math.floor((q.x-b.left)/b.step),y=Math.floor((q.y-b.top)/b.step);
 if(x<0||y<0||x>=b.width||y>=b.height)return 0;
 const same=(id:number|undefined)=>!!p.owner&&(id===p.owner||(aliasOffset>0&&p.owner<=aliasOffset/2&&id===p.owner+aliasOffset));const k=y*b.width+x,firstOwn=p.z>2&&same(field.owner?.[k]),secondOwn=p.z>2&&same(field.secondOwner?.[k]);
 const first=!firstOwn&&field.depth[k]>p.z+bias?field.coverage[k]/255:0,second=!secondOwn&&(field.secondDepth?.[k]??-1)>p.z+bias?(field.secondCoverage?.[k]??0)/255:0;return Math.max(first,second);
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

export function writeGeometry(out:Uint8ClampedArray,offset:number,z:number,owner:number,coverage:number){
 if(z>2047.5||owner>4095)throw Error('Shadow geometry exceeds packed texture contract');
 const h=Math.round(Math.max(0,z)*2);out[offset]=owner>>4;out[offset+1]=(owner&15)*16+(h>>8);out[offset+2]=h&255;out[offset+3]=coverage;
}
