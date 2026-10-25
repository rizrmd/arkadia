import {highpShadowProgram} from './shadow-program';
import {DefaultBatcher,Shader,UniformGroup,compileHighShaderGlProgram,colorBitGl,generateTextureBatchBitGl,getBatchSamplersUniformGroup,roundPixelsBitGl,extensions,ExtensionType,type BatcherOptions,type Renderer,type Sprite,type TextureSource,type Batch} from 'pixi.js';
import {SHADOW_SAMPLING_GLSL} from './shadow-sampling';
import {actorAnchorForSprite,actorAnchorForTexture} from './shadow-actor-sources';
export {registerActorShadowSprite} from './shadow-actor-sources';
export type {ActorAnchor} from './shadow-actor-sources';
export type ActorShadowBindings={uCamera:Float32Array;uSun:Float32Array;uDynamicSun:Float32Array;uLightBounds:Float32Array;uDynamicLightBounds:Float32Array;textures:TextureSource[]};
// Each render group needs independent uniforms, but its identical shader program
// must not be linked again when another group or enemy batch first appears.
const actorPrograms=new Map<number,ReturnType<typeof compileHighShaderGlProgram>>();
class ActorShadowShader extends Shader{
 readonly count:number;
 constructor(count:number){
  const bit={name:'actor-shadow-receive',vertex:{header:'out vec2 vShadowScreen;',end:'vShadowScreen=(worldTransformMatrix*modelMatrix*vec3(position,1.0)).xy;'},fragment:{header:`in vec2 vShadowScreen;uniform vec4 uActorAnchors[${count}];${SHADOW_SAMPLING_GLSL}`,end:`vec4 anchor;${Array.from({length:count},(_,i)=>`${i?'else ':''}${i<count-1?`if(vTextureId<${i}.5)`:''}anchor=uActorAnchors[${i}];`).join('')} if(anchor.w>.5&&uSun.z>0.0&&finalColor.a>.003){vec2 world=(vShadowScreen-uCamera.xy)/uCamera.z;float h=max(anchor.y,anchor.x-world.y),shade=shadowCoverage(world,h,anchor.z)*uSun.z;finalColor.rgb=mix(finalColor.rgb,finalColor.a*vec3(.078431,.109804,.172549),shade);}`}};
  let program=actorPrograms.get(count);
  if(!program){program=highpShadowProgram(compileHighShaderGlProgram({name:'actor-shadow-batch',bits:[colorBitGl,generateTextureBatchBitGl(count),roundPixelsBitGl,bit]}),'actor-shadow-batch-highp');actorPrograms.set(count,program);}
  super({glProgram:program,resources:{batchSamplers:getBatchSamplersUniformGroup(count),actorUniforms:new UniformGroup({
   uActorAnchors:{value:new Float32Array(count*4),type:'vec4<f32>',size:count},uCamera:{value:new Float32Array([0,0,1,0]),type:'vec4<f32>'},uSun:{value:new Float32Array(4),type:'vec4<f32>'},uDynamicSun:{value:new Float32Array(4),type:'vec4<f32>'},uLightBounds:{value:new Float32Array([0,0,1,1]),type:'vec4<f32>'},uDynamicLightBounds:{value:new Float32Array([0,0,1,1]),type:'vec4<f32>'},uDepth:{value:count,type:'i32'},uSecondDepth:{value:count+1,type:'i32'},uDynamicDepth:{value:count+2,type:'i32'},uDynamicSecond:{value:count+3,type:'i32'},
  })}});this.count=count;
 }
}
class ActorShadowBatcher extends DefaultBatcher{
 constructor(options:BatcherOptions){super({...options,maxTextures:Math.max(1,Math.min(12,options.maxTextures-4))});(this as {name:string}).name='shadow-actors';this.shader=new ActorShadowShader(this.maxTextures);}
}
extensions.add({type:ExtensionType.Batcher,name:'shadow-actors',ref:ActorShadowBatcher});
type Provider=()=>ActorShadowBindings;
const providers=new WeakMap<Renderer,Provider>(),installed=new WeakSet<Renderer>();
// Keep Pixi's original geometry, source sprites, tint, alpha and multi-texture
// batches. Extra field samplers use four reserved units; no per-actor filters or
// GPU readback are introduced for animated/3D receiver silhouettes.
export function installActorShadowReceivers(renderer:Renderer,provider:Provider){
 const previous=providers.get(renderer);providers.set(renderer,provider);
 if(!installed.has(renderer)){
  installed.add(renderer);
  const pipe=(renderer.renderPipes as any).sprite,get=pipe._getGpuSprite.bind(pipe);
  pipe._getGpuSprite=(sprite:Sprite)=>{const gpu=get(sprite);if(actorAnchorForSprite(sprite))gpu.batcherName='shadow-actors';return gpu;};
  const adaptor=(renderer.renderPipes as any).batch._adaptor,execute=adaptor.execute.bind(adaptor);
  adaptor.execute=(batchPipe:any,batch:Batch)=>{
   const shader=batch.batcher.shader;
   if(shader instanceof ActorShadowShader){const binding=providers.get(renderer)?.();if(binding){const group=shader.resources.actorUniforms as UniformGroup,uniforms=group.uniforms,anchors=uniforms.uActorAnchors as Float32Array;anchors.fill(0);for(let i=0;i<batch.textures.count;i++){const anchor=actorAnchorForTexture(batch.textures.textures[i])?.();if(anchor)anchors.set([anchor.groundY,anchor.lift,anchor.owner??3900,1],i*4);}
     for(const name of ['uCamera','uSun','uDynamicSun','uLightBounds','uDynamicLightBounds'] as const)uniforms[name]=binding[name];
     (renderer as any).shader.updateUniformGroup(group);
     // Stock adaptor overwrites only units 0..batch.count-1. The four field
     // sources stay resident above the actor batch's source texture range.
     for(let i=0;i<4;i++)(renderer as any).texture.bind(binding.textures[i],shader.count+i);
   }}
   execute(batchPipe,batch);
  };
 }
 return ()=>{if(previous)providers.set(renderer,previous);else providers.delete(renderer);};
}
