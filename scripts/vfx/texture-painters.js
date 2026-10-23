// Particle textures for the NixieFX project in vfx/, painted procedurally in a browser canvas by textures.mjs.
// Every texture is white (or grey-shaded) on transparent: emitters colour them with their own gradients, so one
// texture serves every palette. Flipbooks are square grids read by the textureSheetAnimation module.
(()=>{
const TAU=Math.PI*2;
function rng(seed){let s=seed>>>0;return()=>{s=s+0x6d2b79f5>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Periodic value noise: 'period' cells wrap so tiles and angular bands have no seam.
function valueNoise(seed,period=256){const r=rng(seed),g=new Float32Array(period*period);for(let i=0;i<g.length;i++)g[i]=r();
 const at=(x,y)=>g[((y%period+period)%period)*period+((x%period+period)%period)],sm=t=>t*t*(3-2*t);
 return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=sm(x-xi),yf=sm(y-yi),a=at(xi,yi),b=at(xi+1,yi),c=at(xi,yi+1),d=at(xi+1,yi+1);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;};}
function fbm(n,x,y,oct=4){let v=0,a=.5,f=1,t=0;for(let i=0;i<oct;i++){v+=a*n(x*f,y*f);t+=a;a*=.5;f*=2;}return v/t;}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
// Per-pixel painter. fn(x,y) returns [luminance 0..1, alpha 0..1] or [r, g, b, alpha] in cell-normalised coordinates.
function pixels(ctx,ox,oy,w,h,fn){const img=ctx.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=fn((x+.5)/w,(y+.5)/h),i=(y*w+x)*4;
  if(p.length===4){d[i]=Math.round(clamp(p[0])*255);d[i+1]=Math.round(clamp(p[1])*255);d[i+2]=Math.round(clamp(p[2])*255);d[i+3]=Math.round(clamp(p[3])*255);}
  else{const v=Math.round(clamp(p[0])*255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.round(clamp(p[1])*255);}}
 ctx.putImageData(img,ox,oy);}
const polar=(x,y)=>{const dx=x*2-1,dy=y*2-1;return{r:Math.hypot(dx,dy),a:Math.atan2(dy,dx),dx,dy};};
function glowStroke(ctx,blur,width,draw){ctx.save();ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineCap='round';ctx.lineJoin='round';
 for(const [b,wd,al] of [[blur,width*2.2,.35],[blur*.4,width,1]]){ctx.shadowColor='rgba(255,255,255,'+al+')';ctx.shadowBlur=b;ctx.globalAlpha=al;ctx.lineWidth=wd;draw();}ctx.restore();}
// Jagged polyline from (x0,y0) to (x1,y1) by midpoint displacement.
function jagged(r,x0,y0,x1,y1,rough,depth){let pts=[[x0,y0],[x1,y1]];
 for(let d=0;d<depth;d++){const out=[pts[0]];for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/(len||1),ny=(bx-ax)/(len||1),o=(r()-.5)*len*rough;out.push([(ax+bx)/2+nx*o,(ay+by)/2+ny*o],pts[i]);}pts=out;}
 return pts;}
const path=(ctx,pts)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));};

const P={};
// Soft round glow: rich saturated rim around a bright core so it reads on both bright snow/stone by day and dark ground by night.
P.glow={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {r}=polar(x,y);const a=Math.pow(clamp(1-r),1.8),core=smooth(.62,.08,r);return[.78+.22*core,a];});}};
// Hot ember: crisp dual-tone pixel dot with a wide bright incandescent core (1.0) and a saturated outer rim (.80) so tiny dots pop on bright daylight snow/stone.
P.ember={w:64,h:64,paint(c){pixels(c,0,0,64,64,(x,y)=>{const {r}=polar(x,y);const core=smooth(.56,.16,r),body=smooth(.80,.36,r),halo=Math.exp(-r*r/.24)*.42;const a=clamp(body*.98+halo)*smooth(1,.86,r);return[.80+.20*core,a];});}};
// Velocity streak: conical spearhead near the top tapering smoothly into a sleek tail downward for bolts and velocity sparks.
P.streak={w:32,h:128,paint(c){pixels(c,0,0,32,128,(x,y)=>{const t=1-y,dx=(x-.5)*2;
 const tip=smooth(1,.85,t),tail=Math.pow(clamp(t/.78),.68),w=.14+.50*Math.pow(clamp(t/.82),.82)*smooth(1,.80,t*.92);
 const spine=Math.exp(-(dx*dx)/(.10*w*w))*tail*tip,halo=Math.exp(-(dx*dx)/(.62*w*w))*tail*tip*.88;
 const a=clamp(spine+halo)*smooth(0,.04,t);return[.82+.18*spine,a];});}};
// Four-point star flare with faint diagonals, for crit flashes and sparkles.
P.flare={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {dx,dy,r}=polar(x,y);const ray=(u,v)=>Math.exp(-Math.abs(v)*28)*Math.pow(clamp(1-Math.abs(u)),1.35);
 const d1=(dx+dy)/Math.SQRT2,d2=(dx-dy)/Math.SQRT2,core=Math.exp(-r*r/.028),a=Math.max(ray(dx,dy),ray(dy,dx),.52*ray(d1,d2),.52*ray(d2,d1))+core+Math.exp(-r*r/.14)*.54;return[.82+.18*core,clamp(a)*smooth(1,.92,r)];});}};
// Flame tongue flipbook, 4x4 frames of 128: multi-lobed billowing fire sheets with wide incandescent core and saturated fiery-crimson edge so flames read clearly in bright daylight and glow at night.
P.flame={w:512,h:512,tiles:[4,4],paint(c){const n=valueNoise(11,32),n2=valueNoise(73,32);for(let f=0;f<16;f++){const ox=(f%4)*128,oy=Math.floor(f/4)*128,t=f/16,ph=t*TAU,variant=(f%4)*.55;
 pixels(c,ox,oy,128,128,(x,y)=>{const ny=1-y,nx=(x-.5)*2;
  // Soft S-curve billow that scrolls upward across the 16-frame cycle
  const wave=Math.sin(ny*3.6-ph+variant)*.16*Math.pow(ny,.75)+Math.cos(ny*5.8-ph*2+variant)*.06*ny;
  const turb=(fbm(n,y*3.8+t*7+variant,3.7,3)-.5)*.32*Math.pow(ny,.8);
  const cx=wave+turb,dx=nx-cx;
  // Broad, volumetric flame sheet envelope: full rounded belly tapering into multiple soft rising tongues
  const base=smooth(.02,.22,ny);
  const width=.74*Math.pow(clamp(1-ny*.84),.90)*(.54+.62*smooth(0,.28,ny));
  const ex=Math.abs(dx)/Math.max(.002,width);
  // Upward-scrolling turbulent flame billows and multi-lobe crown
  const lick=fbm(n,x*4.2+1.9+variant*.4,(y+t)*7,4),fine=fbm(n2,x*8+4.1,(y+t*2)*10,3);
  const lobes=Math.sin(nx*4.8+ph+variant)*.12*ny+Math.cos(nx*7.5-ph+variant)*.08*ny;
  const shear=(lick-.46)*(.58+.62*ny)+(fine-.5)*.26*ny+lobes;
  // Broad secondary curling side-lobes that merge into a fuller fire cluster
  const leftLobe=smooth(.64,.05,Math.abs(dx+width*(.48+.18*ny))/(width*.54))*smooth(.1,.32,ny)*smooth(.88,.42,ny)*smooth(.28,.72,lick);
  const rightLobe=smooth(.64,.05,Math.abs(dx-width*(.46+.2*ny))/(width*.54))*smooth(.14,.38,ny)*smooth(.92,.48,ny)*smooth(.28,.72,fine);
  const sideLobing=(leftLobe*(.65+.3*Math.sin(ph+1.1))+rightLobe*(.65+.3*Math.cos(ph-.8)));
  const edge=ex-shear*.68;
  const mainBody=smooth(1.06,.08,edge)*base*smooth(.98,.66,ny-(lick-.5)*.34-lobes*.4);
  const rawBody=clamp(mainBody+sideLobing*.82);
  // Strong body opacity + warm crimson-orange edge so flames stand out against bright snow and sunlit stone without dark soot borders
  const radial=Math.hypot(nx,ny*1.85-.88);
  const halo=Math.exp(-(dx*dx)/(.64*width*width+.06))*smooth(.02,.24,ny)*smooth(.94,.24,ny)*.42;
  const alpha=clamp((Math.pow(rawBody,1.18)+halo)*smooth(1,.80,radial)*.96);
  if(alpha<=.002)return[0,0,0,0];
  // Local temperature (0 = saturated fiery red-orange edge, 1 = incandescent white-gold core)
  const coreSpine=smooth(.82,.0,ex)*smooth(.86,.06,ny)*base;
  const vein=smooth(.26,.76,fine)*smooth(.94,.14,ex)*smooth(.92,.1,ny)*.40;
  const heat=clamp(rawBody*.58+coreSpine*.68+vein-ny*.08);
  const rimShade=.58+.42*smooth(.0,.34,heat);
  const r=rimShade;
  const g=rimShade*(.34+.66*Math.pow(clamp(heat/.82),1.02));
  const b=rimShade*(.08+.90*Math.pow(clamp((heat-.30)/.64),1.45));
  return[r,g,b,alpha];});}}};
// Smoke puff flipbook, 2x2 frames of 128: billowy fBm blobs with a lit upper-left.
P.smoke={w:256,h:256,tiles:[2,2],paint(c){const n=valueNoise(23,64);for(let f=0;f<4;f++){const ox=(f%2)*128,oy=Math.floor(f/2)*128;
 pixels(c,ox,oy,128,128,(x,y)=>{const {r,dx,dy}=polar(x,y);const b=fbm(n,x*4+f*9.3,y*4+f*4.1,5);const a=smooth(.95,.25,r+(b-.5)*.8)*.85;const light=.72+.28*clamp(.5-(dx+dy)*.35+b*.3);return[light,a];});}}};
// Shockwave front: sharp outer lip, fading inward, ragged by angular noise.
P.shock={w:256,h:256,paint(c){const n=valueNoise(37,32);pixels(c,0,0,256,256,(x,y)=>{const {r,a}=polar(x,y);const j=(fbm(n,(a/TAU+.5)*32,r*6,4)-.5)*.08;const rr=r+j;
 const lip=smooth(.97,.9,rr)*smooth(.45,.88,rr);return[.6+.4*smooth(.8,.92,rr),Math.pow(lip,1.4)];});}};
// Scorch decal: dark burnt patch with ragged rim (alpha-blended, tinted near black).
P.scorch={w:256,h:256,paint(c){const n=valueNoise(41,32);pixels(c,0,0,256,256,(x,y)=>{const {r}=polar(x,y);const b=fbm(n,x*7,y*7,5);const a=smooth(.98,.35,r+(b-.5)*.55)*(.55+.45*b);return[.12+.2*b,a*.9];});}};
// Lightning / flame tendril flipbook, 2x2 frames of 128: jagged branching arcs from left to right with dark-saturated contrast sheath around a bright core.
P.arc={w:256,h:256,tiles:[2,2],paint(c){const arcStroke=(w,draw)=>{c.save();c.lineCap='round';c.lineJoin='round';
 for(const [col,sh,bl,wd,al] of [['#9e92dc','rgba(130,115,210,.88)',6,w*2.6,.90],['#d4ccff','rgba(212,204,255,.94)',3,w*1.6,.96],['#ffffff','rgba(255,255,255,1)',1.5,w,1]]){
  c.strokeStyle=col;c.shadowColor=sh;c.shadowBlur=bl;c.globalAlpha=al;c.lineWidth=wd;draw();}c.restore();};
 for(let f=0;f<4;f++){const r=rng(100+f),ox=(f%2)*128,oy=Math.floor(f/2)*128;c.save();c.beginPath();c.rect(ox,oy,128,128);c.clip();c.translate(ox,oy);
 const main=jagged(r,6,64,122,64,.55,6);arcStroke(2.2,()=>{path(c,main);c.stroke();});
 for(let b=0;b<3;b++){const i=2+Math.floor(r()*(main.length-6)),[sx,sy]=main[i];const br=jagged(r,sx,sy,sx+20+r()*30,sy+(r()-.5)*60,.5,4);arcStroke(1.3,()=>{path(c,br);c.stroke();});}c.restore();}}};
// Radial ground cracks with a crumbled rim, for slams and eruptions (glows when tinted and blended additively).
P.crack={w:512,h:512,paint(c){const r=rng(5),C=256;c.translate(C,C);
 glowStroke(c,10,3,()=>{for(let i=0;i<11;i++){const a=i/11*TAU+r()*.3,len=150+r()*80;const pts=jagged(r,Math.cos(a)*18,Math.sin(a)*18,Math.cos(a)*len,Math.sin(a)*len,.35,5);path(c,pts);c.stroke();
  for(let b=0;b<2;b++){const k=3+Math.floor(r()*(pts.length-5)),[sx,sy]=pts[k],ba=a+(r()-.5)*1.4,bl=30+r()*50;path(c,jagged(r,sx,sy,sx+Math.cos(ba)*bl,sy+Math.sin(ba)*bl,.4,3));c.stroke();}}
  c.beginPath();for(let i=0;i<=40;i++){const a=i/40*TAU,rr=34+r()*10;i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.stroke();});}};
// Rock debris flipbook, 2x2 frames of 64: irregular lit chunks (alpha-blended, tinted by the emitter).
P.debris={w:128,h:128,tiles:[2,2],paint(c){for(let f=0;f<4;f++){const r=rng(300+f),cx=(f%2)*64+32,cy=Math.floor(f/2)*64+32,n=6+Math.floor(r()*3),pts=[];
 for(let i=0;i<n;i++){const a=i/n*TAU+r()*.4,rr=14+r()*12;pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.85]);}
 const g=c.createLinearGradient(cx-24,cy-24,cx+20,cy+22);g.addColorStop(0,'#f4efe6');g.addColorStop(.55,'#9a948c');g.addColorStop(1,'#3d3934');
 c.fillStyle=g;path(c,pts);c.closePath();c.fill();c.strokeStyle='rgba(30,26,22,.8)';c.lineWidth=1.5;c.stroke();
 c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.2;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);c.lineTo(cx+(r()-.5)*8,cy+(r()-.5)*8);c.lineTo(pts[3][0],pts[3][1]);c.stroke();}}};
// Crescent slash: a half ring around the bottom-centre of the texture, bulging toward the top (the aim once the
// decal is pinned to it), thickest and brightest at its apex with a hot leading edge, tapering to both ends.
P.slash={w:256,h:128,paint(c){pixels(c,0,0,256,128,(x,y)=>{const px=(x-.5)*2,py=(1-y),r=Math.hypot(px,py),a=Math.atan2(py,px);
 const taper=Math.pow(Math.max(0,Math.sin(a)),.65),inner=.96-.32*taper,band=smooth(inner-.05,inner+.05,r)*smooth(1,.94,r),edge=Math.exp(-Math.pow((r-(inner+.18*taper))/(.045+.025*taper),2));
 return[.80+.20*edge,clamp((band*.92+edge)*taper)];});}};
// Swirling energy orb: spiral arms in polar fBm around a bright core.
P.orb={w:128,h:128,paint(c){const n=valueNoise(51,32);pixels(c,0,0,128,128,(x,y)=>{const {r,a}=polar(x,y);const s=fbm(n,(a/TAU+.5+r*.6)*16,r*5,4);
 const arms=smooth(.45,.8,s)*smooth(1,.4,r);const core=Math.exp(-r*r/.05);return[.7+.3*core,clamp(arms*.9+core+Math.exp(-r*r/.3)*.25)*smooth(1,.9,r)];});}};
// Fire wisp: tapering, turbulent velocity-aligned plume with a bright core spine and dark-saturated contrast rim, head at top.
P.wisp={w:64,h:128,paint(c){const n=valueNoise(61,32),n2=valueNoise(89,32);pixels(c,0,0,64,128,(x,y)=>{const t=1-y,dx=(x-.5)*2;
 const sway=(fbm(n,1.9,y*4.2,3)-.5)*.24*(1-t*.45),b=fbm(n,x*3.6,y*5.8,4),f=fbm(n2,x*7+2.3,y*9,3);
 const env=Math.sin(clamp(t)*Math.PI),w=.18+.52*Math.pow(env,.68)*(1-.18*t);
 const ex=Math.abs(dx-sway+(b-.5)*.34*(1-t*.3))/Math.max(.01,w);
 const body=smooth(1.06,.12,ex)*smooth(.02,.18,t)*smooth(.98,.76,t+(b-.5)*.16)*(.76+.24*f);
 const core=smooth(.62,0,ex)*smooth(.08,.32,t)*smooth(.94,.58,t);
 const alpha=Math.pow(clamp(body*1.22),1.15);
 const rim=.34+.66*smooth(0,.5,core+body*.45);
 return[rim,rim*(.42+.58*core),rim*(.14+.84*Math.pow(core,1.35)),alpha];});}};
// Crystal shard: high-contrast faceted diamond splinter with dark outer bevel and bright specular facet for daylight readability.
P.shard={w:64,h:128,paint(c){c.translate(32,64);const fill=(pts,col)=>{c.fillStyle=col;path(c,pts);c.closePath();c.fill();};
 fill([[0,-60],[-20,0],[0,60],[20,0]],'#6e5ec2');
 fill([[0,-56],[-17,0],[0,56]],'#c4b8ff');
 fill([[0,-56],[-17,0],[0,-4]],'#ffffff');
 fill([[0,-56],[5,0],[0,56],[17,0]],'#8a7ae0');
 c.strokeStyle='rgba(36,20,82,.94)';c.lineWidth=2.4;path(c,[[0,-60],[-20,0],[0,60],[20,0]]);c.closePath();c.stroke();
 c.strokeStyle='rgba(255,255,255,.94)';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-56);c.lineTo(0,56);c.moveTo(-17,0);c.lineTo(5,0);c.stroke();}};

window.VFX_TEXTURES=Object.fromEntries(Object.entries(P).map(([name,p])=>[name,{w:p.w,h:p.h,tiles:p.tiles??[1,1],render(){const cv=document.createElement('canvas');cv.width=p.w;cv.height=p.h;const ctx=cv.getContext('2d');p.paint(ctx);return cv.toDataURL('image/png');}}]));
})();
