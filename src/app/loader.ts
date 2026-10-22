import {Application,Assets,BitmapTextPipe,CanvasSource,Container,extensions,Graphics,GraphicsPipe,NineSliceSpritePipe,Rectangle,Sprite,Texture,TilingSpritePipe} from 'pixi.js';
import {FrameSet,pickFrameScale,type FrameScale} from '../typography/frames';
import {installMsdfFx,loadFonts} from '../typography/msdf';
import {MsdfText} from '../typography/text';

extensions.add(TilingSpritePipe,NineSliceSpritePipe,BitmapTextPipe,GraphicsPipe);

// Drives the Pixi v8 loading screen and owns the shared Pixi Application + MSDF typography resources
// so the DOM holds only the single Pixi canvas (#world-canvas) during play.
export type Progress=(done:number,total:number,label:string)=>void;

export function createCanvasSprite(canvas:HTMLCanvasElement){
 if(!canvas.width)canvas.width=1;
 if(!canvas.height)canvas.height=1;
 const source=new CanvasSource({resource:canvas,resolution:1});
 const texture=new Texture({source});
 const sprite=new Sprite(texture);
 return {
  sprite,
  source,
  texture,
  sync(logicalW=canvas.width,logicalH=canvas.height){
   if(source.pixelWidth!==canvas.width||source.pixelHeight!==canvas.height){
    source.resize(canvas.width,canvas.height,1);
    texture.updateUvs();
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
  const app=new Application();
  await app.init({
   preference:'webgl',
   resizeTo:window,
   backgroundColor:0x0b0e12,
   antialias:true,
   autoDensity:true,
   resolution:window.devicePixelRatio||1,
  });
  app.canvas.id='world-canvas';
  const mountTarget=host??document.querySelector<HTMLElement>('#app')??document.body;
  if(app.canvas.parentElement!==mountTarget){
   mountTarget.prepend(app.canvas);
  }
  installMsdfFx(app.renderer);
  const [,frames]=await Promise.all([
   loadFonts('/typography/v2/fonts/'),
   FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1)),
  ]);
  const worldStage=new Container();
  const uiStage=new Container();
  const loadingStage=new Container();
  app.stage.addChild(worldStage,uiStage,loadingStage);
  return {app,frames,worldStage,uiStage,loadingStage};
 })();
 return runtimePromise;
}

interface LoadingAssets{
 bgDesktop:Texture;
 bgMobile:Texture;
 vignette:Texture;
 logo:Texture;
 divider:Texture;
 track:Texture;
 fill:Texture;
 crest:Texture;
}

async function loadLoadingAssets(scale:FrameScale):Promise<LoadingAssets>{
 const base='/typography/v2/loading/';
 const [bgDesktop,bgMobile,vignette,logo,divider,track,fill,crest]=await Promise.all([
  Assets.load<Texture>({src:`${base}bg-desktop.webp`,data:{autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}bg-mobile.webp`,data:{autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}vignette.png`,data:{autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}logo@${scale}x.png`,data:{resolution:scale,autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}divider@${scale}x.png`,data:{resolution:scale,autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}bar-track@${scale}x.png`,data:{resolution:scale,autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}bar-fill@${scale}x.png`,data:{resolution:scale,autoGenerateMipmaps:true}}),
  Assets.load<Texture>({src:`${base}bar-crest@${scale}x.png`,data:{resolution:scale,autoGenerateMipmaps:true}}),
 ]);
 return {bgDesktop,bgMobile,vignette,logo,divider,track,fill,crest};
}

export function loadingScreen(){
 // Artwork still in flight after a failure keeps reporting; it must not overwrite the error.
 const params=typeof location!=='undefined'?new URLSearchParams(location.search):null;
 const holdLoading=params?.get('holdLoading')==='1';
 const pinnedPct=params?.get('loadingPct')!==null&&params?.get('loadingPct')!==undefined?Number(params.get('loadingPct')):null;
 const pinnedText=params?.get('loadingText');

 let shown=pinnedPct!==null&&!Number.isNaN(pinnedPct)?Math.max(0,Math.min(100,Math.round(pinnedPct))):0;
 let failed=false,finished=false,statusText=pinnedText||'Loading the game';

 let baseBg:Graphics|undefined;
 let bgSprite:Sprite|undefined;
 let dimOverlay:Graphics|undefined;
 let content:Container|undefined;
 let fillMask:Graphics|undefined;
 let crestSprite:Sprite|undefined;
 let labelNode:MsdfText|undefined;
 let percentNode:MsdfText|undefined;
 let retryBtn:Container|undefined;
 let rtRef:SharedPixiRuntime|undefined;
 let assetsRef:LoadingAssets|undefined;

 // Layout in @1x design pixels (no enclosing modal box):
 // Logo (390x120) -> Divider (340x16) -> Ornate Bar Track (460x28, inner cavity 408x10 at x=26,y=9) -> Status + %
 const STAGE_W=460,STAGE_H=230;
 const TRACK_Y=150,INNER_X=26,INNER_Y=9,INNER_W=408,INNER_H=10;

 const syncView=()=>{
  if(!rtRef||!content||!baseBg||!bgSprite||!dimOverlay||!assetsRef)return;
  const w=window.innerWidth||rtRef.app.screen.width,h=window.innerHeight||rtRef.app.screen.height;
  if(rtRef.app.screen.width!==w||rtRef.app.screen.height!==h){
   rtRef.app.renderer.resize(w,h);
  }
  const portrait=w<h;

  // Solid opaque floor so the uninitialized world/HUD never bleeds through.
  baseBg.clear().rect(0,0,w,h).fill({color:0x080b0e,alpha:1});

  // Full-bleed background painting (cover fit).
  const tex=portrait?assetsRef.bgMobile:assetsRef.bgDesktop;
  if(bgSprite.texture!==tex)bgSprite.texture=tex;
  const bgScale=Math.max(w/tex.width,h/tex.height);
  bgSprite.scale.set(bgScale);
  bgSprite.position.set(Math.round((w-tex.width*bgScale)/2),Math.round((h-tex.height*bgScale)/2));

  // Subtle uniform atmospheric wash over the full background.
  dimOverlay.clear().rect(0,0,w,h).fill({color:0x05070a,alpha:0.18});

  const s=Math.min(1.06,Math.min((w-28)/STAGE_W,(h-36)/STAGE_H));
  const cy=Math.round(h*(portrait?0.52:0.54));
  content.scale.set(s);
  content.position.set(Math.round((w-STAGE_W*s)/2),Math.round(cy-STAGE_H*s*0.5));

  const displayPct=pinnedPct!==null&&!Number.isNaN(pinnedPct)?Math.max(0,Math.min(100,Math.round(pinnedPct))):shown;
  const ratio=failed?1:Math.max(0.02,Math.min(1,displayPct/100));
  const fillW=Math.round(INNER_W*ratio);

  if(fillMask){
   fillMask.clear().roundRect(0,0,fillW,INNER_H,1.5).fill(0xffffff);
  }
  if(crestSprite){
   crestSprite.visible=!failed&&displayPct>0;
   crestSprite.position.set(INNER_X+fillW-12,TRACK_Y+INNER_Y+INNER_H/2-12);
  }
  if(labelNode){
   labelNode.text=statusText;
   labelNode.place(INNER_X,202);
   labelNode.refresh();
  }
  if(percentNode){
   percentNode.text=failed?'':`${displayPct}%`;
   percentNode.place(STAGE_W-INNER_X,202,1);
   percentNode.refresh();
  }
  if(retryBtn){
   retryBtn.visible=failed;
  }
 };

 void ensurePixiRuntime().then(async rt=>{
  const scale=pickFrameScale(window.devicePixelRatio||1);
  const assets=await loadLoadingAssets(scale);
  rtRef=rt;
  assetsRef=assets;
  const {frames,loadingStage}=rt;

  baseBg=loadingStage.addChild(new Graphics());
  baseBg.eventMode='static';
  bgSprite=loadingStage.addChild(new Sprite(assets.bgDesktop));
  dimOverlay=loadingStage.addChild(new Graphics());
  content=loadingStage.addChild(new Container());

  // Smooth feathered radial vignette sprite behind the logo, bar, and status text (no hard edges).
  const vigSprite=content.addChild(new Sprite(assets.vignette));
  vigSprite.position.set(Math.round((STAGE_W-680)/2),Math.round((STAGE_H-340)/2)+8);

  // High-resolution ARKADIA compass logo (no modal box, no STRONGHOLD subtitle).
  const logoSprite=content.addChild(new Sprite(assets.logo));
  logoSprite.position.set(Math.round((STAGE_W-390)/2),0);

  // Delicate antique-gold compass divider beneath the logo.
  const divSprite=content.addChild(new Sprite(assets.divider));
  divSprite.position.set(Math.round((STAGE_W-340)/2),124);

  // Ornate antique-gold progress bar track (460 x 28) and strictly-masked molten-gold fill (408 x 10).
  const trackSprite=content.addChild(new Sprite(assets.track));
  trackSprite.position.set(0,TRACK_Y);

  const fillHolder=content.addChild(new Container());
  fillHolder.position.set(INNER_X,TRACK_Y+INNER_Y);
  const fillSprite=fillHolder.addChild(new Sprite(assets.fill));
  fillMask=fillHolder.addChild(new Graphics());
  fillSprite.mask=fillMask;

  // Leading-edge compass spark crest riding the tip of the fill.
  crestSprite=content.addChild(new Sprite(assets.crest));

  labelNode=content.addChild(new MsdfText('panel-body',statusText));
  percentNode=content.addChild(new MsdfText('hud-xp-accent',`${shown}%`,{size:18}));

  retryBtn=content.addChild(new Container());
  retryBtn.position.set((STAGE_W-168)/2,216);
  retryBtn.eventMode='static';
  retryBtn.cursor='pointer';
  retryBtn.hitArea=new Rectangle(0,0,168,42);
  retryBtn.addChild(frames.frame('button-bronze',168,42));
  const retryTxt=retryBtn.addChild(new MsdfText('panel-title','Try Again',{size:15}));
  retryTxt.place(84,27,0.5);
  retryBtn.on('pointertap',()=>location.reload());
  retryBtn.visible=failed;

  syncView();
  (window as any).__LOADING_READY__=true;
  (window as any).__LOADING_SCREEN__={
   set(pct:number,text:string){
    shown=Math.max(0,Math.min(100,Math.round(pct)));
    statusText=text;
    syncView();
   },
  };
  window.addEventListener('resize',syncView);
  rt.app.renderer.on('resize',syncView);
  if(finished&&!failed&&!holdLoading){
   fadeOutLoading(rt,()=>{
    window.removeEventListener('resize',syncView);
    rt.app.renderer.off('resize',syncView);
   });
  }
 }).catch(e=>console.error('Loading screen runtime error:',e));

 const progress:Progress=(done,total,text)=>{
  if(failed)return;
  if(pinnedPct!==null&&!Number.isNaN(pinnedPct))return;
  shown=Math.max(shown,Math.round(100*Math.min(1,done/Math.max(1,total))));
  statusText=pinnedText||text;
  syncView();
 };

 return {
  progress,
  done(){
   progress(1,1,'Ready');
   finished=true;
   if(rtRef&&!failed&&!holdLoading){
    fadeOutLoading(rtRef,()=>{});
   }
  },
  // Failed loads keep the screen up with the reason and a reload button, instead of leaving a blank world.
  fail(message:string){
   failed=true;
   statusText=message;
   syncView();
  },
 };
}

function fadeOutLoading(rt:SharedPixiRuntime,onRemoved:()=>void){
 const stage=rt.loadingStage;
 if(stage.destroyed||!stage.parent)return;
 const step=()=>{
  if(stage.destroyed)return;
  stage.alpha=Math.max(0,stage.alpha-0.08);
  if(stage.alpha<=0){
   rt.app.ticker.remove(step);
   stage.removeFromParent();
   stage.destroy({children:true});
   onRemoved();
  }
 };
 rt.app.ticker.add(step);
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
