import companions from '../world/maps/shadow-material-companions.json';
import type {ShadowSurface} from './shadow-surfaces';
const material=companions.assets['court:brazier'];
export const BRAZIER_PHYSICAL_SOURCE=material.physical.url+'?audit='+material.physical.sha256;
export function withBrazierShadowMaterial(p:ShadowSurface,physical?:HTMLImageElement):ShadowSurface{
 if(p.key!=='brazier:'+material.source)return p;
 if(!physical?.complete||physical.naturalWidth!==material.sourceSize[0]||physical.naturalHeight!==material.sourceSize[1]||p.sourceWidth!==material.sourceSize[0]||p.sourceHeight!==material.sourceSize[1])throw Error('Brazier material companion/source dimensions differ');
 return {...p,physicalSource:physical,materialRevision:'brazier:'+material.physical.sha256};
}
