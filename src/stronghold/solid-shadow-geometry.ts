import models from '../world/maps/solid-shadow-companions.json';
import catalog from '../world/maps/frozen-frontier-sprites.json';
import type {ShadowSurface} from './shadow-surfaces';
type SolidModel={source:string;sourceSize:number[];frame:number[];capHeightFraction?:number;frontGround:number[];backGround?:number[];nativeBoxes?:number[][];nativeWorld?:number[];nativePivot?:number[];recipeSha256?:string;sourceVertices?:number[][]};
const solids=models.assets as Record<string,SolidModel>;
export function withSolidShadowGeometry(p:ShadowSurface):ShadowSurface{
 if(p.solidBody===false)return p;
 const frontier=p.key.startsWith('ff:'),id=frontier?'frontier:'+p.key.split(':')[1]:'court:'+p.key.split(':')[0],model=solids[id];if(!model)return p;
 if(frontier&&models.atlasSha256!==catalog.sha256)throw Error('Solid shadow companion atlas revision mismatch');
 if(!frontier&&!p.key.endsWith(':'+model.source))return p;
 // Full-image court companions use normalized UVs and remain aligned when
 // delivery downsizes the PNG uniformly (server/webp.go rounds decoded height).
 // Atlas/subframe companions still require exact source-pixel registration.
 const whole=!frontier&&!p.frame&&model.frame[0]===0&&model.frame[1]===0&&model.frame[2]===model.sourceSize[0]&&model.frame[3]===model.sourceSize[1];
 const scaled=whole&&p.sourceWidth>0&&p.sourceHeight>0&&p.sourceWidth<=model.sourceSize[0]&&p.sourceHeight<=model.sourceSize[1]&&p.sourceHeight===Math.max(1,Math.round(model.sourceSize[1]*p.sourceWidth/model.sourceSize[0]));
 if(!scaled&&(p.sourceWidth!==model.sourceSize[0]||p.sourceHeight!==model.sourceSize[1]||JSON.stringify(p.frame??[0,0,p.sourceWidth,p.sourceHeight])!==JSON.stringify(model.frame)))throw Error('Solid shadow companion frame mismatch: '+id);
 if(model.sourceVertices)return {...p,solidBody:true,capHeight:undefined,backGround:undefined,ground:model.frontGround,geometryModel:'authored-source-vertices-v1',nativeGeometry:{vertices:model.sourceVertices}};
 if(model.nativeBoxes){const boxes=model.nativeBoxes,world=model.nativeWorld!,pivot=model.nativePivot!,scale=p.height*(p.vertical??1)/world[1];
  // Inverse source camera: u=x/128+(screenY+z)/64,
  // v=-x/128+(screenY+z)/64. Intersect each authored box along z.
  const heightInterval=(u:number,v:number)=>{const x=(u-pivot[0])*world[0],y=(v-pivot[1])*world[1];let near=0,far=Infinity;for(const [u0,v0,u1,v1,z0,z1] of boxes){const lo=Math.max(z0,64*u0-x*.5-y,64*v0+x*.5-y),hi=Math.min(z1,64*u1-x*.5-y,64*v1+x*.5-y);if(hi>=lo-1e-5){near=Math.max(near,hi);far=Math.min(far,lo);}}return {near:near*scale,far:far===Infinity?0:Math.max(0,far)*scale};};
  return {...p,solidBody:true,capHeight:undefined,backGround:undefined,ground:model.frontGround,nativeGeometry:{boxes,world,pivot},geometryModel:'native-boxes:'+model.recipeSha256,heightInterval};
 }
 return {...p,solidBody:true,capHeight:model.capHeightFraction!*p.height*(p.vertical??1),ground:model.frontGround,backGround:model.backGround};
}
