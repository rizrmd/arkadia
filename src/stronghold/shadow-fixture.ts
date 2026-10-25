import {registerActorShadowSprite} from './shadow-actor-batch';
import {Application,Container,Sprite,Texture,Filter,GlProgram,type Renderer} from 'pixi.js';
import {createSceneShadows,shadowFilterVertex} from './scene-shadows';
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
  const translucent=document.createElement('canvas');translucent.width=translucent.height=1;translucent.getContext('2d')!.fillStyle='rgba(255,255,255,.2)';translucent.getContext('2d')!.fillRect(0,0,1,1);
  const upper:ShadowSurface={key:'partial-upper',source:translucent,sourceWidth:1,sourceHeight:1,x:80,y:50,width:20,height:20,pivot:[.5,.5],constantHeight:80};
  const lower:ShadowSurface={key:'opaque-lower',source:receiver,sourceWidth:80,sourceHeight:40,x:120,y:110,width:20,height:20,pivot:[.5,.5],constantHeight:40};
  field.setScene([upper]);await wait();pixel=await read();const partialOnly=pixel(160,170);if(partialOnly[0]<220||partialOnly[0]>245)throw Error('Partial source alpha was hardened');
  field.setScene([lower,upper]);await wait();pixel=await read();const partialOverOpaque=pixel(160,170);if(partialOverOpaque[0]>210)throw Error('Partial upper caster hid opaque lower caster');
  field.setScene([lower,upper,{...lower,key:'above-lower',x:100,y:80,constantHeight:60,cast:false}]);await wait();pixel=await read();const aboveOpaquePartial=pixel(100,80);if(aboveOpaquePartial[0]<220||aboveOpaquePartial[0]>245)throw Error('Lower opaque caster shaded receiver above it');
  // Sweep all alpha bytes and packed-byte boundaries through the production
  // texture upload. Canvas2D silently damages RGB on partial-alpha texels.
  const packedSource=field.filter.resources.uDepth,saved={resource:packedSource.resource,width:packedSource.width,height:packedSource.height};
  const packed=new Uint8ClampedArray(256*16*4);for(let k=0;k<4096;k++)packed.set([(k>>4)&255,k&255,(k*73)&255,k&255],k*4);
  const lossy=document.createElement('canvas');lossy.width=256;lossy.height=16;const lc=lossy.getContext('2d')!;lc.putImageData(new ImageData(packed,256,16),0,0);const oldBytes=lc.getImageData(0,0,256,16).data;let oldCanvasCorruptedBytes=0;for(let k=0;k<packed.length;k++)if(k%4!==3&&packed[k]!==oldBytes[k])oldCanvasCorruptedBytes++;if(!oldCanvasCorruptedBytes)throw Error('Canvas corruption regression control did not reproduce');
  packedSource.resource=packed;packedSource.resize(256,16);packedSource.update();
  const probe=new Filter({glProgram:GlProgram.from({name:'packed-shadow-byte-regression',vertex:shadowFilterVertex,fragment:'in vec2 vScreen;out vec4 finalColor;uniform sampler2D uPacked;uniform float uAlpha;void main(){ivec2 p=ivec2(vScreen);vec4 d=p.x<256&&p.y<16?texture(uPacked,(vec2(p)+.5)/vec2(256.0,16.0)):vec4(0.0);finalColor=vec4(uAlpha>.5?d.aaa:d.rgb,1.0);}'}),resources:{uPacked:packedSource,probeUniforms:{uAlpha:{value:0,type:'f32'}}}});
  let packedByteChecks=0;try{stage.filters=[probe];for(const mode of [0,1]){probe.resources.probeUniforms.uniforms.uAlpha=mode;const capture=renderer.extract.pixels({target:stage,resolution:1});const bytes=capture.pixels;for(let y=0;y<16;y++)for(let x=0;x<256;x++)for(let c=0;c<3;c++){const expected=packed[(y*256+x)*4+(mode?3:c)],actual=bytes[(y*320+x)*4+c];if(actual!==expected)throw Error('Packed shadow GPU byte changed: '+JSON.stringify({x,y,c,mode,expected,actual}));packedByteChecks++;}}}finally{stage.filters=[field.filter];packedSource.resource=saved.resource;packedSource.resize(saved.width,saved.height);packedSource.update();probe.destroy();}
  field.setScene([surface(20),casterSurface]);await wait();stage.filters=[];const actor=stage.addChild(new Sprite(Texture.from(receiver)));actor.position.set(100,80);registerActorShadowSprite(actor,()=>({groundY:120,lift:0,owner:3900}));pixel=await read();const actorReceive=pixel(140,100);if(actorReceive[0]>210)throw Error('Native actor batch did not receive scenery shadow: '+JSON.stringify(actorReceive));
  return {ok:true,oldCanvasCorruptedBytes,packedByteChecks,partialOnly,partialOverOpaque,aboveOpaquePartial,overlappingHigh,overlappingLow,actorReceive,raisedBlocked,groundBlocked,alphaHole,mirroredHole,mirroredSolid,aboveCaster,assertions:['GPU raised-object receive','GPU snow-plane receive','original alpha hole preserved','receiver above caster rejected','mirrored original-alpha registration','native actor batch shadow reception','overlapping receiver painter order','partial alpha above opaque caster preserves occlusion','receiver above lower opaque caster retains partial alpha'],stats:field.stats()};
 }finally{stage.filters=[];field.destroy();stage.destroy({children:true,texture:true,textureSource:true});}
}

// A fixture must not replace receiver providers or batch state on the running game renderer.
export async function runIsolatedShadowReceiverFixture(){const app=new Application();await app.init({width:320,height:240,preference:'webgl',antialias:false});app.stop();try{return await runShadowReceiverFixture(app.renderer);}finally{app.destroy({removeView:true,releaseGlobalResources:false},{children:true});}}
