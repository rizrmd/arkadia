import models from '../world/maps/solid-shadow-companions.json';
import catalog from '../world/maps/frozen-frontier-sprites.json';
import type {ShadowSurface} from './shadow-surfaces';
type SolidModel={source:string;sourceSize:number[];frame:number[];capHeightFraction:number;frontGround:number[];backGround:number[]};
const solids=models.assets as Record<string,SolidModel>;
export function withSolidShadowGeometry(p:ShadowSurface):ShadowSurface{
 if(p.solidBody===false)return p;
 const frontier=p.key.startsWith('ff:'),id=frontier?'frontier:'+p.key.split(':')[1]:'court:'+p.key.split(':')[0],model=solids[id];if(!model)return p;
 if(frontier&&models.atlasSha256!==catalog.sha256)throw Error('Solid shadow companion atlas revision mismatch');
 if(!frontier&&!p.key.endsWith(':'+model.source))return p;
 if(p.sourceWidth!==model.sourceSize[0]||p.sourceHeight!==model.sourceSize[1]||JSON.stringify(p.frame??[0,0,p.sourceWidth,p.sourceHeight])!==JSON.stringify(model.frame))throw Error('Solid shadow companion frame mismatch: '+id);
 return {...p,solidBody:true,capHeight:model.capHeightFraction*p.height*(p.vertical??1),ground:model.frontGround,backGround:model.backGround};
}
