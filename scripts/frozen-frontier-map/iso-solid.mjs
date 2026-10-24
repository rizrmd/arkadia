// True 2:1 isometric stone blocks for the Frozen Frontier v3 kit (pillars, stairs, fallen columns), drawn from the
// same stone as the reviewed v1 art. The v1 pillars and stairs were generated face-on or in perspective, so their edges
// did not follow the 2:1 grid the walls, arches and floors sit on; here every piece is built from axis-aligned boxes
// in map space and projected exactly as the game projects the map:
//   screen x = (u - v) * 64, screen y = (u + v) * 32 - z      (u, v in tiles, z in world px; 1 m = 1/3 tile = 37 px up)
// so every horizontal edge runs at 1:2 and every vertical edge is vertical. Three faces of a box can face the camera:
// the top, the +v face (lower left, lit by the kit's upper-left daylight) and the +u face (lower right, in shade);
// the shade ratios are measured from the v1 corners (left arm 158, right arm 97 mean luminance), and the lit face is
// brought from the v1 pillar's front (mean 181, 166, 147) to the walls' stone (144, 134, 122).
// A z-buffer (depth u + v + z / 64 grows toward the camera along every view ray) resolves overlaps; 3x3 supersampling
// gives clean antialiased edges. Output: straight-alpha RGBA floats {w, h, d} at R px per world px, plus the pixel
// of the ground point (0, 0, 0), which becomes the sprite's pivot.
export const M=1/3,PX_M=37;
export const LIGHT={top:.94,pv:.8,pu:.5};
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;

// Bilinear sample of an image {w, h, d}; returns [r, g, b, a] in 0..255 (colour) and 0..1 (alpha).
export function sample(img,x,y){x=clamp(x,0,img.w-1.001);y=clamp(y,0,img.h-1.001);const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,o=[0,0,0,0];
 for(const [dx,dy,wt] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){const i=((y0+dy)*img.w+x0+dx)*4;for(let c=0;c<4;c++)o[c]+=img.d[i+c]*wt;}
 return [o[0]*255,o[1]*255,o[2]*255,o[3]];}
// A face-on stone texture: a window of a source image whose right edge x1 is a corner of the stone; s (m) runs
// from that corner across the face (mirror-wrapped), t (m) up from the bottom yb (wrapped), ppm source px per metre.
// desnow replaces the snow lying on the source's ledges with stone (for a texture turned on its side).
export function faceTexture(img,{x0,x1,yb,yt,ppm,desnow=false}){const w=x1-x0,h=yb-yt;
 return (s,t)=>{let m=(s*ppm)%(2*w);if(m<0)m+=2*w;if(m>w)m=2*w-m;let n=(t*ppm)%h;if(n<0)n+=h;const c=sample(img,x1-m,yb-n);
  if(desnow){const l=c[0]*.3+c[1]*.59+c[2]*.11,k=clamp((c[2]-c[0]+4)/14)*clamp((l-150)/40);if(k>0){const g=158+(((x1-m)*7+(yb-n)*13)%17-8);for(let i=0;i<3;i++)c[i]+=([g,g*.93,g*.83][i]-c[i])*k;}}
  return c;};}

// boxes: {u0, v0, u1, v1, z0, z1, top(u, v, box) -> rgb, side(face, s, t, box) -> rgb, sref?, tref?}
// Face coordinates: s in metres from the box's front corner edge (or sref, a shared u/v so neighbouring boxes
// continue one texture), t in metres above tref (default 0, the ground).
const hash=(x,y,s)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const vnoise=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
// rough (world px): how deep the arrises are chipped. Pixels closer to an exposed edge than a noise depth are left out,
// so the box behind (or the background) shows through, like knocked stone corners. Exposed: a top face's edges, and a
// vertical face's top edge and front corner; a joint with the block below or beside stays closed.
export function renderBoxes(boxes,{R=4,SS=3,pad=3,edge=true}={}){
 const pts=boxes.flatMap(b=>[[b.u0,b.v0],[b.u1,b.v0],[b.u0,b.v1],[b.u1,b.v1]].flatMap(([u,v])=>[[(u-v)*64,(u+v)*32-b.z0],[(u-v)*64,(u+v)*32-b.z1]]));
 const X0=Math.min(...pts.map(p=>p[0]))-pad,Y0=Math.min(...pts.map(p=>p[1]))-pad,X1=Math.max(...pts.map(p=>p[0]))+pad,Y1=Math.max(...pts.map(p=>p[1]))+pad;
 const K=R*SS,W=Math.ceil((X1-X0)*K),H=Math.ceil((Y1-Y0)*K),col=new Float32Array(W*H*3),zb=new Float32Array(W*H).fill(-Infinity);
 const faces=[
  // [name, corners as (u, v, z), inverse: screen (x, y) -> {u, v, z} or null]
  ['top',b=>[[b.u0,b.v0,b.z1],[b.u1,b.v0,b.z1],[b.u1,b.v1,b.z1],[b.u0,b.v1,b.z1]],(b,x,y)=>{const a=x/64,c=(y+b.z1)/32,u=(a+c)/2,v=(c-a)/2;return u>=b.u0&&u<=b.u1&&v>=b.v0&&v<=b.v1?{u,v,z:b.z1}:null;}],
  ['pv',b=>[[b.u0,b.v1,b.z0],[b.u1,b.v1,b.z0],[b.u1,b.v1,b.z1],[b.u0,b.v1,b.z1]],(b,x,y)=>{const u=x/64+b.v1,z=(u+b.v1)*32-y;return u>=b.u0&&u<=b.u1&&z>=b.z0&&z<=b.z1?{u,v:b.v1,z}:null;}],
  ['pu',b=>[[b.u1,b.v0,b.z0],[b.u1,b.v1,b.z0],[b.u1,b.v1,b.z1],[b.u1,b.v0,b.z1]],(b,x,y)=>{const v=b.u1-x/64,z=(b.u1+v)*32-y;return v>=b.v0&&v<=b.v1&&z>=b.z0&&z<=b.z1?{u:b.u1,v,z}:null;}],
 ];
 for(const b of boxes)for(const [name,corners,inv] of faces){
  const cs=corners(b).map(([u,v,z])=>[((u-v)*64-X0)*K,((u+v)*32-z-Y0)*K]);
  const px0=Math.max(0,Math.floor(Math.min(...cs.map(c=>c[0])))),px1=Math.min(W-1,Math.ceil(Math.max(...cs.map(c=>c[0])))),py0=Math.max(0,Math.floor(Math.min(...cs.map(c=>c[1])))),py1=Math.min(H-1,Math.ceil(Math.max(...cs.map(c=>c[1]))));
  for(let py=py0;py<=py1;py++)for(let px=px0;px<=px1;px++){
   const x=(px+.5)/K+X0,y=(py+.5)/K+Y0,p=inv(b,x,y);if(!p)continue;const dep=p.u+p.v+p.z/64,i=py*W+px;if(dep<=zb[i])continue;
   // Screen distance to the face's nearest edge: a top face's edges are 57.2 px apart per tile across them.
   if(b.rough){const d=name==='top'?Math.min(p.u-b.u0,b.u1-p.u,p.v-b.v0,b.v1-p.v)*57.2:Math.min(b.z1-p.z,(name==='pv'?b.u1-p.u:b.v1-p.v)*64);
    if(d<b.rough*clamp((vnoise(x*.7+b.u0*99,y*.7+b.v0*99,7)-.42)*2.6)*(.6+vnoise(x*.12,y*.12,9)*.8))continue;}
   zb[i]=dep;
   let c;
   if(name==='top')c=b.top(p.u,p.v,b).map(x=>x*LIGHT.top);
   else{const s=name==='pv'?((b.sref??b.u1)-p.u)/M:((b.sref??b.v1)-p.v)/M,t=(p.z-(b.tref??0))/PX_M;c=b.side(name,s,t,b).map(x=>x*LIGHT[name]);}
   if(edge){// Dressed edges: a light arris along the top of every face, a dark joint along its foot and outer ends.
    let f=1;if(name==='top'){const d=Math.min(b.u1-p.u,b.v1-p.v)*64;if(d<.7)f=1.1;}
    else{const dt=b.z1-p.z,db=p.z-b.z0,ds=(name==='pv'?Math.min(p.u-b.u0,b.u1-p.u):Math.min(p.v-b.v0,b.v1-p.v))*64;
     if(dt<.55)f*=1.16;else if(db<.6)f*=.72;if(ds<.45)f*=name==='pv'&&b.u1-p.u<.45/64?1.1:.82;}
    c=c.map(x=>x*f);}
   col.set(c,i*3);
  }
 }
 // Downsample to R px per world px.
 const w=Math.floor(W/SS),h=Math.floor(H/SS),d=new Float32Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let r=0,g=0,bl=0,n=0;for(let j=0;j<SS;j++)for(let k=0;k<SS;k++){const i=(y*SS+j)*W+x*SS+k;if(zb[i]===-Infinity)continue;r+=col[i*3];g+=col[i*3+1];bl+=col[i*3+2];n++;}
  if(!n)continue;const o=(y*w+x)*4;d[o]=clamp(r/n/255);d[o+1]=clamp(g/n/255);d[o+2]=clamp(bl/n/255);d[o+3]=n/(SS*SS);}
 return {img:{w,h,d},pivot:[-X0*R,-Y0*R]};
}
// Swap u and v (a flight climbing -u becomes one climbing -v); sref follows its axis.
export const swapUV=b=>({...b,u0:b.v0,v0:b.u0,u1:b.v1,v1:b.u1});
