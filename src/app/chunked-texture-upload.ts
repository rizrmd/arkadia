import {BufferImageSource,extensions,ExtensionType,type GLTextureUploader,type Renderer} from 'pixi.js';

const ranges=new WeakMap<BufferImageSource,[number,number]>();
const uploader:GLTextureUploader={id:'shadow-rows',upload(base,texture,gl,_version,targetOverride){
 const source=base as BufferImageSource,resource=source.resource as Uint8ClampedArray,target=targetOverride??texture.target;
 const width=source.pixelWidth,height=source.pixelHeight;
 if(texture.width!==width||texture.height!==height){
  // Allocate without copying a multi-megabyte buffer in one blocking GL call.
  gl.texImage2D(target,0,texture.internalFormat,width,height,0,texture.format,texture.type,null);
  texture.width=width;texture.height=height;
 }
 // No range means a completed texture is being restored after context loss/GC.
 const [start,end]=ranges.get(source)??[0,height];
 if(end>start)gl.texSubImage2D(target,0,0,start,width,end-start,texture.format,texture.type,resource.subarray(start*width*4,end*width*4));
}};
extensions.add({type:ExtensionType.TextureUploaderWebGL,name:uploader.id,ref:uploader});
export type BufferUpload={pixels:Uint8ClampedArray;width:number;height:number;label:string};

// Staging sources are never visible until every map in the bundle is complete.
// Share one time/byte budget across the bundle; keep packed height/owner bytes raw.
export async function prepareBufferTextures(renderer:Renderer,maps:BufferUpload[],isCurrent:()=>boolean=()=>true){
 const sources:BufferImageSource[]=[];
 let started=performance.now(),chunks=0,complete=false;
 const yieldIfNeeded=async()=>{
  if(chunks>=8||performance.now()-started>=2){await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));started=performance.now();chunks=0;}
  return isCurrent();
 };
 try{
  for(const map of maps){
   if(!await yieldIfNeeded())return null;
   const source=new BufferImageSource({resource:map.pixels,width:map.width,height:map.height,label:map.label,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest',autoGenerateMipmaps:false});
   sources.push(source);source.uploadMethodId=uploader.id;ranges.set(source,[0,0]);
   (renderer as any).texture.bind(source,0);chunks++;
   const rows=Math.max(1,Math.floor(65536/(map.width*4)));
   for(let y=0;y<map.height;y+=rows){
    if(!await yieldIfNeeded())return null;
    ranges.set(source,[y,Math.min(map.height,y+rows)]);source.update();chunks++;
   }
   ranges.delete(source);
  }
  if(!isCurrent())return null;
  complete=true;return sources;
 }finally{
  // Canceled work owns no visible textures; callers can safely keep the old bundle.
  if(!complete)for(const source of sources){ranges.delete(source);source.destroy();}
 }
}
