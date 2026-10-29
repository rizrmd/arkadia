import type {ShadowSurface} from './shadow-surfaces';
// Hand-fitted geometry in a 756 x 498 reference plane of the artwork. Heights are screen-
// vertical world units, not brightness. The ridge and both eaves have matching
// heights at the front and rear, retaining the tent's ground-plane depth.
type Vertex=readonly [number,number,number];
const left:Vertex=[151,268,142],front:Vertex=[371,316,142],rear:Vertex=[662,191,142];
const ridge:Vertex=[274,140,260],back:Vertex=[560,35,260];
const leftFoot:Vertex=[136,390,0],frontFoot:Vertex=[380,459,0],rearFoot:Vertex=[688,300,0];
const triangles:readonly (readonly Vertex[])[]=[
 [left,ridge,back],[left,back,[522,130,142]],
 [ridge,front,rear],[ridge,rear,back],
 [front,frontFoot,rearFoot],[front,rearFoot,rear],
 [left,leftFoot,frontFoot],[left,frontFoot,front],[left,front,ridge],
];
const ropes:readonly (readonly [Vertex,Vertex])[]=[
 [left,[47,390,0]],[front,[455,483,0]],[rear,[748,282,0]],
];
const edges=[...ropes,...triangles.flatMap(([a,b,c])=>[[a,b],[b,c],[c,a]] as [Vertex,Vertex][])];
export function tentHeightAt(u:number,v:number){
 const x=u*756,y=v*498;
 for(const [a,b,c] of triangles){
  const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  const s=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
  const t=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
  if(s>=-1e-6&&t>=-1e-6&&s+t<=1+1e-6)return Math.max(0,s*a[2]+t*b[2]+(1-s-t)*c[2]);
 }
 // Rope/pole/banner fringes keep their nearest structural height; stake tips
 // remain at ground level. Original source alpha still defines every cutout.
 let distance=Infinity,height=0;
 for(const [a,b] of edges){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy))),d=(x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2;if(d<distance){distance=d;height=a[2]+t*(b[2]-a[2]);}}
 return height;
}
// Closed pitched-roof envelope. Source-camera coordinates and geometric
// heights share the reference plane above; hidden walls/floor close the light
// volume. Every face remains clipped to the original source alpha.
const body:Vertex[]=[
 [151,410,0],[371,458,0],[662,333,0],[522,272,0],
 left,front,rear,[522,130,142],[274,140,294],[560,35,267],
];
const bodyFaces=[[4,8,9,7],[8,5,6,9],[0,1,5,8,4],[1,2,6,5],[2,3,7,9,6],[3,0,4,7],[0,3,2,1]];
// Rope silhouettes stay as thin authored ribbons, rather than being dropped
// outside the body envelope or receiving the full roof height.
const tentVertices=body.map(v=>[...v]),tentFaces=bodyFaces.map(f=>[...f]);
for(const [a,b] of ropes){const n=tentVertices.length;tentVertices.push([a[0]-3,a[1],a[2]],[a[0]+3,a[1],a[2]],[b[0]+3,b[1],b[2]],[b[0]-3,b[1],b[2]]);tentFaces.push([n,n+1,n+2,n+3]);}
export function withTentGeometry(p:ShadowSurface):ShadowSurface{
 return {...p,solidBody:true,geometryModel:'closed-pitched-tent-v1',nativeGeometry:{completeAlpha:true,vertices:tentVertices.map(([x,y,z])=>[x/756,y/498,z/498]),faces:tentFaces,receiveFaces:[0,1,2,3,...ropes.map((_,i)=>bodyFaces.length+i)]},heightAtScreen:(x,y)=>{
  const lx=x-p.x,u=lx/p.width*(p.flip?-1:1)+p.pivot[0],v=(y-p.y+(p.lift??0)-(p.shear??0)*lx)/((p.vertical??1)*p.height)+p.pivot[1];
  return (p.lift??0)+tentHeightAt(u,v)*p.height/498*(p.vertical??1);
 }};
}
