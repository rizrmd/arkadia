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
let bundlePromise:Promise<{manifest:unknown;effects:Record<string,unknown>}>|null=null;
export function fetchBundle():Promise<{manifest:unknown;effects:Record<string,unknown>}>{
 return bundlePromise??=(async()=>{
  const res=await fetch(BUNDLE);if(!res.ok||!res.body)throw Error(`${BUNDLE}: ${res.status}`);
  return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).json();
 })();
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
 occlusionAt?:(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean,anchorY?:number)=>number;
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
  async preload(refs:VfxTextureAssetRef[]){await Promise.all(refs.map(async ref=>{if(!textures.has(ref.path)){const tex=await (await PIXI()).Assets.load<Texture>({src:'/vfx/'+ref.path,data:{scaleMode:'nearest'}});if(tex?.source){tex.source.scaleMode='nearest';tex.source.autoGarbageCollect=false;}textures.set(ref.path,tex);}}));},
  getTexture:(ref:VfxTextureAssetRef)=>textures.get(ref.path),
  getAlphaTexture:(ref,opacitySource,invert)=>{
   const key=`${ref.path}|${opacitySource}|${invert?1:0}`;
   const hit=alphaTextures.get(key);if(hit)return hit;
   const src=textures.get(ref.path);if(!src||!deriveAlpha)return undefined;
   const derived=deriveAlpha(src,opacitySource,invert)??src;
   if(derived?.source)derived.source.autoGarbageCollect=false;
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
   const effKey=(fx.sourceEffectFile??fx.id).replace(/\.json$/,'');
   const isGround=effKey.endsWith('.ground');
   if(o.host&&fx.emitters){
    const maxEmitters=isGround?4:3;
    if(fx.emitters.length>maxEmitters){
     const src=fx.emitters.filter((e:any)=>!/(smoke|glint|hand core)/i.test(e.name??''));
     const base=src.length>=maxEmitters?src:fx.emitters;
     if(base.length>maxEmitters){
      const step=(base.length-1)/(maxEmitters-1);
      fx.emitters=Array.from({length:maxEmitters},(_,i)=>base[Math.round(i*step)]);
     }else{
      fx.emitters=base;
     }
    }
    const perMax=isGround?18:Math.max(6,Math.min(10,Math.floor(28/Math.max(1,fx.emitters.length))));
    for(const e of fx.emitters as any[]){
     e.maxParticles=Math.min(e.maxParticles||perMax,perMax);
     if(e.spawn){
      if(typeof e.spawn.rate==='number'&&e.spawn.rate>perMax)e.spawn.rate=perMax;
      const rv=e.spawn.rateValue;
      if(rv){
       if(typeof rv.value==='number'&&rv.value>perMax)rv.value=perMax;
       if(typeof rv.min==='number'&&rv.min>perMax)rv.min=perMax;
       if(typeof rv.max==='number'&&rv.max>perMax)rv.max=perMax;
      }
      if(e.spawn.bursts)for(const b of e.spawn.bursts){
       if(isGround)b.count=Math.min(perMax,Math.max(6,Math.ceil(b.count*.45)));
       else if(b.count>5)b.count=Math.min(perMax,Math.max(4,Math.ceil(b.count*.35)));
      }
     }
    }
   }
   effects.set(effKey,fx);
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
     const inst=P.vfx.createEffect(fx,{projection:proj,position:[0,0,0],seed:c+1,timeSeconds:0,autoStart:true,addToStage:false});
     inst.update(0.08,0.08);
     inst.stop();inst.root.visible=false;P.vfx.removeEffect(inst,false);
     list.push(inst);
    }
    pool.set(key,list);
    if(++batch%12===0)await new Promise(r=>setTimeout(r,0));
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
    oldest.follow=at.follow;
    oldest.inst.setProjection(proj);
    if(oldest.age>=0.045||oldest.released){
     oldest.age=0;oldest.released=false;
     oldest.inst.spawn({position:[0,0,0],seed,timeSeconds:clock});oldest.inst.root.visible=true;
    }
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
   release:()=>{if(l.released)return;l.released=true;l.inst.stop();l.inst.root.visible=false;},
   get alive(){return live.includes(l);}};
  live.push(l);
  return l.handle;
 }

 // Once per rendered frame, in seconds. render=false advances the simulation only (scripted captures).
 const staticOccCache=new Map<number,number>(),heroOccCache=new Map<number,number>();
 let lastOccHx=-1e9,lastOccHy=-1e9;
 function frame(dt:number,render=true){
  if(!planes)return;
  clock+=dt;
  for(let i=pending.length-1;i>=0;i--)if(pending[i].at<=clock){const p=pending.splice(i,1)[0];p.run();}
  for(const l of live){l.age+=dt;if(l.follow){const p=l.follow();l.anchor.u=p.u;l.anchor.v=p.v;}}
  planes.ground.vfx.update(dt,{timeSeconds:clock});planes.world.vfx.update(dt,{timeSeconds:clock});
  const occFn=o.occlusionAt,heroPos=o.getHeroWorld?.(),layers=o.depthLayers,sc=view.scale||1;
  const hx=heroPos?.x??0,hy=heroPos?.y??0;
  if(Math.abs(hx-lastOccHx)>2||Math.abs(hy-lastOccHy)>2||heroOccCache.size>2048){
   heroOccCache.clear();lastOccHx=hx;lastOccHy=hy;
  }
  if(staticOccCache.size>8192)staticOccCache.clear();
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
   const flat=l.plane==='ground',anchorY=anchorPt.y,aHashY=((anchorY*.125)|0)*668265263;
   if(flat&&anchorY>860)continue;
   const canOcclude=Boolean(occFn)&&(anchorY<=860||(!flat&&Boolean(heroPos&&Math.abs(anchorPt.x-heroPos.x)<=110&&Math.abs(anchorY-heroPos.y)<=110)));
   let sumPy=0,cntPy=0,maxPy=-Infinity;
   const walkInst=(inst:any)=>{
    const views=inst?.emitterViews as any[]|undefined;
    if(views)for(let v=0;v<views.length;v++){
     const ev=views[v],ds=ev.depthSort as {particle:any;depth:number}[]|undefined;
     const isAdd=ev.container?.blendMode==='add';
     if(ds)for(let j=0;j<ds.length;j++){
      const entry=ds[j],p=entry.particle;
      const py=(-entry.depth-view.y)/sc,px=(p.x-view.x)/sc,wx=px,wy=flat?py:(p.y-view.y)/sc;
      sumPy+=py;cntPy++;if(py>maxPy)maxPy=py;
      if(canOcclude&&occFn){
       const nearHero=!flat&&py<hy-2&&Math.abs(wx-hx)<=64&&wy>=hy-116&&wy<=hy+36;
       if(anchorY>850&&py>850&&wy>850&&!nearHero){
        occTotal++;occSum+=1;
        continue;
       }
       const texW=p.texture?.orig?.width??64,rad=Math.abs(p.scaleX)*texW*.5/sc,rBin=(rad*.25)|0;
       const gk=(((px*.125)|0)*73856093)^(((py*.125)|0)*19349663)^(((wy*.125)|0)*83492791)^(rBin*2654435761)^aHashY^(flat?1:2);
       const cache=nearHero?heroOccCache:staticOccCache;
       let occ=cache.get(gk);
       if(occ===undefined){
        occ=occFn(px,py,wx,wy,rad,flat,nearHero,anchorY);
        cache.set(gk,occ);
       }
       occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
       if(occ<.999){p.alpha=occ<=.01?0:isAdd?Math.min(occ*.28,p.alpha*occ*.35):p.alpha*occ;occCount++;}
      }
     }
     const tc=ev.trailContainer?.particleChildren as any[]|undefined;
     if(canOcclude&&occFn&&tc?.length)for(let j=0;j<tc.length;j++){
      const tp=tc[j],px=(tp.x-view.x)/sc,wy=flat?(tp.y*.5-view.y)/sc:(tp.y-view.y)/sc,py=flat?wy:anchorY;
      const nearHero=!flat&&py<hy-2&&Math.abs(px-hx)<=64&&wy>=hy-116&&wy<=hy+36;
      if(anchorY>850&&py>850&&wy>850&&!nearHero){
       occTotal++;occSum+=1;
       continue;
      }
      const occ=occFn(px,py,px,wy,6,flat,nearHero,anchorY);
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
      if(occ<.999){tp.alpha=occ<=.01?0:isAdd?Math.min(occ*.28,tp.alpha*occ*.35):tp.alpha*occ;occCount++;}
     }
     if(canOcclude&&occFn&&ev.trailMesh?.visible){
      const occ=occFn(anchorPt.x,anchorY,anchorPt.x,anchorY-anchorLift,12,flat,!flat,anchorY);
      ev.trailMesh.alpha=occ;
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;if(occ<.999)occCount++;
     }
    }
    const kids=inst?.childInstances as any[]|undefined;
    if(kids)for(let k=0;k<kids.length;k++)walkInst(kids[k]);
   };
   if(canOcclude)walkInst(l.inst);
   if(l.plane==='world'&&layers&&heroPos){
    const effY=cntPy>0?sumPy/cntPy:anchorY-anchorLift*.5;
    const isBehind=effY<heroPos.y-2;
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
