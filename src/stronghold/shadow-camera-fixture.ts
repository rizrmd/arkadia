import {Application,CanvasSource,Texture,Sprite,Container,Rectangle,BufferImageSource} from 'pixi.js';
import {createLiveShadowField} from './shadow-live-field';
import {registerActorShadowSprite,publishActorShadowFrame,actorAnchorForSprite,actorHeightTile,type ActorShadowFrame,type ActorSkinnedPose} from './shadow-actor-sources';
import {packedProbe} from './shadow-packed-probe';
import {installActorShadowReceivers} from './shadow-actor-batch';
/** Two coincident color silhouettes at different physical heights must retain independent receiver data. */
export async function runActorCameraFixture(){
 const app=new Application();await app.init({width:200,height:200,preference:'webgl',antialias:false});app.stop();
 const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const pose:ActorSkinnedPose={geometry:{key:'camera-overlap',positions:new Float32Array([-10,0,0,10,0,0,10,60,0,-10,60,0]),joints:new Float32Array(16),weights:new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]),indices:new Uint32Array([0,1,2,0,2,3]),bindMatrix:identity()},bindInverse:identity(),bones:identity(),model:identity(),camera:new Float32Array([.02,0,0,0,0,.02,0,0,0,0,.01,0,0,-1,0,1]),heightScale:1,heightRange:[0,60]};
 const actors=[0,20].map(lift=>{const stage=app.stage.addChild(new Container()),canvas=document.createElement('canvas');canvas.width=canvas.height=100;canvas.getContext('2d')!.fillRect(40,40,20,60);const source=new CanvasSource({resource:canvas,scaleMode:'linear'}),texture=new Texture({source}),sprite=stage.addChild(new Sprite(texture)),anchor={groundX:100,groundY:100+lift,lift};sprite.position.set(100,100);sprite.anchor.set(.5,1);registerActorShadowSprite(sprite,()=>anchor);return {stage,canvas,source,texture,sprite,anchor};});
 const live=createLiveShadowField(app.renderer,app.stage),probe=packedProbe(app.renderer),bytes=new Uint8Array([1,0,80,255]),staticSource=new BufferImageSource({resource:bytes,width:1,height:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'}),empty=new BufferImageSource({resource:new Uint8Array(4),width:1,height:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'});
 let shade=0;const release=installActorShadowReceivers(app.renderer,()=>({uCamera:new Float32Array([0,0,1,0]),uSun:new Float32Array([0,0,shade,1]),uDynamicSun:live.sun(),uLightBounds:new Float32Array([-8192,-8192,16384,16384]),uDynamicLightBounds:live.bounds(),textures:[staticSource,empty,live.primary,live.second]}));
 const rows:any[]=[];
 const assert=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
 try{
  for(const size of [200,100,200]){
   for(const a of actors){a.canvas.width=a.canvas.height=size;a.canvas.getContext('2d')!.fillRect(size*.4,size*.4,size*.2,size*.6);a.source.resize(size,size);a.source.update();a.texture.frame.copyFrom(new Rectangle(0,0,size,size));a.texture.updateUvs();a.sprite.width=a.sprite.height=100;const frame:ActorShadowFrame={source:a.canvas,frame:[0,0,size,size],width:100,height:100,pivot:[.5,1],flip:false,revision:size,skinned:[pose]};publishActorShadowFrame(a.sprite,frame);}
   live.setSun({dx:.5,dy:.2,alpha:.55});live.renderNow();
   const packed=probe.read(live.second),samples=[];
   for(const a of actors){const owner=actorAnchorForSprite(a.sprite)!().owner!,tile=actorHeightTile(app.renderer,owner)!;assert(!!tile,'Missing owner tile');const [x,y,w,h]=tile.rect,mx=Math.floor((100-tile.bounds[0])/(tile.bounds[2]/w)),my=Math.floor((70-tile.bounds[1])/(tile.bounds[3]/h)),i=((y+my)*packed.width+x+mx)*4,actualOwner=packed.rgb[i]*16+(packed.rgb[i+1]>>4),height=((packed.rgb[i+1]&15)*256+packed.rgb[i+2])*.5;assert(actualOwner===owner,'Other owner erased camera tile');assert(Math.abs(height-(29.75+a.anchor.lift))<.6,'Wrong independent height '+height);
    const pixel=(70*200+100)*4;shade=0;const base=app.renderer.extract.pixels({target:a.stage,frame:new Rectangle(0,0,200,200)}).pixels;shade=.55;const shaded=app.renderer.extract.pixels({target:a.stage,frame:new Rectangle(0,0,200,200)}).pixels;
    // The forty-high control covers the lower actor at z~30, while the higher
    // actor at z~50 remains clear, even with identical screen silhouettes.
    const expected=a.anchor.lift?base[pixel]:base[pixel]*.45+20*.55;assert(Math.abs(shaded[pixel]-expected)<=3,'Overlap receiver used another actor height '+shaded[pixel]+' '+expected);
    samples.push({owner,height,alpha:packed.alpha[i],base:base[pixel],shaded:shaded[pixel],tile:tile.rect});
   }
   rows.push({sourceSize:size,samples,stats:live.stats()});
  }
  // Move without a new pose: tight bounds move while the bitmap is reused.
  for(const a of actors){a.anchor.groundX+=10;a.sprite.x+=10;}live.renderNow();for(const a of actors){const tile=actorHeightTile(app.renderer,actorAnchorForSprite(a.sprite)!().owner!)!;assert(Math.abs(tile.bounds[0]-59)<.001,'Translated camera bounds stale');}
  return {ok:true,rows,scope:'Two overlapping owners; native upper/lower receiver control; 2x to 1x to 2x source resize; translation without pose revision. Software GPU only.'};
 }finally{release();live.destroy();probe.destroy();staticSource.destroy();empty.destroy();app.destroy({removeView:true,releaseGlobalResources:false},{children:true,texture:true,textureSource:true});}
}
