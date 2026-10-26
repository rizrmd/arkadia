import {packedMapCopier} from './shadow-packed-copy';
import {ShadowAlphaShell} from './shadow-alpha-shell';
import {SkinnedShadowMesh} from './shadow-skinned-mesh';
import {highpShadowProgram} from './shadow-program';
import {renderQuality} from '../app/render-quality';
import {CanvasSource,Container,DefaultBatcher,Shader,UniformGroup,TextureSource,Texture,RenderTarget,Rectangle,Sprite,MeshSimple,State,extensions,ExtensionType,compileHighShaderGlProgram,generateTextureBatchBitGl,getBatchSamplersUniformGroup,roundPixelsBitGl,type BatcherOptions,type Renderer,type Batch,type DefaultBatchableQuadElement,type DefaultBatchableMeshElement} from 'pixi.js';
import {actorShadowSources,onActorShadowFrame,retainUnifiedActorShadows,setActorHeightTile,type ActorShadowSource} from './shadow-actor-sources';
import {surfacePoint,type ShadowSurface} from './shadow-surfaces';
import type {ShadowBounds,ShadowSun} from './shadow-field';
import type {ShadowView} from './shadow-map-builder';

type DrawMeta={owner:number;opacity:number;groundY?:number;groundX?:number;slope?:number;heights?:Float32Array};
const drawMeta=new WeakMap<Container,DrawMeta>(),skinDraws=new WeakMap<Container,SkinnedShadowMesh|ShadowAlphaShell>();
function packedHeight(z:number,owner:number,opacity:number){const h=Math.round((z+512)*2);if(h<0||h>4095||owner>4095)throw Error('Live shadow geometry exceeds packed vertex contract');return ((owner>>4)|(((owner&15)*16+(h>>8))<<8)|((h&255)<<16)|(Math.round(opacity*255)<<24))>>>0;}
class LiveDepthShader extends Shader{
 readonly count:number;
 constructor(count:number){
  const bit={name:'live-shadow-depth',vertex:{header:'in vec4 aColor;out float vShadowHeight;out float vShadowOwner;out float vShadowOpacity;uniform vec4 uLiveBounds;uniform vec4 uLiveSun;uniform float uLiveMode;',main:`vec3 bytes=floor(aColor.rgb*255.0+.5);float z=(mod(bytes.g,16.0)*256.0+bytes.b)*.5-512.0;vShadowHeight=z;vShadowOwner=bytes.r*16.0+floor(bytes.g/16.0);vShadowOpacity=aColor.a;vec2 ray=position+(uLiveMode>.5?vec2(0.0):vec2(uLiveSun.x*z,(1.0+uLiveSun.y)*z));position=(ray-uLiveBounds.xy)/uLiveBounds.z+vec2(0.0,uLiveBounds.w);worldTransformMatrix=mat3(1.0);modelMatrix=mat3(1.0);`,end:'gl_Position.z=1.0-2.0*vShadowHeight/2048.0;'},fragment:{header:'in float vShadowHeight;in float vShadowOwner;in float vShadowOpacity;uniform sampler2D uLivePrimary;uniform vec4 uLiveSize;uniform float uLivePeel;uniform vec4 uLiveBounds;',end:`float coverage=outColor.a*vShadowOpacity;if(coverage<.5/255.0||vShadowHeight<0.0||gl_FragCoord.y<uLiveBounds.w||gl_FragCoord.y>=uLiveBounds.w+uLiveSize.y)discard;if(uLivePeel>1.5&&uLivePeel<2.5){if(coverage<250.0/255.0)discard;}else if(uLivePeel>.5&&uLivePeel<1.5){vec4 front=texture(uLivePrimary,gl_FragCoord.xy/uLiveSize.xy);float own=floor(front.r*255.0+.5)*16.0+floor(floor(front.g*255.0+.5)/16.0);if(abs(own-vShadowOwner)<.5&&coverage<=front.a+.5/255.0)discard;}float h=floor(max(0.0,vShadowHeight)*2.0+.5),owner=floor(vShadowOwner+.5);finalColor=vec4(floor(owner/16.0),mod(owner,16.0)*16.0+floor(h/256.0),mod(h,256.0),coverage*255.0)/255.0;`}};
  super({glProgram:highpShadowProgram(compileHighShaderGlProgram({name:'live-shadow-depth',bits:[generateTextureBatchBitGl(count),roundPixelsBitGl,bit]}),'live-shadow-depth-highp'),resources:{batchSamplers:getBatchSamplersUniformGroup(count),liveUniforms:new UniformGroup({uLiveBounds:{value:new Float32Array([0,0,1.25,0]),type:'vec4<f32>'},uLiveSun:{value:new Float32Array(4),type:'vec4<f32>'},uLiveMode:{value:0,type:'f32'},uLivePeel:{value:0,type:'f32'},uLiveSize:{value:new Float32Array([1,1,0,0]),type:'vec4<f32>'},uLivePrimary:{value:count,type:'i32'}})}});this.count=count;
 }
}
class LiveDepthBatcher extends DefaultBatcher{
 constructor(options:BatcherOptions){super({...options,maxTextures:Math.max(1,Math.min(12,options.maxTextures-1))});(this as {name:string}).name='live-shadow-depth';this.shader=new LiveDepthShader(this.maxTextures);}
 packQuadAttributes(element:DefaultBatchableQuadElement,f:Float32Array,u:Uint32Array,index:number,textureId:number){super.packQuadAttributes(element,f,u,index,textureId);const m=drawMeta.get((element as any).renderable)!;for(let v=0;v<4;v++){const i=index+v*6,z=m.groundY!+(m.slope??0)*(f[i]-m.groundX!)-f[i+1];u[i+4]=packedHeight(z,m.owner,m.opacity);}}
 packAttributes(element:DefaultBatchableMeshElement,f:Float32Array,u:Uint32Array,index:number,textureId:number){super.packAttributes(element,f,u,index,textureId);const m=drawMeta.get((element as any).renderable)!;for(let v=0;v<element.attributeSize;v++)u[index+v*6+4]=packedHeight(m.heights![v],m.owner,m.opacity);}
}
extensions.add({type:ExtensionType.Batcher,name:'live-shadow-depth',ref:LiveDepthBatcher});
type Pass={bounds:Float32Array;sun:Float32Array;size:Float32Array;mode:number;peel:number;primary:TextureSource};
const passes=new WeakMap<Renderer,Pass>(),installed=new WeakSet<Renderer>();
function installDepthPipe(renderer:Renderer){if(installed.has(renderer))return;installed.add(renderer);
 const sprite=(renderer.renderPipes as any).sprite,getSprite=sprite._getGpuSprite.bind(sprite);sprite._getGpuSprite=(s:Sprite)=>{const gpu=getSprite(s);if(drawMeta.has(s))gpu.batcherName='live-shadow-depth';return gpu;};
 const mesh=(renderer.renderPipes as any).mesh,getMesh=mesh._getBatchableMesh.bind(mesh);mesh._getBatchableMesh=(m:MeshSimple)=>{const gpu=getMesh(m);if(drawMeta.has(m))gpu.batcherName='live-shadow-depth';return gpu;};
 const adaptor=(renderer.renderPipes as any).batch._adaptor,execute=adaptor.execute.bind(adaptor),state=State.for2d();state.blend=false;state.depthTest=true;state.depthMask=true;
 adaptor.execute=(pipe:any,batch:Batch)=>{const shader=batch.batcher.shader;if(!(shader instanceof LiveDepthShader)){execute(pipe,batch);return;}const p=passes.get(renderer)!;const group=shader.resources.liveUniforms as UniformGroup;Object.assign(group.uniforms,{uLiveBounds:p.bounds,uLiveSun:p.sun,uLiveSize:p.size,uLiveMode:p.mode,uLivePeel:p.peel});(renderer as any).shader.updateUniformGroup(group);(renderer as any).state.set(state);for(let i=0;i<batch.textures.count;i++)(renderer as any).texture.bind(batch.textures.textures[i],i);(renderer as any).texture.bind(p.primary,shader.count);(renderer as any).geometry.draw(batch.topology,batch.size,batch.start);};
}
function target(label:string,depth=true){const source=new TextureSource({width:1,height:1,resolution:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest',autoGenerateMipmaps:false,label});return {source,target:new RenderTarget({colorTextures:[source],depth,stencil:false,antialias:false,label}),bounds:{left:0,top:0,step:1.25,width:1,height:1} as ShadowBounds};}
function inRoot(sprite:Container,root:Container){let p:Container|null=sprite;while(p){if(!p.visible||!p.renderable||p.alpha<=0)return false;if(p===root)return true;p=p.parent;}return false;}
const region=(b:ShadowBounds)=>new Float32Array([b.left,b.top,b.width*b.step,b.height*b.step]);
export function createLiveShadowField(renderer:Renderer,root:Container,onUpdate:()=>void=()=>{}){
 installDepthPipe(renderer);const gl=(renderer as any).gl as WebGLRenderingContext,textureLimit=gl.getParameter(gl.MAX_TEXTURE_SIZE);const release=retainUnifiedActorShadows(),stage=new Container(),heightStage=new Container(),primary=target('live-shadow-primary'),second=target('live-shadow-second'),height=target('live-shadow-gateway-height'),copyCamera=packedMapCopier(renderer),empty=Texture.from(document.createElement('canvas')).source;
 const actors=new Map<Sprite,{pair:Sprite[];skin:SkinnedShadowMesh[];shell:ShadowAlphaShell|undefined;skinKey:string;texture:Texture;source:CanvasImageSource;frameKey:string;cameraPoseKey:string;owner:number;raw:ReturnType<typeof target>;completed:ReturnType<typeof target>;cameraKey:string;rect:[number,number,number,number]}>(),extras=new Map<string,{mesh:MeshSimple;geometryKey:string;revision:string;source:CanvasImageSource}>();
 // Private depth sprites need repacking when metadata changes; updating their
 // dynamic texture uses Pixi's public invalidation path.
 let packedSecond=false,hasSkinned=false;let sun:ShadowSun={dx:0,dy:0,alpha:0},view:ShadowView|undefined,extraSurfaces:ShadowSurface[]=[],signature='',inside=false,disposed=false;
 const firstCamera=()=>[...actors.values()].find(v=>v.skin.some(d=>d.mesh.visible));
 const stats={updates:0,actors:0,extraSurfaces:0,skinnedMeshes:0,receiverPasses:1,geometryBytes:0,drawnVertices:0,pixels:0,bytes:0,renderMs:0,ready:false,casterPasses:2,fieldSamplers:4,opaqueEnvelope:false};
 function sourceTexture(source:HTMLImageElement|HTMLCanvasElement){const texture=Texture.from(source);if(source instanceof HTMLCanvasElement)texture.source.update();return texture;}
 function destroyActor(v:ReturnType<typeof actorSprites>){for(const d of v.pair)d.destroy();for(const d of v.skin)d.destroy();v.shell?.destroy();setActorHeightTile(renderer,v.owner,undefined);for(const t of [v.raw,v.completed]){t.target.destroy();t.source.destroy();}v.texture.destroy(v.source instanceof HTMLCanvasElement);}
 function actorSprites(record:ActorShadowSource){
  const frame=record.frame!,anchor=record.anchor(),source=frame.source,skinKey=frame.skinned?.map(p=>p.geometry.key).join('|')??'';let v=actors.get(record.sprite);
  if(!v||v.source!==source||v.skinKey!==skinKey){
   if(v)destroyActor(v);
   const bodySource=source instanceof HTMLCanvasElement?new CanvasSource({resource:source,scaleMode:'linear',autoGenerateMipmaps:false}):sourceTexture(source).source,texture=new Texture({source:bodySource,frame:new Rectangle(...frame.frame),dynamic:true}),pair=skinKey?[]:[new Sprite(texture),new Sprite(texture)],skin=(frame.skinned??[]).map(p=>new SkinnedShadowMesh(p,texture)),shell=skin.length?new ShadowAlphaShell(texture,frame.width,frame.height):undefined;
   for(const d of pair)stage.addChild(d);for(const d of skin){stage.addChild(d.mesh);skinDraws.set(d.mesh,d);}
   if(shell){stage.addChild(shell.mesh);skinDraws.set(shell.mesh,shell);}
   v={pair,skin,shell,skinKey,texture,source,frameKey:'',cameraPoseKey:'',owner:record.owner,raw:target('actor-camera-'+record.owner),completed:target('actor-alpha-'+record.owner,false),cameraKey:'',rect:[0,0,1,1]};actors.set(record.sprite,v);signature='';
  }
  const fKey=frame.frame.join()+':'+frame.revision;if(fKey!==v.frameKey){v.frameKey=fKey;if(source instanceof HTMLCanvasElement){if(v.texture.source.width!==source.width||v.texture.source.height!==source.height)v.texture.source.resize(source.width,source.height,1);v.texture.source.update();(renderer as any).texture.bind(v.texture.source,0);}v.texture.frame.copyFrom(new Rectangle(...frame.frame));v.texture.updateUvs();}
  for(let i=0;i<v.pair.length;i++){const d=v.pair[i];d.visible=true;d.anchor.set(...frame.pivot);d.position.set(anchor.groundX??0,anchor.groundY-anchor.lift);d.width=frame.width;d.height=frame.height;d.scale.x=Math.abs(d.scale.x)*(frame.flip?-1:1);drawMeta.set(d,{owner:record.owner,opacity:record.sprite.alpha,groundX:anchor.groundX??0,groundY:anchor.groundY+(frame.groundOffsetY??0),slope:(i?-1:1)*(frame.depthSpan??9)/frame.width});}
  for(let i=0;i<v.skin.length;i++){v.skin[i].mesh.visible=true;v.skin[i].update(frame.skinned![i],frame,anchor,record.owner,record.sprite.alpha);}
  if(v.shell){v.shell.mesh.visible=true;v.shell.update(frame,anchor,record.owner,record.sprite.alpha);}
  v.cameraPoseKey=[frame.revision,frame.frame.join(),frame.width,frame.height,frame.pivot.join(),frame.groundOffsetY,anchor.lift,record.sprite.alpha].join(':');v.texture.update();return v;
 }
 function extraMesh(p:ShadowSurface,index:number){const key='extra:'+index,shape=JSON.stringify([p.frame,p.width,p.height,p.pivot,p.x,p.y,p.lift,p.shear,p.vertical,p.ground,p.flip,p.constantHeight]);let v=extras.get(key);if(!v||v.geometryKey!==shape||v.source!==p.source){v?.mesh.destroy();const base=sourceTexture(p.source as HTMLImageElement|HTMLCanvasElement),g=p.ground??[p.pivot[1]],cols=Math.max(2,g.length),vertices=new Float32Array(cols*3*2),uvs=new Float32Array(cols*3*2),heights=new Float32Array(cols*3),indices:number[]=[],f=p.frame??[0,0,p.sourceWidth,p.sourceHeight];for(let i=0;i<cols;i++){const u=i/(cols-1),baseV=g[Math.min(i,g.length-1)];for(let r=0;r<3;r++){const vv=r===0?0:r===1?Math.max(0,Math.min(1,baseV)):1,q=surfacePoint(p,u,vv,g),j=r*cols+i;vertices[j*2]=q.x;vertices[j*2+1]=q.y-q.z;heights[j]=q.z;uvs[j*2]=(f[0]+u*f[2])/p.sourceWidth;uvs[j*2+1]=(f[1]+vv*f[3])/p.sourceHeight;}if(i<cols-1)for(let r=0;r<2;r++){const a=r*cols+i,b=a+1,c=a+cols,d=c+1;indices.push(a,b,d,a,d,c);}}const mesh=new MeshSimple({texture:base,vertices,uvs,indices:new Uint32Array(indices)});mesh.geometry.batchMode='batch';stage.addChild(mesh);drawMeta.set(mesh,{owner:4000+index,opacity:1,heights});v={mesh,geometryKey:shape,revision:'',source:p.source};extras.set(key,v);}
  if(v.revision!==p.key){v.revision=p.key;v.mesh.texture.source.update();}v.mesh.visible=p.cast!==false;return v.mesh;
 }
 function boundsOf(draws:Container[],screen=false,constrain=true,bands=1,receiver=false):ShadowBounds{let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const d of draws){const skin=skinDraws.get(d);if(skin){const ranges=[skin.bounds(sun,screen),...(!screen?[skin.bounds(sun,true)]:[])];for(const b of ranges){left=Math.min(left,b.left);right=Math.max(right,b.right);top=Math.min(top,b.top);bottom=Math.max(bottom,b.bottom);}continue;}const m=drawMeta.get(d)!;if(d instanceof Sprite){const b=d.getLocalBounds(),sx=d.scale.x,sy=d.scale.y;for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY]){const px=d.x+x*sx,py=d.y+y*sy,z=m.groundY!+(m.slope??0)*(px-m.groundX!)-py,qx=screen?px:px+sun.dx*z,qy=screen?py:py+(1+sun.dy)*z;left=Math.min(left,qx);right=Math.max(right,qx);top=Math.min(top,qy);bottom=Math.max(bottom,qy);}}else{const mesh=d as MeshSimple,pos=mesh.geometry.positions;for(let i=0;i<pos.length;i+=2){const z=m.heights![i/2],x=pos[i]+(screen?0:sun.dx*z),y=pos[i+1]+(screen?0:(1+sun.dy)*z);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}}
  if(!Number.isFinite(left))return {left:0,top:0,step:1.25,width:1,height:1};if(view&&!screen&&constrain){const zMax=320;left=Math.max(left,view.left+Math.min(0,sun.dx*zMax)-16);right=Math.min(right,view.right+Math.max(0,sun.dx*zMax)+16);top=Math.max(top,view.top+Math.min(0,(1+sun.dy)*zMax)-16);bottom=Math.min(bottom,view.bottom+Math.max(0,(1+sun.dy)*zMax)+16);}if(right<=left||bottom<=top)return {left:0,top:0,step:1.25,width:1,height:1};
  const high=renderQuality.get().tier==='high',minStep=high?.5:1.25,maxSize=Math.min(high?4096:2048,textureLimit),budget=(high?4_000_000:1_000_000)*2/(1+bands+(receiver?2:0)),maxHeight=Math.floor(maxSize/bands);let step=Math.max(minStep,(right-left+32)/maxSize,(bottom-top+32)/maxHeight,Math.sqrt((right-left)*(bottom-top)/budget));left=Math.floor(left/32)*32-8;top=Math.floor(top/32)*32-8;right=Math.ceil(right/32)*32+8;bottom=Math.ceil(bottom/32)*32+8;step=Math.max(step,(right-left)/maxSize,(bottom-top)/maxHeight,Math.sqrt((right-left)*(bottom-top)/budget));return {left,top,step,width:Math.min(maxSize,Math.max(1,Math.ceil((right-left)/step))),height:Math.min(maxHeight,Math.max(1,Math.ceil((bottom-top)/step)))};
 }
 function visibleExtra(d:Container){if(!view)return true;const screen=boundsOf([d],true,false),light=boundsOf([d],false,false),hit=(b:ShadowBounds,l:number,t:number,r:number,bt:number)=>b.left+b.width*b.step>=l&&b.left<=r&&b.top+b.height*b.step>=t&&b.top<=bt;return hit(screen,view.left,view.top,view.right,view.bottom)||hit(light,view.left+Math.min(0,sun.dx*320)-16,view.top+Math.min(0,(1+sun.dy)*320)-16,view.right+Math.max(0,sun.dx*320)+16,view.bottom+Math.max(0,(1+sun.dy)*320)+16);}
 function renderPass(drawStage:Container,t:ReturnType<typeof target>,b:ShadowBounds,mode:number,peel:number,bands=1,offset=0){const fullHeight=b.height*bands;if(t.source.width!==b.width||t.source.height!==fullHeight)t.target.resize(b.width,fullHeight,1);t.bounds=b;passes.set(renderer,{bounds:new Float32Array([b.left,b.top,b.step,offset]),sun:new Float32Array([sun.dx,sun.dy,sun.alpha,0]),size:new Float32Array([b.width,b.height,0,0]),mode,peel,primary:peel===1?primary.source:empty});for(const v of actors.values()){for(const d of v.skin)if(d.mesh.parent===drawStage&&d.mesh.visible)d.pass(b,sun,mode,peel,offset,peel===1?primary.source:empty);if(v.shell?.mesh.parent===drawStage&&v.shell.mesh.visible)v.shell.pass(b,sun,mode,peel,offset,peel===1?primary.source:empty,v.raw.source,v.raw.bounds);}originalRender({container:drawStage,target:t.target,clear:peel<2,clearColor:[0,0,0,0]});}
 function render(){const start=performance.now(),seen=new Set<Sprite>(),draws:Container[]=[],keys:string[]=[sun.dx.toFixed(4),sun.dy.toFixed(4),String(sun.alpha),renderQuality.get().tier,JSON.stringify(view)];for(const r of actorShadowSources()){if(!r.frame||!inRoot(r.sprite,root))continue;seen.add(r.sprite);const v=actorSprites(r),a=r.anchor();draws.push(...v.pair,...v.skin.map(d=>d.mesh),...(v.shell?[v.shell.mesh]:[]));keys.push([r.owner,a.groundX,a.groundY,a.lift,r.sprite.alpha,r.frame.revision,r.frame.flip].join(':'));}for(const [key,v] of actors)if(!seen.has(key)){if(key.destroyed){destroyActor(v);actors.delete(key);}else {for(const d of v.pair)d.visible=false;for(const d of v.skin)d.mesh.visible=false;if(v.shell)v.shell.mesh.visible=false;}}
  for(const v of extras.values())v.mesh.visible=false;const extra=extraSurfaces.map(extraMesh);for(const d of extra){if(d.visible&&!visibleExtra(d))d.visible=false;if(d.visible)draws.push(d);keys.push(extraSurfaces[extra.indexOf(d)].key);}const next=keys.join('|');if(next===signature)return;signature=next;
  const activeActors=[...actors.values()].filter(v=>v.skin.some(d=>d.mesh.visible));
  const skins=activeActors.flatMap(v=>v.skin);hasSkinned=skins.length>0;packedSecond=hasSkinned||extra.some(d=>d.visible);
  const bands=packedSecond?2:1,high=renderQuality.get().tier==='high',maxSize=Math.min(high?4096:2048,textureLimit);
  // Tight per-owner camera ROIs cannot erase one another when actors overlap.
  // Dimensions are independent of sun/view; translation reuses their pose bitmap.
  let cameraStep=.5;
  const cameraBudget=(high?64:16)*1024*1024*.35;
  const area=activeActors.reduce((n,v)=>{const q=v.shell!.bounds(sun,true);return n+(q.right-q.left+2)*(q.bottom-q.top+2);},0);
  cameraStep=Math.max(cameraStep,Math.ceil(Math.sqrt(area*20/cameraBudget)*8)/8);
  for(const v of activeActors){
   const q=v.shell!.bounds(sun,true),cb={left:q.left-1,top:q.top-1,step:cameraStep,width:Math.ceil((q.right-q.left+2)/cameraStep),height:Math.ceil((q.bottom-q.top+2)/cameraStep)};
   const key=[v.cameraPoseKey,cb.width,cb.height,cb.step].join(':');
   v.raw.bounds=cb;v.completed.bounds=cb;
   if(v.cameraKey!==key){
    for(const d of v.skin)heightStage.addChild(d.mesh);
    renderPass(heightStage,v.raw,cb,1,0);
    for(const d of v.skin)stage.addChild(d.mesh);
    if(v.completed.source.width!==cb.width||v.completed.source.height!==cb.height)v.completed.target.resize(cb.width,cb.height,1);
    copyCamera.copy(v.raw.source,v.completed.target,0);
    heightStage.addChild(v.shell!.mesh);
    // Raw mesh is already copied. Complete only original-alpha raster support,
    // without a depth test that could reject floor fragments through roundoff.
    v.shell!.pass(cb,sun,1,0,0,empty,v.raw.source,cb);
    originalRender({container:heightStage,target:v.completed.target,clear:false});
    stage.addChild(v.shell!.mesh);v.cameraKey=key;
   }
  }
  const b=boundsOf(draws,false,true,bands,hasSkinned);
  const minimumWidth=activeActors.length?Math.max(...activeActors.map(v=>v.completed.source.width))*Math.ceil(Math.sqrt(activeActors.length)):1;
  b.width=Math.max(b.width,Math.min(maxSize,minimumWidth));
  let tailHeight=0;
  function packTiles(){let x=0,y=0,row=0;for(const v of activeActors){const w=v.completed.source.width,h=v.completed.source.height;if(x+w>b.width){y+=row;x=0;row=0;}v.rect=[x,b.height*bands+y,w,h];x+=w;row=Math.max(row,h);}tailHeight=y+row;}
  packTiles();
  // Reserve the camera tail before rendering either light band.
  if(b.height*bands+tailHeight>maxSize){const oldHeight=b.height;b.height=Math.max(1,Math.floor((maxSize-tailHeight)/bands));b.step*=oldHeight/b.height;packTiles();}
  const atlasHeight=b.height*bands+tailHeight;
  renderPass(stage,primary,b,0,0);
  // renderPass normally sizes integral bands. Keep the reserved tail intact.
  second.target.resize(b.width,atlasHeight,1);second.bounds=b;
  function lightSecond(peel:number,offset:number,clear:boolean){
   passes.set(renderer,{bounds:new Float32Array([b.left,b.top,b.step,offset]),sun:new Float32Array([sun.dx,sun.dy,sun.alpha,0]),size:new Float32Array([b.width,b.height,0,0]),mode:0,peel,primary:peel===1?primary.source:empty});
   for(const v of activeActors){for(const d of v.skin)d.pass(b,sun,0,peel,offset,peel===1?primary.source:empty);v.shell!.pass(b,sun,0,peel,offset,peel===1?primary.source:empty,v.raw.source,v.raw.bounds);}
   originalRender({container:stage,target:second.target,clear,clearColor:[0,0,0,0]});
  }
  lightSecond(1,0,true);if(packedSecond)lightSecond(2,b.height,false);
  for(const v of actors.values())if(!activeActors.includes(v))setActorHeightTile(renderer,v.owner,undefined);
  for(const v of activeActors){const [x,y,w,h]=v.rect;copyCamera.copy(v.completed.source,second.target,y,x);setActorHeightTile(renderer,v.owner,{bounds:region(v.raw.bounds),uv:new Float32Array([x/b.width,y/atlasHeight,w/b.width,h/atlasHeight]),rect:v.rect});}
  const extraReceivers=extra.filter(d=>d.visible);for(const d of extraReceivers)heightStage.addChild(d);const hb=boundsOf(extraReceivers,true);renderPass(heightStage,height,hb,1,0);for(const d of extraReceivers)stage.addChild(d);
  Object.assign(stats,{updates:stats.updates+1,actors:seen.size,skinnedMeshes:skins.length,receiverPasses:activeActors.length*2+1,extraSurfaces:extraReceivers.length,casterPasses:packedSecond?3:2,opaqueEnvelope:packedSecond,drawnVertices:draws.reduce((n,d)=>n+(skinDraws.get(d)?.vertices??(d instanceof Sprite?4:(d as MeshSimple).geometry.positions.length/2)),0),pixels:b.width*b.height,bytes:[primary,second,height,...activeActors.flatMap(v=>[v.raw,v.completed])].reduce((n,t)=>n+t.source.width*t.source.height*(activeActors.some(v=>v.completed===t)?4:8),0),geometryBytes:[...actors.values()].reduce((n,v)=>n+v.skin.reduce((m,d)=>m+d.geometryBytes,0)+(v.shell?.geometryBytes??0),0),renderMs:performance.now()-start,ready:true});onUpdate();
 }
 // Each actor gets its own GPU source. Upload synchronously on publication:
 // the shared Three body canvas may be overwritten by another party member
 // before the root render. No CPU canvas copy or readPixels is needed.
 const unsubscribe=onActorShadowFrame(record=>{if(!disposed&&record.frame&&inRoot(record.sprite,root))actorSprites(record);});
 const originalRender=(renderer.render as any).bind(renderer);const wrapper=(options:any)=>{const container=options?.container??options;if(container===root&&!inside&&!disposed){inside=true;try{render();}finally{inside=false;}}return originalRender(options);};(renderer as any).render=wrapper;
 return {primary:primary.source,second:second.source,height:height.source,get skinHeight(){return firstCamera()?.raw.source??empty;},get actorHeight(){return firstCamera()?.completed.source??empty;},skinHeightBounds:()=>region(firstCamera()?.raw.bounds??primary.bounds),cameraInfo:(owner:number)=>[...actors.values()].find(v=>v.owner===owner)?.rect,setSun:(s:ShadowSun)=>{sun={...s};},setView:(v:ShadowView)=>{view=v;},setExtra:(s:ShadowSurface[])=>{extraSurfaces=s;signature='';},bounds:()=>region(primary.bounds),heightBounds:()=>region(height.bounds),sun:()=>new Float32Array([sun.dx,sun.dy,hasSkinned?10+primary.bounds.height/second.source.height:(packedSecond?2:0),primary.bounds.step]),stats:()=>({...stats,step:primary.bounds.step}),renderNow:render,destroy(){if(disposed)return;disposed=true;unsubscribe();release();if((renderer as any).render===wrapper)(renderer as any).render=originalRender;for(const v of actors.values())destroyActor(v);for(const v of extras.values())v.mesh.destroy();stage.destroy();heightStage.destroy();copyCamera.destroy();for(const t of [primary,second,height]){t.target.destroy();t.source.destroy();}empty.destroy();}};
}
