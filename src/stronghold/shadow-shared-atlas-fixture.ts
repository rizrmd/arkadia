import {Application,CanvasSource,Texture,Sprite,Rectangle,BufferImageSource} from 'pixi.js';
import {installActorShadowReceivers} from './shadow-actor-batch';
import {registerActorShadowSprite,actorAnchorForSprite,setActorHeightTile} from './shadow-actor-sources';
/** Shared color atlas must not imply shared world anchor, owner or receiver height. */
export async function runSharedAtlasFixture(){
 const app=new Application();await app.init({width:280,height:180,preference:'webgl',antialias:false});app.stop();
 const canvas=document.createElement('canvas');canvas.width=10;canvas.height=30;const c=canvas.getContext('2d')!;c.fillStyle='white';c.fillRect(0,0,10,30);
 const sprites:Sprite[]=[];const source=new CanvasSource({resource:canvas,scaleMode:'nearest'}),texture=new Texture({source}),records=[{x:50,groundY:80,lift:0},{x:130,groundY:140,lift:0},{x:210,groundY:120,lift:40}];
 for(const a of records){const sprite=app.stage.addChild(new Sprite(texture));sprite.anchor.set(.5,1);sprite.position.set(a.x,a.groundY-a.lift);sprites.push(sprite);registerActorShadowSprite(sprite,()=>({groundX:a.x,groundY:a.groundY,lift:a.lift}));}
 const bytes=new Uint8Array([1,0,40,255]),field=new BufferImageSource({resource:bytes,width:1,height:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'}),empty=new BufferImageSource({resource:new Uint8Array(4),width:1,height:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'});let shade=0,batches:any[]=[];let dynamicSecond=empty;
 const release=installActorShadowReceivers(app.renderer,()=>({uCamera:new Float32Array([0,0,1,0]),uSun:new Float32Array([0,0,shade,1]),uDynamicSun:new Float32Array([0,0,0,1]),uLightBounds:new Float32Array([-4096,-4096,8192,8192]),uDynamicLightBounds:new Float32Array([-4096,-4096,8192,8192]),textures:[field,empty,empty,dynamicSecond]}));
 const adaptor=(app.renderer.renderPipes as any).batch._adaptor,execute=adaptor.execute.bind(adaptor);adaptor.execute=(pipe:any,batch:any)=>{if(batch.batcher.shader.resources.actorUniforms)batches.push({textures:batch.textures.count,size:batch.size});execute(pipe,batch);};
 const read=()=>app.renderer.extract.pixels({target:app.stage,frame:new Rectangle(0,0,280,180),resolution:1}).pixels;
 try{const base=read();batches=[];shade=.5;const shaded=read();const rows=records.map(a=>{const y=a.groundY-a.lift-10,k=(y*280+a.x)*4,expected=a.lift?255:137;return {anchor:a,pixel:[a.x,y],base:Array.from(base.subarray(k,k+4)),actual:Array.from(shaded.subarray(k,k+4)),expected};});
  const failures=rows.filter(r=>Math.abs(r.actual[0]-r.expected)>2).map(r=>JSON.stringify(r));if(batches.length!==1||batches[0].textures!==1)failures.push('Shared atlas split batches '+JSON.stringify(batches));const sourceBatch=[...batches];
  records[0].groundY=120;const changed=read();const firstPixel=(70*280+50)*4;if(changed[firstPixel]!==255)failures.push('Cached quad ignored anchor-only update');records[0].groundY=80;
  const owner=actorAnchorForSprite(sprites[0])!().owner!,h=60,cameraBytes=new Uint8Array([owner>>4,(owner&15)*16+(h>>8),h&255,255]),camera=new BufferImageSource({resource:cameraBytes,width:1,height:1,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'});dynamicSecond=camera;
  setActorHeightTile(app.renderer,owner,{bounds:new Float32Array([45,50,10,30]),uv:new Float32Array([0,0,1,1]),rect:[0,0,1,1]});const tiled=read();if(tiled[firstPixel]!==255||tiled[(130*280+130)*4]>140)failures.push('Cached per-owner tile update leaked across shared atlas');setActorHeightTile(app.renderer,owner,undefined);camera.destroy();
  return {ok:!failures.length,rows,batches:sourceBatch,anchorOnlyPixel:changed[firstPixel],perOwnerTilePixels:[tiled[firstPixel],tiled[(130*280+130)*4]],failures};
 }finally{release();app.destroy({removeView:true,releaseGlobalResources:false},{children:true});texture.destroy(true);field.destroy();empty.destroy();}
}
