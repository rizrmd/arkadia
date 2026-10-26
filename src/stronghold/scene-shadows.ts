import {prepareBufferTextures} from '../app/chunked-texture-upload';
import {withSolidShadowGeometry} from './solid-shadow-geometry';
import {createLiveShadowField} from './shadow-live-field';
import {SHADOW_SAMPLING_GLSL} from './shadow-sampling';
import {installActorShadowReceivers} from './shadow-actor-batch';
import {BufferImageSource,Container,Filter,GlProgram,Rectangle,Texture,UniformGroup,type Renderer} from 'pixi.js';
import type {ShadowSun,ShadowBounds} from './shadow-field';
import type {PackedShadowMap,ShadowView} from './shadow-map-builder';
import {sampleSurface,type ShadowSurface} from './shadow-surfaces';
export const shadowFilterVertex=`in vec2 aPosition;out vec2 vTextureCoord;out vec2 vScreen;uniform vec4 uInputSize;uniform vec4 uOutputFrame;uniform vec4 uOutputTexture;
void main(){vec2 p=aPosition*uOutputFrame.zw+uOutputFrame.xy;vScreen=p;gl_Position=vec4(p.x*2.0/uOutputTexture.x-1.0,p.y*(2.0*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z,0.0,1.0);vTextureCoord=aPosition*uOutputFrame.zw*uInputSize.zw;}`;
const fragment=`in vec2 vTextureCoord;in vec2 vScreen;out vec4 finalColor;uniform sampler2D uTexture;uniform sampler2D uHeight;uniform sampler2D uDynamicHeight;uniform vec4 uHeightBounds;uniform vec4 uDynamicHeightBounds;
${SHADOW_SAMPLING_GLSL}
void main(){vec4 color=texture(uTexture,vTextureCoord);if(uSun.z<=0.0){finalColor=color;return;}vec2 world=(vScreen-uCamera.xy)/uCamera.z;vec4 receiver=texAt(uHeight,world,uHeightBounds);float emission=receiver.a>0.0?clamp((1.0-receiver.a)*255.0/127.0,0.0,1.0):0.0;vec4 dynamicHeight=texAt(uDynamicHeight,world,uDynamicHeightBounds);if(dynamicHeight.a>.5){receiver=dynamicHeight;emission=0.0;}float h=zOf(receiver),own=ownerOf(receiver);float shade=shadowCoverage(world,h,own)*uSun.z*(1.0-emission);finalColor=vec4(mix(color.rgb,color.a*vec3(.078431,.109804,.172549),shade),color.a);}`;

// Packed owner/height bytes must never pass through Canvas2D. Its internal
// premultiplied storage rounds RGB when alpha <255, corrupting height/owner.
type MapTexture={source:BufferImageSource;texture:Texture;bounds:ShadowBounds};
function pixelsTexture(map:PackedShadowMap):MapTexture{
 const b=map.bounds,source=new BufferImageSource({resource:map.pixels,width:b.width,height:b.height,format:'rgba8unorm',scaleMode:'nearest',autoGenerateMipmaps:false,alphaMode:'no-premultiply-alpha'}),texture=new Texture({source});return {source,texture,bounds:b};
}
function updateMapTexture(target:MapTexture,map:PackedShadowMap){
 const b=map.bounds;target.source.resource=map.pixels;target.source.resize(b.width,b.height);target.bounds=b;target.source.update();
}
const region=(b:ShadowBounds)=>new Float32Array([b.left,b.top,b.width*b.step,b.height*b.step]);
export function createSceneShadows(stage:Container,onUpdate:()=>void=()=>{},renderer?:Renderer,root?:Container){
 const stats={surfaces:0,samples:0,rebuilds:0,buildMs:0,bytes:0,receiverPixels:0,depthPixels:0,ready:false,error:'',sun:{dx:0,dy:0,alpha:0},model:'original alpha, explicit billboard/relief geometry; light-space depth compare'};
 let sun:ShadowSun={dx:0,dy:0,alpha:0},key='',depthTex:MapTexture|null=null,heightTex:MapTexture|null=null,secondTex:MapTexture|null=null;
 let view:ShadowView|undefined,viewKey='',disposed=false;
 let heightRevision=0,committedHeightRevision=-1;
 let auditSurfaces:ShadowSurface[]=[];
 let revision=0,id=0,inFlight=false,queued=false,hasScene=false;
 const worker=new Worker(new URL('./shadow-field-worker.ts',import.meta.url),{type:'module'});
 const empty=()=>pixelsTexture({bounds:{left:0,top:0,step:1,width:1,height:1},pixels:new Uint8ClampedArray(4)});
 depthTex=empty();heightTex=empty();secondTex=empty();
 const dynamicMaps={uDynamicDepth:empty(),uDynamicSecond:empty(),uDynamicHeight:empty()};
 const uniforms=new UniformGroup({uDynamicSun:{value:new Float32Array(4),type:'vec4<f32>'},uDynamicLightBounds:{value:region(dynamicMaps.uDynamicDepth.bounds),type:'vec4<f32>'},uDynamicHeightBounds:{value:region(dynamicMaps.uDynamicHeight.bounds),type:'vec4<f32>'},uLightBounds:{value:region(depthTex.bounds),type:'vec4<f32>'},uHeightBounds:{value:region(heightTex.bounds),type:'vec4<f32>'},uCamera:{value:new Float32Array([0,0,1,0]),type:'vec4<f32>'},uSun:{value:new Float32Array(4),type:'vec4<f32>'}});
 const filter=new Filter({glProgram:GlProgram.from({name:'scene-depth-shadows',preferredFragmentPrecision:'highp',vertex:shadowFilterVertex,fragment}),resources:{shadowUniforms:uniforms,uDepth:depthTex.source,uHeight:heightTex.source,uSecondDepth:secondTex.source,uDynamicDepth:dynamicMaps.uDynamicDepth.source,uDynamicSecond:dynamicMaps.uDynamicSecond.source,uDynamicHeight:dynamicMaps.uDynamicHeight.source},resolution:1,padding:0});
 const live=renderer&&root?createLiveShadowField(renderer,root,()=>{uniforms.uniforms.uDynamicSun=live!.sun();uniforms.uniforms.uDynamicLightBounds=live!.bounds();uniforms.uniforms.uDynamicHeightBounds=live!.heightBounds();}):null;
 if(live){filter.resources.uDynamicDepth=live.primary;filter.resources.uDynamicSecond=live.second;filter.resources.uDynamicHeight=live.height;}
 stage.filters=[filter];const area=new Rectangle();stage.filterArea=area;
 function replace(which:'uDepth'|'uHeight'|'uSecondDepth',map:PackedShadowMap){updateMapTexture((which==='uDepth'?depthTex:which==='uHeight'?heightTex:secondTex)!,map);}
 function request(){if(inFlight||!hasScene){queued=true;return;}inFlight=true;queued=false;worker.postMessage({type:'build',id:++id,revision,sun,view,needHeight:heightRevision!==committedHeightRevision,heightRevision});}
 worker.onmessage=async({data})=>{if(data.error){inFlight=false;stats.error=data.error;console.error('Scene shadow worker:',data.error);return;}
  try{if(data.revision===revision&&!disposed){
   const upload=performance.now(),names=['uDepth','uSecondDepth',...(data.height?['uHeight']:[])] as ('uDepth'|'uSecondDepth'|'uHeight')[];
   const maps=[data.depth,data.second,...(data.height?[data.height]:[])] as PackedShadowMap[];
   if(renderer){
    const prepared=await prepareBufferTextures(renderer,maps.map((map,i)=>({pixels:map.pixels,width:map.bounds.width,height:map.bounds.height,label:`scene-shadow-${names[i]}`})),()=>!disposed&&data.revision===revision);
    if(!prepared)return;
    // Commit sources and their coordinate transforms together, after the last row.
    for(let i=0;i<names.length;i++){
     const next={source:prepared[i],texture:new Texture({source:prepared[i]}),bounds:maps[i].bounds};
     const old=names[i]==='uDepth'?depthTex:names[i]==='uSecondDepth'?secondTex:heightTex;
     if(names[i]==='uDepth')depthTex=next;else if(names[i]==='uSecondDepth')secondTex=next;else heightTex=next;
     filter.resources[names[i]]=next.source;old?.texture.destroy(true);
    }
   }else{replace('uDepth',data.depth);replace('uSecondDepth',data.second);if(data.height)replace('uHeight',data.height);}
   if(data.height)committedHeightRevision=data.heightRevision;
   uniforms.uniforms.uCamera[3]=auditSurfaces.length*2;uniforms.uniforms.uLightBounds=region(data.depth.bounds);uniforms.uniforms.uHeightBounds=region(heightTex!.bounds);uniforms.uniforms.uSun=new Float32Array([data.sun.dx,data.sun.dy,data.sun.alpha,data.depth.bounds.step]);
   const n=data.depth.bounds.width*data.depth.bounds.height,h=heightTex!.bounds.width*heightTex!.bounds.height;Object.assign(stats,{ready:true,samples:data.samples,rebuilds:stats.rebuilds+1,buildMs:data.buildMs,uploadMs:performance.now()-upload,bytes:(n*2+h)*4,receiverPixels:h,depthPixels:n,sun:data.sun});onUpdate();
  }}catch(error){stats.error=String(error);console.error('Scene shadow upload:',error);}finally{inFlight=false;if(queued&&!disposed)request();}
 };
 worker.onerror=e=>{stats.error=e.message;console.error('Scene shadow worker:',e.message);};
 function setScene(surfaces:ShadowSurface[]){
  surfaces=surfaces.map(withSolidShadowGeometry);auditSurfaces=surfaces.map(p=>({...p}));
  const sampled=surfaces.map((p,i)=>{const s=sampleSurface(p,2);for(const q of s.samples)q.owner=i+1;return s;});
  const aliases=surfaces.map((p,i)=>p.cast!==false?surfaces.length*2+i+1:0);if(Math.max(surfaces.length,...aliases)>=3000)throw Error('Static shadow owner pool overlaps actor owners');
  const total=sampled.reduce((n,s)=>n+s.samples.length,0),packed=new Float32Array(total*18);let j=0;for(const [index,s] of sampled.entries())for(const q of s.samples){packed[j++]=q.x;packed[j++]=q.y;packed[j++]=q.z;packed[j++]=q.alpha;packed[j++]=q.opaqueProxy?aliases[index]:q.owner!;packed[j++]=(s.surface.cast===false?0:1)|(q.receive===false?0:2)|(Math.round((q.emission??0)*255)<<8);packed.set(q.quad!,j);j+=12;}
  heightRevision++;revision++;hasScene=true;stats.surfaces=surfaces.length;stats.ready=false;worker.postMessage({type:'scene',packed},[packed.buffer]);queued=true;queueMicrotask(()=>{if(!inFlight&&queued)request();});
 }
 function setSun(s:ShadowSun){live?.setSun(s);const next=s.alpha?[s.dx,s.dy,s.alpha].map(n=>n.toFixed(3)).join():'night';sun={dx:s.dx,dy:s.dy,alpha:s.alpha};if(next===key)return;if(!live&&dynamicScene.length){dynamicRevision++;dynamicQueued=true;if(!dynamicInFlight)updateDynamic();}key=next;queued=true;queueMicrotask(()=>{if(!inFlight&&queued)request();});}
 const dynamicWorker=live?null:new Worker(new URL('./shadow-field-worker.ts',import.meta.url),{type:'module'});
 let dynamicRevision=0,dynamicInFlight=false,dynamicQueued=false,dynamicScene:ShadowSurface[]=[];
 const dynamicStats={updates:0,surfaces:0,buildMs:0,ready:false};
 function updateDynamic(){if(dynamicInFlight||!dynamicScene.length){dynamicQueued=true;return;}dynamicInFlight=true;dynamicQueued=false;const sampled=dynamicScene.map((p,i)=>{const a=sampleSurface(p,1.5);for(const q of a.samples)q.owner=4000+i;return a;});
  if(4000+sampled.length*2>4095)throw Error('Dynamic shadow owner pool exhausted');const aliases=sampled.map((_,i)=>4000+sampled.length+i);
  const packed=new Float32Array(sampled.reduce((n,s)=>n+s.samples.length,0)*18);let j=0;for(const [index,s] of sampled.entries())for(const q of s.samples){packed[j++]=q.x;packed[j++]=q.y;packed[j++]=q.z;packed[j++]=q.alpha;packed[j++]=q.opaqueProxy?aliases[index]:q.owner!;packed[j++]=(s.surface.cast===false?0:1)|(q.receive===false?0:2)|(Math.round((q.emission??0)*255)<<8);packed.set(q.quad!,j);j+=12;}
  dynamicWorker?.postMessage({type:'scene',packed},[packed.buffer]);dynamicWorker?.postMessage({type:'build',id:dynamicRevision,revision:dynamicRevision,sun});
 }
 if(dynamicWorker)dynamicWorker.onmessage=({data})=>{dynamicInFlight=false;if(data.error){stats.error=data.error;console.error('Dynamic scene shadow:',data.error);return;}
  if(data.revision===dynamicRevision){for(const [name,map] of Object.entries({uDynamicDepth:data.depth,uDynamicSecond:data.second,uDynamicHeight:data.height}) as [keyof typeof dynamicMaps,PackedShadowMap][]){if(!map)continue;updateMapTexture(dynamicMaps[name],map);}
   uniforms.uniforms.uDynamicSun=new Float32Array([data.sun.dx,data.sun.dy,data.sun.alpha,data.depth.bounds.step]);uniforms.uniforms.uDynamicLightBounds=region(data.depth.bounds);uniforms.uniforms.uDynamicHeightBounds=region(dynamicMaps.uDynamicHeight.bounds);Object.assign(dynamicStats,{ready:true,updates:dynamicStats.updates+1,surfaces:dynamicScene.length,buildMs:data.buildMs});onUpdate();}
  if(dynamicQueued)updateDynamic();
 };
 if(dynamicWorker)dynamicWorker.onerror=e=>{stats.error=e.message;console.error('Dynamic scene shadow:',e.message);};
 function setDynamic(surfaces:ShadowSurface[]){if(live){live.setExtra(surfaces);return;}dynamicScene=surfaces;dynamicRevision++;dynamicQueued=true;if(!dynamicInFlight)updateDynamic();}
 function place(x:number,y:number,scale:number,w:number,h:number){uniforms.uniforms.uCamera=new Float32Array([x,y,scale,uniforms.uniforms.uCamera[3]]);area.x=0;area.y=0;area.width=w;area.height=h;
  const next={left:Math.floor(-x/scale/128)*128-192,top:Math.floor(-y/scale/128)*128-192,right:Math.ceil((w-x)/scale/128)*128+192,bottom:Math.ceil((h-y)/scale/128)*128+192,step:1.25},sig=JSON.stringify(next);if(sig!==viewKey){viewKey=sig;view=next;live?.setView(next);heightRevision++;revision++;queued=true;queueMicrotask(()=>{if(!inFlight&&queued)request();});}
 }
 const actorBindings=()=>({uCamera:uniforms.uniforms.uCamera,uSun:uniforms.uniforms.uSun,uDynamicSun:uniforms.uniforms.uDynamicSun,uLightBounds:uniforms.uniforms.uLightBounds,uDynamicLightBounds:uniforms.uniforms.uDynamicLightBounds,textures:[depthTex!.source,secondTex!.source,live?.primary??dynamicMaps.uDynamicDepth.source,live?.second??dynamicMaps.uDynamicSecond.source]});
 const restoreActors=renderer?installActorShadowReceivers(renderer,actorBindings):()=>{};
 return {setScene,setSun,setDynamic,place,runSharedAtlasFixture:()=>import('./shadow-shared-atlas-fixture').then(m=>m.runSharedAtlasFixture()),auditSurfaces:()=>auditSurfaces.map(p=>({...p,frame:p.frame&&[...p.frame],pivot:[...p.pivot],ground:p.ground&&[...p.ground]})),listFamilyAudit:(supplement=false)=>import('./shadow-family-audit').then(async m=>m.familyAuditInventory(supplement?await m.supplementalAuditSurfaces(auditSurfaces):auditSurfaces).map(({surface,...entry})=>entry)),runFamilyAudit:(offset=0,limit=6,supplement=false)=>import('./shadow-family-audit').then(async m=>m.auditShadowFamilies(supplement?await m.supplementalAuditSurfaces(auditSurfaces):auditSurfaces,offset,limit)),runActorFrameAudit:(offset=0,limit=445)=>import('./shadow-actor-frame-audit').then(m=>m.auditActorFrames(offset,limit)),runGatewayFrameAudit:(offset=0,limit=16,sourceSet='gateway-producer-frames')=>import('./shadow-gateway-frame-audit').then(m=>m.auditGatewayFrames(offset,limit,sourceSet)),runLiveFixture:()=>import('./shadow-live-fixture').then(m=>m.runLiveShadowFixture()),runFixture:()=>import('./shadow-fixture').then(m=>m.runIsolatedShadowReceiverFixture()),destroy:()=>{disposed=true;restoreActors();if(stage.filters?.includes(filter))stage.filters=stage.filters.filter(f=>f!==filter);live?.destroy();worker.terminate();dynamicWorker?.terminate();for(const t of [depthTex,heightTex,secondTex,...Object.values(dynamicMaps)])t?.texture.destroy(true);filter.destroy();},stats:()=>({...stats,dynamic:live?live.stats():{...dynamicStats}}),sample:(x:number,y:number,z:number)=>({x,y,z}),filter};
}
