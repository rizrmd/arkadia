import {Assets,Rectangle,Texture,type Sprite} from 'pixi.js';
export type VisualPatch={color?:string;opacity?:number;size?:number;count?:number;rate?:number;lifetime?:number;speed?:number;direction?:number;spread?:number;gravity?:number;x?:number;y?:number;z?:number;delay?:number;duration?:number;texture?:string;blend?:'alpha'|'additive'|'screen'|'multiply';columns?:number;rows?:number;fps?:number;frameCount?:number;pivotX?:number;pivotY?:number;loop?:boolean;enabled?:boolean};
export type VisualDocument={version:1;revision:number;effects:Record<string,Record<string,VisualPatch>>};
export const emptyVisuals=():VisualDocument=>({version:1,revision:0,effects:{}});
let applied=emptyVisuals(),preview:VisualDocument|null=null,revision=0,loaded:Promise<void>|undefined;
let isolation:{effect:string;layer:string}|null=null;let phaseLayers:Set<string>|null=null;
export const visualVersion=()=>revision;
export const visualDocument=()=>preview??applied;
export const visualPatch=(effect:string,layer:string):VisualPatch=>visualDocument().effects[effect]?.[layer]??{};
export const visibleVisualLayer=(effect:string,layer:string)=>(!phaseLayers||phaseLayers.has(effect+':'+layer))&&(!isolation||isolation.effect===effect&&(isolation.layer==='*'||isolation.layer===layer));
export function setVisualPhaseLayers(keys:string[]|null){const next=keys?new Set(keys):null;if(JSON.stringify(next?[...next]:null)===JSON.stringify(phaseLayers?[...phaseLayers]:null))return;phaseLayers=next;revision++;}
export function setVisualPreview(doc:VisualDocument|null){const before=JSON.stringify(visualDocument());preview=doc?structuredClone(doc):null;if(before!==JSON.stringify(visualDocument()))revision++;}
export function isolateVisualLayer(effect?:string,layer='*'){const next=effect?{effect,layer}:null;if(JSON.stringify(next)===JSON.stringify(isolation))return;isolation=next;revision++;}
export async function refreshAppliedVisuals(){const r=await fetch('/api/vfx/visuals',{cache:'no-store'});if(!r.ok)throw Error('Visual settings unavailable');const state=await r.json();if(state.applied?.version!==1)throw Error('Invalid visual settings');if(JSON.stringify(applied)!==JSON.stringify(state.applied)){await prepareVisualTextures(state.applied);applied=state.applied;revision++;}return state as {saved:VisualDocument;applied:VisualDocument};}
export function loadAppliedVisuals(){if(!loaded){loaded=refreshAppliedVisuals().then(()=>{}).catch(()=>{});if(!location.pathname.startsWith('/fx-lab')){const channel=new BroadcastChannel('arkodia.vfx.visuals');channel.onmessage=()=>{void refreshAppliedVisuals().catch(()=>{});};window.addEventListener('pagehide',()=>channel.close(),{once:true});const timer=setInterval(()=>{void refreshAppliedVisuals().catch(()=>{});},15000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});}}return loaded;}
const constant=(value:number)=>({mode:'constant',value,min:value,max:value});
function multiplyScalar(value:any,mult:number){if(!value)return;if(String(value.mode??'').toLowerCase().includes('curve')&&typeof value.multiplier!=='number')value.multiplier=1;for(const key of ['value','min','max','multiplier'])if(typeof value[key]==='number')value[key]*=mult;}
/** The only Nixie visual compiler, used by editor preview AND gameplay. Input remains authored bundle data. */
export function compileVisualEffect<T>(effect:string,source:T):T{
 const out=structuredClone(source) as any;
 out.emitters=out.emitters.map((e:any,index:number)=>{const id=String(index),p=visualPatch(effect,id);e.modules??={};e.spawn??={};e.initializeParticle??={};e.render??={};e.forces??={};e.timeline??={};
  if(p.enabled===false||p.count===0||!visibleVisualLayer(effect,id)){e.maxParticles=1;e.spawn.rate=0;e.spawn.rateValue=constant(0);e.spawn.bursts=[];return e;}
  if(p.count!==undefined){e.maxParticles=Math.min(1024,Math.ceil((e.maxParticles??32)*p.count));for(const b of e.spawn.bursts??[])b.count=Math.min(512,Math.round(b.count*p.count));}
  if(p.rate!==undefined){e.spawn.rate=(e.spawn.rate??0)*p.rate;multiplyScalar(e.spawn.rateValue,p.rate);}
  if(p.size!==undefined){multiplyScalar(e.initializeParticle.size,p.size);for(const s of Object.values(e.initializeParticle.size3D??{}))multiplyScalar(s,p.size);}
  if(p.lifetime!==undefined)multiplyScalar(e.initializeParticle.lifetime,p.lifetime);
  if(p.speed!==undefined){multiplyScalar(e.initializeParticle.velocity?.speed,p.speed);for(const key of ['min','max'])if(Array.isArray(e.initializeParticle.velocity?.[key]))e.initializeParticle.velocity[key]=e.initializeParticle.velocity[key].map((v:number)=>v*p.speed!);}
  if(p.color){const rgb=[1,3,5].map(i=>parseInt(p.color!.slice(i,i+2),16)/255);e.initializeParticle.color??={};e.initializeParticle.color.mode='constant';e.initializeParticle.color.color=[...rgb,1];e.initializeParticle.color.colorB=[...rgb,1];if(e.color?.gradient?.colorStops)for(const stop of e.color.gradient.colorStops)stop.color=[...rgb];}
  if(p.opacity!==undefined){e.initializeParticle.color??={};e.initializeParticle.color.alpha=constant(p.opacity);}
  if(p.gravity!==undefined){e.forces.gravity=p.gravity;e.forces.gravityValue=constant(p.gravity);}
  e.spawn.position=[...(e.spawn.position??[0,0,0])];['x','y','z'].forEach((k,i)=>{if(p[k as 'x']!==undefined)e.spawn.position[i]+=p[k as 'x']!;});
  if(p.direction!==undefined){e.spawn.rotation=[...(e.spawn.rotation??[0,0,0])];e.spawn.rotation[1]+=p.direction;}
  if(p.spread!==undefined)e.spawn.arc=p.spread;
  if(p.delay!==undefined)e.timeline.start=p.delay;
  if(p.duration!==undefined)e.duration=p.duration;
  if(p.texture){e.render.texture=p.texture;if(e.render.material?.mainTex)e.render.material.mainTex={type:'texture',id:p.texture,path:p.texture};}
  if(p.blend)e.render.blend=p.blend;if(p.pivotX!==undefined||p.pivotY!==undefined){e.billboard??={};e.billboard.pivot=[(p.pivotX??.5)-.5,.5-(p.pivotY??.5)];if(e.mesh)e.mesh.pivot=e.billboard.pivot;}
  if(p.columns!==undefined||p.rows!==undefined||p.fps!==undefined){e.modules.textureSheetAnimation=true;e.advanced??={};const a=e.advanced.textureSheetAnimation??={};a.tiles=[p.columns??a.tiles?.[0]??1,p.rows??a.tiles?.[1]??1];a.startFrame=0;a.endFrame=Math.min(p.frameCount??a.tiles[0]*a.tiles[1],a.tiles[0]*a.tiles[1])-1;const life=e.initializeParticle.lifetime?.value??e.initializeParticle.lifetime?.max??1;a.randomStartFrame=false;a.cycles=32;const advance=(p.fps??30)*Math.max(.001,life),end=p.loop===false?Math.min(a.endFrame+.999,advance):advance;a.frameOverTime={mode:'curve',curve:p.loop===false?[{x:0,y:0},{x:Math.min(1,(a.endFrame+1)/advance),y:end/32},{x:1,y:end/32}]:[{x:0,y:0},{x:1,y:end/32}]};}
  return e;
 });if(out.timeline&&Object.keys(visualDocument().effects[effect]??{}).length){out.timeline.duration=Math.min(40,Math.max(out.timeline.duration??0,...out.emitters.map((e:any)=>(e.timeline?.start??0)+(e.duration??0)+(e.initializeParticle?.lifetime?.max??e.initializeParticle?.lifetime?.value??1))));}return out;
}
export const RUNTIME_VISUALS:Record<string,{name:string;phase:string;layers:{id:string;name:string;phase?:string;fields:(keyof VisualPatch)[]}[]}>= {
 'runtime/flame-fan':{name:'Flame Fan · gameplay sprites',phase:'detonate',layers:[{id:'burst',name:'Projecting burst',fields:['color','opacity','size','lifetime','delay','x','y','z','texture','columns','rows','fps','blend']},{id:'soil',phase:'aura',name:'Burn soil (visual area only)',fields:['color','opacity','size','lifetime','delay','x','y','z','texture','blend']},{id:'fire',name:'Upright flames',fields:['color','opacity','size','count','lifetime','delay','x','y','z','texture','columns','rows','fps','blend']},{id:'smoke',name:'Smoke',fields:['color','opacity','size','count','lifetime','speed','gravity','delay','x','y','z','texture','blend']},{id:'embers',phase:'trail',name:'Embers',fields:['color','opacity','size','count','lifetime','speed','direction','spread','gravity','delay','x','y','z','texture','blend']}]},
 'runtime/rift-dash':{name:'Rift Dash · gameplay flipbooks',phase:'trail',layers:['departure','arrival','trail','ghosts','particles'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),phase:id==='departure'?'cast':id==='arrival'?'impact':'trail',fields:[...['color','opacity','size','lifetime','direction','gravity','delay','x','y','z','texture','columns','rows','fps','blend'],...(['ghosts','particles'].includes(id)?['count']:[]),...(id==='particles'?['speed']:[])] as (keyof VisualPatch)[]}))}
};
const textures=new Map<string,Promise<Texture>>(),resolved=new Map<string,Texture>(),frames=new Map<string,Texture>();
const original=new WeakMap<Sprite,{tint:number;blend:any;anchorX:number;anchorY:number;texture?:Texture}>();
export async function prepareVisualTextures(doc=visualDocument()){const paths=new Set(Object.values(doc.effects).flatMap(ls=>Object.values(ls).map(p=>p.texture).filter((p):p is string=>!!p)));await Promise.all([...paths].map(path=>{if(!textures.has(path))textures.set(path,Assets.load<Texture>(path.startsWith('/')?path:'/vfx/'+path).then(t=>{resolved.set(path,t);return t;}).catch(e=>{textures.delete(path);throw e;}));return textures.get(path);}));}
/** Shared sprite adapter for authored Flame Fan and Rift Dash renderers. Values affect rendering only. */
export function renderSpriteVisual(effect:string,layer:string,sprite:Sprite,age:number,scale=1,index=0,total=1){
 const p=visualPatch(effect,layer);let base=original.get(sprite);if(!base){base={tint:sprite.tint,blend:sprite.blendMode,anchorX:sprite.anchor.x,anchorY:sprite.anchor.y};original.set(sprite,base);}
 if(!visibleVisualLayer(effect,layer)||p.enabled===false||age<(p.delay??0)||index>=Math.ceil(total*(p.count??1))){sprite.visible=false;return;}
 sprite.anchor.set(base.anchorX,base.anchorY);sprite.tint=p.color?parseInt(p.color.slice(1),16):base.tint;sprite.blendMode=({alpha:'normal',additive:'add',screen:'screen',multiply:'multiply'} as const)[p.blend??'alpha']??base.blend;
 sprite.alpha*=p.opacity??1;sprite.scale.x*=p.size??1;sprite.scale.y*=p.size??1;
 sprite.position.x+=(p.x??0)*64*scale;sprite.position.y+=((p.z??0)*32-(p.y??0)*64+(p.gravity??0)*age*age*16)*scale;
 if(p.direction!==undefined)sprite.rotation+=p.direction*Math.PI/180;
 if(p.texture&&resolved.has(p.texture)){base.texture??=sprite.texture;const tex=resolved.get(p.texture)!,cols=p.columns??1,rows=p.rows??1,count=Math.min(p.frameCount??cols*rows,cols*rows),rawFrame=Math.floor(Math.max(0,age-(p.delay??0))*(p.fps??30)),frame=p.loop===false?Math.min(count-1,rawFrame):rawFrame%count,key=`${p.texture}:${cols}:${rows}:${frame}`;
  if(!frames.has(key))frames.set(key,new Texture({source:tex.source,frame:new Rectangle(frame%cols*tex.width/cols,Math.floor(frame/cols)*tex.height/rows,tex.width/cols,tex.height/rows)}));sprite.texture=frames.get(key)!;if(p.pivotX!==undefined||p.pivotY!==undefined)sprite.anchor.set(p.pivotX??sprite.anchor.x,p.pivotY??sprite.anchor.y);
 }else if(base.texture){sprite.texture=base.texture;base.texture=undefined;}
}
