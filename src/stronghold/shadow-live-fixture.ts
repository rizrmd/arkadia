import {Application,Container,Sprite,Texture,NineSliceSprite} from 'pixi.js';
import {createLiveShadowField} from './shadow-live-field';
import {createSceneShadows} from './scene-shadows';
import {registerActorShadowSprite,publishActorShadowFrame,actorAnchorForSprite} from './shadow-actor-sources';
import type {ShadowSurface} from './shadow-surfaces';
// QA readbacks only. Production live casting never reads pixels back to the CPU.
export async function runLiveShadowFixture(){
 const app=new Application();await app.init({width:320,height:240,preference:'webgl',antialias:false});
 app.stop();
 const tile=document.createElement('canvas');tile.width=tile.height=12;tile.getContext('2d')!.fillStyle='white';tile.getContext('2d')!.fillRect(0,0,12,12);const nine=app.stage.addChild(new NineSliceSprite({texture:Texture.from(tile),leftWidth:2,rightWidth:2,topHeight:2,bottomHeight:2,width:30,height:30}));nine.blendMode='add';const survivor=app.stage.addChild(new Sprite(Texture.from(tile)));app.renderer.render(app.stage);nine.visible=false;app.renderer.render(app.stage);(nine as any)._gpuData[app.renderer.uid]._batcher.begin();const temporary=new Application();await temporary.init({width:16,height:16,preference:'webgl'});temporary.stop();temporary.destroy({removeView:true,releaseGlobalResources:false},{children:true});nine.width=40;(app.renderer.renderPipes as any).nineSliceSprite.validateRenderable(nine);app.stage.renderGroup!.structureDidChange=true;app.renderer.render(app.stage);nine.visible=true;app.renderer.render(app.stage);const shown=app.renderer.extract.pixels({target:app.stage});if(!shown.pixels.some((v,i)=>i%4===3&&v>0))throw Error('Retired batch rebuild lost visible nine-slice');nine.destroy();survivor.destroy({texture:true,textureSource:true});
 const root=app.stage,stage=root.addChild(new Container()),white=document.createElement('canvas');white.width=320;white.height=240;white.getContext('2d')!.fillStyle='white';white.getContext('2d')!.fillRect(0,0,320,240);stage.addChild(new Sprite(Texture.from(white)));
 const caster=document.createElement('canvas');caster.width=20;caster.height=80;const c=caster.getContext('2d')!;c.fillStyle='white';c.fillRect(0,0,20,80);c.clearRect(0,30,12,20);
 const actor=root.addChild(new Sprite(Texture.from(caster)));actor.position.set(-500,-500);registerActorShadowSprite(actor,()=>({groundX:100,groundY:100,lift:0}));
 const publish=(revision:number,flip=false,depthSpan=0)=>publishActorShadowFrame(actor,{source:caster,frame:[0,0,20,80],width:20,height:80,pivot:[.5,1],flip,revision,depthSpan});publish(1);
 const receiver=document.createElement('canvas');receiver.width=80;receiver.height=40;receiver.getContext('2d')!.fillStyle='white';receiver.getContext('2d')!.fillRect(0,0,80,40);
 const surface=(h:number):ShadowSurface=>({key:'receiver-'+h,source:receiver,sourceWidth:80,sourceHeight:40,x:140,y:100,width:80,height:40,pivot:[.5,.5],constantHeight:h,cast:false});
 let destroyed=false;const field=createSceneShadows(stage,()=>{},app.renderer,root);field.place(0,0,1,320,240);field.setSun({dx:1,dy:.5,alpha:.5});
 const wait=async()=>{const start=performance.now();while(!field.stats().ready){if(field.stats().error)throw Error(field.stats().error);if(performance.now()-start>20000)throw Error('Live receiver fixture worker timeout');await new Promise(r=>setTimeout(r,10));}};
 const read=()=>{app.renderer.render(root);const {pixels,width}=app.renderer.extract.pixels({target:stage,resolution:1});return (x:number,y:number)=>Array.from(pixels.slice((y*width+x)*4,(y*width+x)*4+4));};
 const checks:Record<string,number[]>={};const expect=(name:string,p:number[],dark:boolean)=>{checks[name]=p;if(dark?p[0]>210:p[0]<240)throw Error(name+': '+JSON.stringify(p));};
 try{
  field.setScene([surface(20)]);await wait();let p=read();expect('actor casts on raised receiver',p(140,100),true);expect('actor casts on ground',p(160,130),true);expect('original alpha opening',p(115,90),false);
  publish(2,true);p=read();expect('same-frame mirror hole',p(125,90),false);expect('same-frame mirror solid',p(115,90),true);
  c.fillRect(0,0,20,80);publish(3);p=read();expect('same-frame animation fills former hole',p(115,90),true);
  field.setScene([surface(100)]);await wait();p=read();expect('receiver above actor stays lit',p(140,100),false);
  // A second owner behind the first proves depth peeling. With the front owner
  // as receiver owner, the shared sampler must still see this rear caster.
  const other=root.addChild(new Sprite(Texture.from(receiver)));other.position.set(-500,-500);registerActorShadowSprite(other,()=>({groundX:100,groundY:105,lift:10}));publishActorShadowFrame(other,{source:caster,frame:[0,0,20,80],width:20,height:80,pivot:[.5,1],flip:false,revision:1,depthSpan:0});
  field.setScene([surface(20)]);await wait();p=read();expect('overlapping actors remain opaque',p(140,100),true);
  actor.visible=false;other.visible=false;field.setDynamic([{key:'gateway-frame:0',source:caster,sourceWidth:20,sourceHeight:80,x:100,y:100,width:20,height:80,pivot:[.5,1],ground:[1]}]);p=read();expect('gateway mesh casts on raised receiver',p(140,100),true);
  field.setDynamic([]);p=read();expect('removed dynamic caster leaves no stale shadow',p(140,100),false);
  field.setScene([{key:'static-caster',source:caster,sourceWidth:20,sourceHeight:80,x:100,y:100,width:20,height:80,pivot:[.5,1],ground:[1]}]);await wait();
  const gate:ShadowSurface={key:'gate-receiver:0',source:receiver,sourceWidth:80,sourceHeight:40,x:140,y:100,width:80,height:40,pivot:[.5,.5],ground:[1]};field.setDynamic([gate]);p=read();expect('gateway receives static caster',p(140,100),true);
  field.setDynamic([{...gate,key:'gate-above-caster',constantHeight:100}]);p=read();expect('gateway above caster stays lit',p(140,100),false);field.setDynamic([]);actor.visible=true;other.visible=true;
  field.setScene([]);field.setSun({dx:1,dy:.01,alpha:.5});publish(4,false,9);await wait();p=read();let dark=0;for(let y=90;y<120;y++)for(let x=90;x<190;x++)if(p(x,y)[0]<210)dark++;if(dark<20)throw Error('Near-horizontal sun collapsed body proxy: '+dark);
  const dynamic=field.stats().dynamic;field.destroy();destroyed=true;
  publish(5,false,0);const raw=createLiveShadowField(app.renderer,root);raw.setSun({dx:1,dy:.5,alpha:.5});raw.renderNow();const b=raw.bounds(),readPacked=(source:typeof raw.primary,x=155,y=130)=>{const t=new Texture({source}),r=app.renderer.extract.pixels(t),i=(Math.floor((y-b[1])/1.25)*r.width+Math.floor((x-b[0])/1.25))*4,p=Array.from(r.pixels.slice(i,i+4));t.destroy();return p[0]*16+Math.floor(p[1]/16);};const primaryOwner=readPacked(raw.primary),secondOwner=readPacked(raw.second);if(primaryOwner!==actorAnchorForSprite(actor)!().owner||secondOwner!==actorAnchorForSprite(other)!().owner)throw Error('Distinct-owner depth peeling failed '+JSON.stringify({primaryOwner,secondOwner}));
  c.clearRect(0,30,12,20);publish(6);c.fillRect(0,0,20,80);publishActorShadowFrame(other,{source:caster,frame:[0,0,20,80],width:20,height:80,pivot:[.5,1],flip:false,revision:2,depthSpan:0});raw.renderNow();const sharedCanvasOwner=readPacked(raw.primary,135,120);raw.destroy();if(sharedCanvasOwner!==actorAnchorForSprite(other)!().owner)throw Error('Shared body canvas overwrote an earlier actor frame');
  return {ok:true,rendererIsolation:true,retirementFaultInjected:true,checks,primaryOwner,secondOwner,sharedCanvasOwner,nearHorizontalShadowPixels:dark,dynamic,scope:'Actual Pixi WebGL casts/receivers; software GPU. Runtime has no readback.'};
 }finally{if(!destroyed)field.destroy();app.destroy({removeView:true,releaseGlobalResources:false},{children:true,texture:true,textureSource:true});}
}
