import {highpShadowProgram} from './shadow-program';
import {DefaultBatcher,Shader,UniformGroup,compileHighShaderGlProgram,colorBitGl,generateTextureBatchBitGl,getBatchSamplersUniformGroup,roundPixelsBitGl,extensions,ExtensionType,type BatcherOptions,type Renderer,type Sprite,type TextureSource,type Batch,type DefaultBatchableQuadElement,type DefaultBatchableMeshElement} from 'pixi.js';
import {SHADOW_SAMPLING_GLSL} from './shadow-sampling';
import {actorAnchorForSprite,actorHeightTile} from './shadow-actor-sources';
export {registerActorShadowSprite} from './shadow-actor-sources';
export type {ActorAnchor} from './shadow-actor-sources';
export type ActorShadowBindings={uCamera:Float32Array;uSun:Float32Array;uDynamicSun:Float32Array;uLightBounds:Float32Array;uDynamicLightBounds:Float32Array;textures:TextureSource[]};
// Each render group needs independent uniforms, but its identical shader program
// must not be linked again when another group or enemy batch first appears.
const actorPrograms=new Map<number,ReturnType<typeof compileHighShaderGlProgram>>();
class ActorShadowShader extends Shader{
 readonly count:number;
 constructor(count:number){
  const bit={name:'actor-shadow-receive',vertex:{header:'in vec4 aActorAnchor;in vec4 aActorHeightBounds;in vec4 aActorHeightUV;out vec4 vActorAnchor;out vec4 vActorHeightBounds;out vec4 vActorHeightUV;',end:'vActorAnchor=aActorAnchor;vActorHeightBounds=aActorHeightBounds;vActorHeightUV=aActorHeightUV;'},fragment:{header:`in vec4 vActorAnchor;in vec4 vActorHeightBounds;in vec4 vActorHeightUV;uniform mat3 uProjectionMatrix;uniform vec2 uResolution;${SHADOW_SAMPLING_GLSL}`,end:`vec4 anchor=vActorAnchor,heightBounds=vActorHeightBounds,heightUV=vActorHeightUV;if(anchor.w>.5&&uSun.z>0.0&&finalColor.a>.003){vec2 screenPixel=(gl_FragCoord.xy/uResolution*2.0-1.0-uProjectionMatrix[2].xy)/vec2(uProjectionMatrix[0].x,uProjectionMatrix[1].y);vec2 world=(screenPixel-uCamera.xy)/uCamera.z;float h=actorReceiverHeight(world,anchor.z,max(anchor.y,anchor.x-world.y),heightBounds,heightUV),shade=shadowCoverage(world,h,anchor.z)*uSun.z;finalColor.rgb=mix(finalColor.rgb,finalColor.a*vec3(.078431,.109804,.172549),shade);}`}};
  let program=actorPrograms.get(count);
  if(!program){program=highpShadowProgram(compileHighShaderGlProgram({name:'actor-shadow-batch',bits:[colorBitGl,generateTextureBatchBitGl(count),roundPixelsBitGl,bit]}),'actor-shadow-batch-highp');actorPrograms.set(count,program);}
  super({glProgram:program,resources:{batchSamplers:getBatchSamplersUniformGroup(count),actorUniforms:new UniformGroup({
   uCamera:{value:new Float32Array([0,0,1,0]),type:'vec4<f32>'},uSun:{value:new Float32Array(4),type:'vec4<f32>'},uDynamicSun:{value:new Float32Array(4),type:'vec4<f32>'},uLightBounds:{value:new Float32Array([0,0,1,1]),type:'vec4<f32>'},uDynamicLightBounds:{value:new Float32Array([0,0,1,1]),type:'vec4<f32>'},uDepth:{value:count,type:'i32'},uSecondDepth:{value:count+1,type:'i32'},uDynamicDepth:{value:count+2,type:'i32'},uDynamicSecond:{value:count+3,type:'i32'},
  })}});this.count=count;
 }
}
const actorRenderers=new WeakMap<object,Renderer>();
class ActorShadowBatcher extends DefaultBatcher{
 private metaScratch=new Float32Array(12);private scratch=new Float32Array(24);private scratchBits=new Uint32Array(this.scratch.buffer);
 constructor(options:BatcherOptions){
  super({...options,maxTextures:Math.max(1,Math.min(12,options.maxTextures-4))});(this as {name:string}).name='shadow-actors';this.shader=new ActorShadowShader(this.maxTextures);
  this.vertexSize=18;const geometry=this.geometry,buffer=geometry.attributes.aPosition.buffer;
  for(const attribute of Object.values(geometry.attributes))attribute.stride=72;
  for(const [name,offset] of [['aActorAnchor',24],['aActorHeightBounds',40],['aActorHeightUV',56]] as const)geometry.addAttribute(name,{buffer,format:'float32x4',stride:72,offset});
 }
 private metadata(element:object){
  const anchor=actorAnchorForSprite((element as any).renderable)?.(),renderer=actorRenderers.get(element),tile=anchor&&renderer?actorHeightTile(renderer,anchor.owner??3900):undefined;
  const data=this.metaScratch;data.fill(0);if(anchor){data[0]=anchor.groundY;data[1]=anchor.lift;data[2]=anchor.owner??3900;data[3]=1;if(tile){data.set(tile.bounds,4);data.set(tile.uv,8);}}return data;
 }
 private expand(element:DefaultBatchableQuadElement|DefaultBatchableMeshElement,f:Float32Array,u:Uint32Array,index:number){const data=this.metadata(element);for(let v=0;v<element.attributeSize;v++){const dst=index+v*18;u.set(this.scratchBits.subarray(v*6,v*6+6),dst);f.set(data,dst+6);}}
 packQuadAttributes(element:DefaultBatchableQuadElement,f:Float32Array,u:Uint32Array,index:number,textureId:number){super.packQuadAttributes(element,this.scratch,this.scratchBits,0,textureId);this.expand(element,f,u,index);}
 packAttributes(element:DefaultBatchableMeshElement,f:Float32Array,u:Uint32Array,index:number,textureId:number){if(this.scratch.length<element.attributeSize*6){this.scratch=new Float32Array(element.attributeSize*6);this.scratchBits=new Uint32Array(this.scratch.buffer);}super.packAttributes(element,this.scratch,this.scratchBits,0,textureId);this.expand(element,f,u,index);}
 // A pose tile or anchor may change while Pixi reuses a cached color quad.
 // Refresh only metadata before its existing vertex-buffer upload, not at draw
 // time. Shared atlas sprites still occupy one source slot and one draw batch.
 refreshMetadata(){let changed=false;const f=this.attributeBuffer.float32View;for(let i=0;i<this.batchIndex;i++)for(const element of this.batches[i].elements){const data=this.metadata(element);for(let v=0;v<element.attributeSize;v++)for(let j=0;j<12;j++){const k=element._attributeStart+v*18+6+j,value=Math.fround(data[j]);if(f[k]!==value){f[k]=value;changed=true;}}}if(changed)this.dirty=true;}
}
extensions.add({type:ExtensionType.Batcher,name:'shadow-actors',ref:ActorShadowBatcher});
type Provider=()=>ActorShadowBindings;
const providers=new WeakMap<Renderer,Provider>(),installed=new WeakSet<Renderer>();
// Keep Pixi's quad positions, source sprites, tint, alpha and multi-texture
// batches. Extra field samplers use four reserved units; no per-actor filters or
// GPU readback are introduced for animated/3D receiver silhouettes.
export function installActorShadowReceivers(renderer:Renderer,provider:Provider){
 const previous=providers.get(renderer);providers.set(renderer,provider);
 if(!installed.has(renderer)){
  installed.add(renderer);
  const pipe=(renderer.renderPipes as any).sprite,get=pipe._getGpuSprite.bind(pipe);
  pipe._getGpuSprite=(sprite:Sprite)=>{const gpu=get(sprite);if(actorAnchorForSprite(sprite)){gpu.batcherName='shadow-actors';actorRenderers.set(gpu,renderer);}return gpu;};
  const batchPipe=(renderer.renderPipes as any).batch,upload=batchPipe.upload.bind(batchPipe);
  batchPipe.upload=(instructionSet:any)=>{for(const batcher of Object.values(batchPipe._batchersByInstructionSet[instructionSet.uid]??{}))if(batcher instanceof ActorShadowBatcher)batcher.refreshMetadata();upload(instructionSet);};
  const adaptor=(renderer.renderPipes as any).batch._adaptor,execute=adaptor.execute.bind(adaptor);
  adaptor.execute=(batchPipe:any,batch:Batch)=>{
   const shader=batch.batcher.shader;
   if(shader instanceof ActorShadowShader){const binding=providers.get(renderer)?.();if(binding){const group=shader.resources.actorUniforms as UniformGroup,uniforms=group.uniforms;
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
