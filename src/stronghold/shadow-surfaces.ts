import {sampleNativeBoxes} from './native-shadow-sampling';
import {type ShadowSample} from './shadow-field';
export type ShadowSurface={key:string;source:CanvasImageSource;sourceWidth:number;sourceHeight:number;frame?:number[];x:number;y:number;width:number;height:number;pivot:number[];flip?:boolean;shear?:number;vertical?:number;lift?:number;ground?:number[];constantHeight?:number;depth?:number;cast?:boolean;solidBody?:boolean;nativeGeometry?:{boxes?:number[][];world?:number[];pivot?:number[];vertices?:number[][];faces?:number[][];receiveFaces?:number[];completeAlpha?:boolean};geometryModel?:string;heightInterval?:(u:number,v:number)=>{near:number;far:number};capHeight?:number;backGround?:number[];heightAtScreen?:(x:number,y:number)=>number};
export type SampledSurface={surface:ShadowSurface;samples:ShadowSample[];bounds:{left:number;top:number;right:number;bottom:number};step:number};
// Ground contact measured from alpha, with the same 2:1 support constraint as the
// frontier kit builder. This is an explicitly declared folded billboard proxy.
export function measuredGround(alpha:Uint8ClampedArray,w:number,h:number){
 const bottom=new Int32Array(w).fill(-1);let low=-1,lx=0;
 for(let x=0;x<w;x++)for(let y=h-1;y>=0;y--)if(alpha[(y*w+x)*4+3]>160){bottom[x]=y;if(y>low){low=y;lx=x;}break;}
 if(low<0)return Array(17).fill(1);
 const points:number[][]=[];for(let x=0;x<w;x++)if(bottom[x]>=low-.5*Math.abs(x-lx)-3)points.push([x,bottom[x]+1]);
 const at=(x:number)=>{if(x<=points[0][0])return points[0][1];let j=1;while(j<points.length&&points[j][0]<x)j++;if(j===points.length)return points[j-1][1];const a=points[j-1],b=points[j];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);};
 return Array.from({length:17},(_,i)=>at(i*(w-1)/16)/h);
}
export function baseline(ground:number[],u:number){const n=ground.length-1,t=Math.max(0,Math.min(n,u*n)),i=Math.min(n-1,Math.floor(t));return n?ground[i]+(ground[i+1]-ground[i])*(t-i):ground[0];}
export function surfacePoint(p:ShadowSurface,u:number,v:number,ground=p.ground??[p.pivot[1]]){
 const lx=(u-p.pivot[0])*p.width*(p.flip?-1:1),sy=(p.vertical??1)*p.height,screenY=p.y-(p.lift??0)+(p.shear??0)*lx+(v-p.pivot[1])*sy;
 const raw=p.heightInterval?.(u,v).near??p.constantHeight??Math.max(0,(baseline(ground,u)-v)*sy),local=p.capHeight===undefined?raw:Math.min(p.capHeight,raw),z=p.heightAtScreen?p.heightAtScreen(p.x+lx,screenY):(p.lift??0)+local;
 return {x:p.x+lx,y:screenY+z,z,alpha:1};
}
export function sampleSurface(surface:ShadowSurface,step=2):SampledSurface{
 const p=surface,w=Math.max(1,Math.ceil(p.width/step)),h=Math.max(1,Math.ceil(p.height*(p.vertical??1)/step)),c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true})!,f=p.frame??[0,0,p.sourceWidth,p.sourceHeight];ctx.drawImage(p.source,f[0],f[1],f[2],f[3],0,0,w,h);const data=ctx.getImageData(0,0,w,h).data,g=p.ground??measuredGround(data,w,h),samples:ShadowSample[]=[];
 if(p.nativeGeometry&&p.solidBody!==false){const result=sampleNativeBoxes(p,data,w,h,step);c.width=c.height=1;return result;}
 const volume=!!(p.backGround||p.heightInterval)&&p.solidBody!==false&&p.cast!==false,back=volume?new Float32Array((w+1)*(h+1)*3):null;
 const vertices=new Float32Array((w+1)*(h+1)*3);for(let y=0;y<=h;y++)for(let x=0;x<=w;x++){const q=surfacePoint(p,x/w,y/h,g),i=(y*(w+1)+x)*3;vertices[i]=q.x;vertices[i+1]=q.y;vertices[i+2]=q.z;if(back){const screen=q.y-q.z,z=(p.lift??0)+Math.min(q.z-(p.lift??0),p.heightInterval?p.heightInterval(x/w,y/h).far:Math.max(0,(baseline(p.backGround!,x/w)-y/h)*p.height*(p.vertical??1)));back[i]=q.x;back[i+1]=screen+z;back[i+2]=z;}}
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[(y*w+x)*4+3];if(!a)continue;const q:ShadowSample=surfacePoint(p,(x+.5)/w,(y+.5)/h,g);q.alpha=a/255;const quad=new Float32Array(12);for(const [j,offset] of [y*(w+1)+x,y*(w+1)+x+1,(y+1)*(w+1)+x+1,(y+1)*(w+1)+x].entries())quad.set(vertices.subarray(offset*3,offset*3+3),j*3);q.quad=quad;samples.push(q);
  // Preserve the nearest opaque source interior independently of a higher,
  // translucent texel from the same folded surface. Its original alpha stays
  // unchanged; the separate owner is used only by the light-depth envelope.
  if(!back&&p.cast!==false&&a>=240)samples.push({...q,receive:false,opaqueProxy:true});
  if(back){const far=new Float32Array(12);for(const [j,offset] of [y*(w+1)+x,y*(w+1)+x+1,(y+1)*(w+1)+x+1,(y+1)*(w+1)+x].entries())far.set(back.subarray(offset*3,offset*3+3),j*3);
   const faces=[quad];if(quad.some((n,i)=>Math.abs(n-far[i])>1e-5)){faces.push(far);for(let edge=0;edge<4;edge++){const next=(edge+1)%4,face=new Float32Array(12);face.set(quad.subarray(edge*3,edge*3+3),0);face.set(quad.subarray(next*3,next*3+3),3);face.set(far.subarray(next*3,next*3+3),6);face.set(far.subarray(edge*3,edge*3+3),9);faces.push(face);}}
   for(const [i,face] of faces.entries()){const cell:ShadowSample={x:0,y:0,z:0,alpha:q.alpha,quad:face,receive:false};for(let j=0;j<12;j+=3){cell.x+=face[j]/4;cell.y+=face[j+1]/4;cell.z+=face[j+2]/4;}if(i)samples.push(cell);// Keep a second, near-opaque depth envelope. Source interiors are 250–253
   // alpha, so requiring 254 would omit the solid body. Coverage is unchanged.
   if(a>=240)samples.push({...cell,opaqueProxy:true});}
  }
  left=Math.min(left,q.x);right=Math.max(right,q.x);top=Math.min(top,q.y-q.z);bottom=Math.max(bottom,q.y-q.z);}
 c.width=c.height=1;return {surface:{...p,ground:g},samples,bounds:{left,top,right,bottom},step};
}
