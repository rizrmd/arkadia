import {GlProgram,Mesh,MeshGeometry,RenderTexture,Shader,Texture,UniformGroup,type Renderer} from 'pixi.js';
import {FLAME_FAN_FRAGMENT} from './flame-fan-material';
import {createGpuPreparation} from '../app/gpu-preparation';

// Same authored material at the same fixed raster size, in Pixi's existing GL
// context. No secondary WebGL canvas, GPU-to-2D copy or per-frame source upload.
export function createGpuFlameFanMaterial(renderer:Renderer,size=256){
 const uniforms=new UniformGroup({t:{value:0,type:'f32'},rank:{value:1,type:'f32'},size:{value:size,type:'f32'}});
 const fragment=FLAME_FAN_FRAGMENT
  .replace('uniform float t;uniform float rank;uniform float size;','uniform float t;uniform float rank;uniform float size;uniform sampler2D uMask;out vec4 finalColor;')
  .replace('vec2 p=(gl_FragCoord.xy/size-.5)*2.;','vec2 p=vec2(gl_FragCoord.x/size-.5,.5-gl_FragCoord.y/size)*2.;')
  .replace('gl_FragColor=vec4(col,alpha);','alpha*=texture(uMask,gl_FragCoord.xy/size).a;finalColor=vec4(col*alpha,alpha);');
 const shader=new Shader({glProgram:GlProgram.from({name:'flame-fan-connected',vertex:'#version 300 es\nin vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}',fragment:'#version 300 es\n'+fragment}),resources:{material:uniforms,uMask:Texture.WHITE.source}});
 const mesh=new Mesh({geometry:new MeshGeometry({positions:new Float32Array([-1,-1,1,-1,1,1,-1,1]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])}),shader});
 mesh.blendMode='none';
 return {
  mesh,
  prepare:()=>createGpuPreparation(renderer).prepare(mesh),
  createTexture:()=>RenderTexture.create({width:size,height:size,resolution:1,antialias:false,autoGenerateMipmaps:false,scaleMode:'linear'}),
  render(target:RenderTexture,mask:Texture,level:number,time:number){
   uniforms.uniforms.t=time;uniforms.uniforms.rank=level;shader.resources.uMask=mask.source;
   renderer.render({container:mesh,target,clear:true});
  },
 };
}
