// Particle textures for the NixieFX project in vfx/, painted procedurally in a browser canvas by textures.mjs.
// Every texture is painted per-pixel at high resolution on transparent: emitters colour them with their own gradients.
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
const mix=(a,b,t)=>a+(b-a)*t;
// Per-pixel painter. fn(x,y) returns [luminance 0..1, alpha 0..1] or [r, g, b, alpha] in cell-normalised coordinates.
function pixels(ctx,ox,oy,w,h,fn){const img=ctx.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=fn((x+.5)/w,(y+.5)/h),i=(y*w+x)*4;
  if(p.length===4){d[i]=Math.round(clamp(p[0])*255);d[i+1]=Math.round(clamp(p[1])*255);d[i+2]=Math.round(clamp(p[2])*255);d[i+3]=Math.round(clamp(p[3])*255);}
  else{const v=Math.round(clamp(p[0])*255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.round(clamp(p[1])*255);}}
 ctx.putImageData(img,ox,oy);}
const polar=(x,y)=>{const dx=x*2-1,dy=y*2-1;return{r:Math.hypot(dx,dy),a:Math.atan2(dy,dx),dx,dy};};
// Jagged polyline from (x0,y0) to (x1,y1) by midpoint displacement.
function jagged(r,x0,y0,x1,y1,rough,depth){let pts=[[x0,y0],[x1,y1]];
 for(let d=0;d<depth;d++){const out=[pts[0]];for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/(len||1),ny=(bx-ax)/(len||1),o=(r()-.5)*len*rough;out.push([(ax+bx)/2+nx*o,(ay+by)/2+ny*o],pts[i]);}pts=out;}
 return pts;}
const path=(ctx,pts)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));};

const P={};
// Soft round glow: rich saturated rim around a bright core so it reads on both bright snow/stone by day and dark ground by night.
P.glow={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {r}=polar(x,y);const a=Math.pow(clamp(1-r),1.8),core=smooth(.62,.08,r);return[.78+.22*core,a];});}};

// Hot ember: crisp glowing mote with incandescent core and soft warm halo.
P.ember={w:64,h:64,paint(c){pixels(c,0,0,64,64,(x,y)=>{const {r}=polar(x,y);const core=smooth(.52,.12,r),body=smooth(.82,.32,r),halo=Math.exp(-r*r/.26)*.45;const a=clamp(body*.96+halo)*smooth(1,.88,r);return[.80+.20*core,a];});}};

// Velocity streak: sleek spearhead near the top tapering smoothly into a feathered tail downward for bolts and velocity sparks.
P.streak={w:32,h:128,paint(c){pixels(c,0,0,32,128,(x,y)=>{const t=1-y,dx=(x-.5)*2;
 const tip=smooth(1,.84,t),tail=Math.pow(clamp(t/.80),.72),w=.15+.48*Math.pow(clamp(t/.82),.80)*smooth(1,.78,t*.92);
 const spine=Math.exp(-(dx*dx)/(.10*w*w))*tail*tip,halo=Math.exp(-(dx*dx)/(.58*w*w))*tail*tip*.86;
 const a=clamp(spine+halo)*smooth(0,.05,t);return[.82+.18*spine,a];});}};

// Four-point star flare with soft diagonals, for crit flashes and starlight sparkles.
P.flare={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {dx,dy,r}=polar(x,y);const ray=(u,v)=>Math.exp(-Math.abs(v)*26)*Math.pow(clamp(1-Math.abs(u)),1.4);
 const d1=(dx+dy)/Math.SQRT2,d2=(dx-dy)/Math.SQRT2,core=Math.exp(-r*r/.026),a=Math.max(ray(dx,dy),ray(dy,dx),.50*ray(d1,d2),.50*ray(d2,d1))+core+Math.exp(-r*r/.13)*.50;return[.84+.16*core,clamp(a)*smooth(1,.92,r)];});}};

// Flame tongue flipbook, 4x4 frames of 128: volumetric multi-lobed fire clusters with soft warm-dark outer feathering
// and wide incandescent core so overlapping particles merge into continuous roaring fire instead of isolated teardrops.
P.flame={w:512,h:512,tiles:[4,4],paint(c){const n=valueNoise(11,32),n2=valueNoise(73,32);for(let f=0;f<16;f++){const ox=(f%4)*128,oy=Math.floor(f/4)*128,t=f/16,ph=t*TAU,variant=(f%4)*.62+Math.floor(f/4)*.31;
 pixels(c,ox,oy,128,128,(x,y)=>{const ny=1-y,nx=(x-.5)*2;
  const wave=Math.sin(ny*3.4-ph+variant)*.14*Math.pow(ny,.7)+Math.cos(ny*5.2-ph*2+variant)*.05*ny;
  const turb=(fbm(n,x*3.6+variant,y*3.8+t*6,3)-.5)*.34*Math.pow(ny,.75);
  const cx=wave+turb,dx=nx-cx;
  const base=smooth(.01,.24,ny);
  const width=.82*Math.pow(clamp(1-ny*.78),.82)*(.58+.58*smooth(0,.30,ny));
  const ex=Math.abs(dx)/Math.max(.004,width);
  const lick=fbm(n,x*4.4+1.7+variant*.5,(y+t)*6.5,4),fine=fbm(n2,x*7.5+3.9,(y+t*2)*9.5,3);
  const tongues=Math.sin(nx*5.2+ph+variant)*.14*ny+Math.cos(nx*8.4-ph+variant)*.09*ny;
  const shear=(lick-.46)*(.62+.58*ny)+(fine-.5)*.28*ny+tongues;
  const leftLobe=smooth(.72,.06,Math.abs(dx+width*(.44+.16*ny))/(width*.60))*smooth(.08,.30,ny)*smooth(.92,.38,ny)*smooth(.24,.74,lick);
  const rightLobe=smooth(.72,.06,Math.abs(dx-width*(.42+.18*ny))/(width*.60))*smooth(.10,.34,ny)*smooth(.94,.42,ny)*smooth(.24,.74,fine);
  const sideLobing=(leftLobe*(.68+.28*Math.sin(ph+1.1))+rightLobe*(.68+.28*Math.cos(ph-.8)));
  const edge=ex-shear*.66;
  const mainBody=smooth(1.12,.10,edge)*base*smooth(.98,.58,ny-(lick-.5)*.38-tongues*.36);
  const rawBody=clamp(mainBody+sideLobing*.85);
  const radial=Math.hypot(nx*.95,ny*1.75-.84);
  const softHalo=Math.exp(-(dx*dx)/(.78*width*width+.08))*smooth(.01,.22,ny)*smooth(.96,.18,ny)*.48;
  const alpha=clamp((Math.pow(rawBody,1.35)*.92+softHalo)*smooth(1.0,.72,radial));
  if(alpha<=.002)return[0,0,0,0];
  const coreSpine=smooth(.78,.0,ex)*smooth(.84,.06,ny)*base;
  const vein=smooth(.28,.76,fine)*smooth(.92,.12,ex)*smooth(.90,.08,ny)*.42;
  const heat=clamp(rawBody*.56+coreSpine*.72+vein-ny*.06);
  // Warm dark-crimson outer soot veil -> fiery crimson -> orange-gold -> incandescent white-yellow core
  const r=mix(.42,1.0,smooth(0,.28,heat));
  const g=mix(.08,1.0,Math.pow(clamp((heat-.06)/.84),1.08));
  const b=mix(.02,.92,Math.pow(clamp((heat-.34)/.62),1.55));
  return[r,g,b,alpha];});}}};

// Smoke puff flipbook, 2x2 frames of 128: soft multi-lobed volumetric cloud billows lit from top-left with smooth radial feathering.
P.smoke={w:256,h:256,tiles:[2,2],paint(c){const n=valueNoise(23,64),n2=valueNoise(91,64);for(let f=0;f<4;f++){const ox=(f%2)*128,oy=Math.floor(f/2)*128;
 pixels(c,ox,oy,128,128,(x,y)=>{const {r,dx,dy}=polar(x,y);
  const b=fbm(n,x*3.6+f*8.7,y*3.6+f*4.3,5),detail=fbm(n2,x*7.2+f*3.1,y*7.2+f*6.4,3);
  const env=smooth(.96,.18,r+(b-.5)*.62+(detail-.5)*.18);
  const a=Math.pow(env,1.35)*smooth(1.0,.82,r)*.88;
  if(a<=.002)return[0,0,0,0];
  const sun=clamp(.52-(dx*.42+dy*.38)+(b-.48)*.36+(detail-.5)*.16);
  const light=.44+.52*smooth(.08,.92,sun);
  return[light,a];});}}};

// Shockwave front: soft inner heat gradient rising to a crisp ragged outer ring.
P.shock={w:256,h:256,paint(c){const n=valueNoise(37,32);pixels(c,0,0,256,256,(x,y)=>{const {r,a}=polar(x,y);const j=(fbm(n,(a/TAU+.5)*32,r*6,4)-.5)*.08;const rr=r+j;
 const lip=smooth(.97,.88,rr)*smooth(.38,.86,rr);return[.62+.38*smooth(.78,.92,rr),Math.pow(lip,1.35)];});}};

// Scorch decal: soft feathered burnt ash & soot bed on the ground.
P.scorch={w:256,h:256,paint(c){const n=valueNoise(41,32);pixels(c,0,0,256,256,(x,y)=>{const {r}=polar(x,y);const b=fbm(n,x*6.5,y*6.5,5);
 const a=Math.pow(smooth(.96,.22,r+(b-.5)*.50),1.25)*smooth(1,.84,r)*(.58+.42*b);return[.14+.18*b,a*.88];});}};

// Lightning / flame tendril flipbook, 2x2 frames of 128: jagged branching arcs from left to right with dark-saturated contrast sheath around a bright core.
P.arc={w:256,h:256,tiles:[2,2],paint(c){const arcStroke=(w,draw)=>{c.save();c.lineCap='round';c.lineJoin='round';
 for(const [col,sh,bl,wd,al] of [['#9e92dc','rgba(130,115,210,.88)',6,w*2.6,.90],['#d4ccff','rgba(212,204,255,.94)',3,w*1.6,.96],['#ffffff','rgba(255,255,255,1)',1.5,w,1]]){
  c.strokeStyle=col;c.shadowColor=sh;c.shadowBlur=bl;c.globalAlpha=al;c.lineWidth=wd;draw();}c.restore();};
 for(let f=0;f<4;f++){const r=rng(100+f),ox=(f%2)*128,oy=Math.floor(f/2)*128;c.save();c.beginPath();c.rect(ox,oy,128,128);c.clip();c.translate(ox,oy);
 const main=jagged(r,6,64,122,64,.55,6);arcStroke(2.2,()=>{path(c,main);c.stroke();});
 for(let b=0;b<3;b++){const i=2+Math.floor(r()*(main.length-6)),[sx,sy]=main[i];const br=jagged(r,sx,sy,sx+20+r()*30,sy+(r()-.5)*60,.5,4);arcStroke(1.3,()=>{path(c,br);c.stroke();});}c.restore();}}};

// Shattered 3D tectonic basalt & molten lava crater (512x512):
// Two-tier Voronoi polygonal dark basalt rock slabs (major plates + secondary hairline fractures) separated by
// incandescent yellow-orange-red lava seams, with chiseled 3D rock relief and sunlit slate-basalt facet highlights.
P.crack={w:512,h:512,paint(c){
 const r=rng(77),n1=valueNoise(19,64),n2=valueNoise(53,64);
 const sites=[];
 const rings=[[3,.10,.02],[9,.27,.04],[16,.50,.05],[24,.74,.05],[30,.98,.05]];
 for(const [cnt,rad,jit] of rings){
  for(let i=0;i<cnt;i++){
   const a=(i+(r()-.5)*.48)/cnt*TAU,rr=rad+(r()-.5)*jit*2;
   sites.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr,shade:.14+r()*.16,tx:(r()-.5)*.65,ty:(r()-.5)*.65});
  }
 }
 pixels(c,0,0,512,512,(x,y)=>{
  const {r:rad,a:ang,dx,dy}=polar(x,y);
  if(rad>=.98)return[0,0,0,0];
  // Angular jagged domain warp so fracture lines are sharp and rocky rather than smooth curves
  const w1=fbm(n1,x*7.5,y*7.5,4)-.5,w2=fbm(n2,x*7.5+3.7,y*7.5+1.9,4)-.5;
  const grain=fbm(n1,x*18,y*18,4),fine=fbm(n2,x*36,y*36,3);
  const jag=(Math.abs(w1)-.25)*.08;
  const wx=dx+w1*.10+jag,wy=dy+w2*.10-jag;
  let d1=1e9,d2=1e9,d3=1e9,s1=sites[0],s2=sites[0];
  for(let i=0;i<sites.length;i++){
   const s=sites[i],dd=Math.hypot(wx-s.x,wy-s.y);
   if(dd<d1){d3=d2;d2=d1;s2=s1;d1=dd;s1=s;}
   else if(dd<d2){d3=d2;d2=dd;s2=s;}
   else if(dd<d3){d3=dd;}
  }
  const seam=d2-d1,subSeam=d3-d2;
  const rimJit=(fbm(n1,8+Math.cos(ang)*3.0,8+Math.sin(ang)*3.0,3)-.5)*.14+(grain-.5)*.06;
  const effR=rad+rimJit;
  if(effR>=.94)return[0,0,0,0];
  // Major lava seam width + secondary hairline fracture seams
  const seamW=(.054-.030*smooth(.08,.88,rad))*(.75+.50*grain);
  const mainCrack=smooth(seamW,seamW*.05,seam);
  const subCrack=smooth(.018,.002,subSeam)*smooth(.85,.20,rad)*.65;
  const crackT=Math.max(mainCrack,subCrack);
  const slabMask=smooth(.91,.74,effR);
  const lavaMask=smooth(.94,.78,effR);
  if(crackT>.01){
   const core=smooth(.36,.92,crackT)*smooth(.94,.12,rad*.60);
   const mid=smooth(.04,.56,crackT);
   const lr=mix(.32,1.0,smooth(0,.20,crackT));
   const lg=mix(.06,.98,Math.pow(clamp(mid*.68+core*.42),1.05));
   const lb=mix(.01,.84,Math.pow(core,1.65));
   const la=clamp(mix(slabMask*.95,lavaMask*.98,smooth(0,.4,crackT)));
   if(crackT<.38&&slabMask>.05){
    // Steep 3D chiseled cliff wall between the raised basalt slab and recessed lava channel
    const nx=(s2.x-s1.x),ny=(s2.y-s1.y),nl=Math.hypot(nx,ny)||1;
    const cliffShade=clamp(.5+(nx/nl*.52+ny/nl*.52));
    const bevel=smooth(.38,.02,crackT);
    const wallLum=.08+.24*cliffShade;
    const rr=mix(lr,wallLum*1.25,bevel*.75),rg=mix(lg,wallLum*.62,bevel*.80),rb=mix(lb,wallLum*.45,bevel*.84);
    return[rr,rg,rb,la];
   }
   return[lr,lg,lb,la];
  }
  // Interior of a 3D chiseled tectonic basalt rock slab
  if(slabMask<=.003)return[0,0,0,0];
  const relX=(wx-s1.x)/Math.max(.07,d1+seam),relY=(wy-s1.y)/Math.max(.07,d1+seam);
  // Crisp faceted rock surface normal: sunlit upper-left ridge + dark lower-right shadow
  const ridgeFacet=smooth(-.25,.35,-(relX*.65+relY*.75)+s1.tx*.4+s1.ty*.4+(grain-.5)*.45);
  const microBump=(fine-.5)*.22+(grain-.5)*.26;
  const topLight=clamp(ridgeFacet*.75+microBump+.18);
  // Sharp sunlit rock rim along the top-left lip of each slab + warm orange under-glow along the lava edge
  const sunLip=smooth(seamW*2.4,seamW*1.05,seam)*clamp(-(relX*.6+relY*.7))*.28;
  const seamGlow=smooth(seamW*2.0,seamW,seam)*smooth(.88,.14,rad);
  const baseLum=clamp(s1.shade*(.48+.95*topLight)+sunLip);
  const rCol=clamp(baseLum*1.12+seamGlow*.58);
  const gCol=clamp(baseLum*.94+seamGlow*.21);
  const bCol=clamp(baseLum*.88+seamGlow*.04);
  return[rCol,gCol,bCol,slabMask*.95];
 });
}};

// Rock debris flipbook, 2x2 frames of 64: angular 3D chiseled volcanic/basalt rock boulders with directional lighting
// and a warm molten orange-gold under-rim so flying boulders read as realistic 3D rocks instead of flat cutouts.
P.debris={w:128,h:128,tiles:[2,2],paint(c){
 const n1=valueNoise(307,32);
 const segDist=(px,py,a,b)=>{
  const vx=b[0]-a[0],vy=b[1]-a[1],l2=vx*vx+vy*vy||1,t=clamp(((px-a[0])*vx+(py-a[1])*vy)/l2);
  return Math.hypot(px-(a[0]+t*vx),py-(a[1]+t*vy));
 };
 const inTri=(px,py,a,b,d)=>{
  const v0x=d[0]-a[0],v0y=d[1]-a[1],v1x=b[0]-a[0],v1y=b[1]-a[1],v2x=px-a[0],v2y=py-a[1];
  const dot00=v0x*v0x+v0y*v0y,dot01=v0x*v1x+v0y*v1y,dot02=v0x*v2x+v0y*v2y,dot11=v1x*v1x+v1y*v1y,dot12=v1x*v2x+v1y*v2y;
  const inv=1/(dot00*dot11-dot01*dot01||1),u=(dot11*dot02-dot01*dot12)*inv,v=(dot00*dot12-dot01*dot02)*inv;
  return u>=-.03&&v>=-.03&&u+v<=1.03;
 };
 for(let f=0;f<4;f++){
  const r=rng(600+f*41),ox=(f%2)*64,oy=Math.floor(f/2)*64;
  const nv=7,pts=[];
  const sx=1+(f%2)*.14,sy=.94+Math.floor(f/2)*.12;
  for(let i=0;i<nv;i++){
   const a=i/nv*TAU+(r()-.5)*.26,rad=(19+r()*6.5);
   pts.push([Math.cos(a)*rad*sx,Math.sin(a)*rad*sy]);
  }
  const apex=[(r()-.5)*6-2,(r()-.5)*6-2];
  // Compute lighting per triangular facet from (pts[i], pts[i+1], apex)
  const facetLum=pts.map((p0,i)=>{
   const p1=pts[(i+1)%nv],mx=(p0[0]+p1[0]+apex[0])/3,my=(p0[1]+p1[1]+apex[1])/3,ml=Math.hypot(mx,my)||1;
   const sun=(-mx/ml*.68-my/ml*.73);
   return clamp(.42+sun*.34+(r()-.5)*.08,.18,.82);
  });
  pixels(c,ox,oy,64,64,(x,y)=>{
   const px=(x-.5)*64,py=(y-.5)*64;
   const grain=fbm(n1,x*9+f*4,y*9+f*3,3);
   let inside=false,minEdge=1e9;
   for(let i=0,j=nv-1;i<nv;j=i++){
    const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
    minEdge=Math.min(minEdge,segDist(px,py,pts[j],pts[i]));
   }
   const alpha=inside?clamp(.5+minEdge*.8):clamp(.5-minEdge*.8);
   if(alpha<=.003)return[0,0,0,0];
   let lum=.38;
   for(let i=0;i<nv;i++){if(inTri(px,py,pts[i],pts[(i+1)%nv],apex)){lum=facetLum[i];break;}}
   const rimDark=smooth(5.5,0,minEdge);
   const moltenRim=smooth(5.0,0,minEdge)*smooth(-4,16,px*.45+py*.85)*(.75+.25*grain);
   const base=clamp((lum+(grain-.5)*.14)*(1-rimDark*.32));
   const rc=clamp(base*1.06+moltenRim*.82);
   const gc=clamp(base*.95+moltenRim*.36);
   const bc=clamp(base*.90+moltenRim*.06);
   return[rc,gc,bc,alpha];
  });
 }
}};

// Crescent slash (256x128): razor-sharp leading energy arc with swept-back turbulent ribbon streamers and feathered wake.
P.slash={w:256,h:128,paint(c){const n=valueNoise(83,32),n2=valueNoise(127,32);pixels(c,0,0,256,128,(x,y)=>{
 const px=(x-.5)*2,py=(1-y),r=Math.hypot(px,py),a=Math.atan2(py,px);
 if(a<=0||r>1.02)return[0,0,0,0];
 const sinA=Math.max(0,Math.sin(a)),taper=Math.pow(sinA,.72);
 const stream=fbm(n,(a/Math.PI)*10,r*6,3),fine=fbm(n2,(a/Math.PI)*22,r*10,2);
 const outerR=.94-.04*(1-sinA)+(stream-.5)*.035*taper;
 const innerR=.60-.18*taper+(stream-.5)*.08*taper;
 // Razor-sharp hot leading blade + secondary inner harmonic ribbon + feathered trailing wake
 const leadEdge=Math.exp(-Math.pow((r-(outerR-.038*taper))/(.036+.020*taper),2))*taper;
 const innerRibbon=Math.exp(-Math.pow((r-(innerR+.09*taper))/(.042+.022*taper),2))*taper*(.55+.45*fine);
 const bodyBand=smooth(innerR-.06,innerR+.10,r)*smooth(outerR+.02,outerR-.03,r)*(.62+.38*stream)*taper;
 const alpha=clamp(leadEdge*.98+innerRibbon*.58+bodyBand*.76)*smooth(0,.08,sinA);
 const lum=clamp(.68+.32*clamp(leadEdge+innerRibbon*.45));
 return[lum,alpha];
});}};

// Swirling fireball / energy orb (128x128): dense incandescent core surrounded by tightly wound spiral fire/energy arms
// and a dark-shaded outer corona rim so projectile heads read as 3D blazing spheres on bright snow.
P.orb={w:128,h:128,paint(c){const n=valueNoise(51,32),n2=valueNoise(109,32);pixels(c,0,0,128,128,(x,y)=>{
 const {r,a}=polar(x,y);
 if(r>=1)return[0,0,0,0];
 const swirl=fbm(n,(a/TAU+.5+r*.85)*12,r*5.5,4),detail=fbm(n2,(a/TAU+.5+r*1.1)*20,r*8,3);
 const core=Math.exp(-r*r/.095);
 const arms=smooth(.34,.78,swirl*.72+detail*.28)*smooth(.94,.22,r);
 const body=smooth(.86,.18,r)*(.68+.32*swirl);
 const alpha=clamp((core+arms*.88+body*.72)*smooth(.98,.78,r));
 // Outer corona darkens slightly (.42) so the sphere has a crisp 3D silhouette on white snow, while core is 1.0
 const rimShade=smooth(.92,.48,r);
 const lum=clamp(.38+.62*clamp(core*1.1+arms*.65*rimShade+body*.45*rimShade));
 return[lum,alpha];
});}};

// Fire wisp (64x128): volumetric velocity-aligned fire plume with a full rounded fireball head at top and curling multi-tongue tail.
P.wisp={w:64,h:128,paint(c){const n=valueNoise(61,32),n2=valueNoise(89,32);pixels(c,0,0,64,128,(x,y)=>{const t=1-y,dx=(x-.5)*2;
 const sway=(fbm(n,1.9,y*4.0,3)-.5)*.22*(1-t*.45),b=fbm(n,x*3.6,y*5.6,4),f=fbm(n2,x*7+2.3,y*9,3);
 const env=Math.sin(clamp(t)*Math.PI),w=.16+.54*Math.pow(env,.66)*(1-.14*t);
 const ex=Math.abs(dx-sway+(b-.5)*.32*(1-t*.3))/Math.max(.01,w);
 const body=smooth(1.08,.10,ex)*smooth(.02,.20,t)*smooth(.98,.74,t+(b-.5)*.16)*(.74+.26*f);
 const core=smooth(.58,0,ex)*smooth(.10,.34,t)*smooth(.94,.56,t);
 const alpha=Math.pow(clamp(body*1.16),1.28);
 if(alpha<=.002)return[0,0,0,0];
 const heat=clamp(.42+body*.42+core*.58);
 return[heat,alpha];});}};

// 3D Faceted crystal shard (64x128): compact asymmetric 4-facet crystal prism shaded per-pixel without cartoon black outlines,
// so ASTRAL and RIFT palettes tint it into realistic 3D dark-indigo/violet gemstones with a bright specular facet.
P.shard={w:64,h:128,paint(c){
 const poly=[[-2,-44],[-15,-6],[-11,22],[1,44],[14,10],[12,-16]];
 const apex=[-2,-4],top=[0,-44],bot=[1,44],left=[-15,-6],midL=[-11,22],right=[14,10],midR=[12,-16];
 const inTri=(px,py,a,b,d)=>{
  const v0x=d[0]-a[0],v0y=d[1]-a[1],v1x=b[0]-a[0],v1y=b[1]-a[1],v2x=px-a[0],v2y=py-a[1];
  const dot00=v0x*v0x+v0y*v0y,dot01=v0x*v1x+v0y*v1y,dot02=v0x*v2x+v0y*v2y,dot11=v1x*v1x+v1y*v1y,dot12=v1x*v2x+v1y*v2y;
  const inv=1/(dot00*dot11-dot01*dot01||1),u=(dot11*dot02-dot01*dot12)*inv,v=(dot00*dot12-dot01*dot02)*inv;
  return u>=-.02&&v>=-.02&&u+v<=1.02;
 };
 const segDist=(px,py,a,b)=>{
  const vx=b[0]-a[0],vy=b[1]-a[1],l2=vx*vx+vy*vy||1,t=clamp(((px-a[0])*vx+(py-a[1])*vy)/l2);
  return Math.hypot(px-(a[0]+t*vx),py-(a[1]+t*vy));
 };
 pixels(c,0,0,64,128,(x,y)=>{
  const px=(x-.5)*64,py=(y-.5)*128;
  // Point-in-polygon + soft anti-aliased edge
  let inside=false,minEdge=1e9;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
   if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
   minEdge=Math.min(minEdge,segDist(px,py,poly[j],poly[i]));
  }
  const alpha=inside?clamp(.5+minEdge*.85):clamp(.5-minEdge*.85);
  if(alpha<=.003)return[0,0,0,0];
  // 3D facet shading (top-left bright specular facet, lower-left mid facet, right shadow facets)
  let lum=.42;
  if(inTri(px,py,top,left,apex))lum=.94-.004*Math.hypot(px+6,py+18);
  else if(inTri(px,py,left,midL,apex))lum=.74-.003*Math.hypot(px+8,py-6);
  else if(inTri(px,py,midL,bot,apex))lum=.58-.003*Math.hypot(px+4,py-20);
  else if(inTri(px,py,top,apex,midR))lum=.52-.003*Math.hypot(px-5,py+18);
  else if(inTri(px,py,midR,apex,right))lum=.38-.002*Math.hypot(px-6,py);
  else lum=.28;
  // Subtle crystal ridge highlight along the central spine
  const ridge=Math.min(segDist(px,py,top,apex),segDist(px,py,apex,bot),segDist(px,py,left,apex));
  const spec=smooth(1.8,0,ridge)*.22;
  const rimShade=smooth(0,2.2,minEdge);
  return[clamp((lum+spec)*(.68+.32*rimShade)),alpha];
 });
}};

// Channel-packed RGBA Diablo-style noise mask (256x256, tiles 1x1, seamlessly tileable in X & Y):
//   R = Perlin/FBM turbulent billow noise (soft organic fire & smoke distortion)
//   G = Periodic Voronoi cellular erosion (crisp cellular pockets & ridges for alpha erosion)
//   B = Directional flow/streaks (anisotropic high-velocity streaks for Soulercoaster arcs & pillars)
//   A = Radial silhouette mask (smooth falloff toward quad borders)
P.noise={w:256,h:256,paint(c){
 const n1=valueNoise(401,32),n2=valueNoise(419,64),n3=valueNoise(433,64);
 const G1=8,G2=14,r=rng(457);
 const cells1=Array.from({length:G1*G1},()=>[.15+r()*.70,.15+r()*.70]);
 const cells2=Array.from({length:G2*G2},()=>[.15+r()*.70,.15+r()*.70]);
 const voronoi=(u,v,G,cells)=>{
  const gx=u*G,gy=v*G,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
  let d1=1e9,d2=1e9;
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
   const cx=((ix+ox)%G+G)%G,cy=((iy+oy)%G+G)%G,pt=cells[cy*G+cx];
   const dx=ox+pt[0]-fx,dy=oy+pt[1]-fy,d=Math.hypot(dx,dy);
   if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}
  }
  const cell=clamp(1-d1*.95),ridge=smooth(.02,.32,d2-d1);
  return clamp(cell*.68+ridge*.32);
 };
 pixels(c,0,0,256,256,(x,y)=>{
  const {r:rad}=polar(x,y);
  // R: Seamless multi-octave Perlin/FBM billow
  const b1=fbm(n1,x*8,y*8,4),b2=fbm(n2,x*16+3.1,y*16+1.7,3);
  const chR=clamp(smooth(.16,.84,b1*.68+b2*.32));
  // G: Seamless two-tier Voronoi cellular erosion (warped slightly by n1 for organic fire cells)
  const wx=(x+(b1-.5)*.06+1)%1,wy=(y+(b2-.5)*.06+1)%1;
  const v1=voronoi(wx,wy,G1,cells1),v2=voronoi(wx,wy,G2,cells2);
  const chG=clamp(smooth(.10,.90,v1*.64+v2*.36));
  // B: Seamless directional flow/streaks (anisotropic high-frequency vertical/polar ribbons)
  const s1=fbm(n2,x*24,y*4,4),s2=fbm(n3,x*48+5.2,y*8+2.4,3);
  const wave=.5+.5*Math.sin((x*6+(b1-.5)*.8)*TAU);
  const chB=clamp(smooth(.14,.86,s1*.52+s2*.30+wave*.18));
  // A: Silhouette mask channel (kept >= 0.78 across tile border so WebGL premultiply-on-upload preserves R/G/B seamlessly across fract(uv))
  const chA=clamp(.78+.22*Math.pow(smooth(1.0,.12,rad),1.1)*(.75+.25*chR));
  return[chR,chG,chB,chA];
 });
}};

// High-density 8x8 (64-frame) Sub-UV explosion & roaring flame flipbook (512x512, 64x64 per frame):
// Evolves continuously from a tight white-hot plasma ignition (frames 0..11) -> churning multi-lobed fireball pyre
// with Voronoi-carved soot crevices (frames 12..35) -> tearing flame tongues & dark charcoal soot billows (frames 36..51)
// -> crisp incandescent ember & cinder erosion (frames 52..63).
P.explosion={w:512,h:512,tiles:[8,8],paint(c){
 const n=valueNoise(503,32),n2=valueNoise(547,32),n3=valueNoise(587,32);
 for(let f=0;f<64;f++){
  const ox=(f%8)*64,oy=Math.floor(f/8)*64,t=f/63,ph=t*TAU*1.5;
  const expand=.76+.22*smooth(0,.35,t);
  const erode=smooth(.44,1.0,t);
  pixels(c,ox,oy,64,64,(x,y)=>{
   const {r,a}=polar(x,y);
   if(r>=.98)return[0,0,0,0];
   const angNorm=a/TAU+.5;
   const billow=fbm(n,x*4.2+Math.cos(ph)*.6,y*4.2-t*3.2,4);
   const cell=fbm(n2,x*7.8-Math.sin(ph)*.8,y*7.8-t*5.4,3);
   const streak=fbm(n3,angNorm*16+t*2.2,r*6.5-t*3.8,3);
   const lobeWave=Math.sin(a*5+ph)*.08+Math.cos(a*9-ph*1.3)*.05;
   const effR=r/expand+lobeWave+(billow-.5)*.26+(cell-.5)*.15;
   // Voronoi-style cellular erosion carves out dark crevices and crisp ember islands as t -> 1
   const cellPocket=clamp(billow*.48+cell*.34+streak*.18);
   const rawMask=smooth(.96,.18,effR)*smooth(erode*.66-.10,erode*.66+.26,cellPocket+(1-effR)*.46);
   const alpha=clamp(Math.pow(rawMask,1.18)*smooth(.98,.78,r));
   if(alpha<=.003)return[0,0,0,0];
   const coreFlash=Math.exp(-effR*effR/(.24+.24*(1-erode)))*(1-erode*.68);
   const ridgeHeat=smooth(.20,.80,cellPocket)*smooth(.94,.14,effR)*(1-erode*.30);
   const heat=clamp(coreFlash*.80+ridgeHeat*.72+rawMask*.30);
   // Dark charcoal soot outer crevices -> molten crimson/orange midtones -> white-hot core
   const rCol=mix(.14,1.0,smooth(.02,.30,heat));
   const gCol=mix(.04,1.0,Math.pow(clamp((heat-.08)/.82),1.10));
   const bCol=mix(.02,.92,Math.pow(clamp((heat-.38)/.56),1.50));
   return[rCol,gCol,bCol,alpha];
  });
 }
}};

// High-density 8x8 (64-frame) Sub-UV arcane/void singularity & plasma crackle flipbook (512x512, 64x64 per frame):
// Evolves from a blinding cyan-white singularity flash (frames 0..11) -> swirling violet-indigo void nebula with
// branching arcane lightning filaments (frames 12..35) -> Voronoi-eroded dimensional rift pockets (frames 36..51)
// -> crystalline arcane motes & tendrils (frames 52..63).
P['rift-burst']={w:512,h:512,tiles:[8,8],paint(c){
 const n=valueNoise(607,32),n2=valueNoise(643,32),n3=valueNoise(683,32);
 for(let f=0;f<64;f++){
  const ox=(f%8)*64,oy=Math.floor(f/8)*64,t=f/63,ph=t*TAU*1.8;
  const expand=smooth(0,.18,t)*(.60+.40*smooth(.10,.64,t));
  const erode=smooth(.30,1.0,t);
  pixels(c,ox,oy,64,64,(x,y)=>{
   const {r,a}=polar(x,y);
   if(r>=.98)return[0,0,0,0];
   const angNorm=a/TAU+.5;
   const swirl=fbm(n,(angNorm+r*.55-t*.35)*10,r*5.2-t*2.6,4);
   const cell=fbm(n2,x*8.4+Math.cos(ph)*.7,y*8.4-Math.sin(ph)*.7,3);
   const filament=smooth(.62,.94,fbm(n3,angNorm*18-t*3.0,r*7.5-t*4.2,3));
   const spireWave=Math.sin(a*6+ph)*.08+Math.cos(a*11-ph*1.4)*.05;
   const effR=r/Math.max(.24,expand)+spireWave+(swirl-.5)*.24+(cell-.5)*.16;
   const voronoiCell=clamp(swirl*.46+cell*.36+filament*.32);
   const rawMask=smooth(.96,.16,effR)*smooth(erode*.74-.08,erode*.74+.26,voronoiCell+(1-effR)*.44);
   const ringShock=Math.exp(-Math.pow((effR-(.52+.32*t))/(.09+.05*t),2))*(1-erode*.55)*.65;
   const alpha=clamp((Math.pow(rawMask,1.18)+ringShock)*smooth(.98,.78,r));
   if(alpha<=.003)return[0,0,0,0];
   const coreSingularity=Math.exp(-effR*effR/(.18+.20*(1-erode)))*(1-erode*.65);
   const arcVein=filament*smooth(.92,.12,effR)*(1-erode*.25);
   const energy=clamp(coreSingularity*.82+arcVein*.64+ringShock*.55+smooth(.20,.82,voronoiCell)*smooth(.90,.16,effR)*.52);
   // Deep void abyss edge (#140438) -> electric indigo/violet (#4416b4 -> #7c38ff) -> cyan-white core (#68d8ff -> #eef8ff)
   const rCol=mix(.10,.96,Math.pow(clamp((energy-.04)/.92),1.05));
   const gCol=mix(.02,.98,Math.pow(clamp((energy-.18)/.78),1.18));
   const bCol=mix(.28,1.0,smooth(0,.28,energy));
   return[rCol,gCol,bCol,alpha];
  });
 }
}};

// Shattered 3D arcane obsidian & dimensional rift fracture crater (512x512):
// Two-tier Voronoi polygonal dark void-obsidian slabs separated by glowing cyan-violet arcane leyline fissures,
// providing instant high-contrast dark ground anchoring on bright Stronghold snow.
P['rift-crack']={w:512,h:512,paint(c){
 const r=rng(177),n1=valueNoise(219,64),n2=valueNoise(253,64);
 const sites=[];
 const rings=[[3,.10,.02],[9,.27,.04],[16,.50,.05],[24,.74,.05],[30,.98,.05]];
 for(const [cnt,rad,jit] of rings){
  for(let i=0;i<cnt;i++){
   const a=(i+(r()-.5)*.46)/cnt*TAU,rr=rad+(r()-.5)*jit*2;
   sites.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr,shade:.12+r()*.14,tx:(r()-.5)*.65,ty:(r()-.5)*.65});
  }
 }
 pixels(c,0,0,512,512,(x,y)=>{
  const {r:rad,a:ang,dx,dy}=polar(x,y);
  if(rad>=.98)return[0,0,0,0];
  const w1=fbm(n1,x*7.5,y*7.5,4)-.5,w2=fbm(n2,x*7.5+3.7,y*7.5+1.9,4)-.5;
  const grain=fbm(n1,x*18,y*18,4),fine=fbm(n2,x*36,y*36,3);
  const jag=(Math.abs(w1)-.25)*.08;
  const wx=dx+w1*.10+jag,wy=dy+w2*.10-jag;
  let d1=1e9,d2=1e9,d3=1e9,s1=sites[0],s2=sites[0];
  for(let i=0;i<sites.length;i++){
   const s=sites[i],dd=Math.hypot(wx-s.x,wy-s.y);
   if(dd<d1){d3=d2;d2=d1;s2=s1;d1=dd;s1=s;}
   else if(dd<d2){d3=d2;d2=dd;s2=s;}
   else if(dd<d3){d3=dd;}
  }
  const seam=d2-d1,subSeam=d3-d2;
  const rimJit=(fbm(n1,8+Math.cos(ang)*3.0,8+Math.sin(ang)*3.0,3)-.5)*.14+(grain-.5)*.06;
  const effR=rad+rimJit;
  if(effR>=.94)return[0,0,0,0];
  const seamW=(.054-.030*smooth(.08,.88,rad))*(.75+.50*grain);
  const mainCrack=smooth(seamW,seamW*.05,seam);
  const subCrack=smooth(.018,.002,subSeam)*smooth(.85,.20,rad)*.68;
  const runeRing=Math.exp(-Math.pow((rad-.66)/.018,2))*smooth(.25,.75,grain)*.72;
  const crackT=Math.max(mainCrack,subCrack,runeRing);
  const slabMask=smooth(.91,.74,effR);
  const riftMask=smooth(.94,.78,effR);
  if(crackT>.01){
   const core=smooth(.34,.92,crackT)*smooth(.94,.12,rad*.58);
   const mid=smooth(.04,.56,crackT);
   const lr=mix(.18,.92,Math.pow(clamp(mid*.52+core*.58),1.08));
   const lg=mix(.05,.97,Math.pow(clamp(mid*.38+core*.72),1.15));
   const lb=mix(.42,1.0,smooth(0,.18,crackT));
   const la=clamp(mix(slabMask*.95,riftMask*.98,smooth(0,.4,crackT)));
   if(crackT<.38&&slabMask>.05){
    const nx=(s2.x-s1.x),ny=(s2.y-s1.y),nl=Math.hypot(nx,ny)||1;
    const cliffShade=clamp(.5+(nx/nl*.52+ny/nl*.52));
    const bevel=smooth(.38,.02,crackT);
    const wallLum=.07+.20*cliffShade;
    const rr=mix(lr,wallLum*.62,bevel*.80),rg=mix(lg,wallLum*.48,bevel*.82),rb=mix(lb,wallLum*1.28,bevel*.75);
    return[rr,rg,rb,la];
   }
   return[lr,lg,lb,la];
  }
  if(slabMask<=.003)return[0,0,0,0];
  const relX=(wx-s1.x)/Math.max(.07,d1+seam),relY=(wy-s1.y)/Math.max(.07,d1+seam);
  const ridgeFacet=smooth(-.25,.35,-(relX*.65+relY*.75)+s1.tx*.4+s1.ty*.4+(grain-.5)*.45);
  const microBump=(fine-.5)*.22+(grain-.5)*.26;
  const topLight=clamp(ridgeFacet*.75+microBump+.18);
  const sunLip=smooth(seamW*2.4,seamW*1.05,seam)*clamp(-(relX*.6+relY*.7))*.26;
  const seamGlow=smooth(seamW*2.2,seamW,seam)*smooth(.88,.14,rad);
  const baseLum=clamp(s1.shade*(.44+.92*topLight)+sunLip);
  const rCol=clamp(baseLum*.78+seamGlow*.38);
  const gCol=clamp(baseLum*.72+seamGlow*.32);
  const bCol=clamp(baseLum*1.18+seamGlow*.68);
  return[rCol,gCol,bCol,slabMask*.95];
 });
}};

window.VFX_TEXTURES=Object.fromEntries(Object.entries(P).map(([name,p])=>[name,{w:p.w,h:p.h,tiles:p.tiles??[1,1],render(){const cv=document.createElement('canvas');cv.width=p.w;cv.height=p.h;const ctx=cv.getContext('2d');p.paint(ctx);return cv.toDataURL('image/png');}}]));
})();
