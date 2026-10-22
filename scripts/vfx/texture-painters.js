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
// Per-pixel painter. fn(x,y) returns [luminance 0..1, alpha 0..1] in cell-normalised coordinates.
function pixels(ctx,ox,oy,w,h,fn){const img=ctx.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const [l,a]=fn((x+.5)/w,(y+.5)/h);const i=(y*w+x)*4,v=Math.round(clamp(l)*255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.round(clamp(a)*255);}
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
// Soft round glow: the workhorse for cores, halos and light blooms.
P.glow={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {r}=polar(x,y);const a=Math.pow(clamp(1-r),2.4);return[1,a];});}};
// Hot ember: pin-point white core with a thin halo, reads as a spark at small sizes.
P.ember={w:64,h:64,paint(c){pixels(c,0,0,64,64,(x,y)=>{const {r}=polar(x,y);const core=Math.exp(-r*r/.018),halo=Math.exp(-r*r/.16)*.45;return[.75+.25*core,clamp(core+halo)*smooth(1,.85,r)];});}};
// Velocity streak: bright head at the top, long fading tail downward. NixieFX velocity alignment pins the texture
// top (+Y) to the direction of motion, so every motion texture here points up.
P.streak={w:32,h:128,paint(c){pixels(c,0,0,32,128,(x,y)=>{const t=1-y,dx=(x-.5)*2,head=smooth(1,.9,t),tail=Math.pow(t,1.6),w=.22+.5*t;const a=Math.exp(-(dx*dx)/(w*w*.35))*tail*head;return[.7+.3*Math.exp(-dx*dx*30)*t,a];});}};
// Four-point star flare with faint diagonals, for crit flashes and sparkles.
P.flare={w:128,h:128,paint(c){pixels(c,0,0,128,128,(x,y)=>{const {dx,dy,r}=polar(x,y);const ray=(u,v)=>Math.exp(-Math.abs(v)*38)*Math.pow(clamp(1-Math.abs(u)),1.5);
 const d1=(dx+dy)/Math.SQRT2,d2=(dx-dy)/Math.SQRT2,a=Math.max(ray(dx,dy),ray(dy,dx),.45*ray(d1,d2),.45*ray(d2,d1))+Math.exp(-r*r/.012)+Math.exp(-r*r/.09)*.35;return[1,clamp(a)*smooth(1,.92,r)];});}};
// Flame tongue flipbook, 4x4 frames of 128: fBm-licked teardrop whose noise scrolls upward frame to frame. Hard-edged
// and opaque, so alpha-blended fire stays saturated over the snow; edges are a little darker than the core.
P.flame={w:512,h:512,tiles:[4,4],paint(c){const n=valueNoise(11,64);for(let f=0;f<16;f++){const ox=(f%4)*128,oy=Math.floor(f/4)*128,t=f/16;
 pixels(c,ox,oy,128,128,(x,y)=>{const ny=1-y,nx=(x-.5)*2;const lick=fbm(n,x*5+3.1,(y+t)*6,4),sway=(fbm(n,y*3+t*4,7.7,3)-.5)*.5*ny;
  const width=.8*Math.pow(clamp(1-ny*.92),.75)*(.55+.9*Math.min(1,ny*4));const ex=Math.abs(nx-sway)/Math.max(.001,width);
  const body=smooth(1,.78,ex+(lick-.5)*.9)*smooth(.98,.8,ny+(lick-.5)*.35)*smooth(0,.06,ny);const core=smooth(.7,.1,ex)*smooth(.75,.15,ny);
  return[.8+.2*core,body];});}}};
// Smoke puff flipbook, 2x2 frames of 128: billowy fBm blobs with a lit upper-left.
P.smoke={w:256,h:256,tiles:[2,2],paint(c){const n=valueNoise(23,64);for(let f=0;f<4;f++){const ox=(f%2)*128,oy=Math.floor(f/2)*128;
 pixels(c,ox,oy,128,128,(x,y)=>{const {r,dx,dy}=polar(x,y);const b=fbm(n,x*4+f*9.3,y*4+f*4.1,5);const a=smooth(.95,.25,r+(b-.5)*.8)*.85;const light=.72+.28*clamp(.5-(dx+dy)*.35+b*.3);return[light,a];});}}};
// Thin glowing ring (decals, telegraph edges).
P.ring={w:256,h:256,paint(c){pixels(c,0,0,256,256,(x,y)=>{const {r}=polar(x,y);const d=Math.abs(r-.9);return[1,Math.exp(-d*d/.0006)+Math.exp(-d*d/.006)*.35];});}};
// Shockwave front: sharp outer lip, fading inward, ragged by angular noise.
P.shock={w:256,h:256,paint(c){const n=valueNoise(37,32);pixels(c,0,0,256,256,(x,y)=>{const {r,a}=polar(x,y);const j=(fbm(n,(a/TAU+.5)*32,r*6,4)-.5)*.08;const rr=r+j;
 const lip=smooth(.97,.9,rr)*smooth(.45,.88,rr);return[.6+.4*smooth(.8,.92,rr),Math.pow(lip,1.4)];});}};
// Scorch decal: dark burnt patch with ragged rim (alpha-blended, tinted near black).
P.scorch={w:256,h:256,paint(c){const n=valueNoise(41,32);pixels(c,0,0,256,256,(x,y)=>{const {r}=polar(x,y);const b=fbm(n,x*7,y*7,5);const a=smooth(.98,.35,r+(b-.5)*.55)*(.55+.45*b);return[.12+.2*b,a*.9];});}};
// Ember magic circle: double rim, glyph band, twelve flame rays, hexagram and core ring.
P['sigil-sun']={w:512,h:512,paint(c){const r=rng(7),C=256;c.translate(C,C);
 glowStroke(c,14,3,()=>{c.beginPath();c.arc(0,0,236,0,TAU);c.stroke();c.beginPath();c.arc(0,0,214,0,TAU);c.stroke();c.beginPath();c.arc(0,0,150,0,TAU);c.stroke();c.beginPath();c.arc(0,0,58,0,TAU);c.stroke();});
 glowStroke(c,8,2,()=>{for(let i=0;i<48;i++){const a=i/48*TAU,l=i%4===0?14:7;c.beginPath();c.moveTo(Math.cos(a)*(236-l),Math.sin(a)*(236-l));c.lineTo(Math.cos(a)*236,Math.sin(a)*236);c.stroke();}
  // glyph band: small angular runes between the two rims
  for(let i=0;i<24;i++){const a=(i+.5)/24*TAU;c.save();c.rotate(a);c.translate(0,-182);c.beginPath();const s=11;const k=Math.floor(r()*4);
   if(k===0){c.moveTo(-s,-s);c.lineTo(0,s);c.lineTo(s,-s);}else if(k===1){c.moveTo(0,-s);c.lineTo(0,s);c.moveTo(-s,0);c.lineTo(s*.6,-s*.6);}
   else if(k===2){c.moveTo(-s,s);c.lineTo(-s,-s);c.lineTo(s,-s*.2);c.moveTo(-s,0);c.lineTo(s*.4,s);}else{c.arc(0,0,s*.6,0,TAU);c.moveTo(0,-s);c.lineTo(0,s);}c.stroke();c.restore();}
  // flame rays between core ring and inner rim
  for(let i=0;i<12;i++){const a=i/12*TAU;c.save();c.rotate(a);c.beginPath();c.moveTo(-12,-62);c.quadraticCurveTo(-4,-104,0,-146);c.quadraticCurveTo(4,-104,12,-62);c.stroke();c.restore();}
  // hexagram
  for(const off of [0,Math.PI]){c.beginPath();for(let i=0;i<=3;i++){const a=off+i/3*TAU-Math.PI/2;const px=Math.cos(a)*150,py=Math.sin(a)*150;i?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
 });}};
// Arcane circle for the rift hero: ticked rim, octagram, orbit rings and an inner glyph ring.
P['sigil-hex']={w:512,h:512,paint(c){const r=rng(9),C=256;c.translate(C,C);
 glowStroke(c,14,3,()=>{c.beginPath();c.arc(0,0,238,0,TAU);c.stroke();c.beginPath();c.arc(0,0,196,0,TAU);c.stroke();c.beginPath();c.arc(0,0,92,0,TAU);c.stroke();});
 glowStroke(c,8,2,()=>{for(let i=0;i<72;i++){const a=i/72*TAU,l=i%6===0?18:8;c.beginPath();c.moveTo(Math.cos(a)*(238-l),Math.sin(a)*(238-l));c.lineTo(Math.cos(a)*238,Math.sin(a)*238);c.stroke();}
  for(const rot of [0,Math.PI/4]){c.save();c.rotate(rot);c.strokeRect(-138,-138,276,276);c.restore();}
  for(let i=0;i<4;i++){const a=i/4*TAU+Math.PI/4;c.beginPath();c.arc(Math.cos(a)*196,Math.sin(a)*196,20,0,TAU);c.stroke();}
  for(let i=0;i<16;i++){const a=i/16*TAU;c.save();c.rotate(a);c.translate(0,-70);c.beginPath();const s=8,k=Math.floor(r()*3);
   if(k===0){c.moveTo(-s,0);c.lineTo(0,-s);c.lineTo(s,0);c.lineTo(0,s);c.closePath();}else if(k===1){c.moveTo(0,-s);c.lineTo(0,s);c.moveTo(-s,-s*.3);c.lineTo(s,-s*.3);}else{c.arc(0,0,s*.55,0,TAU);}c.stroke();c.restore();}
  c.beginPath();c.arc(0,0,30,0,TAU);c.stroke();
 });}};
// Lightning / flame tendril flipbook, 2x2 frames of 128: jagged branching arcs from left to right.
P.arc={w:256,h:256,tiles:[2,2],paint(c){for(let f=0;f<4;f++){const r=rng(100+f),ox=(f%2)*128,oy=Math.floor(f/2)*128;c.save();c.beginPath();c.rect(ox,oy,128,128);c.clip();c.translate(ox,oy);
 const main=jagged(r,6,64,122,64,.55,6);glowStroke(c,6,2.2,()=>{path(c,main);c.stroke();});
 for(let b=0;b<3;b++){const i=2+Math.floor(r()*(main.length-6)),[sx,sy]=main[i];const br=jagged(r,sx,sy,sx+20+r()*30,sy+(r()-.5)*60,.5,4);glowStroke(c,4,1.2,()=>{path(c,br);c.stroke();});}c.restore();}}};
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
 const taper=Math.pow(Math.max(0,Math.sin(a)),.7),inner=.98-.2*taper,band=smooth(inner-.04,inner+.04,r)*smooth(1,.96,r),edge=Math.exp(-Math.pow((r-.955)/.022,2));
 return[.75+.25*edge,clamp((band*.7+edge)*taper)];});}};
// Swirling energy orb: spiral arms in polar fBm around a bright core.
P.orb={w:128,h:128,paint(c){const n=valueNoise(51,32);pixels(c,0,0,128,128,(x,y)=>{const {r,a}=polar(x,y);const s=fbm(n,(a/TAU+.5+r*.6)*16,r*5,4);
 const arms=smooth(.45,.8,s)*smooth(1,.4,r);const core=Math.exp(-r*r/.05);return[.7+.3*core,clamp(arms*.9+core+Math.exp(-r*r/.3)*.25)*smooth(1,.9,r)];});}};
// Fire wisp: wide, turbulent velocity-aligned tongue with its head at the top.
P.wisp={w:64,h:128,paint(c){const n=valueNoise(61,32);pixels(c,0,0,64,128,(x,y)=>{const t=1-y,dx=(x-.5)*2,b=fbm(n,x*3,y*6,4),w=.18+.7*Math.pow(1-t,.8)*smooth(1,.75,t)+.12;
 const a=clamp(1.2*smooth(1,.6,Math.abs(dx+(b-.5)*.6*(1-t))/w)*Math.pow(t,.7)*smooth(1,.88,t)*(.7+.3*b));return[1,a];});}};
// Crystal shard: faceted diamond, lighter facet on the left (alpha-blended or additive).
P.shard={w:64,h:128,paint(c){c.translate(32,64);const fill=(pts,col)=>{c.fillStyle=col;path(c,pts);c.closePath();c.fill();};
 fill([[0,-60],[-18,0],[0,60],[18,0]],'#cfd8ff');fill([[0,-60],[-18,0],[0,60]],'#ffffff');fill([[0,-60],[6,0],[0,60],[18,0]],'#8c9bd6');
 c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-60);c.lineTo(0,60);c.stroke();}};

window.VFX_TEXTURES=Object.fromEntries(Object.entries(P).map(([name,p])=>[name,{w:p.w,h:p.h,tiles:p.tiles??[1,1],render(){const cv=document.createElement('canvas');cv.width=p.w;cv.height=p.h;const ctx=cv.getContext('2d');p.paint(ctx);return cv.toDataURL('image/png');}}]));
})();
