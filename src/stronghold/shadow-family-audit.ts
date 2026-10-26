import {Application,Container,Sprite,Texture,Filter,GlProgram,ImageSource,CanvasSource,Rectangle,Matrix,type TextureSource} from 'pixi.js';
import {createSceneShadows,shadowFilterVertex} from './scene-shadows';
import {sampleSurface,type ShadowSurface} from './shadow-surfaces';
import type {ShadowSun} from './shadow-field';
const suns:ShadowSun[]=[{dx:1.594,dy:.092,alpha:.55},{dx:.278,dy:.307,alpha:.55},{dx:-.826,dy:.743,alpha:.55}];
const family=(p:ShadowSurface)=>p.key.startsWith('ff:')?p.key.split(':').slice(0,2).join(':'):p.key;
export const surfaceAuditSignature=(p:ShadowSurface)=>{const base=[family(p),p.frame,p.width,p.height,p.pivot,p.flip,p.shear,p.vertical,p.lift,p.ground,p.constantHeight,p.cast,!!p.heightAtScreen];return JSON.stringify((p.backGround||p.geometryModel)?[...base,p.capHeight,p.backGround,p.geometryModel]:base);};
export function familyAuditInventory(surfaces:ShadowSurface[]){
 const groups=new Map<string,{id:string;signature:string;family:string;surface:ShadowSurface;placements:{key:string;x:number;y:number}[]}>();
 for(const p of surfaces){const signature=surfaceAuditSignature(p),placement={key:p.key,x:p.x,y:p.y},existing=groups.get(signature);if(existing)existing.placements.push(placement);else groups.set(signature,{id:'variant:'+groups.size,signature,family:family(p),surface:p,placements:[placement]});}
 return [...groups.values()];
}
export async function supplementalAuditSurfaces(surfaces:ShadowSurface[]){
 const [{slots,calibration},{default:catalog}]=await Promise.all([import('./scene'),import('../world/maps/frozen-frontier-sprites.json')]);
 const result=[...surfaces],atlas=surfaces.find(p=>p.key.startsWith('ff:'))!;
 if(!surfaces.some(p=>p.key.startsWith('ff:foundation:'))){const p=catalog.assets.foundation;result.push({key:'ff:foundation:unused-catalog',source:atlas.source,sourceWidth:atlas.sourceWidth,sourceHeight:atlas.sourceHeight,frame:p.frame,width:p.world[0],height:p.world[1],pivot:p.pivot,ground:p.ground,x:0,y:0,constantHeight:25.3,cast:true});}
 for(const level of [1,2,3]){const file=`/fortress-ui/forge-${level}.webp`,key='forge:'+file;if(result.some(p=>p.key===key))continue;const image=new Image();image.src=file;await image.decode();const s=slots.forge,c=calibration('forge');result.push({key,source:image,sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,x:s.x,y:s.y,width:s.width,height:image.naturalHeight*s.width/image.naturalWidth,pivot:[.5,s.pivot],shear:c.shear,vertical:c.vertical,cast:true});}
 return result;
}
// QA only: uses the production filter, Worker rasterizer and registered geometry.
// No synthetic height is inferred from source RGB. Readback is confined to QA.
export async function auditShadowFamilies(surfaces:ShadowSurface[],offset=0,limit=8,captureGround=false){
 const all=familyAuditInventory(surfaces),variants=all.slice(offset,offset+limit),size=256,app=new Application();await app.init({width:size,height:size,preference:'webgl',antialias:false});app.stop();
 const stage=app.stage.addChild(new Container()),white=document.createElement('canvas');white.width=white.height=1;white.getContext('2d')!.fillStyle='white';white.getContext('2d')!.fillRect(0,0,1,1);const bg=stage.addChild(new Sprite(Texture.from(white)));bg.width=bg.height=size;
 const field=createSceneShadows(stage,()=>{},app.renderer),sheet=document.createElement('canvas');sheet.width=size*3;sheet.height=(size+40)*variants.length;const ctx=sheet.getContext('2d')!,rows:any[]=[],failures:string[]=[];
 const groundSheet=captureGround?document.createElement('canvas'):null;if(groundSheet){groundSheet.width=sheet.width;groundSheet.height=sheet.height;}
 let art:Sprite|null=null;const ownSources=new Map<CanvasImageSource,TextureSource>();
 const readPixels=()=>app.renderer.extract.pixels({target:stage,resolution:1,frame:new Rectangle(0,0,size,size)});
 const heightDiagnostic=new Filter({glProgram:GlProgram.from({name:'audit-receiver-height',preferredFragmentPrecision:'highp',vertex:shadowFilterVertex,fragment:'in vec2 vScreen;out vec4 finalColor;uniform sampler2D uHeight;uniform vec4 uHeightBounds;uniform vec4 uCamera;void main(){vec2 world=(vScreen-uCamera.xy)/uCamera.z,uv=(world-uHeightBounds.xy)/uHeightBounds.zw;finalColor=any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0)))?vec4(0.0):texture(uHeight,uv);}'}),resources:{shadowUniforms:field.filter.resources.shadowUniforms,uHeight:field.filter.resources.uHeight},resolution:1,padding:0});
 const wait=async(before:number)=>{const start=performance.now();while(!field.stats().ready||field.stats().rebuilds<=before){if(field.stats().error)throw Error(field.stats().error);if(performance.now()-start>30000)throw Error('Family audit Worker timeout');await new Promise(r=>setTimeout(r,5));}};
 const render=async(scene:ShadowSurface[],sun:ShadowSun)=>{const before=field.stats().rebuilds;field.setScene(scene);field.setSun(sun);await wait(before);return readPixels();};
 try{for(const [row,entry] of variants.entries()){
  const p=entry.surface,sampled=sampleSurface(p,2),points=sampled.samples;let maxHeight=0;for(const q of points){maxHeight=Math.max(maxHeight,q.z);for(const v of [q.x,q.y,q.z,...q.quad!])if(!Number.isFinite(v))throw Error('Nonfinite geometry '+p.key);}
  art?.destroy({texture:true,textureSource:false});let imageSource=ownSources.get(p.source);if(!imageSource){imageSource=p.source instanceof HTMLCanvasElement?new CanvasSource({resource:p.source}):new ImageSource({resource:p.source as HTMLImageElement});ownSources.set(p.source,imageSource);}const frame=p.frame??[0,0,p.sourceWidth,p.sourceHeight];art=stage.addChild(new Sprite(new Texture({source:imageSource,frame:new Rectangle(...frame as [number,number,number,number])})));art.anchor.set(...p.pivot as [number,number]);art.visible=false;
  const tests=[];
  for(const [column,sun] of suns.entries()){
   let left=sampled.bounds.left,top=sampled.bounds.top,right=sampled.bounds.right,bottom=sampled.bounds.bottom;
   for(const q of points){const x=q.x+sun.dx*q.z,y=q.y+sun.dy*q.z;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
   const zoom=Math.min((size-24)/Math.max(1,right-left),(size-24)/Math.max(1,bottom-top)),ox=12-left*zoom,oy=12-top*zoom;field.place(ox,oy,zoom,size,size);
   art.visible=false;const pixels=await render([p],sun);
   if(groundSheet){const uniforms=field.filter.resources.shadowUniforms.uniforms,previous=uniforms.uHeightBounds;uniforms.uHeightBounds=new Float32Array([-1e6,-1e6,1,1]);const raw=readPixels();uniforms.uHeightBounds=previous;const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(raw.pixels),size,size),0,0);const g=groundSheet.getContext('2d')!;g.drawImage(canvas,column*size,row*(size+40));g.fillStyle='#101820';g.fillRect(column*size,row*(size+40)+size,size,40);g.fillStyle='white';g.font='12px sans-serif';g.fillText(entry.family.slice(0,36),column*size+5,row*(size+40)+size+15);g.fillText('Ground receiver only / original alpha',column*size+5,row*(size+40)+size+31);}
   let dark=0;for(let i=0;i<pixels.pixels.length;i+=4)if(pixels.pixels[i]<250)dark++;
   const f=p.frame??[0,0,p.sourceWidth,p.sourceHeight],sx=p.width/f[2]*(p.flip?-1:1),sy=p.height/f[3]*(p.vertical??1),shear=p.shear??0;art.setFromMatrix(new Matrix(zoom*sx,zoom*sx*shear,0,zoom*sy,ox+zoom*p.x,oy+zoom*(p.y-(p.lift??0))));art.visible=true;const colored=readPixels();art.visible=false;
   const image=document.createElement('canvas');image.width=image.height=size;image.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(colored.pixels),size,size),0,0);
   ctx.drawImage(image,column*size,row*(size+40));ctx.fillStyle='#101820';ctx.fillRect(column*size,row*(size+40)+size,size,40);ctx.fillStyle='white';ctx.font='12px sans-serif';ctx.fillText(entry.family.slice(0,36),column*size+5,row*(size+40)+size+15);ctx.fillText(`${p.flip?'mirrored':'original'} / sun ${column+1} / ${dark} shadow px`,column*size+5,row*(size+40)+size+31);
   if(p.cast===false&&dark)failures.push(entry.id+' excluded caster produced '+dark+' dark pixels');
   const h=Math.min(24,maxHeight*.25),candidate=p.cast===false?null:points.filter(q=>q.alpha>.99&&q.z>h+3).sort((a,b)=>b.z-a.z).find(q=>{const x=q.x+sun.dx*(q.z-h),y=q.y-h+sun.dy*(q.z-h);return x<sampled.bounds.left-Math.max(5,3/zoom)||x>sampled.bounds.right+Math.max(5,3/zoom)||y<sampled.bounds.top-Math.max(5,3/zoom)||y>sampled.bounds.bottom+Math.max(5,3/zoom);});
   let receiver:any={status:p.cast===false?'excluded caster':maxHeight<=3?'no raised geometry':'no unoccluded probe outside source bounds'};
   if(candidate){const q=candidate,x=q.x+sun.dx*(q.z-h),y=q.y-h+sun.dy*(q.z-h),probe=(height:number):ShadowSurface=>({key:'audit-probe',source:white,sourceWidth:1,sourceHeight:1,x,y,width:Math.max(8,8/zoom),height:Math.max(8,8/zoom),pivot:[.5,.5],constantHeight:height,cast:false});
    const minAt=(data:Uint8ClampedArray)=>{const px=Math.round(ox+x*zoom),py=Math.round(oy+y*zoom);let min=255;for(let yy=Math.max(0,py-1);yy<=Math.min(size-1,py+1);yy++)for(let xx=Math.max(0,px-1);xx<=Math.min(size-1,px+1);xx++)min=Math.min(min,data[(yy*size+xx)*4]);return min;};
    const raised=await render([probe(h),p],sun),raisedMin=minAt(raised.pixels),above=await render([probe(maxHeight+8),p],sun),aboveMin=minAt(above.pixels);
    receiver={status:raisedMin<250&&aboveMin>=250?'pass':'needs inspection',height:h,screenProbe:[x,y],raisedMin,aboveMin};if(receiver.status!=='pass')failures.push(entry.id+' receiver sun '+column+' '+JSON.stringify(receiver));
   }
   // Test this real asset as a receiver, even when its own projected shadow
   // stays hidden inside its art bounds. Read the CPU-packed receiver height
   // at an actual GPU pixel, then place an independent caster on that ray.
   await render([{...p,cast:false}],sun);
   heightDiagnostic.resources.uHeight=field.filter.resources.uHeight;stage.filters=[heightDiagnostic];const packed=readPixels().pixels;stage.filters=[field.filter];
   let chosen:{px:number;py:number;x:number;y:number;z:number}|null=null;
   const owner=(k:number)=>packed[k]*16+Math.floor(packed[k+1]/16),height=(k:number)=>((packed[k+1]%16)*256+packed[k+2])*.5;
   for(let pass=0;pass<2&&!chosen;pass++)for(let py=2;py<size-2;py++)for(let px=2;px<size-2;px++){const k=(py*size+px)*4;if(owner(k)!==1||packed[k+3]<200)continue;const z=height(k);if(chosen&&z<=chosen.z)continue;let interior=true;if(!pass)for(let yy=py-1;yy<=py+1;yy++)for(let xx=px-1;xx<=px+1;xx++){const j=(yy*size+xx)*4;if(owner(j)!==1||Math.abs(height(j)-z)>4)interior=false;}if(!interior)continue;const x=Math.fround(Math.fround(px+.5-Math.fround(ox))/Math.fround(zoom)),y=Math.fround(Math.fround(py+.5-Math.fround(oy))/Math.fround(zoom));chosen={px,py,x,y,z};}
   let receive:any={status:'no opaque receiver pixels'};if(!chosen&&points.some(q=>q.receive!==false&&q.alpha>=.5))failures.push(entry.id+' missing expected GPU receiver pixels');
   if(chosen){const q=chosen,external=(z:number):ShadowSurface=>({key:'external-probe-caster',source:white,sourceWidth:1,sourceHeight:1,x:q.x+sun.dx*(q.z-z),y:q.y+q.z+sun.dy*(q.z-z)-z,width:Math.max(8,8/zoom),height:Math.max(8,8/zoom),pivot:[.5,.5],constantHeight:z,cast:true});
    const at=(p:Uint8ClampedArray)=>p[(q.py*size+q.px)*4],high=await render([external(maxHeight+50),{...p,cast:false}],sun),low=await render([external(Math.max(0,q.z-8)),{...p,cast:false}],sun),highRed=at(high.pixels),lowRed=at(low.pixels);
    receive={status:highRed<250&&lowRed>=250?'pass':'needs inspection',receiverHeight:q.z,pixel:[q.px,q.py],highRed,lowRed};if(receive.status!=='pass')failures.push(entry.id+' asset reception sun '+column+' '+JSON.stringify(receive));
   }
   tests.push({sun,darkPixels:dark,cast:p.cast!==false,maxHeight,receiver,receive});
  }
  rows.push({id:entry.id,signature:entry.signature,family:entry.family,key:p.key,placements:entry.placements,width:p.width,height:p.height,flip:!!p.flip,lift:p.lift??0,frame:p.frame,explicitHeight:!!p.heightAtScreen,solidBody:!!p.solidBody,capHeight:p.capHeight,geometryModel:p.geometryModel,tests});
 }
 return {...(groundSheet?{groundImage:groundSheet.toDataURL('image/png')}:{}),offset,totalVariants:all.length,totalPlacements:surfaces.length,rows,failures,image:sheet.toDataURL('image/png'),probeSampling:'GPU packed receiver height at actual rendered pixel; float32 camera reconstruction',scope:'Actual registered static geometry plus explicitly labeled catalog/building fixtures, production GPU filter and Worker; three light vectors. Contact sheets show one representative per distinct geometry variant. Probe cases outside source bounds test visible raised receiving and above-caster rejection.'};
 }finally{heightDiagnostic.destroy();field.destroy();const whiteSource=bg.texture.source;const gl=(app.renderer as any).gl as WebGLRenderingContext;app.destroy({removeView:true,releaseGlobalResources:false},{children:true,texture:true,textureSource:false});whiteSource.destroy();for(const source of ownSources.values())source.destroy();if(!gl.isContextLost())gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
