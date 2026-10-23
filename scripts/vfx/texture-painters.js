// Particle textures for the NixieFX project in vfx/, painted procedurally in a browser canvas by textures.mjs.
// Every texture is painted on a crisp Diablo-like pixel grid (quantized pixel cells with incandescent cores and stepped
// pixel alpha/luminance): emitters colour them with their own gradients, so one pixel texture serves every palette.
// Flipbooks are square grids read by the textureSheetAnimation module.
(()=>{
const TAU=Math.PI*2;
function rng(seed){let s=seed>>>0;return()=>{s=s+0x6d2b79f5>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Periodic value noise: 'period' cells wrap so tiles and angular bands have no seam.
function valueNoise(seed,period=256){const r=rng(seed),g=new Float32Array(period*period);for(let i=0;i<g.length;i++)g[i]=r();
 const at=(x,y)=>g[((y%period+period)%period)*period+((x%period+period)%period)],sm=t=>t*t*(3-2*t);
 return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=sm(x-xi),yf=sm(y-yi),a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;};}
function fbm(n,x,y,oct=4){let v=0,a=.5,f=1,t=0;for(let i=0;i<oct;i++){v+=a*n(x*f,y*f);t+=a;a*=.5;f*=2;}return v/t;}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
// Diablo-like pixel quantiser: snaps continuous coordinates to a pixel grid (px × py) and steps luminance/alpha
// with a subtle Bayer 2×2 dither so particles read as crisp pixel clusters rather than smooth vector gradients.
const BAYER=[[0,.5],[.75,.25]];
function pixelCells(ctx,ox,oy,w,h,gridW,gridH,fn){
 const img=ctx.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=Math.floor(x*gridW/w),gy=Math.floor(y*gridH/h);
  const ux=(gx+.5)/gridW,uy=(gy+.5)/gridH;
  const bayer=BAYER[gy&1][gx&1]-.375;
  const p=fn(ux,uy,gx,gy,bayer),i=(y*w+x)*4;
  if(p.length===4){
   d[i]=Math.round(clamp(p[0])*255);d[i+1]=Math.round(clamp(p[1])*255);d[i+2]=Math.round(clamp(p[2])*255);d[i+3]=Math.round(clamp(p[3])*255);
  }else{
   const v=Math.round(clamp(p[0])*255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.round(clamp(p[1])*255);
  }
 }
 ctx.putImageData(img,ox,oy);
}
const stepVal=(v,steps)=>Math.round(clamp(v)*steps)/steps;
const polar=(x,y)=>{const dx=x*2-1,dy=y*2-1;return{r:Math.hypot(dx,dy),a:Math.atan2(dy,dx),dx,dy};};

const P={};
// Pixelated Diablo-like radial glow: stepped concentric pixel rings around an incandescent pixel core.
P.glow={w:128,h:128,paint(c){pixelCells(c,0,0,128,128,24,24,(x,y,_gx,_gy,b)=>{const {r}=polar(x,y);
 const raw=Math.pow(clamp(1-r),2.2);const a=stepVal(raw+b*.08,6);return[stepVal(.75+.25*raw,4),a*smooth(1,.88,r)];});}};
// Hot pixel ember: crisp 2×2 / 4×4 white-hot pixel core with stepped pixel halo, reads as a Diablo pixel cinder/spark.
P.ember={w:64,h:64,paint(c){pixelCells(c,0,0,64,64,16,16,(x,y,gx,gy,b)=>{const {r}=polar(x,y);
 const center=gx>=6&&gx<=9&&gy>=6&&gy<=9?1:0;
 const inner=gx>=5&&gx<=10&&gy>=5&&gy<=10?.78:0;
 const halo=stepVal(Math.exp(-r*r/.18)*.55+b*.08,4);
 const a=clamp(Math.max(center,inner,halo))*smooth(1,.82,r);
 return[center?1:inner?.92:.78,a];});}};
// Pixelated velocity spark cluster: clustered pixel blocks near the head tapering into stepped pixel motes (not a smooth vector line).
P.streak={w:32,h:128,paint(c){const n=valueNoise(19,16);pixelCells(c,0,0,32,128,8,24,(x,y,gx,gy,b)=>{const t=1-y,dx=(x-.5)*2;
 const tip=smooth(1,.82,t),tail=Math.pow(clamp(t/.88),1.35),w=.22+.38*Math.sin(clamp(t)*Math.PI*.88);
 const jitter=(n(gx*1.7,gy*1.3)-.5)*.28;
 const dist=Math.abs(dx+jitter*.4)/Math.max(.08,w);
 const body=smooth(1.05,.15,dist)*tail*tip;
 // Break the tail into discrete pixel spark beads so it never reads as a continuous vector line
 const bead=gy<10?1:((gy+gx)%2===0?.92:.45);
 const a=stepVal(clamp(body*bead+b*.1)*smooth(0,.06,t),5);
 const lum=stepVal(.76+.24*smooth(.6,0,dist)*tip,4);
 return[lum,a];});}};
// Pixelated 4-point star glint: stepped pixel cross and pixel core for Diablo-like arcane/fire twinkles.
P.flare={w:128,h:128,paint(c){pixelCells(c,0,0,128,128,24,24,(x,y,gx,gy)=>{const {dx,dy,r}=polar(x,y);
 const ax=Math.abs(gx-11.5),ay=Math.abs(gy-11.5);
 const cross=(ax<=1.2?Math.max(0,1-ay/10.5):0)+(ay<=1.2?Math.max(0,1-ax/10.5):0);
 const diag=Math.abs(ax-ay)<=1?Math.max(0,1-(ax+ay)/14)*.55:0;
 const core=Math.hypot(ax,ay)<=2.4?1:Math.hypot(ax,ay)<=4.2?.65:0;
 const a=stepVal(clamp(Math.max(cross,diag,core)),5)*smooth(1,.9,r);
 return[1,a];});}};
// Diablo-like pixel flame flipbook, 4x4 frames of 128 (rendered on a 24×24 pixel art grid per frame):
// multi-lobed pixel fire clusters with stepped thermal shading (white-gold pixel core -> orange pixel body -> crimson pixel tips).
P.flame={w:512,h:512,tiles:[4,4],paint(c){const n=valueNoise(11,32),n2=valueNoise(73,32);for(let f=0;f<16;f++){const ox=(f%4)*128,oy=Math.floor(f/4)*128,t=f/16,ph=t*TAU,variant=(f%4)*.55;
 pixelCells(c,ox,oy,128,128,24,24,(x,y,_gx,_gy,b)=>{const ny=1-y,nx=(x-.5)*2;
  const wave=Math.sin(ny*3.6-ph+variant)*.16*Math.pow(ny,.75)+Math.cos(ny*5.8-ph*2+variant)*.06*ny;
  const turb=(fbm(n,y*3.8+t*7+variant,3.7,3)-.5)*.32*Math.pow(ny,.8);
  const cx=wave+turb,dx=nx-cx;
  const base=smooth(.02,.22,ny);
  const width=.72*Math.pow(clamp(1-ny*.86),.92)*(.52+.62*smooth(0,.28,ny));
  const ex=Math.abs(dx)/Math.max(.002,width);
  const lick=fbm(n,x*4.2+1.9+variant*.4,(y+t)*7,4),fine=fbm(n2,x*8+4.1,(y+t*2)*10,3);
  const lobes=Math.sin(nx*4.8+ph+variant)*.12*ny+Math.cos(nx*7.5-ph+variant)*.08*ny;
  const shear=(lick-.46)*(.58+.62*ny)+(fine-.5)*.26*ny+lobes;
  const leftLobe=smooth(.62,.05,Math.abs(dx+width*(.48+.18*ny))/(width*.52))*smooth(.1,.32,ny)*smooth(.88,.42,ny)*smooth(.3,.72,lick);
  const rightLobe=smooth(.62,.05,Math.abs(dx-width*(.46+.2*ny))/(width*.52))*smooth(.14,.38,ny)*smooth(.92,.48,ny)*smooth(.3,.72,fine);
  const sideLobing=(leftLobe*(.6+.3*Math.sin(ph+1.1))+rightLobe*(.6+.3*Math.cos(ph-.8)));
  const edge=ex-shear*.68;
  const mainBody=smooth(1.04,.08,edge)*base*smooth(.98,.68,ny-(lick-.5)*.34-lobes*.4);
  const rawBody=clamp(mainBody+sideLobing*.78);
  const radial=Math.hypot(nx,ny*1.85-.88);
  const halo=Math.exp(-(dx*dx)/(.62*width*width+.06))*smooth(.02,.24,ny)*smooth(.94,.24,ny)*.28;
  const rawAlpha=clamp((Math.pow(rawBody,1.55)+halo)*smooth(1,.82,radial)*.94);
  const alpha=stepVal(rawAlpha+b*.07,5);
  if(alpha<=.05)return[0,0,0,0];
  const coreSpine=smooth(.78,.0,ex)*smooth(.84,.06,ny)*base;
  const vein=smooth(.28,.76,fine)*smooth(.94,.14,ex)*smooth(.92,.1,ny)*.36;
  const heat=stepVal(clamp(rawBody*.56+coreSpine*.64+vein-ny*.12+b*.05),5);
  const r=1;
  const g=stepVal(.48+.52*Math.pow(clamp(heat/.88),1.02),5);
  const bl=stepVal(.14+.84*Math.pow(clamp((heat-.32)/.66),1.5),5);
  return[r,g,bl,alpha];});}}};
// Pixelated smoke puff flipbook, 2x2 frames of 128 on a 20×20 pixel cell grid: billowy pixel soot/ash clouds.
P.smoke={w:256,h:256,tiles:[2,2],paint(c){const n=valueNoise(23,64);for(let f=0;f<4;f++){const ox=(f%2)*128,oy=Math.floor(f/2)*128;
 pixelCells(c,ox,oy,128,128,20,20,(x,y,_gx,_gy,b)=>{const {r,dx,dy}=polar(x,y);const v=fbm(n,x*4+f*9.3,y*4+f*4.1,5);
  const a=stepVal(smooth(.95,.25,r+(v-.5)*.8)*.85+b*.07,5);
  const light=stepVal(.72+.28*clamp(.5-(dx+dy)*.35+v*.3),4);return[light,a];});}}};
// Pixelated shockwave cluster: ring of discrete pixel embers/fragments rather than a smooth vector ring.
P.shock={w:256,h:256,paint(c){const n=valueNoise(37,32);pixelCells(c,0,0,256,256,32,32,(x,y,gx,gy,b)=>{const {r,a}=polar(x,y);
 const j=(fbm(n,(a/TAU+.5)*24,r*6,4)-.5)*.14;const rr=r+j;
 const speck=fbm(n,gx*1.3,gy*1.3,2)>.38?1:.25;
 const lip=smooth(.96,.84,rr)*smooth(.52,.82,rr)*speck;
 return[stepVal(.65+.35*smooth(.78,.92,rr),4),stepVal(Math.pow(lip,1.25)+b*.06,4)];});}};
// Pixelated scorch decal: dithered pixel ash & char clusters on snow.
P.scorch={w:256,h:256,paint(c){const n=valueNoise(41,32);pixelCells(c,0,0,256,256,28,28,(x,y,_gx,_gy,b)=>{const {r}=polar(x,y);
 const v=fbm(n,x*7,y*7,5);const a=stepVal(smooth(.98,.35,r+(v-.5)*.55)*(.55+.45*v)+b*.08,5);
 return[stepVal(.12+.2*v,4),a*.9];});}};
// Pixelated lightning / arcane spark cluster flipbook, 2x2 frames of 128: stepped pixel energy clusters instead of vector polylines.
P.arc={w:256,h:256,tiles:[2,2],paint(c){const n=valueNoise(105,32);for(let f=0;f<4;f++){const ox=(f%2)*128,oy=Math.floor(f/2)*128;
 pixelCells(c,ox,oy,128,128,20,20,(x,y,gx,gy,b)=>{
  const wave=(fbm(n,x*5+f*3.7,f*2.1,3)-.5)*.45;
  const dy=Math.abs((y-.5)-wave);
  const branch=Math.abs((y-.5)+wave*.75-(x-.5)*.45);
  const d=Math.min(dy,branch*(gx>6&&gx<15?1.15:3));
  const edge=smooth(.95,.15,Math.abs(x-.5)*2);
  const spark=smooth(.22,.0,d)*edge;
  const a=stepVal(spark+b*.08,4);
  return[stepVal(.78+.22*smooth(.09,0,d),4),a];
 });}}};
// Pixelated magma / ground fissure cluster (no vector lines): glowing pixel ember pockets and stepped pixel fissures.
P.crack={w:512,h:512,paint(c){const n=valueNoise(5,32),n2=valueNoise(47,32);pixelCells(c,0,0,512,512,40,40,(x,y,_gx,_gy,b)=>{
 const {r,a}=polar(x,y);if(r>.95)return[0,0];
 const spokes=Math.abs(Math.sin(a*5+(fbm(n,x*5,y*5,3)-.5)*2.6));
 const ridge=smooth(.28,.02,spokes)*smooth(.92,.18,r)*smooth(.05,.18,r);
 const pockets=smooth(.58,.82,fbm(n2,x*9,y*9,3))*smooth(.85,.15,r);
 const val=clamp(ridge*.85+pockets*.9);
 return[stepVal(.7+.3*val,4),stepVal(val+b*.06,4)];
});}};
// Pixelated rock/cinder debris flipbook, 2x2 frames of 64 (rendered on a 12×12 pixel art grid per frame): chunky Diablo pixel boulders.
P.debris={w:128,h:128,tiles:[2,2],paint(c){const n=valueNoise(301,16);for(let f=0;f<4;f++){const ox=(f%2)*64,oy=Math.floor(f/2)*64;
 pixelCells(c,ox,oy,64,64,12,12,(x,y)=>{const {r,dx,dy}=polar(x,y);
  const bump=(fbm(n,x*3+f*4.1,y*3+f*2.7,3)-.5)*.35;
  if(r+bump>.76)return[0,0,0,0];
  const rim=r+bump>.62;
  const shade=stepVal(clamp(.68-(dx*.45+dy*.45)+bump*.4),4);
  const v=rim?.22:(.32+.58*shade);
  return[v,v*.96,v*.9,1];
 });}}};
// Pixelated crescent particle cluster (replaces smooth vector crescent): discrete pixel embers/sparks arranged in an arc.
P.slash={w:256,h:128,paint(c){const n=valueNoise(67,32);pixelCells(c,0,0,256,128,32,16,(x,y,gx,gy,b)=>{
 const px=(x-.5)*2,py=(1-y),r=Math.hypot(px,py),a=Math.atan2(py,px);
 const taper=Math.pow(Math.max(0,Math.sin(a)),.75);
 const grain=fbm(n,gx*.9,gy*.9,2);
 const band=smooth(.68,.88,r)*smooth(1.02,.9,r)*(grain>.35?1:.35);
 const core=smooth(.86,.94,r)*smooth(.99,.94,r);
 const alpha=stepVal(clamp((band*.75+core*.85)*taper)+b*.06,4);
 return[stepVal(.75+.25*core,4),alpha];
});}};
// Swirling pixel energy orb: pixel-stepped vortex cluster around a white-hot pixel core.
P.orb={w:128,h:128,paint(c){const n=valueNoise(51,32);pixelCells(c,0,0,128,128,20,20,(x,y,_gx,_gy,b)=>{const {r,a}=polar(x,y);
 const s=fbm(n,(a/TAU+.5+r*.6)*16,r*5,4);
 const arms=smooth(.45,.8,s)*smooth(1,.4,r);const core=Math.exp(-r*r/.05);
 return[stepVal(.7+.3*core,4),stepVal(clamp(arms*.9+core+Math.exp(-r*r/.3)*.25)*smooth(1,.9,r)+b*.06,5)];});}};
// Pixelated fire wisp: 12×24 pixel art plume with stepped thermal core and dithered pixel edges.
P.wisp={w:64,h:128,paint(c){const n=valueNoise(61,32),n2=valueNoise(89,32);pixelCells(c,0,0,64,128,12,24,(x,y,_gx,_gy,b)=>{const t=1-y,dx=(x-.5)*2;
 const sway=(fbm(n,1.9,y*4.2,3)-.5)*.24*(1-t*.45),v=fbm(n,x*3.6,y*5.8,4),f=fbm(n2,x*7+2.3,y*9,3);
 const env=Math.sin(clamp(t)*Math.PI),w=.18+.52*Math.pow(env,.68)*(1-.18*t);
 const ex=Math.abs(dx-sway+(v-.5)*.34*(1-t*.3))/Math.max(.01,w);
 const body=smooth(1.04,.12,ex)*smooth(.02,.18,t)*smooth(.98,.76,t+(v-.5)*.16)*(.72+.28*f);
 const core=smooth(.62,0,ex)*smooth(.08,.32,t)*smooth(.94,.58,t);
 const alpha=stepVal(Math.pow(clamp(body*1.12),1.5)+b*.06,5);
 return[1,stepVal(.55+.45*core,4),stepVal(.2+.78*Math.pow(core,1.4),4),alpha];});}};
// Pixelated crystal/arcane shard: 12×20 pixel art diamond cluster with stepped pixel facets (no vector strokes).
P.shard={w:64,h:128,paint(c){pixelCells(c,0,0,64,128,12,20,(x,y,gx)=>{
 const dx=Math.abs(x-.5)*2,dy=Math.abs(y-.5)*2;
 const d=dx+dy*1.05;
 if(d>.92)return[0,0,0,0];
 const spine=gx===5||gx===6?1:0;
 const left=x<.5;
 const lum=spine?1:left?.92:.72;
 const alpha=d>.78?.75:1;
 return[lum*.92,lum*.96,1,alpha];
});}};

window.VFX_TEXTURES=Object.fromEntries(Object.entries(P).map(([name,p])=>[name,{w:p.w,h:p.h,tiles:p.tiles??[1,1],render(){const cv=document.createElement('canvas');cv.width=p.w;cv.height=p.h;const ctx=cv.getContext('2d');p.paint(ctx);return cv.toDataURL('image/png');}}]));
})();
