import {Application,BitmapTextPipe,CanvasSource,Container,extensions,Graphics,GraphicsPipe,NineSliceSpritePipe,Rectangle,Sprite,Texture,TilingSpritePipe} from 'pixi.js';
import {FrameSet,pickFrameScale} from '../typography/frames';
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
   backgroundColor:0x11191e,
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

export function loadingScreen(){
 // Artwork still in flight after a failure keeps reporting; it must not overwrite the error.
 let shown=0,failed=false,finished=false,statusText='Loading the game';
 const holdLoading=typeof location!=='undefined'&&new URLSearchParams(location.search).get('holdLoading')==='1';

 let backdrop:Graphics|undefined;
 let card:Container|undefined;
 let trackFill:Container|undefined;
 let labelNode:MsdfText|undefined;
 let percentNode:MsdfText|undefined;
 let retryBtn:Container|undefined;
 let rtRef:SharedPixiRuntime|undefined;

 const CARD_W=460,CARD_H=250,BAR_W=372,BAR_H=24;

 const syncView=()=>{
  if(!rtRef||!card||!backdrop)return;
  const w=rtRef.app.screen.width,h=rtRef.app.screen.height;
  backdrop.clear().rect(0,0,w,h).fill({color:0x11191e,alpha:0.96});
  backdrop.circle(w*0.5,h*0.42,Math.min(w,h)*0.48).fill({color:0x1d2a30,alpha:0.55});
  const s=Math.min(1,Math.min((w-24)/CARD_W,(h-24)/CARD_H));
  card.scale.set(s);
  card.position.set(Math.round((w-CARD_W*s)/2),Math.round((h-CARD_H*s)/2));
  if(trackFill){
   const fillChild=trackFill.children[0] as Container|undefined;
   if(fillChild){
    const ratio=failed?1:Math.max(0.04,shown/100);
    fillChild.width=Math.round(BAR_W*ratio);
   }
  }
  if(labelNode){
   labelNode.text=statusText;
   labelNode.place(38,188);
  }
  if(percentNode){
   percentNode.text=failed?'':`${shown}%`;
   percentNode.place(CARD_W-38,188,1);
  }
  if(retryBtn){
   retryBtn.visible=failed;
  }
 };

 void ensurePixiRuntime().then(rt=>{
  rtRef=rt;
  const {frames,loadingStage,app}=rt;
  backdrop=loadingStage.addChild(new Graphics());
  backdrop.eventMode='static';
  card=loadingStage.addChild(new Container());
  card.addChild(frames.frame('panel-bronze',CARD_W,CARD_H));

  const subtitle=card.addChild(new MsdfText('label-wide','ARKADIA',{size:16,letterSpacing:4}));
  subtitle.place(CARD_W/2,52,0.5);

  const title=card.addChild(new MsdfText('display-title','Stronghold',{size:42}));
  title.place(CARD_W/2,102,0.5);

  const barFrame=card.addChild(frames.frame('xp-frame',BAR_W+28,40));
  barFrame.position.set((CARD_W-(BAR_W+28))/2,126);

  trackFill=card.addChild(new Container());
  trackFill.position.set((CARD_W-BAR_W)/2,134);
  trackFill.addChild(frames.frame('xp-fill',BAR_W,BAR_H));

  labelNode=card.addChild(new MsdfText('panel-body',statusText));
  percentNode=card.addChild(new MsdfText('hud-xp-accent',`${shown}%`,{size:18}));

  retryBtn=card.addChild(new Container());
  retryBtn.position.set((CARD_W-168)/2,196);
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
  window.addEventListener('resize',syncView);
  if(finished&&!failed&&!holdLoading){
   fadeOutLoading(rt,()=>window.removeEventListener('resize',syncView));
  }
 }).catch(e=>console.error('Loading screen runtime error:',e));

 const progress:Progress=(done,total,text)=>{
  if(failed)return;
  shown=Math.max(shown,Math.round(100*Math.min(1,done/Math.max(1,total))));
  statusText=text;
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
