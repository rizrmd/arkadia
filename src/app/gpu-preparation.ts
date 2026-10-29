import {BatcherPipe,RendererType,type Container,type Renderer,type Shader,type TextureSource} from 'pixi.js';
import {measureRenderDetail} from './render-diagnostics';

// CPU construction does not compile a Pixi shader or upload its textures. Prepare
// only resources reachable from requested content, reusing Pixi's own GPU caches.
export function createGpuPreparation(renderer?:Renderer){
 const programs=new WeakSet<object>(),sources=new WeakSet<object>();
 let compiledPrograms=0,uploadedTextures=0;
 async function prepareTextures(textures:Iterable<TextureSource>){
  if(!renderer||renderer.type!==RendererType.WEBGL)return;
  for(const source of textures){
   if(sources.has(source))continue;
   measureRenderDetail('texturePrepare',()=>renderer.texture.initSource(source));
   sources.add(source);uploadedTextures++;
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
 }
 async function prepare(root:Container,batcherNames:string[]=[],includeHiddenTextures=false){
  if(!renderer||renderer.type!==RendererType.WEBGL)return;
  const glRenderer=renderer as import('pixi.js').WebGLRenderer;
  const resources:(Shader|TextureSource)[]=[];
  const temporaryShaders:Shader[]=[];
  for(const name of batcherNames){
   const batcher=BatcherPipe.getBatcher(name,glRenderer.limits.maxBatchableTextures);
   if(batcher.shader){resources.push(batcher.shader);temporaryShaders.push(batcher.shader);}
   // DefaultBatcher owns geometry but leaves its shared shader alive on destroy.
   batcher.destroy();
  }
  const visit=(node:Container,parentVisible=true)=>{
   const visible=parentVisible&&node.visible;
   const item=node as Container&{shader?:Shader;texture?:{source:TextureSource}};
   if(item.shader?.glProgram&&!programs.has(item.shader.glProgram))resources.push(item.shader);
   if(node.renderPipeId==='particle'&&!item.shader){
    const shader=glRenderer.renderPipes.particle.defaultShader;
    if(shader?.glProgram&&!programs.has(shader.glProgram))resources.push(shader);
   }
   if((visible||includeHiddenTextures)&&item.texture?.source&&!sources.has(item.texture.source))resources.push(item.texture.source);
   for(const filter of node.filters??[])if(filter.glProgram&&!programs.has(filter.glProgram))resources.push(filter);
   for(const child of node.children)visit(child,visible);
  };
  visit(root);
  for(const resource of resources){
   if('glProgram' in resource){
    if(!resource.glProgram||programs.has(resource.glProgram))continue;
    measureRenderDetail('shaderPrepare',()=>glRenderer.shader.bind(resource,true));
    programs.add(resource.glProgram);compiledPrograms++;
   }else{
    if(sources.has(resource))continue;
    measureRenderDetail('texturePrepare',()=>glRenderer.texture.initSource(resource));
    sources.add(resource);uploadedTextures++;
   }
   // A link/upload cannot be sliced. Yield after each distinct resource so the
   // loading/selection UI can repaint; never drain this queue in a combat frame.
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  for(const shader of temporaryShaders)shader.destroy();
 }
 return {prepare,prepareTextures,stats:()=>({compiledPrograms,uploadedTextures})};
}
