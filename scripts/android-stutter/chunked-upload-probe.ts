import {Application} from 'pixi.js';
import {prepareBufferTextures} from '../../src/app/chunked-texture-upload';
export async function probe(){
 const app=new Application();await app.init({width:16,height:16,preference:'webgl'});app.stop();
 const renderer=app.renderer as any,gl=renderer.gl as WebGL2RenderingContext,uploads:{kind:string;bytes:number}[]=[],allocations:number[]=[];
 const image=gl.texImage2D.bind(gl),sub=gl.texSubImage2D.bind(gl);
 gl.texImage2D=((...a:any[])=>{if(a.length===9){allocations.push(a[3]*a[4]*4);uploads.push({kind:'allocate',bytes:a[8]?.byteLength??0});}(image as any)(...a);}) as any;
 gl.texSubImage2D=((...a:any[])=>{uploads.push({kind:'rows',bytes:a.at(-1)?.byteLength??0});(sub as any)(...a);}) as any;
 const maps=[0,1,2].map(index=>{const width=731,height=941,pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<pixels.length;i++)pixels[i]=(i*17+index*31+(i>>9))%256;return {width,height,pixels,label:'probe-'+index};});
 let frames=0,live=true;const tick=()=>{if(live){frames++;requestAnimationFrame(tick);}};requestAnimationFrame(tick);
 try{
  const sources=await prepareBufferTextures(app.renderer,maps);if(!sources)throw Error('Upload canceled unexpectedly');
  const normalUploads=uploads.slice(),normalAllocations=allocations.slice();let mismatches=0;
  function read(source:any){renderer.texture.bind(source,0);const tex=renderer.texture.getGlSource(source),previous=gl.getParameter(gl.FRAMEBUFFER_BINDING),fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex.texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete probe framebuffer');const bytes=new Uint8Array(source.pixelWidth*source.pixelHeight*4);gl.readPixels(0,0,source.pixelWidth,source.pixelHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);gl.bindFramebuffer(gl.FRAMEBUFFER,previous);gl.deleteFramebuffer(fb);return bytes;}
  for(let k=0;k<sources.length;k++){const bytes=read(sources[k]);for(let i=0;i<bytes.length;i++)if(bytes[i]!==maps[k].pixels[i])mismatches++;}
  // Completed sources must restore all packed bytes after GPU eviction.
  sources[0].unload();const restored=read(sources[0]);let restorationMismatch=0;for(let i=0;i<restored.length;i++)if(restored[i]!==maps[0].pixels[i])restorationMismatch++;
  for(const source of sources)source.destroy();
  let checks=0;const canceled=await prepareBufferTextures(app.renderer,maps,()=>++checks<5);
  return {mismatches,restorationMismatch,canceled:canceled===null,frames,normalAllocations,normalUploads,maxTransferBytes:Math.max(...normalUploads.map(u=>u.bytes)),glError:gl.getError()};
 }finally{live=false;gl.texImage2D=image;gl.texSubImage2D=sub;app.destroy({removeView:true,releaseGlobalResources:false},{children:true});}
}
