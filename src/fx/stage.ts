import type {Application,Container,Texture} from 'pixi.js';
import type {PixiVfxEffectInstance,PixiVfxRenderer,PixiVfxTextureProvider} from 'nixie-fx/pixi';
import type {VfxExportedEffect} from 'nixie-fx/export';
import type {VfxTextureAssetRef} from 'nixie-fx';
import {groundProjection,worldProjection,UNIT_PX,type Anchor,type View} from './space';
import {tilePoint} from '../stronghold/terrain';
// The NixieFX stage: two planes layered into the world — "ground" under every figure (decals: rune circles, scorch,
// shock rings) and "world" over them (sparks, flames, smoke) — playing the exported effects of vfx/ (packed by
// scripts/vfx/pack.mjs into /vfx/skills.bin). In the game the planes are containers of its own Pixi scene
// ({host}), drawn by its renderer; elsewhere (the FX Lab) they are two transparent canvases of their own
// ({under, over}: the DOM elements the ground canvas goes before and the world canvas goes after).
// An effect is addressed by its authored file without .json, e.g. "ember-warden/flame-fan.cast"; a key ending
// in ".ground" plays on the ground plane. Finished instances go back to a per-effect pool for reuse.
export type Plane='ground'|'world';
export type FxPlay={u:number;v:number;h?:number;yaw?:number;scale?:number;seed?:number;follow?:()=>{u:number;v:number}};
export type FxHandle={
 readonly key:string;
 /** Moves the emitter inside its effect frame (units): world-space particles already emitted stay behind. */
 setLocal(x:number,y?:number,z?:number):void;
 /** Moves the whole effect, particles included. */
 moveTo(u:number,v:number):void;
 /** Stops emitting and lets live particles finish. */
 release():void;
 readonly alive:boolean;
};
type Live={key:string;plane:Plane;inst:PixiVfxEffectInstance;anchor:Anchor;follow?:FxPlay['follow'];age:number;released:boolean;handle:FxHandle};
const BUNDLE='/vfx/skills.bin',POOL=12;
// NixieFX bloom also tone-maps every particle (ACES), which dulls saturated fire toward olive over the snow; effects
// carry their own additive glow layers instead. ?fxbloom=1 turns it on for comparison.
const BLOOM=typeof location!=='undefined'&&new URLSearchParams(location.search).get('fxbloom')==='1';
// The bundle is gzipped JSON (~20x smaller; named .bin because servers treat .gz as an encoding), inflated here
// since the server sends files uncompressed.
export async function fetchBundle():Promise<{manifest:unknown;effects:Record<string,unknown>}>{
 const res=await fetch(BUNDLE);if(!res.ok||!res.body)throw Error(`${BUNDLE}: ${res.status}`);
 return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).json();
}
// NixieFX (and Pixi, where the page has none yet) loads with the effect bundle, after the first paint.
const PIXI=()=>import('pixi.js');
const planeOf=(key:string):Plane=>key.endsWith('.ground')?'ground':'world';

async function mountPlane(host:{before?:Element;after?:Element},id:string,z:string){
 const {Application}=await PIXI();const app=new Application();
 await app.init({backgroundAlpha:0,antialias:false,autoStart:false,sharedTicker:false,preference:'webgl',powerPreference:'high-performance',
  resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,width:innerWidth,height:innerHeight});
 app.ticker.stop();
 const c=app.canvas;c.id=id;c.setAttribute('aria-hidden','true');c.style.cssText=`position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none${z}`;
 if(host.before)host.before.before(c);else host.after!.after(c);
 // Additive particles add light without covering what is under the canvas: colour is summed, alpha is kept, so
 // the browser composites the light additively over the DOM world below.
 const r=app.renderer as any,gl=r.gl as WebGL2RenderingContext|undefined;
 if(gl&&r.state?.blendModesMap)r.state.blendModesMap.add=[gl.ONE,gl.ONE,gl.ZERO,gl.ONE];
 return app;
}

export type FxStageOptions={
 under?:Element;
 over?:Element;
 host?:{ground:Container;world:Container};
 depthLayers?:{back:Container;front:Container};
 getHeroWorld?:()=>{x:number;y:number};
 occlusionAt?:(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean)=>number;
 bloom?:boolean;
};
export function createFxStage(o:FxStageOptions){
 const view:View={x:0,y:0,scale:1};
 const effects=new Map<string,VfxExportedEffect>(),pool=new Map<string,PixiVfxEffectInstance[]>(),live:Live[]=[];
 const pending:{at:number;run:()=>void}[]=[];
 let clock=0,ready=false,failed='',planes:Record<Plane,{app:Application|null;vfx:PixiVfxRenderer;root:Container}>|null=null;
 let Rect:typeof import('pixi.js').Rectangle|null=null;
 let played=0,peakParticles=0,idle=false,occludedParticles=0,minOcclusion=1,meanOcclusion=1,backEffects=0,frontEffects=0;
 const textures=new Map<string,Texture>(),alphaTextures=new Map<string,Texture>();
 let deriveAlpha:typeof import('nixie-fx/pixi').createDerivedAlphaTexture|null=null;
 const textureProvider:PixiVfxTextureProvider={
  staticAssets:true,
  async preload(refs:VfxTextureAssetRef[]){await Promise.all(refs.map(async ref=>{if(!textures.has(ref.path))textures.set(ref.path,await (await PIXI()).Assets.load<Texture>({src:'/vfx/'+ref.path,data:{scaleMode:'linear'}}));}));},
  getTexture:(ref:VfxTextureAssetRef)=>textures.get(ref.path),
  getAlphaTexture:(ref,opacitySource,invert)=>{
   const key=`${ref.path}|${opacitySource}|${invert?1:0}`;
   const hit=alphaTextures.get(key);if(hit)return hit;
   const src=textures.get(ref.path);if(!src||!deriveAlpha)return undefined;
   const derived=deriveAlpha(src,opacitySource,invert)??src;
   alphaTextures.set(key,derived);
   return derived;
  },
  resolveUrl:(ref:VfxTextureAssetRef)=>'/vfx/'+ref.path,
 };
 const boot=(async()=>{
  // The NixieFX runtime loads with the bundle, off the game's first paint.
  const [{PixiVfxRenderer,createDerivedAlphaTexture},{loadVfxExportBundle},packed]=await Promise.all([import('nixie-fx/pixi'),import('nixie-fx/export'),fetchBundle()]);
  deriveAlpha=createDerivedAlphaTexture;
  const bundle=loadVfxExportBundle({manifest:packed.manifest,effectsByPath:packed.effects},{requiredBackend:'pixi2d'});
  for(const fx of bundle.effectsById.values()){
   if(o.host&&fx.emitters){
    for(const e of fx.emitters as any[]){
     e.maxParticles=Math.min(e.maxParticles||16,16);
     if(e.spawn){
      if(typeof e.spawn.rate==='number'&&e.spawn.rate>12)e.spawn.rate=12;
      const rv=e.spawn.rateValue;
      if(rv){
       if(typeof rv.value==='number'&&rv.value>12)rv.value=12;
       if(typeof rv.min==='number'&&rv.min>12)rv.min=12;
       if(typeof rv.max==='number'&&rv.max>12)rv.max=12;
      }
      if(e.spawn.bursts)for(const b of e.spawn.bursts)if(b.count>10)b.count=Math.min(12,Math.ceil(b.count*.22));
     }
    }
   }
   effects.set((fx.sourceEffectFile??fx.id).replace(/\.json$/,''),fx);
  }
  await textureProvider.preload!(bundle.manifest.assets.filter((a):a is VfxTextureAssetRef=>a.type==='texture'));
  const {Container,Rectangle}=await PIXI();Rect=Rectangle;
  // The ground plane is drawn as seen from above and squashed to the 2:1 ground (space.ts groundProjection).
  const make=(parent:Container,app:Application|null,flat:boolean,bloom:boolean)=>{const root=new Container();if(flat)root.scale.set(1,.5);parent.addChild(root);
   return {app,root,vfx:new PixiVfxRenderer({parent:root,textureProvider,pixiRenderer:bloom&&app?app.renderer:undefined,bloom:bloom&&app?{enabled:true,quality:'low',threshold:1,intensity:1.6,radius:22}:undefined})};};
  if(o.host)planes={ground:make(o.host.ground,null,true,false),world:make(o.host.world,null,false,false)};
  else{const [ground,world]=await Promise.all([mountPlane({before:o.under!},'world-fx-ground',''),mountPlane({after:o.over!},'world-fx-over',';z-index:3')]);
   planes={ground:make(ground.stage,ground,true,false),world:make(world.stage,world,false,o.bloom??BLOOM)};}
  resize();addEventListener('resize',resize);
  // Prewarm combat effect pool in small macrotask slices during boot so neither boot frames nor combat frames stall.
  if(o.host&&planes){
   let batch=0;
   for(const [key,fx] of effects){
    if(key.startsWith('ui/'))continue;
    const plane=planeOf(key),P=planes[plane],proj=projection(plane,{u:0,v:0,h:0,yaw:0,scale:1});
    const copies=key.endsWith('.bolt')?3:1;
    const list=pool.get(key)??[];
    for(let c=0;c<copies;c++){
     const inst=P.vfx.createEffect(fx,{projection:proj,position:[0,0,0],seed:c+1,timeSeconds:0,autoStart:false,addToStage:false});
     inst.stop();inst.root.visible=false;P.vfx.removeEffect(inst,false);
     list.push(inst);
    }
    pool.set(key,list);
    if(++batch%5===0)await new Promise(r=>setTimeout(r,0));
   }
  }
  ready=true;
 })().catch(e=>{failed=String(e?.message??e);console.error('NixieFX stage unavailable; skills play without particle effects.',e);});

 function resize(){if(!planes||!Rect)return;const Rectangle=Rect;const w=innerWidth,h=innerHeight;for(const p of Object.values(planes))p.app?.renderer.resize(w,h);
  planes.world.vfx.setBoundsArea(new Rectangle(-64,-64,w+128,h+128));planes.ground.vfx.setBoundsArea(new Rectangle(-64,-128,w+128,h*2+256));}
 function projection(plane:Plane,a:Anchor){return plane==='ground'?groundProjection(view,a):worldProjection(view,a);}

 function play(key:string,at:FxPlay,delayMs=0):FxHandle|null{
  if(delayMs>0){let h:FxHandle|null=null;const proxy:FxHandle={key,setLocal:(x,y,z)=>h?.setLocal(x,y,z),moveTo:(u,v)=>h?.moveTo(u,v),release:()=>{h?h.release():(cancel=true);},get alive(){return h?h.alive:!cancel;}};
   let cancel=false;pending.push({at:clock+delayMs/1000,run:()=>{if(!cancel)h=play(key,at);}});return proxy;}
  if(!ready||!planes)return null;
  const fx=effects.get(key);if(!fx){console.warn('Unknown NixieFX effect',key);return null;}
  const plane=planeOf(key),anchor:Anchor={u:at.u,v:at.v,h:at.h??0,yaw:at.yaw??0,scale:at.scale??1},proj=projection(plane,anchor),P=planes[plane];
  const seed=at.seed??((Math.random()*0x7fffffff)|0);
  if(o.host){
   const maxSame=key.endsWith('.bolt')?3:1;
   let sameCount=0,oldest:Live|null=null;
   for(let i=0;i<live.length;i++){
    const cand=live[i];
    if(cand.key===key){if(!oldest||cand.age>oldest.age)oldest=cand;sameCount++;}
   }
   if(sameCount>=maxSame&&oldest){
    oldest.anchor.u=anchor.u;oldest.anchor.v=anchor.v;oldest.anchor.h=anchor.h;oldest.anchor.yaw=anchor.yaw;oldest.anchor.scale=anchor.scale;
    oldest.follow=at.follow;oldest.age=0;oldest.released=false;
    oldest.inst.setProjection(proj);oldest.inst.spawn({position:[0,0,0],seed,timeSeconds:clock});oldest.inst.root.visible=true;
    played++;
    return oldest.handle;
   }
  }
  let inst=pool.get(key)?.pop();
  if(inst){P.vfx.addEffect(inst,true);inst.setProjection(proj);inst.spawn({position:[0,0,0],seed,timeSeconds:clock});inst.root.visible=true;}
  else inst=P.vfx.createEffect(fx,{projection:proj,position:[0,0,0],seed,timeSeconds:clock});
  played++;
  const l:Live={key,plane,inst,anchor,follow:at.follow,age:0,released:false,handle:null!};
  l.handle={key,
   setLocal:(x,y=0,z=0)=>l.inst.setPosition([x,y,z]),
   moveTo:(u,v)=>{anchor.u=u;anchor.v=v;},
   release:()=>{if(l.released)return;l.released=true;const runner=(l.inst as any).runner;if(runner?.allowCompletion)runner.allowCompletion();else l.inst.stop();},
   get alive(){return live.includes(l);}};
  live.push(l);
  return l.handle;
 }

 // Once per rendered frame, in seconds. render=false advances the simulation only (scripted captures).
 const occCache=new Map<number,number>();
 function frame(dt:number,render=true){
  if(!planes)return;
  clock+=dt;
  for(let i=pending.length-1;i>=0;i--)if(pending[i].at<=clock){const p=pending.splice(i,1)[0];p.run();}
  for(const l of live){l.age+=dt;if(l.follow){const p=l.follow();l.anchor.u=p.u;l.anchor.v=p.v;}}
  planes.ground.vfx.update(dt,{timeSeconds:clock});planes.world.vfx.update(dt,{timeSeconds:clock});
  const occFn=o.occlusionAt,heroPos=o.getHeroWorld?.(),layers=o.depthLayers,sc=view.scale||1;
  const activePartCount=planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles;
  const useGridCache=activePartCount>48;
  if(useGridCache)occCache.clear();
  let occCount=0,occMin=1,occSum=0,occTotal=0,backCnt=0,frontCnt=0;
  for(let i=live.length-1;i>=0;i--){
   const l=live[i];
   if(!l.inst.isActive){
    live.splice(i,1);
    l.inst.root.removeFromParent();
    const list=pool.get(l.key)??[];
    if(list.length<POOL){l.inst.stop();l.inst.root.visible=false;planes[l.plane].vfx.removeEffect(l.inst,false);list.push(l.inst);pool.set(l.key,list);}
    else planes[l.plane].vfx.removeEffect(l.inst,true);
    continue;
   }
   const a=l.anchor,pos=(l.inst as any).position??[0,0,0],cs=Math.cos(a.yaw),sn=Math.sin(a.yaw),lx=pos[0]*a.scale,lz=pos[2]*a.scale;
   const anchorPt=tilePoint(a.u+lx*cs-lz*sn,a.v+lx*sn+lz*cs),anchorLift=(pos[1]*a.scale+a.h)*UNIT_PX;
   const flat=l.plane==='ground';
   let canOcclude=Boolean(occFn);
   if(canOcclude&&occFn){
    const ax=anchorPt.x,ay=anchorPt.y;
    if(flat){
     canOcclude=occFn(ax,ay,ax,ay,28,true,false)<1||occFn(ax-48,ay-28,ax-48,ay-28,24,true,false)<1||occFn(ax+48,ay-28,ax+48,ay-28,24,true,false)<1||occFn(ax-48,ay+28,ax-48,ay+28,24,true,false)<1||occFn(ax+48,ay+28,ax+48,ay+28,24,true,false)<1;
    }else if(!heroPos||Math.hypot(ax-heroPos.x,ay-heroPos.y)>88){
     canOcclude=occFn(ax,ay,ax,ay-anchorLift*.5,28,false,false)<1||occFn(ax-48,ay-36,ax-48,ay-36,24,false,false)<1||occFn(ax+48,ay-36,ax+48,ay-36,24,false,false)<1;
    }
   }
   if(flat&&!canOcclude)continue;
   let sumPy=0,cntPy=0,maxPy=-Infinity;
   const walkInst=(inst:any)=>{
    const views=inst?.emitterViews as any[]|undefined;
    if(views)for(let v=0;v<views.length;v++){
     const ev=views[v],ds=ev.depthSort as {particle:any;depth:number}[]|undefined;
     if(ds)for(let j=0;j<ds.length;j++){
      const entry=ds[j],p=entry.particle;
      const py=(-entry.depth-view.y)/sc,px=(p.x-view.x)/sc,wx=px,wy=flat?py:(p.y-view.y)/sc;
      sumPy+=py;cntPy++;if(py>maxPy)maxPy=py;
      if(canOcclude&&occFn){
       let occ:number|undefined;
       if(useGridCache){
        const gk=(((px*.1667)|0)<<16)^(((wy*.1667)|0)&0x7fff)^(flat?0x8000:0);
        occ=occCache.get(gk);
        if(occ===undefined){
         const texW=p.texture?.orig?.width??64,rad=Math.abs(p.scaleX)*texW*.5/sc;
         occ=occFn(px,py,wx,wy,rad,flat,!flat);
         occCache.set(gk,occ);
        }
       }else{
        const texW=p.texture?.orig?.width??64,rad=Math.abs(p.scaleX)*texW*.5/sc;
        occ=occFn(px,py,wx,wy,rad,flat,!flat);
       }
       occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
       if(occ<.999){p.alpha*=occ;occCount++;}
      }
     }
     const tc=ev.trailContainer?.particleChildren as any[]|undefined;
     if(canOcclude&&occFn&&tc?.length)for(let j=0;j<tc.length;j++){
      const tp=tc[j],px=(tp.x-view.x)/sc,wy=flat?(tp.y*.5-view.y)/sc:(tp.y-view.y)/sc,py=flat?wy:anchorPt.y;
      const occ=occFn(px,py,px,wy,6,flat,!flat);
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
      if(occ<.999){tp.alpha*=occ;occCount++;}
     }
     if(canOcclude&&occFn&&ev.trailMesh?.visible){
      const occ=occFn(anchorPt.x,anchorPt.y,anchorPt.x,anchorPt.y-anchorLift,12,flat,!flat);
      ev.trailMesh.alpha=occ;
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;if(occ<.999)occCount++;
     }
    }
    const kids=inst?.childInstances as any[]|undefined;
    if(kids)for(let k=0;k<kids.length;k++)walkInst(kids[k]);
   };
   if(canOcclude)walkInst(l.inst);
   if(l.plane==='world'&&layers&&heroPos){
    const effY=cntPy>0?sumPy/cntPy:anchorPt.y-anchorLift*.5;
    const isBehind=!l.follow&&anchorPt.y<heroPos.y-2&&effY<heroPos.y-2;
    const targetLayer=isBehind?layers.back:layers.front;
    if(l.inst.root.parent!==targetLayer)targetLayer.addChild(l.inst.root);
    l.inst.root.zIndex=effY;
    if(isBehind)backCnt++;else frontCnt++;
   }
  }
  occludedParticles=occCount;minOcclusion=occTotal?Number(occMin.toFixed(3)):1;meanOcclusion=occTotal?Number((occSum/occTotal).toFixed(3)):1;
  backEffects=backCnt;frontEffects=frontCnt;
  peakParticles=Math.max(peakParticles,planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles);
  // Own canvases only (a host scene renders itself): nothing playing draws the cleared planes once, then leaves
  // the GPU alone until something plays.
  const empty=!live.length&&!pending.length;if(render&&!(empty&&idle)){planes.ground.app?.render();planes.world.app?.render();}idle=empty;
 }

 return {
  ready:()=>ready,
  loaded:boot,
  failed:()=>failed,
  has:(key:string)=>effects.has(key),
  keys:()=>[...effects.keys()],
  place(x:number,y:number,scale:number){view.x=x;view.y=y;view.scale=scale;},
  play,frame,
  stats:()=>({ready,failed,effects:effects.size,live:live.length,played,peakParticles,
   occludedParticles,minOcclusion,meanOcclusion,backEffects,frontEffects,
   particles:planes?planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles:0,
   missing:planes?[...planes.world.vfx.stats.missingTextureRefs,...planes.ground.vfx.stats.missingTextureRefs].map(r=>r.path):[],
   unsupported:planes?[...planes.world.vfx.stats.unsupportedFeatures,...planes.ground.vfx.stats.unsupportedFeatures].map(f=>f.featureKey):[],
   playing:live.map(l=>`${l.key}:${l.inst.stats.activeParticles}`)}),
 };
}
export type FxStage=ReturnType<typeof createFxStage>;
