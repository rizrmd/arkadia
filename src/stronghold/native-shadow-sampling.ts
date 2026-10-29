import {shadowSourceOffset} from './shadow-source-transform';
import type {ShadowSample} from './shadow-field';
import type {ShadowSurface,SampledSurface} from './shadow-surfaces';
type Vertex={u:number;v:number;x:number;y:number;z:number};
// Clip each actual box face in source-camera space before projecting to light
// space. Interpolating a depth map across a silhouette from height to zero
// creates false triangular curtains; face clipping never crosses that seam.
function clip(input:Vertex[],axis:'u'|'v',edge:number,greater:boolean){const out:Vertex[]=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],da=(a[axis]-edge)*(greater?1:-1),db=(b[axis]-edge)*(greater?1:-1);if(da>=-1e-10)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push({u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}}return out;}
export function sampleNativeBoxes(p:ShadowSurface,data:Uint8ClampedArray,w:number,h:number,step:number):SampledSurface{
 const geometry=p.nativeGeometry!,samples:ShadowSample[]=[],covered=new Uint8Array(w*h);
 const point=(su:number,sv:number,z:number)=>{const lx=(su-p.pivot[0])*p.width*(p.flip?-1:1),offset=p.groundRotation?shadowSourceOffset(lx,(sv-p.pivot[1])*p.height*(p.vertical??1),p.shear,p.groundRotation):null,x=p.x+(offset?.x??lx),height=(p.lift??0)+z,screenY=offset?p.y-(p.lift??0)+offset.y:p.y-(p.lift??0)+(p.shear??0)*(x-p.x)+(sv-p.pivot[1])*p.height*(p.vertical??1);return {u:su,v:sv,x,y:screenY+height,z:height};};
 const corners=(box:number[])=>{const [u0,v0,u1,v1,z0,z1]=box,world=geometry.world!,pivot=geometry.pivot!,scale=p.height*(p.vertical??1)/world[1];return [[u0,v0,z0],[u1,v0,z0],[u1,v1,z0],[u0,v1,z0],[u0,v0,z1],[u1,v0,z1],[u1,v1,z1],[u0,v1,z1]].map(([u,v,z])=>point((u-v)*64/world[0]+pivot[0],((u+v)*32-z)/world[1]+pivot[1],z*scale));};
 const solids=geometry.vertices?[geometry.vertices.map(([u,v,z])=>point(u,v,z*p.height*(p.vertical??1)))]:geometry.boxes!.map(corners);
 // First three are source-camera-visible faces: top, +u, +v.
 const faces=geometry.faces??[[4,5,6,7],[1,2,6,5],[2,3,7,6],[0,1,5,4],[0,4,7,3],[0,3,2,1]];
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const vertices of solids){for(const [faceIndex,ids] of faces.entries()){const polygon=ids.map(i=>vertices[i]);let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a.u*b.v-b.u*a.v;}if(Math.abs(area)<1e-12)continue;
  const x0=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p.u))*w)),x1=Math.min(w-1,Math.ceil(Math.max(...polygon.map(p=>p.u))*w)-1),y0=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p.v))*h)),y1=Math.min(h-1,Math.ceil(Math.max(...polygon.map(p=>p.v))*h)-1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const alpha=data[(y*w+x)*4+3];if(!alpha)continue;let cell=clip(polygon,'u',x/w,true);cell=clip(cell,'u',(x+1)/w,false);cell=clip(cell,'v',y/h,true);cell=clip(cell,'v',(y+1)/h,false);if(cell.length<3)continue;
   for(let i=1;i+1<cell.length;i++){const a=cell[0],b=cell[i],c=cell[i+1];if(Math.abs((b.u-a.u)*(c.v-a.v)-(b.v-a.v)*(c.u-a.u))<1e-14)continue;covered[y*w+x]=1;const quad=new Float32Array([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,c.x,c.y,c.z]),q:ShadowSample={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3,z:(a.z+b.z+c.z)/3,alpha:alpha/255,quad,receive:geometry.receiveFaces?geometry.receiveFaces.includes(faceIndex):faceIndex<3};samples.push(q);if(alpha>=240&&p.cast!==false)samples.push({...q,receive:false,opaqueProxy:true});for(const v of [a,b,c]){left=Math.min(left,v.x);right=Math.max(right,v.x);top=Math.min(top,v.y-v.z);bottom=Math.max(bottom,v.y-v.z);}}
  }
 }}
 // Native faces describe the physical body. Preserve original-alpha poles,
 // ropes and ink outside that envelope at their authored structural height.
 // This completion never invents source coverage or reads source brightness.
 if(geometry.completeAlpha&&p.heightAtScreen){for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const alpha=data[(y*w+x)*4+3];if(!alpha||covered[y*w+x])continue;
  const vertices=[[x/w,y/h],[(x+1)/w,y/h],[(x+1)/w,(y+1)/h],[x/w,(y+1)/h]].map(([u,v])=>{const screen=point(u,v,0),z=p.heightAtScreen!(screen.x,screen.y-screen.z)-(p.lift??0);return point(u,v,z);});
  const quad=new Float32Array(vertices.flatMap(v=>[v.x,v.y,v.z])),q:ShadowSample={x:vertices.reduce((n,v)=>n+v.x,0)/4,y:vertices.reduce((n,v)=>n+v.y,0)/4,z:vertices.reduce((n,v)=>n+v.z,0)/4,alpha:alpha/255,quad,receive:true};samples.push(q);if(alpha>=240&&p.cast!==false)samples.push({...q,receive:false,opaqueProxy:true});for(const v of vertices){left=Math.min(left,v.x);right=Math.max(right,v.x);top=Math.min(top,v.y-v.z);bottom=Math.max(bottom,v.y-v.z);}
 }}
 return {surface:p,samples,bounds:{left,top,right,bottom},step};
}
