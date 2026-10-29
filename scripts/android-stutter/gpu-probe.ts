import {BatcherPipe} from 'pixi.js';
import '../../src/stronghold/shadow-actor-batch';

export function actorProgramCacheProbe(){
 const a=BatcherPipe.getBatcher('shadow-actors',16),b=BatcherPipe.getBatcher('shadow-actors',16),c=BatcherPipe.getBatcher('shadow-actors',12);
 const shaders=[a.shader,b.shader,c.shader];
 const result={sameProgram:shaders[0].glProgram===shaders[1].glProgram,independentUniforms:shaders[0].resources.actorUniforms!==shaders[1].resources.actorUniforms,differentSamplerCounts:shaders[0].glProgram!==shaders[2].glProgram};
 a.destroy();b.destroy();c.destroy();for(const shader of shaders)shader.destroy();return result;
}
