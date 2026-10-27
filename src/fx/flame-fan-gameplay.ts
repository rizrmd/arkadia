import {Container,Matrix,RendererType,Sprite,Texture,type Renderer,type RenderTexture,type WebGLRenderer} from 'pixi.js';
import {tilePoint} from '../stronghold/terrain';
import {createFlameFanBurst,FLAME_FAN_BURST_ASSET,burstEnvelope} from './flame-fan-burst';
import type {View} from './space';

/** Approved projecting burst under actors. Radius is supplied by combat, never inferred from rank.
 * One material pass is shared; bounded sprites retain render textures on WebGL2. */
export function createGameplayFlameFan(parent:Container,trace?:(x0:number,y0:number,x1:number,y1:number)=>{hit:boolean;x:number;y:number;t:number},occlusionAt?:(px:number,py:number,wx:number,wy:number,rad:number,flat:boolean,includeHero:boolean,anchorY:number)=>number,renderer?:Renderer){
 let material:ReturnType<typeof createFlameFanBurst>|undefined;
 let gpuMaterial:ReturnType<typeof createFlameFanBurst>|undefined;
 const native=renderer?.type===RendererType.WEBGL&&typeof WebGL2RenderingContext!=='undefined'&&(renderer as WebGLRenderer).gl instanceof WebGL2RenderingContext;
 type Sheet={u:number;v:number;yaw:number;radius:number;rank:number;age:number;tick:number;sprite:Sprite;soil:Sprite;soilCanvas:HTMLCanvasElement;soilBase:HTMLCanvasElement;canvas:HTMLCanvasElement;mask:HTMLCanvasElement;g:CanvasRenderingContext2D;maskCtx:CanvasRenderingContext2D;maskTexture?:Texture;target?:RenderTexture;clip:Path2D};
 const live:Sheet[]=[],pool:Sheet[]=[];
 let preparing:Promise<void>|undefined;
 const soilParts:Record<string,HTMLImageElement>={};
 const soilNames=['crust-a','crust-b','straight','coal'];
 function ensureMaterial(){if(native)gpuMaterial??=createFlameFanBurst(renderer!);else material??=createFlameFanBurst();}
 function makeSheet():Sheet{
  const canvas=Object.assign(document.createElement('canvas'),{width:256,height:256}),mask=Object.assign(document.createElement('canvas'),{width:128,height:128});
  const target=gpuMaterial?.createTexture(),texture=target??Texture.from(canvas);texture.source.autoGarbageCollect=false;
  const maskTexture=gpuMaterial?Texture.from(canvas):undefined;if(maskTexture)maskTexture.source.autoGarbageCollect=false;
  const sprite=new Sprite(texture);sprite.anchor.set(.5);
  const soilCanvas=Object.assign(document.createElement('canvas'),{width:256,height:256}),soil=new Sprite(Texture.from(soilCanvas));soil.anchor.set(.5);soil.texture.source.autoGarbageCollect=false;
  return {u:0,v:0,yaw:0,radius:1,rank:1,age:0,tick:-1,sprite,soil,soilCanvas,soilBase:Object.assign(document.createElement('canvas'),{width:256,height:256}),canvas,mask,g:canvas.getContext('2d')!,maskCtx:mask.getContext('2d')!,maskTexture,target,clip:new Path2D()};
 }
 function prepare(){return preparing??=new Promise<void>(resolve=>setTimeout(resolve,0)).then(async()=>{
  ensureMaterial();
  await Promise.all(soilNames.map(async name=>{const image=new Image();image.src='/flame-fan-static/'+name+'.png';await image.decode();soilParts[name]=image;}));
  if(gpuMaterial){await gpuMaterial.prepare();while(pool.length+live.length<3){const s=makeSheet();gpuMaterial.render(s.target!,s.maskTexture!,1,.1);pool.push(s);await new Promise<void>(resolve=>setTimeout(resolve,0));}}
  else await material!.prepare();
 });}
 const duration=.85;
 function spawn(u:number,v:number,yaw:number,radius:number,rank:number,age=0){
  ensureMaterial();
  let s=pool.pop();
  if(!s&&live.length>=3){s=live.shift()!;s.sprite.visible=false;s.soil.visible=false;}
  s??=makeSheet();
  Object.assign(s,{u,v,yaw,radius,rank,age,tick:-1});
  // Conservative radial wall clipping. This affects appearance only; authoritative hits keep their exact ray check.
  const clip=new Path2D(),origin=tilePoint(u,v);clip.moveTo(128,128);
  for(let i=0;i<=64;i++){const a=-Math.PI*.3+i*Math.PI*.6/64,end=tilePoint(u+Math.cos(yaw+a)*radius,v+Math.sin(yaw+a)*radius),hit=trace?.(origin.x,origin.y,end.x,end.y),r=hit?.hit?Math.max(0,hit.t-.015):1;clip.lineTo(128+Math.cos(a)*r*128,128-Math.sin(a)*r*128);}
  clip.closePath();s.clip=clip;
  // Reuse approved revision-6 soil crops, clipped to the authoritative sector.
  // Bake the crust/fissures once; the retained coal/flame animation stays separate.
  const base=s.soilBase.getContext('2d')!;base.clearRect(0,0,256,256);base.save();base.clip(clip);
  base.fillStyle='rgba(32,16,11,.48)';base.fillRect(0,0,256,256);
  if(soilParts['crust-a']){
   base.globalAlpha=.88;
   for(let y=8;y<272;y+=48)for(let x=124;x<280;x+=48)base.drawImage(soilParts[(x+y)%96===36?'crust-a':'crust-b'],x-28,y-28,76,70);
   base.globalAlpha=.9;
   for(let lane=-2;lane<=2;lane++)for(let r=25;r<128;r+=25){const a=lane*.31,x=128+Math.cos(a)*r,y=128-Math.sin(a)*r;base.save();base.translate(x,y);base.rotate(-a);base.drawImage(soilParts.straight,-22,-10,44,20);base.restore();}
   for(let j=0;j<24;j++){const a=(j*2.399%1.8)-.9,r=22+j*29%100;base.drawImage(soilParts.coal,128+Math.cos(a)*r-4,128-Math.sin(a)*r-4,8,8);}
  }
  base.restore();
  // Cache a ground silhouette mask once per cast. A broad sheet must be hidden per pixel,
  // rather than using the centre-particle occlusion used for small sparks.
  const mask=s.maskCtx,pixels=mask.createImageData(128,128),c=Math.cos(yaw),n=Math.sin(yaw);
  let masked=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const forward=(x+.5-64)/64,lateral=-(y+.5-64)/64,inside=Math.hypot(forward,lateral)<=1&&Math.abs(Math.atan2(lateral,forward))<=Math.PI*.3;
   let alpha=1;
   if(inside&&occlusionAt){const p=tilePoint(u+(forward*c-lateral*n)*radius,v+(forward*n+lateral*c)*radius);alpha=occlusionAt(p.x,p.y,p.x,p.y,0,true,false,p.y);if(alpha<.99)masked++;}
   const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(alpha*255);
  }
  mask.putImageData(pixels,0,0);s.sprite.label=String(masked);
  if(gpuMaterial){const g=s.g;g.clearRect(0,0,256,256);g.save();g.clip(s.clip);g.fillStyle='white';g.fillRect(0,0,256,256);g.restore();g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,256,256);g.globalCompositeOperation='source-over';s.maskTexture!.source.update();}
s.sprite.visible=true;s.soil.visible=rank>=3;parent.addChild(s.soil,s.sprite);live.push(s);
  // At most three recent casts, including high-rank overlap / scripted replays.
  if(live.length>3){const old=live.shift()!;old.sprite.visible=false;old.soil.visible=false;pool.push(old);}
 }
 function frame(dt:number,view:View){
  for(let i=live.length-1;i>=0;i--){const s=live[i];s.age+=dt;
   if(s.age>=(s.rank>=3?1:duration)){s.sprite.visible=false;s.soil.visible=false;live.splice(i,1);pool.push(s);continue;}
   s.sprite.visible=s.age<duration;
   // Keep the cached combat sector, wall clipping and ground projection fixed;
   // fade the entire soil layer continuously through its one-second lifetime.
   s.soil.alpha=Math.max(0,1-s.age);
   const tick=Math.floor(s.age*30);
   if(tick!==s.tick){s.tick=tick;
    if(s.rank>=3){
     const g=s.soilCanvas.getContext('2d')!;g.clearRect(0,0,256,256);g.save();g.clip(s.clip);
     g.drawImage(s.soilBase,0,0);
     for(let j=0;j<55;j++){const a=((j*2.399)%1.88)-.94,r=22+(j*31%100),x=128+Math.cos(a)*r,y=128-Math.sin(a)*r;
      g.fillStyle=`rgba(255,${80+j%70},16,${.4+.25*Math.sin(s.age*24+j)})`;g.beginPath();g.ellipse(x,y,2+j%3,1+j%2,0,0,Math.PI*2);g.fill();
      g.strokeStyle=g.fillStyle;g.lineWidth=1.5;g.beginPath();g.moveTo(x-2,y);g.bezierCurveTo(x+5,y-3,x-3,y-6-j%4,x+Math.sin(s.age*28+j)*2,y-8-j%5);g.stroke();}
     g.restore();g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,256,256);g.globalCompositeOperation='source-over';s.soil.texture.source.update();
    }
    if(gpuMaterial)gpuMaterial.render(s.target!,s.maskTexture!,s.rank,Math.max(0,s.age));
    else{const g=s.g;g.clearRect(0,0,256,256);g.save();g.clip(s.clip);g.drawImage(material!.renderCanvas(s.rank,Math.max(0,s.age)),0,0);g.restore();g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,256,256);g.globalCompositeOperation='source-over';s.sprite.texture.source.update();}
   }
   const p=tilePoint(s.u,s.v),c=Math.cos(s.yaw),n=Math.sin(s.yaw),k=s.radius*view.scale/128;
   // Texture +x = aim; texture +y = -lateral (WebGL's bottom-up raster).
   const transform=new Matrix(64*(c-n)*k,32*(c+n)*k,64*(n+c)*k,32*(n-c)*k,view.x+p.x*view.scale,view.y+p.y*view.scale);s.sprite.setFromMatrix(transform);s.soil.setFromMatrix(transform);
  }
 }
 return {prepare,spawn,frame,clear(){for(const s of live){s.sprite.visible=false;s.soil.visible=false;pool.push(s);}live.length=0;},snapshot:()=>live.map(s=>({u:s.u,v:s.v,yaw:s.yaw,radius:s.radius,rank:s.rank,age:s.age,layers:s.rank,opacity:burstEnvelope(s.age).alpha,bloom:0,height:0,burnSoil:s.rank>=3&&s.age<1,burnDurationMs:s.rank>=3?1000:0,burnOpacity:s.soil.alpha,burnHalfAngle:Math.PI*.3,soilSource:'approved-static-revision-6',material:'approved-projecting-burst-v1',asset:FLAME_FAN_BURST_ASSET,burstReach:burstEnvelope(s.age).reach,burstOpacity:burstEnvelope(s.age).alpha,backend:native?'pixi-render-texture':'canvas',maskedSamples:Number(s.sprite.label),projectiles:0}))};
}
