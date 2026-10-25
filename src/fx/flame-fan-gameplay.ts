import {Container,Matrix,Sprite,Texture} from 'pixi.js';
import {tilePoint} from '../stronghold/terrain';
import {createFlameFanMaterial} from './flame-fan-material';
import type {View} from './space';

/** Low connected sheet under actors. Radius is supplied by combat, never inferred from rank.
 * One small material surface is shared; bounded sprites retain their own texture snapshots. */
export function createGameplayFlameFan(parent:Container,trace?:(x0:number,y0:number,x1:number,y1:number)=>{hit:boolean;x:number;y:number;t:number},occlusionAt?:(px:number,py:number,wx:number,wy:number,rad:number,flat:boolean,includeHero:boolean,anchorY:number)=>number){
 let material:ReturnType<typeof createFlameFanMaterial>|undefined;
 type Sheet={u:number;v:number;yaw:number;radius:number;rank:number;age:number;tick:number;sprite:Sprite;canvas:HTMLCanvasElement;mask:HTMLCanvasElement;clip:Path2D};
 const live:Sheet[]=[],pool:Sheet[]=[];
 const duration=.85;
 function spawn(u:number,v:number,yaw:number,radius:number,rank:number){
  material??=createFlameFanMaterial();
  let s=pool.pop();
  if(!s){const canvas=Object.assign(document.createElement('canvas'),{width:256,height:256});const texture=Texture.from(canvas);texture.source.autoGarbageCollect=false;const sprite=new Sprite(texture);sprite.anchor.set(.5);s={u,v,yaw,radius,rank,age:0,tick:-1,sprite,canvas,mask:Object.assign(document.createElement('canvas'),{width:128,height:128}),clip:new Path2D()};}
  Object.assign(s,{u,v,yaw,radius,rank,age:0,tick:-1});
  // Conservative radial wall clipping. This affects appearance only; authoritative hits keep their exact ray check.
  const clip=new Path2D(),origin=tilePoint(u,v);clip.moveTo(128,128);
  for(let i=0;i<=64;i++){const a=-Math.PI*.3+i*Math.PI*.6/64,end=tilePoint(u+Math.cos(yaw+a)*radius,v+Math.sin(yaw+a)*radius),hit=trace?.(origin.x,origin.y,end.x,end.y),r=hit?.hit?Math.max(0,hit.t-.015):1;clip.lineTo(128+Math.cos(a)*r*128,128-Math.sin(a)*r*128);}
  clip.closePath();s.clip=clip;
  // Cache a ground silhouette mask once per cast. A broad sheet must be hidden per pixel,
  // rather than using the centre-particle occlusion used for small sparks.
  const mask=s.mask.getContext('2d')!,pixels=mask.createImageData(128,128),c=Math.cos(yaw),n=Math.sin(yaw);
  let masked=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const forward=(x+.5-64)/64,lateral=-(y+.5-64)/64,inside=Math.hypot(forward,lateral)<=1&&Math.abs(Math.atan2(lateral,forward))<=Math.PI*.3;
   let alpha=1;
   if(inside&&occlusionAt){const p=tilePoint(u+(forward*c-lateral*n)*radius,v+(forward*n+lateral*c)*radius);alpha=occlusionAt(p.x,p.y,p.x,p.y,0,true,false,p.y);if(alpha<.99)masked++;}
   const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(alpha*255);
  }
  mask.putImageData(pixels,0,0);s.sprite.label=String(masked);
s.sprite.visible=true;parent.addChild(s.sprite);live.push(s);
  // At most three recent casts, including high-rank overlap / scripted replays.
  if(live.length>3){const old=live.shift()!;old.sprite.visible=false;pool.push(old);}
 }
 function frame(dt:number,view:View){
  for(let i=live.length-1;i>=0;i--){const s=live[i];s.age+=dt;
   if(s.age>=duration){s.sprite.visible=false;live.splice(i,1);pool.push(s);continue;}
   const tick=Math.floor(s.age*30);
   if(tick!==s.tick){s.tick=tick;const g=s.canvas.getContext('2d')!;g.clearRect(0,0,256,256);g.save();g.clip(s.clip);g.drawImage(material!.render(s.rank,.42+s.age/duration*2.18),0,0);g.restore();g.globalCompositeOperation='destination-in';g.drawImage(s.mask,0,0,256,256);g.globalCompositeOperation='source-over';s.sprite.texture.source.update();}
   const p=tilePoint(s.u,s.v),c=Math.cos(s.yaw),n=Math.sin(s.yaw),k=s.radius*view.scale/128;
   // Texture +x = aim; texture +y = -lateral (WebGL's bottom-up raster).
   s.sprite.setFromMatrix(new Matrix(64*(c-n)*k,32*(c+n)*k,64*(n+c)*k,32*(n-c)*k,view.x+p.x*view.scale,view.y+p.y*view.scale));
  }
 }
 return {spawn,frame,snapshot:()=>live.map(s=>({u:s.u,v:s.v,yaw:s.yaw,radius:s.radius,rank:s.rank,age:s.age,layers:s.rank,opacity:.34+s.rank*.045,bloom:0,height:0,material:'connected-sheet',maskedSamples:Number(s.sprite.label),projectiles:0}))};
}
