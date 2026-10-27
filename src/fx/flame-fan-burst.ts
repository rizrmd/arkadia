import {Assets,GlProgram,Mesh,MeshGeometry,RenderTexture,Shader,Texture,UniformGroup,type Renderer} from 'pixi.js';
import {createGpuPreparation} from '../app/gpu-preparation';

/** Approved #JQHWD sprite. One source upload, animated UV advection in the existing Pixi context.
 * Local +x is combat aim; the caster is (128,128). Sector/wall/object mask is supplied by combat.
 * Keep rank balance outside this renderer. No new projectiles or damage are created here. */
export const FLAME_FAN_BURST_ASSET='/flame-fan-burst-candidate/v1/flame-burst-v1.png';
export function burstEnvelope(age:number){
 return {reach:Math.min(1,.12+Math.max(0,age)*8),alpha:Math.min(1,Math.max(0,age)*25)*Math.min(1,Math.max(0,(.85-age)/.35))*.84};
}
export function createFlameFanBurst(renderer?:Renderer){
 let image:HTMLImageElement,texture:Texture,preparing:Promise<void>;
 const canvas=Object.assign(document.createElement('canvas'),{width:256,height:256}),g=canvas.getContext('2d')!;
 const uniforms=new UniformGroup({age:{value:0,type:'f32'},reach:{value:1,type:'f32'},opacity:{value:1,type:'f32'}});
 const shader=renderer?new Shader({glProgram:GlProgram.from({name:'flame-fan-approved-burst',vertex:'#version 300 es\nin vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}',fragment:`#version 300 es
 precision highp float;
 uniform float age;uniform float reach;uniform float opacity;
 uniform sampler2D uBurst;uniform sampler2D uMask;out vec4 finalColor;
 void main(){
  vec2 uv=gl_FragCoord.xy/256.;
  float x=(uv.x-.5)*2./reach;
  float strip=floor(x*48.);
  float wave=sin(strip*.63-age*38.)*1.8*(.2+x);
  float y=(uv.y*256.-32.-wave)/192.;
  vec4 col=texture(uBurst,vec2(clamp(x,0.,1.),clamp(y,0.,1.)));
  float inside=step(0.,x)*step(x,1.)*step(0.,y)*step(y,1.);
  float a=col.a*opacity*inside*texture(uMask,gl_FragCoord.xy/256.).a;
  finalColor=vec4(col.rgb*opacity*inside*texture(uMask,gl_FragCoord.xy/256.).a,a);
 }`}),resources:{material:uniforms,uBurst:Texture.WHITE.source,uMask:Texture.WHITE.source}}):undefined;
 const mesh=shader?new Mesh({geometry:new MeshGeometry({positions:new Float32Array([-1,-1,1,-1,1,1,-1,1]),indices:new Uint32Array([0,1,2,0,2,3])}),shader}):undefined;
 if(mesh)mesh.blendMode='none';
 function prepare(){return preparing??= (async()=>{
  if(shader){texture=await Assets.load<Texture>(FLAME_FAN_BURST_ASSET);texture.source.autoGarbageCollect=false;shader.resources.uBurst=texture.source;await createGpuPreparation(renderer!).prepare(mesh!);}
  else{image=new Image();image.src=FLAME_FAN_BURST_ASSET;await image.decode();}
 })();}
 return {prepare,createTexture:()=>RenderTexture.create({width:256,height:256,resolution:1,antialias:false,autoGenerateMipmaps:false,scaleMode:'linear'}),
 render(target:RenderTexture,mask:Texture,_rank:number,time:number){
  const e=burstEnvelope(time);uniforms.uniforms.age=time;uniforms.uniforms.reach=e.reach;uniforms.uniforms.opacity=e.alpha;
  shader!.resources.uMask=mask.source;renderer!.render({container:mesh!,target,clear:true});
 },
 renderCanvas(_rank:number,time:number){
  const e=burstEnvelope(time);g.clearRect(0,0,256,256);if(!image)return canvas;
  g.globalAlpha=e.alpha;
  for(let i=0;i<48;i++){
   const x=i/48,wave=Math.sin(i*.63-time*38)*1.8*(.2+x);
   g.drawImage(image,x*image.width,0,image.width/48,image.height,128+x*128*e.reach,32+wave,128*e.reach/48,192);
  }
  g.globalAlpha=1;return canvas;
 }};
}
