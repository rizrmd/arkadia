import companions from '../world/maps/drift-height-companions.json';
import catalog from '../world/maps/frozen-frontier-sprites.json';
import type {ShadowSurface} from './shadow-surfaces';
type DriftHeight={frame:number[];world:number[];size:number[];height:number[];recipeSha256:string};
const models=companions.assets as Record<string,DriftHeight>;
// Source-camera depths replayed from the same procedural heightfield that
// produced the art. UVs are unmirrored source coordinates; surfacePoint applies
// the production placement, mirror, shear, lift and logical height scale.
export function withDriftGeometry(p:ShadowSurface):ShadowSurface{
 const id=p.key.startsWith('ff:')?p.key.split(':')[1]:'',m=models[id];
 if(!m||p.solidBody===false)return p;
 if(companions.atlasSha256!==catalog.sha256)throw Error('Drift shadow atlas revision mismatch');
 if(p.sourceWidth!==catalog.size[0]||p.sourceHeight!==catalog.size[1]||JSON.stringify(p.frame)!==JSON.stringify(m.frame))throw Error('Drift shadow companion frame mismatch: '+id);
 const [w,h]=m.size;
 const at=(u:number,v:number)=>{
  const x=Math.max(0,Math.min(w-1,u*w-.5)),y=Math.max(0,Math.min(h-1,v*h-.5)),i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j;
  const read=(x:number,y:number)=>m.height[Math.min(h-1,y)*w+Math.min(w-1,x)];
  return ((read(i,j)*(1-a)+read(i+1,j)*a)*(1-b)+(read(i,j+1)*(1-a)+read(i+1,j+1)*a)*b)/65535*p.height*(p.vertical??1);
 };
 return {...p,solidBody:true,ignoreLowSelf:true,capHeight:undefined,backGround:undefined,geometryModel:'procedural-drift-height:'+m.recipeSha256,heightInterval:(u,v)=>({near:at(u,v),far:0})};
}
