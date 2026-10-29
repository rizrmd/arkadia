import {Geometry,GlProgram,Mesh,Shader,State,UniformGroup,type Texture,type TextureSource} from 'pixi.js';
import type {ActorShadowFrame,ActorAnchor} from './shadow-actor-sources';
import type {ShadowBounds,ShadowSun} from './shadow-field';
import {skinnedDepthFragment} from './shadow-skinned-mesh';

const vertex=`#version 300 es
precision highp float;precision highp sampler2D;
in vec2 aPosition;uniform mat3 uProjectionMatrix;
uniform vec4 uFrame;uniform vec4 uSourceFrame;uniform vec4 uAnchor;uniform float uGroundOffset;
uniform vec4 uPass;uniform vec4 uSunPass;uniform float uMode;
uniform sampler2D uCameraHeight;uniform vec4 uCameraBounds;uniform float uCameraStep;uniform vec4 uIdentity;
out vec2 vUv;out float vHeight;out vec2 vOriginalScreen;
float zOf(vec4 d){return (mod(floor(d.g*255.0+.5),16.0)*256.0+floor(d.b*255.0+.5))*.5;}
float ownOf(vec4 d){return floor(d.r*255.0+.5)*16.0+floor(floor(d.g*255.0+.5)/16.0);}
void main(){
 vec2 screen=uAnchor.xy+uFrame.xy+aPosition*uFrame.zw;vOriginalScreen=screen;
 vUv=aPosition*uSourceFrame.zw+uSourceFrame.xy;
 float height=max(uAnchor.z,uAnchor.y+uAnchor.z+uGroundOffset-screen.y),nearest=1e10;
 // Post-process ink and source raster support have no GLB surface. Extend only
 // that silhouette fringe from the nearest real camera-height sample (up to three field texels).
 for(int ring=0;ring<4;ring++){
 if(nearest<=float(ring*ring)*max(uCameraStep,.5)*max(uCameraStep,.5))break;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  if(ring==0&&(x!=0||y!=0))continue;
  vec2 offset=vec2(float(x),float(y))*float(ring)*max(uCameraStep,.5);
  vec2 uv=(floor((screen+offset-uCameraBounds.xy)/uCameraStep+vec2(.001))+.5)*uCameraStep/uCameraBounds.zw;
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))continue;
  vec4 d=texture(uCameraHeight,uv);float distance=dot(offset,offset);
  if(d.a>.001&&abs(ownOf(d)-uIdentity.x)<.5&&distance<nearest){nearest=distance;height=zOf(d);}
 }
 }
 vHeight=max(uAnchor.z,height);
 vec2 ray=screen+(uMode>.5?vec2(0.0):vec2(uSunPass.x*vHeight,(1.0+uSunPass.y)*vHeight));
 vec2 pixel=(ray-uPass.xy)/uPass.z+vec2(0.0,uPass.w);
 gl_Position=vec4((uProjectionMatrix*vec3(pixel,1.0)).xy,uMode>.5?0.0:1.0-2.0*max(vHeight,.002)/2048.0,1.0);
}`;
const fragment=skinnedDepthFragment.replace('in vec2 vUv;','in vec2 vOriginalScreen;uniform sampler2D uCameraHeight;uniform vec4 uCameraBounds;uniform float uCameraStep;\nin vec2 vUv;').replace('float coverage=texture(uBody,vUv).a*uIdentity.y;',`float coverage=texture(uBody,vUv).a*uIdentity.y;
 vec2 cameraUv=(floor((vOriginalScreen-uCameraBounds.xy)/uCameraStep+vec2(.001))+.5)*uCameraStep/uCameraBounds.zw;
 if(all(greaterThanEqual(cameraUv,vec2(0.0)))&&all(lessThan(cameraUv,vec2(1.0)))){vec4 d=texture(uCameraHeight,cameraUv);float own=floor(d.r*255.0+.5)*16.0+floor(floor(d.g*255.0+.5)/16.0);if(abs(own-uIdentity.x)<.5&&d.a>=coverage-.5/255.0)discard;}`);
let program:GlProgram|undefined;
export class ShadowAlphaShell{
 readonly mesh:Mesh<Geometry,Shader>;readonly vertices:number;readonly geometryBytes:number;private readonly group:UniformGroup;private readonly shader:Shader;private screen=[0,0,1,1];private maxHeight=100;
 constructor(texture:Texture,width:number,height:number){
  const cols=Math.ceil(width)+1,rows=Math.ceil(height)+1,positions=new Float32Array(cols*rows*2),indices:number[]=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;positions.set([x/(cols-1),y/(rows-1)],i*2);if(x<cols-1&&y<rows-1)indices.push(i,i+1,i+cols+1,i,i+cols+1,i+cols);}
  const geometry=new Geometry({attributes:{aPosition:{buffer:positions,format:'float32x2'}},indexBuffer:new Uint32Array(indices)});this.vertices=cols*rows;this.geometryBytes=positions.byteLength+indices.length*4;
  this.group=new UniformGroup({uFrame:{value:new Float32Array(4),type:'vec4<f32>'},uSourceFrame:{value:new Float32Array(4),type:'vec4<f32>'},uAnchor:{value:new Float32Array(4),type:'vec4<f32>'},uGroundOffset:{value:0,type:'f32'},uPass:{value:new Float32Array(4),type:'vec4<f32>'},uSunPass:{value:new Float32Array(4),type:'vec4<f32>'},uPassSize:{value:new Float32Array(4),type:'vec4<f32>'},uIdentity:{value:new Float32Array(4),type:'vec4<f32>'},uMode:{value:0,type:'f32'},uCameraBounds:{value:new Float32Array([0,0,1,1]),type:'vec4<f32>'},uCameraStep:{value:1,type:'f32'}});
  program??=GlProgram.from({name:'glb-original-alpha-fringe',vertex,fragment});this.shader=new Shader({glProgram:program,resources:{edgeUniforms:this.group,uBody:texture.source,uPrimary:texture.source,uCameraHeight:texture.source}});const state=State.for2d();state.blend=false;state.depthTest=true;state.depthMask=true;state.culling=false;this.mesh=new Mesh({geometry,shader:this.shader,state,texture});
 }
 update(frame:ActorShadowFrame,anchor:ActorAnchor,owner:number,opacity:number){const u=this.group.uniforms as Record<string,any>,left=-frame.pivot[0]*frame.width,top=-frame.pivot[1]*frame.height,source=this.mesh.texture.source;u.uFrame.set([left,top,frame.width,frame.height]);u.uSourceFrame.set([frame.frame[0]/source.width,frame.frame[1]/source.height,frame.frame[2]/source.width,frame.frame[3]/source.height]);u.uAnchor.set([anchor.groundX??0,anchor.groundY-anchor.lift,anchor.lift,0]);u.uIdentity.set([owner,opacity,0,0]);u.uGroundOffset=frame.groundOffsetY??0;this.screen=[(anchor.groundX??0)+left,anchor.groundY-anchor.lift+top,frame.width,frame.height];this.maxHeight=Math.max(frame.height,...frame.skinned!.map(p=>p.heightRange[1]*p.heightScale+anchor.lift));this.group.update();}
 bounds(sun:ShadowSun,screen=false){const [x,y,w,h]=this.screen;return {left:x+(screen?0:Math.min(0,sun.dx*this.maxHeight)),right:x+w+(screen?0:Math.max(0,sun.dx*this.maxHeight)),top:y+(screen?0:Math.min(0,(1+sun.dy)*this.maxHeight)),bottom:y+h+(screen?0:Math.max(0,(1+sun.dy)*this.maxHeight))};}
 pass(b:ShadowBounds,sun:ShadowSun,mode:number,peel:number,offset:number,primary:TextureSource,camera:TextureSource,cameraBounds:ShadowBounds=b){const u=this.group.uniforms as Record<string,any>;u.uPass.set([b.left,b.top,b.step,offset]);u.uSunPass.set([sun.dx,sun.dy,0,0]);u.uPassSize.set([b.width,b.height,0,0]);u.uIdentity[2]=peel;u.uMode=mode;u.uCameraBounds.set([cameraBounds.left,cameraBounds.top,cameraBounds.width*cameraBounds.step,cameraBounds.height*cameraBounds.step]);u.uCameraStep=cameraBounds.step;this.mesh.state.depthTest=mode<.5;this.mesh.state.depthMask=mode<.5;this.shader.resources.uPrimary=primary;this.shader.resources.uCameraHeight=camera;this.group.update();}
 destroy(){const geometry=this.mesh.geometry;this.mesh.destroy();geometry.destroy();this.shader.destroy();}
}
