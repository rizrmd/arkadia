import {Application,Container,Texture,RenderTexture} from 'pixi.js';
import {createGpuFlameFanMaterial} from '../../src/fx/flame-fan-gpu';
import {createFlameFanMaterial} from '../../src/fx/flame-fan-material';
import {createGameplayFlameFan} from '../../src/fx/flame-fan-gameplay';

export async function flameGpuProbe(){
 const app=new Application();await app.init({preference:'webgl',width:256,height:256,resolution:1,backgroundAlpha:0,antialias:false,autoStart:false});
 const gpu=createGpuFlameFanMaterial(app.renderer),target=gpu.createTexture();await gpu.prepare();
 const legacy=createFlameFanMaterial(),reference=document.createElement('canvas');reference.width=reference.height=256;
 const ctx=reference.getContext('2d',{willReadFrequently:true})!,mask=document.createElement('canvas');mask.width=mask.height=256;
 const maskCtx=mask.getContext('2d')!,maskTexture=Texture.from(mask);
 const compare=(a:Uint8ClampedArray,b:Uint8Array|Uint8ClampedArray)=>{
  let alpha=0,color=0,maxAlpha=0;for(let i=0;i<a.length;i+=4){const e=Math.abs(a[i+3]-b[i+3]);alpha+=e;maxAlpha=Math.max(maxAlpha,e);for(let c=0;c<3;c++)color+=Math.abs(a[i+c]*a[i+3]/255-b[i+c]);}
  return {alphaMean:alpha/(a.length/4),colorMean:color/(a.length/4*3),maxAlpha};
 };
 const rows=[];let inspect:any;
 for(const masked of [false,true]){
  maskCtx.clearRect(0,0,256,256);maskCtx.fillStyle='white';maskCtx.fillRect(0,0,256,256);
  if(masked){maskCtx.clearRect(190,0,66,256);maskCtx.globalCompositeOperation='copy';maskCtx.fillStyle='rgba(255,255,255,.4)';maskCtx.fillRect(0,0,128,256);maskCtx.globalCompositeOperation='source-over';}
  maskTexture.source.update();
  for(let rank=1;rank<=5;rank++)for(const time of [.5,.7,1.2,2.4]){
   ctx.clearRect(0,0,256,256);ctx.drawImage(legacy.render(rank,time),0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';
   gpu.render(target,maskTexture,rank,time);
   const actual=app.renderer.extract.pixels(target).pixels;
   if(!inspect){const r=app.renderer as import('pixi.js').WebGLRenderer,gl=r.gl,p=r.shader._getProgramData(gpu.mesh.shader!.glProgram!).program;inspect={uniforms:Object.fromEntries(['t','rank','size','uMask'].map(n=>[n,gl.getUniformLocation(p,n)?gl.getUniform(p,gl.getUniformLocation(p,n)):null])),error:gl.getError(),link:gl.getProgramInfoLog(p),shaderLogs:(gl.getAttachedShaders(p)||[]).map(s=>gl.getShaderInfoLog(s)),nonzeroAlpha:actual.filter((v,i)=>i%4===3&&v>0).length,vertex:gpu.mesh.shader!.glProgram!.vertex,fragment:gpu.mesh.shader!.glProgram!.fragment};}
   rows.push({rank,time,masked,...compare(ctx.getImageData(0,0,256,256).data,actual)});
  }
 }
 const parent=new Container(),oldParent=new Container(),trace=()=>({hit:true,x:0,y:0,t:.8}),occlusion=(x:number,y:number)=>x>0?.55:1;
 const native=createGameplayFlameFan(parent,trace,occlusion,app.renderer),old=createGameplayFlameFan(oldParent,trace,occlusion);
 const getContext=HTMLCanvasElement.prototype.getContext;let newWebglContexts=0;
 HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl'||type==='webgl2')newWebglContexts++;return (getContext as any).call(this,type,...args); } as any;
 await native.prepare();native.spawn(18,18,.6,4.4,5);native.frame(.3,{x:0,y:0,scale:1});
 const contextsForNative=newWebglContexts;HTMLCanvasElement.prototype.getContext=getContext;
 await old.prepare();old.spawn(18,18,.6,4.4,5);old.frame(.3,{x:0,y:0,scale:1});
 // Find the burst by its backing texture; soil/ember sprite order is independent.
 const current=parent.children.find(c=>(c as import('pixi.js').Sprite).texture instanceof RenderTexture) as import('pixi.js').Sprite,previous=oldParent.children.find(c=>{const r=(c as import('pixi.js').Sprite).texture?.source.resource;return r instanceof HTMLCanvasElement&&r.width===256;}) as import('pixi.js').Sprite;
 const oldCanvas=previous.texture.source.resource as HTMLCanvasElement;
 const clipped=compare(oldCanvas.getContext('2d')!.getImageData(0,0,256,256).data,app.renderer.extract.pixels(current.texture).pixels);
 const gl=(app.renderer as import('pixi.js').WebGLRenderer).gl,texImage=gl.texImage2D,texSub=gl.texSubImage2D;let uploads=0;
 gl.texImage2D=function(...args:any[]){uploads++;return texImage.apply(gl,args as any);} as any;
 gl.texSubImage2D=function(...args:any[]){uploads++;return texSub.apply(gl,args as any);} as any;
 for(let i=0;i<6;i++)native.frame(.034,{x:0,y:0,scale:1});
 gl.texImage2D=texImage;gl.texSubImage2D=texSub;
 for(let i=0;i<5;i++)native.spawn(18,18,0,4.4,1);
 const active=native.snapshot();
 app.destroy(true,{children:true});
 return {rows,clipped,contextsForNative,steadyTextureUploads:uploads,maxLive:active.length,backend:active[0].backend,radius:active[0].radius,inspect};
}
