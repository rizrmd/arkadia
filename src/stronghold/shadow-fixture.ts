import {registerActorShadowSprite} from './shadow-actor-batch';
import {Application,Container,Sprite,Texture,type Renderer} from 'pixi.js';
import {createSceneShadows} from './scene-shadows';
import type {ShadowSurface} from './shadow-surfaces';
// QA only, loaded lazily. Tests the actual GPU filter against an analytically
// positioned alpha opening and receiver plane, rather than checking only counts.
export async function runShadowReceiverFixture(renderer:Renderer){
 const stage=new Container(),white=document.createElement('canvas');white.width=320;white.height=240;const bg=white.getContext('2d')!;bg.fillStyle='#fff';bg.fillRect(0,0,320,240);stage.addChild(new Sprite(Texture.from(white)));
 const receiver=document.createElement('canvas');receiver.width=80;receiver.height=40;const r=receiver.getContext('2d')!;r.fillStyle='#fff';r.fillRect(0,0,80,40);const rv=stage.addChild(new Sprite(Texture.from(receiver)));rv.position.set(100,80);
 const caster=document.createElement('canvas');caster.width=20;caster.height=80;const c=caster.getContext('2d')!;c.fillStyle='#fff';c.fillRect(0,0,20,80);c.clearRect(0,30,12,20);const cv=stage.addChild(new Sprite(Texture.from(caster)));cv.position.set(90,20);
 const field=createSceneShadows(stage,()=>{},renderer);field.place(0,0,1,320,240);
 const casterSurface:ShadowSurface={key:'alpha-opening-caster',source:caster,sourceWidth:20,sourceHeight:80,x:100,y:100,width:20,height:80,pivot:[.5,1],ground:[1]};
 const surface=(height:number):ShadowSurface=>({key:'receiver-plane-'+height,source:receiver,sourceWidth:80,sourceHeight:40,x:140,y:100,width:80,height:40,pivot:[.5,.5],constantHeight:height,cast:false});
 const wait=async()=>{const start=performance.now();while(!field.stats().ready){if(field.stats().error)throw Error(field.stats().error);if(performance.now()-start>20000)throw Error('Receiver fixture worker timeout');await new Promise(resolve=>setTimeout(resolve,10));}};
 const read=async()=>{const result=renderer.extract.pixels({target:stage,resolution:1}),data=result.pixels;return (x:number,y:number)=>Array.from(data.slice((y*320+x)*4,(y*320+x)*4+4));};
 try{
  field.setScene([surface(20),casterSurface]);field.setSun({dx:1,dy:.5,alpha:.5});await wait();let pixel=await read();
  const raisedBlocked=pixel(140,100),alphaHole=pixel(115,90),groundBlocked=pixel(160,130);
  if(raisedBlocked[0]>210||groundBlocked[0]>210)throw Error('GPU failed to shade raised/ground receivers: '+JSON.stringify({raisedBlocked,groundBlocked}));
  if(alphaHole[0]<240)throw Error('GPU filled the original alpha opening: '+JSON.stringify(alphaHole));
  cv.scale.x=-1;cv.position.x=110;field.setScene([surface(20),{...casterSurface,flip:true}]);await wait();pixel=await read();const mirroredHole=pixel(125,90),mirroredSolid=pixel(115,90);if(mirroredHole[0]<240||mirroredSolid[0]>210)throw Error('Mirrored alpha opening misregistered: '+JSON.stringify({mirroredHole,mirroredSolid}));
  field.setScene([surface(100),casterSurface]);await wait();pixel=await read();const aboveCaster=pixel(140,100);if(aboveCaster[0]<240)throw Error('Lower caster incorrectly shaded higher receiver: '+JSON.stringify(aboveCaster));
  field.setScene([surface(20),surface(100),casterSurface]);await wait();pixel=await read();const overlappingHigh=pixel(140,100);if(overlappingHigh[0]<240)throw Error('Receiver painter order lost upper visible surface');
  field.setScene([surface(100),surface(20),casterSurface]);await wait();pixel=await read();const overlappingLow=pixel(140,100);if(overlappingLow[0]>210)throw Error('Receiver painter order lost lower visible surface');
  field.setScene([surface(20),casterSurface]);await wait();stage.filters=[];const actor=stage.addChild(new Sprite(Texture.from(receiver)));actor.position.set(100,80);registerActorShadowSprite(actor,()=>({groundY:120,lift:0,owner:3900}));pixel=await read();const actorReceive=pixel(140,100);if(actorReceive[0]>210)throw Error('Native actor batch did not receive scenery shadow: '+JSON.stringify(actorReceive));
  return {ok:true,overlappingHigh,overlappingLow,actorReceive,raisedBlocked,groundBlocked,alphaHole,mirroredHole,mirroredSolid,aboveCaster,assertions:['GPU raised-object receive','GPU snow-plane receive','original alpha hole preserved','receiver above caster rejected','mirrored original-alpha registration','native actor batch shadow reception','overlapping receiver painter order'],stats:field.stats()};
 }finally{stage.filters=[];field.destroy();stage.destroy({children:true,texture:true,textureSource:true});}
}

// A fixture must not replace receiver providers or batch state on the running game renderer.
export async function runIsolatedShadowReceiverFixture(){const app=new Application();await app.init({width:320,height:240,preference:'webgl',antialias:false});app.stop();try{return await runShadowReceiverFixture(app.renderer);}finally{app.destroy({removeView:true,releaseGlobalResources:false},{children:true});}}
