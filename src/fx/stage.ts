import type {Application,Container,Texture} from 'pixi.js';
import type {PixiVfxEffectInstance,PixiVfxRenderer,PixiVfxTextureProvider} from 'nixie-fx/pixi';
import type {VfxExportedEffect} from 'nixie-fx/export';
import type {VfxTextureAssetRef} from 'nixie-fx';
import {groundProjection,worldProjection,type Anchor,type View} from './space';
// The NixieFX stage: two transparent Pixi canvases layered into the world — "ground" under every figure (decals:
// rune circles, scorch, shock rings) and "world" over them (sparks, flames, smoke) — playing the exported
// effects of vfx/ (packed by scripts/vfx/pack.mjs into /vfx/skills.bin).
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
const BUNDLE='/vfx/skills.bin',POOL=6;
// NixieFX bloom also tone-maps every particle (ACES), which dulls saturated fire toward olive over the snow; effects
// carry their own additive glow layers instead. ?fxbloom=1 turns it on for comparison.
const BLOOM=typeof location!=='undefined'&&new URLSearchParams(location.search).get('fxbloom')==='1';
// The bundle is gzipped JSON (~20x smaller; named .bin because servers treat .gz as an encoding), inflated here
// since the server sends files uncompressed.
export async function fetchBundle():Promise<{manifest:unknown;effects:Record<string,unknown>}>{
 const res=await fetch(BUNDLE);if(!res.ok||!res.body)throw Error(`${BUNDLE}: ${res.status}`);
 return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).json();
}
// Pixi and NixieFX load with the effect bundle, after the game's first paint (the world itself is drawn without Pixi).
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

export function createFxStage(o:{under:Element;over:Element;bloom?:boolean}){
 const view:View={x:0,y:0,scale:1};
 const effects=new Map<string,VfxExportedEffect>(),pool=new Map<string,PixiVfxEffectInstance[]>(),live:Live[]=[];
 const pending:{at:number;run:()=>void}[]=[];
 let clock=0,ready=false,failed='',planes:Record<Plane,{app:Application;vfx:PixiVfxRenderer;root:Container}>|null=null;
 let Rect:typeof import('pixi.js').Rectangle|null=null;
 let played=0,peakParticles=0,idle=false;
 const textures=new Map<string,Texture>();
 const textureProvider:PixiVfxTextureProvider={
  staticAssets:true,
  async preload(refs:VfxTextureAssetRef[]){await Promise.all(refs.map(async ref=>{if(!textures.has(ref.path))textures.set(ref.path,await (await PIXI()).Assets.load<Texture>({src:'/vfx/'+ref.path,data:{scaleMode:'linear'}}));}));},
  getTexture:(ref:VfxTextureAssetRef)=>textures.get(ref.path),
  resolveUrl:(ref:VfxTextureAssetRef)=>'/vfx/'+ref.path,
 };
 const boot=(async()=>{
  // The NixieFX runtime loads with the bundle, off the game's first paint.
  const [{PixiVfxRenderer},{loadVfxExportBundle},packed]=await Promise.all([import('nixie-fx/pixi'),import('nixie-fx/export'),fetchBundle()]);
  const bundle=loadVfxExportBundle({manifest:packed.manifest,effectsByPath:packed.effects},{requiredBackend:'pixi2d'});
  for(const fx of bundle.effectsById.values())effects.set((fx.sourceEffectFile??fx.id).replace(/\.json$/,''),fx);
  await textureProvider.preload!(bundle.manifest.assets.filter((a):a is VfxTextureAssetRef=>a.type==='texture'));
  const [ground,world]=await Promise.all([mountPlane({before:o.under},'world-fx-ground',''),mountPlane({after:o.over},'world-fx-over',';z-index:3')]);
  const {Container,Rectangle}=await PIXI();Rect=Rectangle;
  const make=(app:Application,flat:boolean,bloom:boolean)=>{const root=new Container();if(flat)root.scale.set(1,.5);app.stage.addChild(root);
   return {app,root,vfx:new PixiVfxRenderer({parent:root,textureProvider,pixiRenderer:bloom?app.renderer:undefined,bloom:bloom?{enabled:true,quality:'low',threshold:1,intensity:1.6,radius:22}:undefined})};};
  planes={ground:make(ground,true,false),world:make(world,false,o.bloom??BLOOM)};
  resize();addEventListener('resize',resize);ready=true;
 })().catch(e=>{failed=String(e?.message??e);console.error('NixieFX stage unavailable; skills play without particle effects.',e);});

 function resize(){if(!planes||!Rect)return;const Rectangle=Rect;const w=innerWidth,h=innerHeight;for(const p of Object.values(planes))p.app.renderer.resize(w,h);
  planes.world.vfx.setBoundsArea(new Rectangle(-64,-64,w+128,h+128));planes.ground.vfx.setBoundsArea(new Rectangle(-64,-128,w+128,h*2+256));}
 function projection(plane:Plane,a:Anchor){return plane==='ground'?groundProjection(view,a):worldProjection(view,a);}

 function play(key:string,at:FxPlay,delayMs=0):FxHandle|null{
  if(delayMs>0){let h:FxHandle|null=null;const proxy:FxHandle={key,setLocal:(x,y,z)=>h?.setLocal(x,y,z),moveTo:(u,v)=>h?.moveTo(u,v),release:()=>{h?h.release():(cancel=true);},get alive(){return h?h.alive:!cancel;}};
   let cancel=false;pending.push({at:clock+delayMs/1000,run:()=>{if(!cancel)h=play(key,at);}});return proxy;}
  if(!ready||!planes)return null;
  const fx=effects.get(key);if(!fx){console.warn('Unknown NixieFX effect',key);return null;}
  const plane=planeOf(key),anchor:Anchor={u:at.u,v:at.v,h:at.h??0,yaw:at.yaw??0,scale:at.scale??1},proj=projection(plane,anchor),P=planes[plane];
  let inst=pool.get(key)?.pop();
  const seed=at.seed??((Math.random()*0x7fffffff)|0);
  if(inst){inst.setProjection(proj);inst.spawn({position:[0,0,0],seed,timeSeconds:clock});inst.root.visible=true;}
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
 function frame(dt:number,render=true){
  if(!planes)return;
  clock+=dt;
  for(let i=pending.length-1;i>=0;i--)if(pending[i].at<=clock){const p=pending.splice(i,1)[0];p.run();}
  for(const l of live){l.age+=dt;if(l.follow){const p=l.follow();l.anchor.u=p.u;l.anchor.v=p.v;}}
  planes.ground.vfx.update(dt,{timeSeconds:clock});planes.world.vfx.update(dt,{timeSeconds:clock});
  for(let i=live.length-1;i>=0;i--){const l=live[i];if(l.inst.isActive)continue;live.splice(i,1);
   const list=pool.get(l.key)??[];if(list.length<POOL){l.inst.stop();l.inst.root.visible=false;list.push(l.inst);pool.set(l.key,list);}else planes[l.plane].vfx.removeEffect(l.inst,true);}
  peakParticles=Math.max(peakParticles,planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles);
  // Nothing playing: draw the cleared planes once, then leave the GPU alone until something plays.
  const empty=!live.length&&!pending.length;if(render&&!(empty&&idle)){planes.ground.app.render();planes.world.app.render();}idle=empty;
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
   particles:planes?planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles:0,
   missing:planes?[...planes.world.vfx.stats.missingTextureRefs,...planes.ground.vfx.stats.missingTextureRefs].map(r=>r.path):[],
   unsupported:planes?[...planes.world.vfx.stats.unsupportedFeatures,...planes.ground.vfx.stats.unsupportedFeatures].map(f=>f.featureKey):[],
   playing:live.map(l=>`${l.key}:${l.inst.stats.activeParticles}`)}),
 };
}
export type FxStage=ReturnType<typeof createFxStage>;
