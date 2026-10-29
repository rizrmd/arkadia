import './chunked-texture-upload';
import './render-settings';
import {renderQuality} from './render-quality';
import {installTickerCadence} from './frame-cadence';
import {Application,BitmapTextPipe,CanvasSource,Container,extensions,GraphicsPipe,NineSliceSpritePipe,Sprite,Texture,TilingSpritePipe} from 'pixi.js';
import {FrameSet,pickFrameScale} from '../typography/frames';
import {installMsdfFx,loadFonts} from '../typography/msdf';

extensions.add(TilingSpritePipe,NineSliceSpritePipe,BitmapTextPipe,GraphicsPipe);

// Drives the instant pure-HTML loading screen in index.html and owns the shared Pixi Application + MSDF
// typography resources so the DOM holds only the single Pixi canvas (#world-canvas) once loading finishes.
export {loadingScreen,type Progress} from './loading-progress';

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
  window.__LOADING_SCREEN__?.progress(12,100,'Starting graphics');
  const app=new Application();
  await app.init({
   // Keep WebGL as the fast path, but let Pixi select its Canvas renderer when
   // the device/browser cannot create a WebGL context. Without the fallback,
   // Application.init rejects after the loading artwork has finished and the
   // player is left on the generic "Stronghold could not load" screen.
   preference:['webgl','canvas'],
   resizeTo:window,
   backgroundColor:0x0b0e12,
   antialias:renderQuality.get().tier==='high',
   autoDensity:true,
   // Low-spec phones use a 1x backbuffer and no MSAA; stronger devices can use up to 2x.
   resolution:Math.min(window.devicePixelRatio||1,renderQuality.get().resolution),
   gcActive:false,
  });
  installTickerCadence(app.ticker,()=>renderQuality.get().targetFps);
  const applyQuality=()=>{
   const q=renderQuality.get();
   const resolution=Math.min(window.devicePixelRatio||1,q.resolution);
   if(app.renderer.resolution!==resolution)app.renderer.resize(innerWidth,innerHeight,resolution);
   Object.assign(app.canvas.dataset,{quality:q.tier,targetFps:String(q.targetFps),renderResolution:String(resolution)});
  };
  applyQuality();renderQuality.subscribe(applyQuality);
  app.canvas.id='world-canvas';
  const mountTarget=host??document.querySelector<HTMLElement>('#app')??document.body;
  if(app.canvas.parentElement!==mountTarget){
   mountTarget.prepend(app.canvas);
  }
  installMsdfFx(app.renderer);
  window.__LOADING_SCREEN__?.progress(14,100,'Loading');
  const interfaceProgress={done:0,total:0},fontProgress={done:0,total:3};
  const reportInterface=()=>{
   const done=interfaceProgress.done+fontProgress.done,total=interfaceProgress.total+fontProgress.total;
   // Reserve a separate range for interface assets; artwork continues from 32%, never from zero.
   window.__LOADING_SCREEN__?.progress(14+18*(interfaceProgress.total?done/Math.max(1,total):0),100,
    `Loading interface · ${done}/${total||'…'}`);
  };
  const [,frames]=await Promise.all([
   loadFonts('/typography/v2/fonts/',(done,total)=>{Object.assign(fontProgress,{done,total});reportInterface();}),
   FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1),undefined,(done,total)=>{Object.assign(interfaceProgress,{done,total});reportInterface();}),
  ]);
  window.__LOADING_SCREEN__?.progress(32,100,'Loading artwork');
  const worldStage=new Container();
  const uiStage=new Container();
  const loadingStage=new Container();
  app.stage.addChild(worldStage,uiStage,loadingStage);
  return {app,frames,worldStage,uiStage,loadingStage};
 })();
 return runtimePromise;
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
