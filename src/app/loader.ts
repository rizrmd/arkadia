import {Application,BitmapTextPipe,CanvasSource,Container,extensions,GraphicsPipe,NineSliceSpritePipe,Sprite,Texture,TilingSpritePipe} from 'pixi.js';
import {FrameSet,pickFrameScale} from '../typography/frames';
import {installMsdfFx,loadFonts} from '../typography/msdf';

extensions.add(TilingSpritePipe,NineSliceSpritePipe,BitmapTextPipe,GraphicsPipe);

// Drives the instant pure-HTML loading screen in index.html and owns the shared Pixi Application + MSDF
// typography resources so the DOM holds only the single Pixi canvas (#world-canvas) once loading finishes.
export type Progress=(done:number,total:number,label:string)=>void;

interface HtmlLoadingScreenApi{
 set(pct:number,text?:string):void;
 progress(done:number,total:number,text:string):void;
 done():void;
 fail(message:string):void;
}

declare global{
 interface Window{
  __LOADING_READY__?:boolean;
  __LOADING_SCREEN__?:HtmlLoadingScreenApi;
 }
}

export function createCanvasSprite(canvas:HTMLCanvasElement){
 if(!canvas.width)canvas.width=1;
 if(!canvas.height)canvas.height=1;
 const source=new CanvasSource({resource:canvas,resolution:1});
 const texture=new Texture({source,dynamic:true});
 const sprite=new Sprite(texture);
 return {
  sprite,
  source,
  texture,
  sync(logicalW=canvas.width,logicalH=canvas.height){
   let resized=false;
   if(source.pixelWidth!==canvas.width||source.pixelHeight!==canvas.height){
    source.resize(canvas.width,canvas.height,1);
    resized=true;
   }
   if(texture.frame.width!==source.width||texture.frame.height!==source.height||texture.orig.width!==source.width||texture.orig.height!==source.height){
    texture.frame.width=source.width;
    texture.frame.height=source.height;
    texture.orig.width=source.width;
    texture.orig.height=source.height;
    resized=true;
   }
   if(resized){
    texture.updateUvs();
    texture.update();
    (sprite as unknown as {onViewUpdate():void}).onViewUpdate();
   }
   source.update();
   sprite.width=logicalW;
   sprite.height=logicalH;
  },
 };
}

export interface SharedPixiRuntime{
 app:Application;
 frames:FrameSet;
 worldStage:Container;
 uiStage:Container;
 loadingStage:Container;
}

let runtimePromise:Promise<SharedPixiRuntime>|undefined;

export function ensurePixiRuntime(host?:HTMLElement):Promise<SharedPixiRuntime>{
 if(runtimePromise)return runtimePromise;
 runtimePromise=(async()=>{
  window.__LOADING_SCREEN__?.progress(8,100,'Loading the game');
  const app=new Application();
  await app.init({
   preference:'webgl',
   resizeTo:window,
   backgroundColor:0x0b0e12,
   antialias:true,
   autoDensity:true,
   resolution:window.devicePixelRatio||1,
   gcActive:false,
  });
  app.canvas.id='world-canvas';
  const mountTarget=host??document.querySelector<HTMLElement>('#app')??document.body;
  if(app.canvas.parentElement!==mountTarget){
   mountTarget.prepend(app.canvas);
  }
  installMsdfFx(app.renderer);
  window.__LOADING_SCREEN__?.progress(14,100,'Loading interface & fonts');
  const [,frames]=await Promise.all([
   loadFonts('/typography/v2/fonts/'),
   FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1)),
  ]);
  window.__LOADING_SCREEN__?.progress(18,100,'Loading artwork');
  const worldStage=new Container();
  const uiStage=new Container();
  const loadingStage=new Container();
  app.stage.addChild(worldStage,uiStage,loadingStage);
  return {app,frames,worldStage,uiStage,loadingStage};
 })();
 return runtimePromise;
}

export function loadingScreen(){
 // Connects to the pure HTML loading screen already rendered in index.html at t=0ms.
 return {
  progress(done:number,total:number,text:string){
   window.__LOADING_SCREEN__?.progress(done,total,text);
  },
  done(){
   window.__LOADING_SCREEN__?.done();
  },
  fail(message:string){
   window.__LOADING_SCREEN__?.fail(message);
  },
 };
}

// Artwork downloads count received bytes, so the bar moves with the transfer instead of with finished files:
// a few large textures arriving last no longer hold it near the end. Each URL is fetched once; a view asks
// for the same image again (the hero and revenant atlases) and shares the download.
type Download={received:number;size?:number};
const downloads=new Map<string,Download>(),images=new Map<string,Promise<HTMLImageElement>>(),listeners=new Set<()=>void>(),sizes=new Map<string,number>();
// The build lists every public image's byte size in /asset-sizes.json (vite.config.ts), so the total is exact
// before any download has answered. Without it, Content-Length headers fill the sizes in as they arrive.
export async function expectSizes(){try{for(const [file,size] of Object.entries(await (await fetch('/asset-sizes.json')).json() as Record<string,number>))sizes.set(file,size);}catch(e){console.warn('No asset sizes; the loading bar estimates them.',e);}}
// Files whose length is not known yet count as the average known file until their headers arrive.
export function downloadedBytes(){
 const all=[...downloads.values()],known=all.filter(d=>d.size!==undefined),guess=known.length?known.reduce((a,d)=>a+d.size!,0)/known.length:256e3;
 return {received:all.reduce((a,d)=>a+d.received,0),expected:all.reduce((a,d)=>a+Math.max(d.received,d.size??guess),0)};
}
export function onDownload(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
const changed=()=>listeners.forEach(l=>l());
export function loadImage(url:string){
 let image=images.get(url);if(image)return image;
 const d:Download={received:0,size:sizes.get(url.split('?')[0])};downloads.set(url,d);changed();
 image=(async()=>{
  const response=await fetch(url);if(!response.ok)throw new Error(`${url} answered ${response.status}`);
  // A compressed body streams more bytes than its Content-Length, so only an identity length is trusted.
  const length=Number(response.headers.get('content-length')),encoded=(response.headers.get('content-encoding')||'identity')!=='identity';
  if(length>0&&!encoded&&d.size!==length){d.size=length;changed();}
  const chunks:BlobPart[]=[],reader=response.body?.getReader();
  if(reader)for(let r=await reader.read();!r.done;r=await reader.read()){chunks.push(r.value);d.received+=r.value.byteLength;changed();}
  else{const all=await response.arrayBuffer();chunks.push(all);d.received=all.byteLength;}
  d.size=d.received;changed();
  const source=URL.createObjectURL(new Blob(chunks,{type:response.headers.get('content-type')||''})),result=new Image();
  try{result.src=source;await result.decode();}finally{URL.revokeObjectURL(source);}
  return result;
 })();
 images.set(url,image);return image;
}
