import type {ActorShadowFrame,ActorSkinnedPose,ActorAnchor} from './shadow-actor-sources';
import type {ShadowBounds,ShadowSun} from './shadow-field';
import {alphaAt,alphaRange} from './shadow-actor-frame-audit';
export function vector(m:ArrayLike<number>,p:ArrayLike<number>,w=1){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];}
export function skinVertex(p:ActorSkinnedPose,index:number){const g=p.geometry,local=vector(g.bindMatrix,g.positions.subarray(index*3,index*3+3)),sum=[0,0,0];for(let j=0;j<4;j++){const weight=g.weights[index*4+j];if(!weight)continue;const q=vector(p.bones.subarray(g.joints[index*4+j]*16,g.joints[index*4+j]*16+16),local);for(let k=0;k<3;k++)sum[k]+=q[k]*weight;}return vector(p.model,vector(p.bindInverse,sum));}
export type ReferenceVertex={x:number;y:number;z:number;u:number;v:number};
export function referenceVertices(p:ActorSkinnedPose,f:ActorShadowFrame,a:ActorAnchor,sun:ShadowSun,screen=false){const out:ReferenceVertex[]=[];for(let i=0;i<p.geometry.positions.length/3;i++){const world=skinVertex(p,i),clip=vector(p.camera,world),u=clip[0]*.5+.5,v=.5-clip[1]*.5,z=Math.max(a.lift,world[1]*p.heightScale+a.lift),x=(a.groundX??0)+(u-f.pivot[0])*f.width,y=a.groundY-a.lift+(v-f.pivot[1])*f.height;out.push({u,v,z,x:x+(screen?0:sun.dx*z),y:y+(screen?0:(1+sun.dy)*z)});}return out;}

export type Raster={coverage:Float32Array;lower:Float32Array;lowerWidth:Float32Array;lowerDepth:Float32Array;boundaryDepth:Float32Array;depth:Float32Array;uncertain:Uint8Array};
const raster=(b:ShadowBounds):Raster=>({coverage:new Float32Array(b.width*b.height),lower:new Float32Array(b.width*b.height),lowerWidth:new Float32Array(b.width*b.height),lowerDepth:new Float32Array(b.width*b.height),boundaryDepth:new Float32Array(b.width*b.height).fill(-1),depth:new Float32Array(b.width*b.height).fill(-1),uncertain:new Uint8Array(b.width*b.height)});
function trianglesInto(out:Raster,vertices:ReferenceVertex[],indices:Uint32Array,frame:ActorShadowFrame,b:ShadowBounds,data:Uint8ClampedArray,screen:boolean,receiver:number,bits:number,mask?:(u:number,v:number,alpha:number)=>boolean){
 const grid=2**bits,points=vertices.map(q=>({...q,x:Math.round((q.x-b.left)/b.step*grid)/grid,y:Math.round((q.y-b.top)/b.step*grid)/grid}));
 for(let i=0;i<indices.length;i+=3){
  const a=points[indices[i]],c=points[indices[i+1]],d=points[indices[i+2]],det=(c.y-d.y)*(a.x-d.x)+(d.x-c.x)*(a.y-d.y);if(Math.abs(det)<1e-9)continue;const triangleWidth=Math.abs(det)/(Math.hypot(a.x-c.x,a.y-c.y)+Math.hypot(a.x-d.x,a.y-d.y)+Math.hypot(c.x-d.x,c.y-d.y));
  const x0=Math.max(0,Math.ceil(Math.min(a.x,c.x,d.x)-.5-2/grid)),x1=Math.min(b.width-1,Math.floor(Math.max(a.x,c.x,d.x)-.5+2/grid)),y0=Math.max(0,Math.ceil(Math.min(a.y,c.y,d.y)-.5-2/grid)),y1=Math.min(b.height-1,Math.floor(Math.max(a.y,c.y,d.y)-.5+2/grid));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const wa=((c.y-d.y)*(x+.5-d.x)+(d.x-c.x)*(y+.5-d.y))/det,wb=((d.y-a.y)*(x+.5-d.x)+(a.x-d.x)*(y+.5-d.y))/det,wc=1-wa-wb;
   const z=wa*a.z+wb*c.z+wc*d.z,k=y*b.width+x,edgeDistance=Math.min(wa*Math.abs(det)/Math.hypot(c.x-d.x,c.y-d.y),wb*Math.abs(det)/Math.hypot(a.x-d.x,a.y-d.y),wc*Math.abs(det)/Math.hypot(a.x-c.x,a.y-c.y));if(edgeDistance>=-2/grid&&edgeDistance<=2/grid){const u=wa*a.u+wb*c.u+wc*d.u,v=wa*a.v+wb*c.v+wc*d.v;if(u>=0&&u<=1&&v>=0&&v<=1&&alphaAt(data,frame.frame[2],[0,0,frame.frame[2],frame.frame[3]],u,v)>.001)out.boundaryDepth[k]=Math.max(out.boundaryDepth[k],z);}if(Math.min(wa,wb,wc)<-1e-8)continue;
   if(!screen&&Math.abs(z-receiver-.75)<.26)out.uncertain[k]=1;if(z<0||(!screen&&z<=receiver+.75))continue;
   const u=wa*a.u+wb*c.u+wc*d.u,v=wa*a.v+wb*c.v+wc*d.v;if(u<=0||v<=0||u>=1||v>=1)continue;
   const alpha=alphaAt(data,frame.frame[2],[0,0,frame.frame[2],frame.frame[3]],u,v);if(alpha<.5/255)continue;
   const inv=1/det,duX=((c.y-d.y)*a.u+(d.y-a.y)*c.u+(a.y-c.y)*d.u)*inv,duY=((d.x-c.x)*a.u+(a.x-d.x)*c.u+(c.x-a.x)*d.u)*inv,dvX=((c.y-d.y)*a.v+(d.y-a.y)*c.v+(a.y-c.y)*d.v)*inv,dvY=((d.x-c.x)*a.v+(a.x-d.x)*c.v+(c.x-a.x)*d.v)*inv,eu=(Math.abs(duX)+Math.abs(duY))*2/grid,ev=(Math.abs(dvX)+Math.abs(dvY))*2/grid;
   const cameraX=((u-frame.pivot[0])*frame.width)/b.step,cameraY=((v-frame.pivot[1])*frame.height)/b.step,fx=cameraX-Math.floor(cameraX),fy=cameraY-Math.floor(cameraY),maskUncertain=!!mask&&(Math.min(fx,1-fx)<eu*frame.width/b.step+.002||Math.min(fy,1-fy)<ev*frame.height/b.step+.002);
   if(maskUncertain)out.uncertain[k]=1;if(mask?.(u,v,alpha))continue;
   let lower=alpha;if(alpha>.98)lower=Math.max(eu*frame.frame[2],ev*frame.frame[3])>4?0:alphaRange(data,frame.frame[2],[0,0,frame.frame[2],frame.frame[3]],[{u:u-eu,v:v-ev},{u:u+eu,v:v+ev}]).lo;if(maskUncertain||edgeDistance<=2/grid||(!screen&&z<=receiver+1.01))lower=0;if(lower>out.lower[k]){out.lower[k]=lower;out.lowerWidth[k]=triangleWidth;out.lowerDepth[k]=z;}
   if(z>out.depth[k]){out.depth[k]=z;out.uncertain[k]=edgeDistance<=2/grid?1:0;}out.coverage[k]=Math.max(out.coverage[k],alpha);
  }
 }
}
/** Independent CPU raster of the evaluated skin, used only by isolated diagnostics. */
export function rasterSkinned(pose:ActorSkinnedPose[],frame:ActorShadowFrame,anchor:ActorAnchor,sun:ShadowSun,b:ShadowBounds,data:Uint8ClampedArray,screen=false,receiver=0,subpixelBits=8){
 const out=raster(b);for(const p of pose)trianglesInto(out,referenceVertices(p,frame,anchor,sun,screen),p.geometry.indices,frame,b,data,screen,receiver,subpixelBits);return out;
}
/** Independent reconstruction of the alpha fringe, given the verified camera-height input. */
export function rasterAlphaShell(frame:ActorShadowFrame,anchor:ActorAnchor,sun:ShadowSun,b:ShadowBounds,data:Uint8ClampedArray,camera:{rgb:Uint8Array|Uint8ClampedArray;alpha:Uint8Array|Uint8ClampedArray;width:number;height:number},owner:number,screen=false,receiver=0,bits=8,cb:ShadowBounds=b){
 const cols=Math.ceil(frame.width)+1,rows=Math.ceil(frame.height)+1,vertices:ReferenceVertex[]=[],indices:number[]=[],out=raster(b);
 const read=(x:number,y:number)=>{const mx=Math.floor((x-cb.left)/cb.step+.001),my=Math.floor((y-cb.top)/cb.step+.001);if(mx<0||my<0||mx>=camera.width||my>=camera.height)return {z:0,alpha:0,owner:0};const k=(my*camera.width+mx)*4;return {z:((camera.rgb[k+1]&15)*256+camera.rgb[k+2])*.5,alpha:camera.alpha[k]/255,owner:camera.rgb[k]*16+(camera.rgb[k+1]>>4)};};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const u=x/(cols-1),v=y/(rows-1),sx=(anchor.groundX??0)+(u-frame.pivot[0])*frame.width,sy=anchor.groundY-anchor.lift+(v-frame.pivot[1])*frame.height;let z=Math.max(anchor.lift,anchor.groundY+(frame.groundOffsetY??0)-sy),nearest=Infinity;
  for(let ring=0;ring<4;ring++)for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const dx=ox*ring*Math.max(cb.step,.5),dy=oy*ring*Math.max(cb.step,.5),d=read(sx+dx,sy+dy),distance=dx*dx+dy*dy;if(d.alpha>.001&&d.owner===owner&&distance<nearest){nearest=distance;z=d.z;}}
  vertices.push({u,v,z:Math.max(anchor.lift,z),x:sx+(screen?0:sun.dx*z),y:sy+(screen?0:(1+sun.dy)*z)});const i=y*cols+x;if(x<cols-1&&y<rows-1)indices.push(i,i+1,i+cols+1,i,i+cols+1,i+cols);
 }
 trianglesInto(out,vertices,new Uint32Array(indices),frame,b,data,screen,receiver,bits,(u,v,alpha)=>{const d=read((anchor.groundX??0)+(u-frame.pivot[0])*frame.width,anchor.groundY-anchor.lift+(v-frame.pivot[1])*frame.height);return d.owner===owner&&d.alpha>=alpha-.5/255;});return out;
}
