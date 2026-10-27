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
 type Sheet={u:number;v:number;yaw:number;radius:number;rank:number;age:number;tick:number;sprite:Sprite;soil:Sprite;soilCanvas:HTMLCanvasElement;soilBase:HTMLCanvasElement;canvas:HTMLCanvasElement;mask:HTMLCanvasElement;g:CanvasRenderingContext2D;maskCtx:CanvasRenderingContext2D;maskTexture?:Texture;target?:RenderTexture;clip:Path2D;air:{sprite:Sprite;forward:number;lateral:number;width:number;height:number;smoke:boolean;opacity:number}[]};
 const live:Sheet[]=[],pool:Sheet[]=[];
 let preparing:Promise<void>|undefined;
 const soilParts:Record<string,HTMLImageElement>={};
 const soilNames=['crust-a','crust-b','perimeter','fragments','scorch','ash','straight','bend','fork','tee','cross','terminal','low-a','low-b','low-c','ribbon','accent','lick','wisp','puff','bank','billow','ash-puff','ember','spark','coal','char','glow','cinders','smoke-veil-v1','smoke-split-curl-v1'];
 const soilTextures:Record<string,Texture>={};
 const hide=(s:Sheet)=>{s.sprite.visible=false;s.soil.visible=false;for(const a of s.air)a.sprite.visible=false;};
 const soilOpacity=(age:number,rank:number)=>Math.max(0,Math.min(1,((rank>=3?1:duration)-age)/.42));
 function ensureMaterial(){if(native)gpuMaterial??=createFlameFanBurst(renderer!);else material??=createFlameFanBurst();}
 function makeSheet():Sheet{
  const canvas=Object.assign(document.createElement('canvas'),{width:256,height:256}),mask=Object.assign(document.createElement('canvas'),{width:128,height:128});
  const target=gpuMaterial?.createTexture(),texture=target??Texture.from(canvas);texture.source.autoGarbageCollect=false;
  const maskTexture=gpuMaterial?Texture.from(canvas):undefined;if(maskTexture)maskTexture.source.autoGarbageCollect=false;
  const sprite=new Sprite(texture);sprite.anchor.set(.5);
  const soilCanvas=Object.assign(document.createElement('canvas'),{width:1024,height:1024}),soil=new Sprite(Texture.from(soilCanvas));soil.anchor.set(.5);soil.texture.source.autoGarbageCollect=false;
  return {u:0,v:0,yaw:0,radius:1,rank:1,age:0,tick:-1,sprite,soil,soilCanvas,soilBase:Object.assign(document.createElement('canvas'),{width:1024,height:1024}),canvas,mask,g:canvas.getContext('2d')!,maskCtx:mask.getContext('2d')!,maskTexture,target,clip:new Path2D(),air:[]};
 }
 function prepare(){return preparing??=new Promise<void>(resolve=>setTimeout(resolve,0)).then(async()=>{
  ensureMaterial();
  await Promise.all(soilNames.map(async name=>{const image=new Image();image.src=(name.startsWith('smoke-')?'/flame-fan-supplemental/v1/':'/flame-fan-static/')+name+'.png';await image.decode();soilParts[name]=image;soilTextures[name]=Texture.from(image);}));
  if(gpuMaterial){await gpuMaterial.prepare();while(pool.length+live.length<3){const s=makeSheet();gpuMaterial.render(s.target!,s.maskTexture!,1,.1);pool.push(s);await new Promise<void>(resolve=>setTimeout(resolve,0));}}
  else await material!.prepare();
 });}
 const duration=.85;
 function spawn(u:number,v:number,yaw:number,radius:number,rank:number,age=0){
  ensureMaterial();
  let s=pool.pop();
  if(!s&&live.length>=3){s=live.shift()!;hide(s);}
  s??=makeSheet();
  Object.assign(s,{u,v,yaw,radius,rank,age,tick:-1});delete s.soilCanvas.dataset.ready;
  // Conservative radial wall clipping. This affects appearance only; authoritative hits keep their exact ray check.
  const clip=new Path2D(),origin=tilePoint(u,v);clip.moveTo(128,128);
  for(let i=0;i<=64;i++){const a=-Math.PI*.3+i*Math.PI*.6/64,end=tilePoint(u+Math.cos(yaw+a)*radius,v+Math.sin(yaw+a)*radius),hit=trace?.(origin.x,origin.y,end.x,end.y),r=hit?.hit?Math.max(0,hit.t-.015):1;clip.lineTo(128+Math.cos(a)*r*128,128-Math.sin(a)*r*128);}
  clip.closePath();s.clip=clip;
  // Approved static revision-6 soil composition, scaled to combat radius.
  // Ground plates/cracks are baked once; fire, smoke and embers stay upright.
  const base=s.soilBase.getContext('2d')!;base.setTransform(1,0,0,1,0,0);base.clearRect(0,0,1024,1024);base.save();base.scale(4,4);base.clip(clip);
  const stamp=(name:string,x:number,y:number,w:number,h:number,rotation=0,alpha=1)=>{
   const image=soilParts[name];if(!image)return;base.save();base.globalAlpha=alpha;base.translate(x,y);base.rotate(rotation);base.drawImage(image,-w/2,-h/2,w,h);base.restore();
  };
  for(let y=12;y<260;y+=25)for(let x=120;x<270;x+=29)stamp((Math.floor(x/29)+Math.floor(y/25))%3?'crust-a':'crust-b',x,y,53,49,(x*7+y)*.17);
  for(let i=0;i<30;i++){const a=(i*2.399%1.8)-.9,r=20+i*37%106;stamp(['scorch','ash','fragments','perimeter'][i%4],128+Math.cos(a)*r,128-Math.sin(a)*r,24+i%12,28+i%10,i*.83,.7);}
  for(let lane=-2;lane<=2;lane++){
   const a=lane*.29;
   for(let r=16;r<124;r+=20){const x=128+Math.cos(a)*r,y=128-Math.sin(a)*r;stamp('straight',x,y,27,11,-a,.94);if(r>35)stamp(['fork','tee','cross'][Math.abs(lane+Math.floor(r/20))%3],x,y,18,17,-a,.9);}
   stamp('terminal',128+Math.cos(a)*122,128-Math.sin(a)*122,17,10,-a,.9);
  }
  for(let r=42;r<120;r+=28)for(let a=-.64;a<.7;a+=.31)stamp('bend',128+Math.cos(a)*r,128-Math.sin(a)*r,23,15,-a-1,.85);
  for(let j=0;j<26;j++){const a=(j*2.399%1.8)-.9,r=18+j*29%106;stamp(j%2?'coal':'char',128+Math.cos(a)*r,128-Math.sin(a)*r,7+j%5,6+j%5,j*.67,.9);}
  base.restore();
  for(const a of s.air)a.sprite.visible=false;
  let airIndex=0;
  const upright=(name:string,r:number,a:number,w:number,h:number,opacity:number)=>{
   if(!soilTextures[name])return;
   let site=s.air[airIndex++];
   if(!site){const sprite=new Sprite();sprite.anchor.set(.5,1);site={sprite,forward:0,lateral:0,width:0,height:0,smoke:false,opacity:1};s.air.push(site);}
   site.sprite.texture=soilTextures[name];site.sprite.label=name;
   Object.assign(site,{forward:Math.cos(a)*r,lateral:Math.sin(a)*r,width:w,height:h,smoke:name.startsWith('smoke-')||['wisp','puff','bank','billow','ash-puff'].includes(name),opacity});
   site.sprite.visible=true;parent.addChild(site.sprite);
  };
  // Broken overlapping low seams retain dark plate gaps and the approved source tongues.
  for(let lane=0;lane<5;lane++)for(let j=0;j<5;j++){
   const a=-.58+lane*.29+Math.sin(j*2+lane)*.06,r=.18+j*.165;
   upright(j%3===0?'ribbon':['low-a','low-b','low-c'][(j+lane)%3],r,a,.22,.055+.012*((j+lane)%3),.9);
   if(j%3===1)upright(j%2?'lick':'accent',r+.02,a+.02,.055,.10,.88);
  }
  for(let j=0;j<10;j++)upright(['smoke-veil-v1','wisp','puff','bank','billow','ash-puff','smoke-split-curl-v1'][j%7],.28+j*.065,(j*2.399%1.4)-.7,.14+j%3*.035,.08+j%4*.025,.34);
  for(let j=0;j<13;j++)upright('cinders',.23+j*.054,(j*2.399%1.4)-.7,.10,.07,.72);
  for(let j=0;j<9;j++)upright(j%2?'ember':'spark',.35+j*.066,(j*2.399%1.4)-.7,.022,.045,.92);
  for(let j=0;j<5;j++)upright('glow',.25+j*.15,-.55+j*.27,.12,.025,.16);
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
s.sprite.visible=true;s.soil.visible=true;parent.addChildAt(s.soil,0);parent.addChild(s.sprite);live.push(s);
  // At most three recent casts, including high-rank overlap / scripted replays.
  if(live.length>3){const old=live.shift()!;hide(old);pool.push(old);}
 }
 function frame(dt:number,view:View){
  for(let i=live.length-1;i>=0;i--){const s=live[i];s.age+=dt;
   if(s.age>=(s.rank>=3?1:duration)){hide(s);live.splice(i,1);pool.push(s);continue;}
   s.sprite.visible=s.age<duration;
   // Keep the cached combat sector, wall clipping and ground projection fixed;
   // Retain readable plates through the burst, then continuously fade to the existing expiry.
   s.soil.alpha=soilOpacity(s.age,s.rank);
   const tick=Math.floor(s.age*30);
   if(tick!==s.tick){s.tick=tick;
    // The approved ground raster is static; only masking changes per cast.
    // Avoid uploading an unchanged soil canvas every frame.
    if(!s.soilCanvas.dataset.ready){
     const g=s.soilCanvas.getContext('2d')!;g.clearRect(0,0,1024,1024);g.drawImage(s.soilBase,0,0);
     g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,1024,1024);g.globalCompositeOperation='source-over';s.soil.texture.source.update();s.soilCanvas.dataset.ready='1';
    }
    if(gpuMaterial)gpuMaterial.render(s.target!,s.maskTexture!,s.rank,Math.max(0,s.age));
    else{const g=s.g;g.clearRect(0,0,256,256);g.save();g.clip(s.clip);g.drawImage(material!.renderCanvas(s.rank,Math.max(0,s.age)),0,0);g.restore();g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,256,256);g.globalCompositeOperation='source-over';s.sprite.texture.source.update();}
   }
   const p=tilePoint(s.u,s.v),c=Math.cos(s.yaw),n=Math.sin(s.yaw),k=s.radius*view.scale/128;
   // Texture +x = aim; texture +y = -lateral (WebGL's bottom-up raster).
   const transform=new Matrix(64*(c-n)*k,32*(c+n)*k,64*(n+c)*k,32*(n-c)*k,view.x+p.x*view.scale,view.y+p.y*view.scale);s.sprite.setFromMatrix(transform);s.soil.setFromMatrix(new Matrix(transform.a/4,transform.b/4,transform.c/4,transform.d/4,transform.tx,transform.ty));
   for(const a of s.air){if(!a.sprite.visible)continue;
    const f=a.forward,l=a.lateral,wu=s.u+(f*c-l*n)*s.radius,wv=s.v+(f*n+l*c)*s.radius,foot=tilePoint(wu,wv);
    const end=trace?.(p.x,p.y,foot.x,foot.y),visible=!end?.hit;
    const flicker=a.smoke?1: .88+.12*Math.sin(s.age*25+f*18+l*9);
    const lift=a.smoke?s.age*9*s.radius: a.sprite.label==='ember'||a.sprite.label==='spark'?5+s.age*12:0;
    a.sprite.position.set(view.x+foot.x*view.scale,view.y+(foot.y-lift)*view.scale);
    a.sprite.width=a.width*64*s.radius*view.scale;a.sprite.height=a.height*64*s.radius*view.scale*(a.smoke?1+s.age*.3:flicker);
    a.sprite.alpha=visible?s.soil.alpha*a.opacity*(occlusionAt?.(foot.x,foot.y-lift,foot.x,foot.y,0,false,false,foot.y)??1):0;
   }
  }
 }
 return {prepare,spawn,frame,clear(){for(const s of live){hide(s);pool.push(s);}live.length=0;},snapshot:()=>live.map(s=>({u:s.u,v:s.v,yaw:s.yaw,radius:s.radius,rank:s.rank,age:s.age,layers:s.rank,opacity:burstEnvelope(s.age).alpha,bloom:0,height:0,burnSoil:s.rank>=3&&s.age<1,burnDurationMs:s.rank>=3?1000:0,burnOpacity:s.rank>=3?s.soil.alpha:0,soilOpacity:s.soil.alpha,soilVisible:s.soil.visible,soilLayers:soilNames,soilUpright:s.air.filter(a=>a.sprite.visible).length,burnHalfAngle:Math.PI*.3,soilRaster:1024,soilSource:'approved-static-revision-6',material:'approved-projecting-burst-v1',asset:FLAME_FAN_BURST_ASSET,burstReach:burstEnvelope(s.age).reach,burstOpacity:burstEnvelope(s.age).alpha,backend:native?'pixi-render-texture':'canvas',maskedSamples:Number(s.sprite.label),projectiles:0}))};
}
