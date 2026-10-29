import {Geometry,GlProgram,Mesh,Shader,State,UniformGroup,type Texture,type TextureSource} from 'pixi.js';
import type {ActorShadowFrame,ActorSkinnedPose,ActorAnchor} from './shadow-actor-sources';
import type {ShadowBounds,ShadowSun} from './shadow-field';

const vertex=`#version 300 es
precision highp float;precision highp sampler2D;
in vec3 aMeshPosition;in vec4 aJoints;in vec4 aWeights;
uniform mat3 uProjectionMatrix;
uniform mat4 uBones[BONE_COUNT];
uniform mat4 uBind;uniform mat4 uBindInverse;uniform mat4 uModel;uniform mat4 uCamera3d;
uniform vec4 uFrame;uniform vec4 uSourceFrame;uniform vec4 uAnchor;
uniform vec4 uPass;uniform vec4 uSunPass;uniform float uMode;
out vec2 vUv;out float vHeight;
mat4 bone(float j){return uBones[int(j)];}
void main(){
 vec4 local=uBind*vec4(aMeshPosition,1.0);
 vec4 skin=(bone(aJoints.x)*local)*aWeights.x+(bone(aJoints.y)*local)*aWeights.y+(bone(aJoints.z)*local)*aWeights.z+(bone(aJoints.w)*local)*aWeights.w;
 vec4 world=uModel*uBindInverse*skin;vec4 camera=uCamera3d*world;
 vec2 uv=vec2(camera.x/camera.w*.5+.5,.5-camera.y/camera.w*.5);
 vUv=uv*uSourceFrame.zw+uSourceFrame.xy;
 vHeight=max(uAnchor.z,world.y*uAnchor.w+uAnchor.z);
 vec2 screen=uAnchor.xy+uFrame.xy+uv*uFrame.zw;
 vec2 ray=screen+(uMode>.5?vec2(0.0):vec2(uSunPass.x*vHeight,(1.0+uSunPass.y)*vHeight));
 vec2 pixel=(ray-uPass.xy)/uPass.z+vec2(0.0,uPass.w);
 gl_Position=vec4((uProjectionMatrix*vec3(pixel,1.0)).xy,1.0-2.0*max(vHeight,.002)/2048.0,1.0);
}`;
export const skinnedDepthFragment=`#version 300 es
precision highp float;precision highp sampler2D;
in vec2 vUv;in float vHeight;
uniform sampler2D uBody;uniform sampler2D uPrimary;
uniform vec4 uSourceFrame;uniform vec4 uPass;uniform vec4 uPassSize;uniform vec4 uIdentity;uniform vec4 uAnchor;
out vec4 finalColor;
void main(){
 if(any(lessThan(vUv,uSourceFrame.xy))||any(greaterThanEqual(vUv,uSourceFrame.xy+uSourceFrame.zw)))discard;
 float fieldHeight=max(uAnchor.z,vHeight);float coverage=texture(uBody,vUv).a*uIdentity.y;
 if(coverage<.5/255.0||fieldHeight<0.0||gl_FragCoord.y<uPass.w||gl_FragCoord.y>=uPass.w+uPassSize.y)discard;
 float peel=uIdentity.z;
 if(peel>1.5&&peel<2.5){if(coverage<250.0/255.0)discard;}
 else if(peel>.5&&peel<1.5){vec4 front=texture(uPrimary,gl_FragCoord.xy/uPassSize.xy);float own=floor(front.r*255.0+.5)*16.0+floor(floor(front.g*255.0+.5)/16.0);if(abs(own-uIdentity.x)<.5&&coverage<=front.a+.5/255.0)discard;}
 float h=floor(max(0.0,fieldHeight)*2.0+.5),owner=uIdentity.x;
 finalColor=vec4(floor(owner/16.0),mod(owner,16.0)*16.0+floor(h/256.0),mod(h,256.0),coverage*255.0)/255.0;
}`;
const programs=new Map<number,GlProgram>();

/** The same GLB vertices, joint weights and pose as Three, projected into the shared numeric field. */
export class SkinnedShadowMesh{
 readonly mesh:Mesh<Geometry,Shader>;readonly vertices:number;readonly geometryBytes:number;
 private lastBones:Float32Array|undefined;private readonly group:UniformGroup;private readonly shader:Shader;
 private screen=[0,0,1,1];private range:[number,number]=[0,0];
 constructor(pose:ActorSkinnedPose,texture:Texture){
  const g=pose.geometry,geometry=new Geometry({attributes:{aPosition:{buffer:new Float32Array(g.positions.length/3*2),format:'float32x2'},aMeshPosition:{buffer:g.positions,format:'float32x3'},aJoints:{buffer:g.joints,format:'float32x4'},aWeights:{buffer:g.weights,format:'float32x4'}},indexBuffer:g.indices});
  this.group=new UniformGroup({uBones:{value:new Float32Array(pose.bones.length),type:'mat4x4<f32>',size:pose.bones.length/16},uBind:{value:g.bindMatrix,type:'mat4x4<f32>'},uBindInverse:{value:Float32Array.from(pose.bindInverse),type:'mat4x4<f32>'},uModel:{value:new Float32Array(16),type:'mat4x4<f32>'},uCamera3d:{value:new Float32Array(16),type:'mat4x4<f32>'},uFrame:{value:new Float32Array(4),type:'vec4<f32>'},uSourceFrame:{value:new Float32Array(4),type:'vec4<f32>'},uAnchor:{value:new Float32Array(4),type:'vec4<f32>'},uPass:{value:new Float32Array(4),type:'vec4<f32>'},uSunPass:{value:new Float32Array(4),type:'vec4<f32>'},uPassSize:{value:new Float32Array(4),type:'vec4<f32>'},uIdentity:{value:new Float32Array(4),type:'vec4<f32>'},uMode:{value:0,type:'f32'}});
  const count=pose.bones.length/16;let program=programs.get(count);if(!program){program=GlProgram.from({name:'skinned-shadow-field-'+count,vertex:vertex.replace('BONE_COUNT',String(count)),fragment:skinnedDepthFragment});programs.set(count,program);}
  this.shader=new Shader({glProgram:program,resources:{poseUniforms:this.group,uBody:texture.source,uPrimary:texture.source}});
  const state=State.for2d();state.blend=false;state.depthTest=true;state.depthMask=true;state.culling=false;
  this.mesh=new Mesh({geometry,shader:this.shader,state,texture});this.vertices=g.positions.length/3;this.geometryBytes=g.positions.byteLength+g.joints.byteLength+g.weights.byteLength+g.indices.byteLength;
 }
 update(pose:ActorSkinnedPose,frame:ActorShadowFrame,anchor:ActorAnchor,owner:number,opacity:number){
  if(owner<0||owner>4095||pose.heightRange[1]*pose.heightScale+anchor.lift>2047.5)throw Error('Skinned pose exceeds packed owner/height contract');
  const u=this.group.uniforms as Record<string,any>;if(this.lastBones!==pose.bones){u.uBones.set(pose.bones);this.lastBones=pose.bones;}u.uBindInverse.set(pose.bindInverse);u.uModel.set(pose.model);u.uCamera3d.set(pose.camera);
  const left=-frame.pivot[0]*frame.width,top=-frame.pivot[1]*frame.height;
  u.uFrame.set([left,top,frame.width,frame.height]);
  const source=this.mesh.texture.source;u.uSourceFrame.set([frame.frame[0]/source.width,frame.frame[1]/source.height,frame.frame[2]/source.width,frame.frame[3]/source.height]);
  u.uAnchor.set([anchor.groundX??0,anchor.groundY-anchor.lift,anchor.lift,pose.heightScale]);u.uIdentity.set([owner,opacity,0,0]);
  this.screen=[(anchor.groundX??0)+left,anchor.groundY-anchor.lift+top,frame.width,frame.height];this.range=[Math.max(0,pose.heightRange[0]*pose.heightScale+anchor.lift),pose.heightRange[1]*pose.heightScale+anchor.lift];
  this.group.update();
 }
 bounds(sun:ShadowSun,screen=false){const [x,y,w,h]=this.screen;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const px of [x,x+w])for(const py of [y,y+h])for(const z of this.range){const qx=px+(screen?0:sun.dx*z),qy=py+(screen?0:(1+sun.dy)*z);left=Math.min(left,qx);right=Math.max(right,qx);top=Math.min(top,qy);bottom=Math.max(bottom,qy);}return {left,top,right,bottom};}
 pass(b:ShadowBounds,sun:ShadowSun,mode:number,peel:number,offset:number,primary:TextureSource){const u=this.group.uniforms as Record<string,any>;u.uPass.set([b.left,b.top,b.step,offset]);u.uSunPass.set([sun.dx,sun.dy,0,0]);u.uPassSize.set([b.width,b.height,0,0]);u.uIdentity[2]=peel;u.uMode=mode;this.shader.resources.uPrimary=primary;this.group.update();}
 destroy(){const geometry=this.mesh.geometry;this.mesh.destroy();geometry.destroy();this.shader.destroy();}
}
