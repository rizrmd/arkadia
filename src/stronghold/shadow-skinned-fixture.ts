import {Application,CanvasSource,Texture,TextureSource,RenderTarget,Container} from 'pixi.js';
import {SkinnedShadowMesh} from './shadow-skinned-mesh';
import type {ActorSkinnedPose,ActorShadowFrame} from './shadow-actor-sources';
export async function runSkinnedShadowFixture(){
 const app=new Application();await app.init({width:200,height:200,preference:'webgl',antialias:false});app.stop();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=100;canvas.getContext('2d')!.fillRect(40,40,20,60);
 const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const pose:ActorSkinnedPose={geometry:{key:'synthetic',positions:new Float32Array([-10,0,0,10,0,0,10,60,0,-10,60,0]),joints:new Float32Array(16),weights:new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]),indices:new Uint32Array([0,1,2,0,2,3]),bindMatrix:identity()},bindInverse:identity(),bones:identity(),model:identity(),camera:new Float32Array([.02,0,0,0,0,.02,0,0,0,0,.01,0,0,-1,0,1]),heightScale:1,heightRange:[0,60]};
 const source=new CanvasSource({resource:canvas,scaleMode:'linear',autoGenerateMipmaps:false}),texture=new Texture({source}),frame:ActorShadowFrame={source:canvas,frame:[0,0,100,100],width:100,height:100,pivot:[.5,1],flip:false,revision:1,skinned:[pose]};
 const draw=new SkinnedShadowMesh(pose,texture),stage=new Container();stage.addChild(draw.mesh);
 const packed=new TextureSource({width:200,height:200,format:'rgba8unorm',alphaMode:'no-premultiply-alpha',scaleMode:'nearest'}),target=new RenderTarget({colorTextures:[packed],depth:true,stencil:false,antialias:false}),readTexture=new Texture({source:packed}),b={left:0,top:0,width:200,height:200,step:1},sun={dx:.5,dy:.2,alpha:.5},rows=[];
 try{for(const mode of [0,1]){draw.update(pose,frame,{groundX:100,groundY:100,lift:0},3000,1);draw.pass(b,sun,mode,0,0,source);app.renderer.render({container:stage,target,clear:true,clearColor:[0,0,0,0]});const pixels=app.renderer.extract.pixels({target:readTexture}).pixels;const sample=(x:number,y:number)=>{const i=(y*200+x)*4;return {owner:pixels[i]*16+(pixels[i+1]>>4),z:((pixels[i+1]&15)*256+pixels[i+2])*.5,alpha:pixels[i+3]};};rows.push({mode,inside:mode?sample(100,70):sample(115,106),clear:sample(0,0)});}
  if(rows.some(r=>r.inside.owner!==3000||r.inside.alpha!==255||r.clear.alpha!==0))throw Error('Skinned shader projection or numeric packing mismatch '+JSON.stringify(rows));return {ok:true,rows};
 }finally{draw.destroy();stage.destroy();readTexture.destroy();target.destroy();packed.destroy();texture.destroy();source.destroy();app.destroy({removeView:true,releaseGlobalResources:false},{children:true});}
}
