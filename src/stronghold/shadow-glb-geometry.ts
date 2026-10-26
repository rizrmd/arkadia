import type {ActorSkinnedGeometry,ActorSkinnedPose} from './shadow-actor-sources';

type Cached={geometry:ActorSkinnedGeometry;bounds:Float32Array};
const cache=new WeakMap<object,Cached>();
const transform=(m:ArrayLike<number>,x:number,y:number,z:number)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
function attribute(a:any,n:number){const out=new Float32Array(a.count*n);for(let i=0;i<a.count;i++)for(let j=0;j<n;j++)out[i*n+j]=a.getComponent(i,j);return out;}

/** No pixel readback or CPU skinning: copy immutable attributes once, then only pose matrices. */
export function captureSkinnedShadowPose(root:any,THREE:any,camera:any,heightScale:number):ActorSkinnedPose[]{
 const result:ActorSkinnedPose[]=[],vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 root.traverse((mesh:any)=>{
  if(!mesh.isSkinnedMesh||!mesh.visible)return;
  if(mesh.morphTargetInfluences?.some((v:number)=>v!==0))throw Error('Shadow GLB morph targets require a matching deformation path');
  let c=cache.get(mesh);
  if(!c){
   const attrs=mesh.geometry.attributes,positions=attribute(attrs.position,3),joints=attribute(attrs.skinIndex,4),weights=attribute(attrs.skinWeight,4),index=mesh.geometry.index;
   const geometry:ActorSkinnedGeometry={key:mesh.uuid,positions,joints,weights,indices:index?Uint32Array.from(index.array):Uint32Array.from({length:positions.length/3},(_,i)=>i),bindMatrix:Float32Array.from(mesh.bindMatrix.elements)};
   // Every weighted vertex is a convex combination of its joint transforms.
   // The union AABB of those joint bounds therefore encloses the evaluated mesh.
   const bounds=new Float32Array(mesh.skeleton.bones.length*6);for(let i=0;i<bounds.length;i+=6)bounds.set([Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity],i);
   for(let i=0;i<positions.length/3;i++){const p=transform(geometry.bindMatrix,positions[i*3],positions[i*3+1],positions[i*3+2]);for(let j=0;j<4;j++)if(weights[i*4+j]>0){const k=joints[i*4+j]*6;for(let a=0;a<3;a++){bounds[k+a]=Math.min(bounds[k+a],p[a]);bounds[k+3+a]=Math.max(bounds[k+3+a],p[a]);}}}
   c={geometry,bounds};cache.set(mesh,c);
  }
  mesh.skeleton.update();
  const bones=Float32Array.from(mesh.skeleton.boneMatrices.subarray(0,mesh.skeleton.bones.length*16)),model=Float32Array.from(mesh.matrixWorld.elements),worldBind=new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse),matrix=new THREE.Matrix4();let low=Infinity,high=-Infinity;
  for(let i=0;i<c.bounds.length;i+=6){const b=c.bounds;if(!Number.isFinite(b[i]))continue;matrix.fromArray(bones,i/6*16).premultiply(worldBind);const m=matrix.elements;const minY=m[13]+Math.min(m[1]*b[i],m[1]*b[i+3])+Math.min(m[5]*b[i+1],m[5]*b[i+4])+Math.min(m[9]*b[i+2],m[9]*b[i+5]),maxY=m[13]+Math.max(m[1]*b[i],m[1]*b[i+3])+Math.max(m[5]*b[i+1],m[5]*b[i+4])+Math.max(m[9]*b[i+2],m[9]*b[i+5]);low=Math.min(low,minY);high=Math.max(high,maxY);}
  result.push({geometry:c.geometry,bindInverse:Float32Array.from(mesh.bindMatrixInverse.elements),bones,model,camera:Float32Array.from(vp.elements),heightScale,heightRange:[low,high]});
 });
 return result;
}
