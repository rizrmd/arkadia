import {CanvasSource,Container,Sprite,Texture} from 'pixi.js';
import {loadImage} from '../app/loader';
import {Generator} from '../expedition/world';
import {unproject} from '../isometric';
import {fromGate,GATE,inSafeZone} from './safe-zone';
import {WORLD} from './scene';
import {COURT} from './terrain';
import {measureTracelogPhase} from './tracelog';

export type BiomeId=
 |'court'
 |'snow'
 |'relic-forest'
 |'swamp'
 |'mountains'
 |'ash-frontier'
 |'river';

export type CornerArea='court'|'snow';
export type ParallaxViewportMode='desktop'|'mobile-portrait'|'mobile-landscape';
export type CornerSide='left'|'right';

export const OUTSKIRTS_RADIUS_TILES=16;
export const HYSTERESIS_MS=1500;
export const HYSTERESIS_TILES=2;
export const BORDER_SAMPLE_TILES=6;
export const CROSSFADE_MS=700;
export const REDUCED_CROSSFADE_MS=120;
export const PARALLAX_FACTOR=1.3;
export const BRANCH_PARALLAX_FACTOR=1.5;
export const MAX_PARALLAX_PX=60;
export const DESKTOP_OVERSCAN_PX=60;
export const COMBATANT_FADE_OPACITY=0.5;
// The corners sit nearer the lens than the court, so they are drawn out of focus: baked once at half resolution
// with a Gaussian blur of CORNER_BLUR_PX (in baked texels, about 4 CSS px on desktop and 1.5 on phones).
export const CORNER_BLUR_SCALE=0.5;
export const CORNER_BLUR_PX=3;

const ASSET_ROOT='/environment-corners/v1/';
const DEFAULT_SEED='arkadia-01';
const generators=new Map<string,Generator>();

function getGenerator(seed:string){
 let g=generators.get(seed);
 if(!g){
  g=new Generator(seed);
  generators.set(seed,g);
 }
 return g;
}

const EXPEDITION_BIOME_MAP:Record<string,BiomeId>={
 Sungai:'river',
 River:'river',
 Pegunungan:'mountains',
 Mountains:'mountains',
 Rawa:'swamp',
 Swamp:'swamp',
 'Hutan Relik':'relic-forest',
 'Relic Forest':'relic-forest',
 'Perbatasan Abu':'ash-frontier',
 'Ash Frontier':'ash-frontier',
};

const BIOME_LABELS:Record<string,string>={
 court:'Court',
 snow:'Snow Outskirts',
 'relic-forest':'Relic Forest',
 swamp:'Swamp',
 mountains:'Mountains',
 'ash-frontier':'Ash Frontier',
 river:'River',
 Sungai:'River',
 River:'River',
 Pegunungan:'Mountains',
 Mountains:'Mountains',
 Rawa:'Swamp',
 Swamp:'Swamp',
 'Hutan Relik':'Relic Forest',
 'Relic Forest':'Relic Forest',
 'Perbatasan Abu':'Ash Frontier',
 'Ash Frontier':'Ash Frontier',
};

export function biomeDisplayName(biome:BiomeId|string):string{
 return BIOME_LABELS[biome]??biome;
}

/**
 * Resolves the Stronghold / Expedition biome at tile (u, v):
 * 1. inSafeZone() -> 'court'
 * 2. Inside the gate and outskirts radius -> 'snow'
 * 3. Otherwise -> same noise and seed as src/expedition/world.ts
 */
export function biomeAt(u:number,v:number,seed=DEFAULT_SEED):BiomeId{
 if(inSafeZone({u,v}))return 'court';
 if(fromGate({u,v})<=OUTSKIRTS_RADIUS_TILES)return 'snow';
 const raw=getGenerator(seed).terrain(Math.round(u),Math.round(v)).biome;
 return EXPEDITION_BIOME_MAP[raw]??'ash-frontier';
}

/**
 * Maps a resolved BiomeId to an available Phase 1 corner artwork set ('court' | 'snow').
 */
export function resolveCornerArea(biome:BiomeId):CornerArea{
 return biome==='court'?'court':'snow';
}

export function viewportModeFor(width:number,height:number):ParallaxViewportMode{
 if(height<=500)return 'mobile-landscape';
 if(width<=700)return 'mobile-portrait';
 return 'desktop';
}

export interface ScreenBox{
 left:number;
 top:number;
 right:number;
 bottom:number;
}

interface AssetSet{
 area:CornerArea;
 mobile:boolean;
 leftTex:Texture;
 rightTex:Texture;
 leftCropTex:Texture;
 rightCropTex:Texture;
 leftFile:string;
 rightFile:string;
}

function assetFile(area:CornerArea,side:CornerSide,mobile:boolean){
 return `${ASSET_ROOT}corner-${area}-${side}${mobile?'-mobile':''}.webp`;
}

function bakeDepthBlur(img:HTMLImageElement):HTMLCanvasElement{
 const w=Math.round((img.naturalWidth||img.width)*CORNER_BLUR_SCALE);
 const h=Math.round((img.naturalHeight||img.height)*CORNER_BLUR_SCALE);
 const pad=Math.ceil(CORNER_BLUR_PX*3);
 const padded=document.createElement('canvas');
 padded.width=w+pad*2;
 padded.height=h+pad*2;
 const p=padded.getContext('2d')!;
 p.drawImage(img,pad,pad,w,h);
 // Clamp the outermost texels outward so the blur never thins the art where it meets the screen edge
 p.drawImage(padded,pad,pad,1,h,0,pad,pad,h);
 p.drawImage(padded,pad+w-1,pad,1,h,pad+w,pad,pad,h);
 p.drawImage(padded,0,pad,padded.width,1,0,0,padded.width,pad);
 p.drawImage(padded,0,pad+h-1,padded.width,1,0,pad+h,padded.width,pad);
 const canvas=document.createElement('canvas');
 canvas.width=w;
 canvas.height=h;
 const ctx=canvas.getContext('2d')!;
 ctx.filter=`blur(${CORNER_BLUR_PX}px)`;
 ctx.drawImage(padded,-pad,-pad);
 ctx.filter='none';
 return canvas;
}

function buildLandscapeStripCanvas(img:HTMLCanvasElement,side:CornerSide):HTMLCanvasElement{
 const w=img.width;
 const h=img.height;
 const stripW=Math.round(w*0.42);
 const canvas=document.createElement('canvas');
 canvas.width=stripW;
 canvas.height=h;
 const ctx=canvas.getContext('2d')!;
 if(side==='left'){
  ctx.drawImage(img,0,0,stripW,h,0,0,stripW,h);
  // Feather the inner right edge of the cropped strip so it never shows a hard seam
  const grad=ctx.createLinearGradient(stripW*0.55,0,stripW,0);
  grad.addColorStop(0,'rgba(0,0,0,1)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalCompositeOperation='destination-in';
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,stripW,h);
 }else{
  ctx.drawImage(img,w-stripW,0,stripW,h,0,0,stripW,h);
  // Feather the inner left edge of the cropped strip so it never shows a hard seam
  const grad=ctx.createLinearGradient(stripW*0.45,0,0,0);
  grad.addColorStop(0,'rgba(0,0,0,1)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalCompositeOperation='destination-in';
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,stripW,h);
 }
 ctx.globalCompositeOperation='source-over';
 return canvas;
}

export interface ParallaxOptions{
 worldStage:Container;
 anchorX?:number;
 anchorY?:number;
 initialTile?:{u:number;v:number};
 getHeroWorld?:()=>{x:number;y:number};
 getCombatantsWorld?:()=>Array<{x:number;y:number}>;
}

export async function createParallax(opts:ParallaxOptions){
 const anchorX=opts.anchorX??WORLD.width/2;
 const anchorY=opts.anchorY??385;

 const container=new Container();
 container.label='fg-parallax';
 container.zIndex=90;
 container.eventMode='none';
 container.interactiveChildren=false;
 opts.worldStage.addChild(container);

 const leftSlotA=new Sprite(Texture.EMPTY);
 const leftSlotB=new Sprite(Texture.EMPTY);
 const rightSlotA=new Sprite(Texture.EMPTY);
 const rightSlotB=new Sprite(Texture.EMPTY);
 leftSlotB.visible=false;
 rightSlotB.visible=false;
 container.addChild(leftSlotA,leftSlotB,rightSlotA,rightSlotB);

 const loadedSets=new Map<string,AssetSet>();
 const loadingSets=new Map<string,Promise<AssetSet>>();

 function setKey(area:CornerArea,mobile:boolean){
  return `${area}:${mobile?'mobile':'desktop'}`;
 }

 async function ensureSet(area:CornerArea,mobile:boolean):Promise<AssetSet>{
  const key=setKey(area,mobile);
  const existing=loadedSets.get(key);
  if(existing)return existing;
  const inflight=loadingSets.get(key);
  if(inflight)return inflight;
  const leftFile=assetFile(area,'left',mobile);
  const rightFile=assetFile(area,'right',mobile);
  const promise=(async()=>{
   const [leftImg,rightImg]=await Promise.all([loadImage(leftFile),loadImage(rightFile)]);
   const leftBlur=bakeDepthBlur(leftImg);
   const rightBlur=bakeDepthBlur(rightImg);
   const leftSource=new CanvasSource({resource:leftBlur,resolution:1});
   const rightSource=new CanvasSource({resource:rightBlur,resolution:1});
   const leftTex=new Texture({source:leftSource});
   const rightTex=new Texture({source:rightSource});
   if(!mobile){
    const created:AssetSet={
     area,
     mobile,
     leftTex,
     rightTex,
     leftCropTex:leftTex,
     rightCropTex:rightTex,
     leftFile,
     rightFile,
    };
    loadedSets.set(key,created);
    loadingSets.delete(key);
    return created;
   }
   const leftStripCanvas=buildLandscapeStripCanvas(leftBlur,'left');
   const rightStripCanvas=buildLandscapeStripCanvas(rightBlur,'right');
   const leftCropTex=new Texture({source:new CanvasSource({resource:leftStripCanvas,resolution:1})});
   const rightCropTex=new Texture({source:new CanvasSource({resource:rightStripCanvas,resolution:1})});
   const created:AssetSet={
    area,
    mobile,
    leftTex,
    rightTex,
    leftCropTex,
    rightCropTex,
    leftFile,
    rightFile,
   };
   loadedSets.set(key,created);
   loadingSets.delete(key);
   return created;
  })();
  loadingSets.set(key,promise);
  return promise;
 }

 function unloadDistantSets(keepAreas:Set<CornerArea>,mobile:boolean){
  for(const [k,set] of loadedSets){
   if(set.mobile!==mobile||!keepAreas.has(set.area)){
    loadedSets.delete(k);
   }
  }
 }

 const startTile=opts.initialTile??{u:7.5,v:7.5};
 let heroTile={u:startTile.u,v:startTile.v};
 let currentBiome:BiomeId=biomeAt(heroTile.u,heroTile.v);
 let leftBorderBiome:BiomeId=currentBiome;
 let rightBorderBiome:BiomeId=currentBiome;
 let activeArea:CornerArea=resolveCornerArea(currentBiome);
 let slotAArea:CornerArea=activeArea;
 let slotBArea:CornerArea=activeArea;
 let activeSlotLabel:'A'|'B'='A';

 let pendingArea:CornerArea|null=null;
 let pendingMs=0;
 let pendingEntryTile:{u:number;v:number}|null=null;
 let pendingMaxDist=0;

 let transitioning=false;
 let fadeElapsedMs=0;
 let fadeDurationMs=CROSSFADE_MS;
 let transitionProgress=0;
 let transitionCount=0;

 let vw=typeof innerWidth!=='undefined'&&innerWidth?innerWidth:1440;
 let vh=typeof innerHeight!=='undefined'&&innerHeight?innerHeight:900;
 let mode:ParallaxViewportMode=viewportModeFor(vw,vh);
 let lastCamera={cx:anchorX,cy:anchorY,scale:1};
 let offset={dx:0,dy:0};
 let overscanPx={x:DESKTOP_OVERSCAN_PX,y:DESKTOP_OVERSCAN_PX};

 let leftNearCombatant=false;
 let rightNearCombatant=false;
 let leftTargetAlpha=1;
 let rightTargetAlpha=1;
 let leftAlpha=1;
 let rightAlpha=1;
 let leftBox:ScreenBox={left:0,top:0,right:0,bottom:0};
 let rightBox:ScreenBox={left:0,top:0,right:0,bottom:0};

 let enabled=true;
 let reducedMotionOverride:boolean|null=null;
 let manualStepLockUntil=0;

 const mediaQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 function isReducedMotion(){
  if(reducedMotionOverride!==null)return reducedMotionOverride;
  return Boolean(mediaQuery?.matches);
 }

 const initialMobile=mode!=='desktop';
 await ensureSet(activeArea,initialMobile);
 const neighbourArea:CornerArea=activeArea==='court'?'snow':'court';
 await ensureSet(neighbourArea,initialMobile);

 function applyTexturesToSlot(slot:'A'|'B',area:CornerArea){
  const mobile=mode!=='desktop';
  const set=loadedSets.get(setKey(area,mobile));
  if(!set){
   void ensureSet(area,mobile).then(()=>{
    applyTexturesToSlot(slot,area);
    layoutSprites();
   });
   return;
  }
  const useCrop=mode==='mobile-landscape';
  const lTex=useCrop?set.leftCropTex:set.leftTex;
  const rTex=useCrop?set.rightCropTex:set.rightTex;
  if(slot==='A'){
   leftSlotA.texture=lTex;
   rightSlotA.texture=rTex;
  }else{
   leftSlotB.texture=lTex;
   rightSlotB.texture=rTex;
  }
 }

 applyTexturesToSlot('A',slotAArea);

 function computeCombatantOverlap(){
  const worldOriginX=vw/2-lastCamera.cx*lastCamera.scale;
  const worldOriginY=vh/2-lastCamera.cy*lastCamera.scale;
  const pts=opts.getCombatantsWorld?.()??(opts.getHeroWorld?[opts.getHeroWorld()]:[]);
  let lHit=false;
  let rHit=false;
  const padX=22*lastCamera.scale;
  const headY=58*lastCamera.scale;
  for(const w of pts){
   const sx=worldOriginX+w.x*lastCamera.scale;
   const sy=worldOriginY+w.y*lastCamera.scale;
   if(sx<-40||sx>vw+40||sy<-40||sy>vh+60)continue;
   const cLeft=sx-padX,cRight=sx+padX,cTop=sy-headY,cBottom=sy+8;
   if(cRight>=leftBox.left&&cLeft<=leftBox.right&&cBottom>=leftBox.top&&cTop<=leftBox.bottom){
    lHit=true;
   }
   if(cRight>=rightBox.left&&cLeft<=rightBox.right&&cBottom>=rightBox.top&&cTop<=rightBox.bottom){
    rHit=true;
   }
  }
  leftNearCombatant=lHit;
  rightNearCombatant=rHit;
  leftTargetAlpha=lHit?COMBATANT_FADE_OPACITY:1;
  rightTargetAlpha=rHit?COMBATANT_FADE_OPACITY:1;
 }

 function layoutSprites(){
  container.visible=enabled;
  const newMode=viewportModeFor(vw,vh);
  if(newMode!==mode){
   mode=newMode;
   const mobile=mode!=='desktop';
   void ensureSet(slotAArea,mobile).then(()=>{
    applyTexturesToSlot('A',slotAArea);
    if(transitioning)applyTexturesToSlot('B',slotBArea);
    layoutSprites();
   });
   applyTexturesToSlot('A',slotAArea);
   if(transitioning)applyTexturesToSlot('B',slotBArea);
  }

  const reduced=isReducedMotion();
  if(mode==='desktop'&&!reduced){
   const rawDx=-(lastCamera.cx-anchorX)*lastCamera.scale*(PARALLAX_FACTOR-1);
   const rawDy=-(lastCamera.cy-anchorY)*lastCamera.scale*(PARALLAX_FACTOR-1);
   offset={
    dx:Math.max(-MAX_PARALLAX_PX,Math.min(MAX_PARALLAX_PX,rawDx)),
    dy:Math.max(-MAX_PARALLAX_PX,Math.min(MAX_PARALLAX_PX,rawDy)),
   };
  }else{
   offset={dx:0,dy:0};
  }

  const ease=transitioning?transitionProgress*transitionProgress*(3-2*transitionProgress):0;
  const riseY=transitioning&&mode==='desktop'&&!reduced?(1-ease)*14:0;

  if(mode==='desktop'){
   // Visible width is clamp(220px, 22vw, 380px) with 60 px outer overscan reserve.
   const visibleW=Math.max(220,Math.min(380,vw*0.22));
   const overscan=DESKTOP_OVERSCAN_PX;
   overscanPx={x:overscan,y:overscan};
   const spriteW=visibleW+overscan;
   const spriteH=spriteW*(760/640);
   const visibleH=Math.max(120,spriteH-overscan*0.5);

   leftBox={
    left:0,
    top:Math.max(0,Math.round(vh-visibleH)),
    right:Math.round(visibleW),
    bottom:vh,
   };
   rightBox={
    left:Math.round(vw-visibleW),
    top:Math.max(0,Math.round(vh-visibleH)),
    right:vw,
    bottom:vh,
   };

   // Keep outer edges overscanned (lx <= 0, rx + spriteW >= vw, bottom >= vh) across the full +-60 px camera range
   // while keeping the full painted silhouette inside the bottom corners without any stretched edge pixels.
   const halfOver=overscan*0.5;
   const lx=Math.min(0,Math.round(-halfOver+offset.dx*0.5));
   const ly=Math.max(Math.round(vh-spriteH),Math.round(vh+halfOver-spriteH+offset.dy*0.5));
   const rx=Math.max(Math.round(vw-spriteW),Math.round(vw+halfOver-spriteW+offset.dx*0.5));
   const ry=Math.max(Math.round(vh-spriteH),Math.round(vh+halfOver-spriteH+offset.dy*0.5));

   leftSlotA.width=spriteW;
   leftSlotA.height=spriteH;
   leftSlotA.position.set(lx,ly);

   leftSlotB.width=spriteW;
   leftSlotB.height=spriteH;
   leftSlotB.position.set(lx,Math.round(ly+riseY));

   rightSlotA.width=spriteW;
   rightSlotA.height=spriteH;
   rightSlotA.position.set(rx,ry);

   rightSlotB.width=spriteW;
   rightSlotB.height=spriteH;
   rightSlotB.position.set(rx,Math.round(ry+riseY));
  }else if(mode==='mobile-portrait'){
   overscanPx={x:0,y:0};
   const maxW=vw*0.18;
   const maxH=vh*0.16;
   const w=Math.round(Math.min(maxW,maxH*(360/300)));
   const h=Math.round(w*(300/360));

   leftBox={left:0,top:0,right:w,bottom:h};
   rightBox={left:vw-w,top:0,right:vw,bottom:h};

   leftSlotA.width=w;
   leftSlotA.height=h;
   leftSlotA.position.set(0,0);

   leftSlotB.width=w;
   leftSlotB.height=h;
   leftSlotB.position.set(0,0);

   rightSlotA.width=w;
   rightSlotA.height=h;
   rightSlotA.position.set(vw-w,0);

   rightSlotB.width=w;
   rightSlotB.height=h;
   rightSlotB.position.set(vw-w,0);
  }else{
   // mobile-landscape (height <= 500): narrow outer side strips anchored flush at top-left/top-right behind HUD
   overscanPx={x:0,y:0};
   const stripW=Math.round(Math.max(40,Math.min(64,vw*0.07)));
   const stripH=Math.round(Math.min(128,vh*0.32));

   leftBox={left:0,top:0,right:stripW,bottom:stripH};
   rightBox={left:vw-stripW,top:0,right:vw,bottom:stripH};

   leftSlotA.width=stripW;
   leftSlotA.height=stripH;
   leftSlotA.position.set(0,0);

   leftSlotB.width=stripW;
   leftSlotB.height=stripH;
   leftSlotB.position.set(0,0);

   rightSlotA.width=stripW;
   rightSlotA.height=stripH;
   rightSlotA.position.set(vw-stripW,0);

   rightSlotB.width=stripW;
   rightSlotB.height=stripH;
   rightSlotB.position.set(vw-stripW,0);
  }

  computeCombatantOverlap();
  if(reduced){
   leftAlpha=leftTargetAlpha;
   rightAlpha=rightTargetAlpha;
  }

  if(transitioning){
   leftSlotA.visible=true;
   rightSlotA.visible=true;
   leftSlotB.visible=true;
   rightSlotB.visible=true;
   leftSlotA.alpha=(1-ease)*leftAlpha;
   rightSlotA.alpha=(1-ease)*rightAlpha;
   leftSlotB.alpha=ease*leftAlpha;
   rightSlotB.alpha=ease*rightAlpha;
  }else{
   leftSlotA.visible=true;
   rightSlotA.visible=true;
   leftSlotB.visible=false;
   rightSlotB.visible=false;
   leftSlotA.alpha=leftAlpha;
   rightSlotA.alpha=rightAlpha;
   leftSlotB.alpha=0;
   rightSlotB.alpha=0;
  }
 }

 function beginTransition(nextArea:CornerArea){
  const mobile=mode!=='desktop';
  void ensureSet(nextArea,mobile);
  slotBArea=nextArea;
  applyTexturesToSlot('B',slotBArea);
  const reduced=isReducedMotion();
  fadeDurationMs=reduced?REDUCED_CROSSFADE_MS:CROSSFADE_MS;
  fadeElapsedMs=0;
  transitionProgress=0;
  transitioning=true;
  pendingArea=null;
  pendingMs=0;
  pendingEntryTile=null;
  pendingMaxDist=0;
  layoutSprites();
 }

 function finishTransition(){
  slotAArea=slotBArea;
  activeArea=slotBArea;
  activeSlotLabel=activeSlotLabel==='A'?'B':'A';
  applyTexturesToSlot('A',slotAArea);
  transitioning=false;
  transitionProgress=0;
  fadeElapsedMs=0;
  transitionCount++;
  layoutSprites();
 }

 function stepInternal(u:number,v:number,dtMs:number){
  heroTile={u,v};
  currentBiome=biomeAt(u,v);
  const halfSpan=BORDER_SAMPLE_TILES*0.5;
  leftBorderBiome=biomeAt(u-halfSpan,v+halfSpan);
  rightBorderBiome=biomeAt(u+halfSpan,v-halfSpan);

  const mobile=mode!=='desktop';
  const gateDist=fromGate({u,v});
  if(gateDist<=7){
   const neighbour:CornerArea=activeArea==='court'?'snow':'court';
   void ensureSet(neighbour,mobile);
  }else if(gateDist>13&&!transitioning&&!pendingArea){
   unloadDistantSets(new Set([activeArea]),mobile);
  }

  const candidate=resolveCornerArea(currentBiome);
  const targetBasis=transitioning?slotBArea:activeArea;
  let startedThisStep=false;

  if(candidate===targetBasis){
   pendingArea=null;
   pendingMs=0;
   pendingEntryTile=null;
   pendingMaxDist=0;
  }else{
   void ensureSet(candidate,mobile);
   if(pendingArea!==candidate||!pendingEntryTile){
    pendingArea=candidate;
    pendingMs=Math.max(0,dtMs);
    pendingEntryTile={u,v};
    pendingMaxDist=0;
   }else{
    pendingMs+=Math.max(0,dtMs);
   }
   const moveDist=Math.hypot(u-pendingEntryTile.u,v-pendingEntryTile.v);
   const gateLineDist=Math.abs((u+v)-(GATE.u+GATE.v))*0.5;
   pendingMaxDist=Math.max(pendingMaxDist,moveDist,gateLineDist);
   if(pendingMs>=HYSTERESIS_MS||pendingMaxDist>=HYSTERESIS_TILES){
    if(transitioning){
     finishTransition();
    }
    beginTransition(candidate);
    startedThisStep=true;
   }
  }

  if(transitioning&&!startedThisStep){
   fadeElapsedMs+=Math.max(0,dtMs);
   transitionProgress=Math.min(1,fadeElapsedMs/Math.max(1,fadeDurationMs));
   if(transitionProgress>=1){
    finishTransition();
   }
  }

  computeCombatantOverlap();
  const fadeRate=isReducedMotion()?1:Math.min(1,Math.max(0.05,dtMs/180));
  leftAlpha+=((leftTargetAlpha-leftAlpha)*fadeRate);
  rightAlpha+=((rightTargetAlpha-rightAlpha)*fadeRate);
  if(Math.abs(leftTargetAlpha-leftAlpha)<0.01)leftAlpha=leftTargetAlpha;
  if(Math.abs(rightTargetAlpha-rightAlpha)<0.01)rightAlpha=rightTargetAlpha;

  layoutSprites();
 }

 function step(u:number,v:number,dtMs:number){
  manualStepLockUntil=performance.now()+600;
  stepInternal(u,v,dtMs);
 }

 function place(cx:number,cy:number,scale:number,viewportW?:number,viewportH?:number){
  if(viewportW&&viewportW>0)vw=viewportW;
  else if(typeof innerWidth!=='undefined'&&innerWidth>0)vw=innerWidth;
  if(viewportH&&viewportH>0)vh=viewportH;
  else if(typeof innerHeight!=='undefined'&&innerHeight>0)vh=innerHeight;
  lastCamera={cx,cy,scale};
  if(opts.getHeroWorld&&performance.now()>=manualStepLockUntil){
   const hw=opts.getHeroWorld();
   const g=unproject(hw.x-COURT.x,hw.y-COURT.y);
   heroTile={u:g.x,v:g.y};
   currentBiome=biomeAt(g.x,g.y);
  }
  layoutSprites();
 }

 let lastTick=performance.now();
 let rafId=0;
 function tick(now:number){
  const dt=Math.min(100,Math.max(0,now-lastTick));
  lastTick=now;
  if(opts.getHeroWorld&&now>=manualStepLockUntil){
   measureTracelogPhase('worldDraw',()=>{
    const hw=opts.getHeroWorld!();
    const g=unproject(hw.x-COURT.x,hw.y-COURT.y);
    stepInternal(g.x,g.y,dt);
   });
  }
  rafId=requestAnimationFrame(tick);
 }

 const api={
  container,
  biomeAt,
  biomeDisplayName,
  resolveCornerArea,
  place,
  step,
  start(){
   if(!rafId){
    lastTick=performance.now();
    rafId=requestAnimationFrame(tick);
   }
  },
  stop(){
   if(rafId){
    cancelAnimationFrame(rafId);
    rafId=0;
   }
  },
  setEnabled(on:boolean){
   enabled=on;
   container.visible=on;
   layoutSprites();
  },
  setReducedMotionOverride(val:boolean|null){
   reducedMotionOverride=val;
   layoutSprites();
  },
  forceArea(area:CornerArea){
   manualStepLockUntil=performance.now()+600;
   slotAArea=area;
   slotBArea=area;
   activeArea=area;
   transitioning=false;
   pendingArea=null;
   pendingMs=0;
   applyTexturesToSlot('A',area);
   layoutSprites();
  },
  snapshot(){
   const mobile=mode!=='desktop';
   const curSet=loadedSets.get(setKey(slotAArea,mobile));
   const nextSet=loadedSets.get(setKey(slotBArea,mobile));
   return {
    enabled,
    mode,
    blurPx:CORNER_BLUR_PX,
    textureSize:{w:leftSlotA.texture.width,h:leftSlotA.texture.height},
    reducedMotion:isReducedMotion(),
    heroTile:{u:+heroTile.u.toFixed(2),v:+heroTile.v.toFixed(2)},
    biome:currentBiome,
    biomeLabel:biomeDisplayName(currentBiome),
    borderBiomes:{
     left:leftBorderBiome,
     right:rightBorderBiome,
    },
    area:activeArea,
    slotAArea,
    slotBArea,
    activeSlot:activeSlotLabel,
    pendingArea,
    pendingMs:Math.round(pendingMs),
    pendingDistanceTiles:+pendingMaxDist.toFixed(2),
    transitioning,
    transitionProgress:+transitionProgress.toFixed(3),
    transitionCount,
    overscanPx,
    offset:{
     dx:+offset.dx.toFixed(2),
     dy:+offset.dy.toFixed(2),
    },
    left:{
     alpha:+leftAlpha.toFixed(3),
     targetAlpha:leftTargetAlpha,
     nearCombatant:leftNearCombatant,
     slotAAlpha:+leftSlotA.alpha.toFixed(3),
     slotBAlpha:+leftSlotB.alpha.toFixed(3),
     box:{...leftBox},
     file:curSet?.leftFile??assetFile(slotAArea,'left',mobile),
     nextFile:transitioning?(nextSet?.leftFile??assetFile(slotBArea,'left',mobile)):null,
    },
    right:{
     alpha:+rightAlpha.toFixed(3),
     targetAlpha:rightTargetAlpha,
     nearCombatant:rightNearCombatant,
     slotAAlpha:+rightSlotA.alpha.toFixed(3),
     slotBAlpha:+rightSlotB.alpha.toFixed(3),
     box:{...rightBox},
     file:curSet?.rightFile??assetFile(slotBArea,'right',mobile),
     nextFile:transitioning?(nextSet?.rightFile??assetFile(slotBArea,'right',mobile)):null,
    },
    loadedSets:[...loadedSets.keys()],
   };
  },
 };

 (window as any).__STRONGHOLD_PARALLAX__=api;
 return api;
}
