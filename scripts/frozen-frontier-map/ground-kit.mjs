import sharp from 'sharp';import fs from 'node:fs/promises';import {M,PX_M,renderBoxes,faceTexture,sample,swapUV} from './iso-solid.mjs';
// Frozen Frontier v3 "grounded" kit: makes the reviewed v1 ruins sit in the snow the way the v2 landmarks already do
// (their art has snow piled at the base and a soft contact shadow; the v1 modules were generated with neither, so
// they looked like stages and props placed on top of the map). Everything is derived from the v1 art itself, so the
// stone, snow and lichen stay the kit's own:
//  - grounded uprights (walls, corners, arches, pillars, stairs, rubble, the raised foundation): a snow bank follows
//    each sprite's base, with tails past its ends and a little AO where the snow meets the stone, over a soft contact
//    shadow cast to the lower right (the kit is lit from the upper left); and one consistent snow cap on every
//    upward-facing top edge (merlons, embrasures, broken ends, capitals, ledges), which replaces the separate v1
//    snow-cap strips (they floated over the crenellations and ran past broken wall ends, so they are retired);
//  - sunk floors (foundation, paving): only the top face, its edge eroded into an irregular outline that disappears
//    under a snow lip, with a shadow inside the far edges, so the floor reads as lying in the ground;
//  - flagstone clusters for paths and loose stone chips for their edges, cut from the paving texture;
//  - snow drifts (lit as a small heightfield) and trampled-snow scuffs, the snow/ground transition under ruins and
//    along trails.
// Pillars, stairs and fallen columns are not reworked v1 art but modelled in true 2:1 isometric (ISO below).
// Seeded and deterministic. Output: public/frozen-frontier/v3/assets/*.png, manifest.json (same format as v1/v2,
// read by build-assets.mjs) and contact-sheet.webp.
//   node scripts/frozen-frontier-map/ground-kit.mjs
const V1='public/frozen-frontier/v1',OUT='public/frozen-frontier/v3',R=4; // R: output px per world px
await fs.mkdir(`${OUT}/assets`,{recursive:true});
const v1=JSON.parse(await fs.readFile(`${V1}/manifest.json`,'utf8')).assets;

// ---- Images: straight-alpha RGBA floats, 0..1.
const blank=(w,h)=>({w,h,d:new Float32Array(w*h*4)});
async function load(file,k){const m=await sharp(file).metadata(),w=Math.round(m.width*k),h=Math.round(m.height*k);
 const {data}=await sharp(file).ensureAlpha().resize(w,h,{kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
 const img=blank(w,h);for(let i=0;i<data.length;i++)img.d[i]=data[i]/255;return img;}
function over(dst,src,ox=0,oy=0){for(let y=0;y<src.h;y++){const dy=y+oy;if(dy<0||dy>=dst.h)continue;for(let x=0;x<src.w;x++){const dx=x+ox;if(dx<0||dx>=dst.w)continue;
 const s=(y*src.w+x)*4,d=(dy*dst.w+dx)*4,sa=src.d[s+3];if(sa<=0)continue;const da=dst.d[d+3],oa=sa+da*(1-sa);
 for(let c=0;c<3;c++)dst.d[d+c]=(src.d[s+c]*sa+dst.d[d+c]*da*(1-sa))/oa;dst.d[d+3]=oa;}}}
// Paint one pixel over what is there.
function put(img,x,y,rgb,a){if(a<=0||x<0||y<0||x>=img.w||y>=img.h)return;a=Math.min(1,a);const d=(y*img.w+x)*4,da=img.d[d+3],oa=a+da*(1-a);
 for(let c=0;c<3;c++)img.d[d+c]=(rgb[c]/255*a+img.d[d+c]*da*(1-a))/oa;img.d[d+3]=oa;}
async function blur(mask,w,h,sigma){const b=Buffer.alloc(w*h);for(let i=0;i<b.length;i++)b[i]=Math.max(0,Math.min(255,Math.round(mask[i]*255)));
 const {data}=await sharp(b,{raw:{width:w,height:h,channels:1}}).blur(Math.max(.3,sigma)).extractChannel(0).raw().toBuffer({resolveWithObject:true});return Float32Array.from(data,v=>v/255);}
function crop(img,pivot,pad=2){let x0=img.w,y0=img.h,x1=-1,y1=-1;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(img.d[(y*img.w+x)*4+3]>.02){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(img.w-1,x1+pad);y1=Math.min(img.h-1,y1+pad);const out=blank(x1-x0+1,y1-y0+1);
 for(let y=0;y<out.h;y++)out.d.set(img.d.subarray(((y+y0)*img.w+x0)*4,((y+y0)*img.w+x1+1)*4),y*out.w*4);return {img:out,pivot:[pivot[0]-x0,pivot[1]-y0]};}
async function save(img,file){const b=Buffer.alloc(img.w*img.h*4);for(let i=0;i<b.length;i++)b[i]=Math.max(0,Math.min(255,Math.round(img.d[i]*255)));
 await sharp(b,{raw:{width:img.w,height:img.h,channels:4}}).png({compressionLevel:9}).toFile(file);}

// ---- Noise.
const hash=(x,y,s)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const vnoise=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
const fbm=(x,y,s,o=4)=>{let t=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){t+=a*vnoise(x*f,y*f,s+i*31);n+=a;a*=.5;f*=2.03;}return t/n;};
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// Snow matched to the map's painted snow (sampled from in-game shots: lit snow about (201, 216, 240), hollows about
// (160, 180, 215)), so banks, lips and halos fade into the ground; only crests and caps catch more light.
const SNOW={crest:[228,236,248],body:[208,222,242],low:[193,210,237],shade:[160,180,214],shadow:[40,54,82]};
const snowAt=(t,n)=>{const c=t<.45?mix(SNOW.crest,SNOW.body,t/.45):mix(SNOW.body,SNOW.low,(t-.45)/.55);return c.map(v=>v+(n-.5)*14);};

// Snow settled on a sprite's upward-facing edges: wherever a column turns from clear to solid going down. Thick on
// flat tops, thin on steep silhouette sides, with a cool shadow line underneath.
function snowCap(img,s){const {w,h}=img,a=(x,y)=>x<0||x>=w||y<0||y>=h?0:img.d[(y*w+x)*4+3],tops=[];
 for(let x=0;x<w;x++){const col=[];for(let y=1;y<h;y++)if(a(x,y-1)<.3&&a(x,y)>=.6)col.push(y);tops.push(col);}
 const near=(x,y)=>{let best=Infinity;for(const t of tops[x]??[])if(Math.abs(t-y)<Math.abs(best-y))best=t;return best;};
 for(let x=0;x<w;x++)for(const y0 of tops[x]){
  const dl=Math.abs(near(x-R,y0)-y0),dr=Math.abs(near(x+R,y0)-y0),flat=clamp(1-Math.min(dl,dr)/(2.2*R)),t=(1.8+1.6*fbm(x/(3*R),y0/(6*R),s+41))*R*(.3+.7*flat);
  if(t<.6*R)continue;
  for(let y=y0-1;y<y0+t+1&&y<h;y++){if(a(x,y)<.5&&y>=y0)break;const k=(y-y0+1)/(t+1),n=fbm(x/(2*R),y/(2*R),s+43);
   if(y>=y0+t){put(img,x,y,SNOW.shade,.45);break;}put(img,x,y,snowAt(k*.55,n),y<y0?.6:1);}}}
// Joints and cracks in the paving fill with snow, so stones read as set into it rather than over dark pits.
const jointSnow=(c,n)=>{const l=(c[0]*.3+c[1]*.59+c[2]*.11)/255;return l<.45?mix(c,snowAt(.7,n),clamp((.45-l)/.3)*.75):c;};

const manifest=[];
function record(id,img,pivot,o){manifest.push({id,file:`assets/${id}.png`,size:[img.w,img.h],pivot:{x:+pivot[0].toFixed(1),y:+pivot[1].toFixed(1)},scale:1/R,widthWorld:+(img.w/R).toFixed(2),
 heightM:o.heightM??0,footprintM:o.footprintM??[1,1],...(o.density?{density:o.density}:{}),source:o.source,recipe:o.recipe});}

// ---- Grounded uprights.
// bank: snow bank height range (world px) against the base; spill: how far it runs out in front; tail: how far it
// trails past the base's ends; gaps: skip the base under openings (arches); band: the base height whose silhouette
// casts the contact shadow.
const GROUNDED={
 'wall-ne':{bank:[7,15],spill:4,tail:12,band:22},'wall-se':{bank:[7,15],spill:4,tail:12,band:22},
 'corner-n':{bank:[8,15],spill:4,tail:10,band:22},'corner-s':{bank:[8,15],spill:4,tail:10,band:22},
 'arch-ne':{bank:[7,13],spill:4,tail:9,band:22,gaps:true},'arch-se':{bank:[7,13],spill:4,tail:9,band:22,gaps:true},
 // Modelled in 2:1 isometric (ISO below); they keep their place here, so every module keeps its noise seed.
 // Their snow cap lies on their top faces (stoneTop): the strip cap combs on 2:1 sloped silhouettes.
 'pillar-intact':{bank:[3,6],spill:3,tail:6,band:16,cap:false},'pillar-broken':{bank:[2,4],spill:3,tail:6,band:14,cap:false},
 'stairs-ne':{bank:[2,4],spill:4,tail:8,band:10,cap:false},'stairs-nw':{bank:[2,4],spill:4,tail:8,band:10,cap:false},
 'rubble':{bank:[4,8],spill:3,tail:7,band:12},'foundation':{bank:[2,4],spill:2,tail:3,band:8,cap:false},
};
let seed=11;
// iso: a piece modelled in true 2:1 isometric (isoPieces below) instead of a v1 export: {img, pivot, heightM, footprintM}.
async function grounded(id,o,iso){
 const a=iso?{scale:1/R,pivot:{x:iso.pivot[0],y:iso.pivot[1]},heightM:iso.heightM,footprintM:iso.footprintM}:v1.find(x=>x.id===id),k=a.scale*R,
  src=iso?iso.img:await load(`${V1}/${a.file}`,k),L=8*R,RP=24*R,B=12*R,w=src.w+L+RP,h=src.h+B,s=seed+=101;
 const sprite=blank(w,h);over(sprite,src,L,0);const pivot=[a.pivot.x*k+L,a.pivot.y*k];
 const A=i=>sprite.d[i*4+3];
 if(o.cap!==false)snowCap(sprite,s);
 // Base profile: the lowest solid pixel of each column, median-smoothed.
 let bot=new Float32Array(w).fill(-1);for(let x=0;x<w;x++)for(let y=h-1;y>=0;y--)if(A(y*w+x)>.6){bot[x]=y;break;}
 {const m=new Float32Array(bot),r=R;for(let x=0;x<w;x++){const win=[];for(let i=-r;i<=r;i++){const v=bot[x+i];if(v>=0)win.push(v);}m[x]=bot[x]<0?-1:win.sort((p,q)=>p-q)[win.length>>1];}bot=m;}
 if(o.gaps){// The ground line is the lower hull of the profile; columns well above it look through an opening.
  const pts=[];for(let x=0;x<w;x++)if(bot[x]>=0)pts.push([x,bot[x]]);const hull=[];
  for(const p of pts){while(hull.length>1){const [p1,p2]=hull.slice(-2);if((p2[0]-p1[0])*(p[1]-p1[1])-(p2[1]-p1[1])*(p[0]-p1[0])>=0)hull.pop();else break;}hull.push(p);}
  const line=x=>{for(let i=0;i+1<hull.length;i++)if(x>=hull[i][0]&&x<=hull[i+1][0])return hull[i][1]+(hull[i+1][1]-hull[i][1])*(x-hull[i][0])/((hull[i+1][0]-hull[i][0])||1);return -1;};
  for(let x=0;x<w;x++)if(bot[x]>=0&&bot[x]<line(x)-9*R)bot[x]=-1;
 }
 // Runs of grounded columns, extended by tails that follow the base's slope out onto the snow.
 const base=new Float32Array(w).fill(-1),wt=new Float32Array(w);
 for(let x=0;x<w;){if(bot[x]<0){x++;continue;}let e=x;while(e+1<w&&bot[e+1]>=0)e++;
  for(let i=x;i<=e;i++){base[i]=bot[i];wt[i]=1;}
  const n=Math.min(8*R,e-x),sl=n?(bot[x+n]-bot[x])/n:0,sr=n?(bot[e]-bot[e-n])/n:0,T=o.tail*R;
  for(let i=1;i<=T;i++){const f=1-i/T,q=f*f*(3-2*f);if(x-i>=0&&q>wt[x-i]){base[x-i]=bot[x]-sl*i;wt[x-i]=q;}if(e+i<w&&q>wt[e+i]){base[e+i]=bot[e]+sr*i;wt[e+i]=q;}}
  x=e+1;}
 // Contact shadow: the base band's silhouette, cast down-right and softened, plus a little ambient occlusion.
 const band=new Float32Array(w*h);for(let x=0;x<w;x++){if(bot[x]<0)continue;for(let y=Math.max(0,bot[x]-o.band*R);y<=bot[x];y++)band[y*w+x]=A(y*w+x)>.5?1:0;}
 const cast=new Float32Array(w*h),dx=5*R,dy=Math.round(2.5*R);for(let y=0;y+dy<h;y++)for(let x=0;x+dx<w;x++)cast[(y+dy)*w+x+dx]=band[y*w+x];
 const sh=await blur(cast,w,h,3.5*R),ao=await blur(band,w,h,2*R);
 const out=blank(w,h);for(let i=0;i<w*h;i++){const v=Math.min(1,sh[i]*.85+ao[i]*.5)*.5;out.d[i*4]=SNOW.shadow[0]/255;out.d[i*4+1]=SNOW.shadow[1]/255;out.d[i*4+2]=SNOW.shadow[2]/255;out.d[i*4+3]=v;}
 // AO on the stone just above the bank's crest.
 const crest=new Float32Array(w).fill(-1);
 for(let x=0;x<w;x++){if(base[x]<0)continue;const hh=(o.bank[0]+(o.bank[1]-o.bank[0])*fbm(x/(14*R),0,s))*R*wt[x];crest[x]=base[x]-hh+(fbm(x/(2.5*R),3,s+7)-.5)*2.2*R*wt[x];}
 for(let x=0;x<w;x++){if(crest[x]<0||wt[x]<.05)continue;for(let y=Math.max(0,Math.floor(crest[x]-3*R));y<crest[x];y++){const i=y*w+x;if(A(i)<.1)continue;const f=.3*(1-(crest[x]-y)/(3*R))*wt[x];
  sprite.d[i*4]*=1-f*1.1;sprite.d[i*4+1]*=1-f;sprite.d[i*4+2]*=1-f*.75;}}
 over(out,sprite);
 // The snow bank itself, shaded crest to foot, darker where the cast shadow falls on it.
 for(let x=0;x<w;x++){if(base[x]<0||wt[x]<.03)continue;const sp=o.spill*R*(.6+.8*fbm(x/(9*R),1,s+5))*Math.max(wt[x],.35),top=crest[x],foot=base[x]+sp,span=Math.max(1,foot-top);
  for(let y=Math.floor(top);y<=Math.ceil(foot)+1&&y<h;y++){if(y<0)continue;let al=clamp(y+1-top);
   if(y>base[x])al*=clamp((1-(y-base[x])/sp)*1.4+(fbm(x/(3*R),y/(3*R),s+9)-.5)*.8);
   al*=clamp(wt[x]*1.6);if(al<=0)continue;
   const t=(y-top)/span,n=fbm(x/(3*R),y/(3*R),s+13),rim=y-top<1.2*R?.5*(1-(y-top)/(1.2*R)):0;
   let c=mix(snowAt(t,n),[253,254,255],rim);c=mix(c,SNOW.shade,clamp(sh[y*w+x]*.55));c=c.map(v=>v+(hash(x,y,s)-.5)*6);put(out,x,y,c,al);}}
 const {img,pivot:p}=crop(out,pivot);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:a.heightM,footprintM:a.footprintM,source:iso?iso.source:`${V1}/${a.file}`,recipe:{kind:'grounded',...o,...(iso?{iso:iso.recipe}:{})}});
}

// ---- Sunk floors: the top face only, eroded to an irregular outline under a snow lip.
// face: the top face's diamond in source px [cx, cy, half width, half height]; squash: vertical factor that brings
// the face to 2:1; edge: the outline's mean radius (1 = the face's own edge) and how far it wanders.
async function sunk(id,o){
 const a=v1.find(x=>x.id===o.from),k=a.scale*R,src=await load(`${V1}/${a.file}`,k),sq=o.squash??1;
 const img0=sq===1?src:await (async()=>{const b=Buffer.alloc(src.w*src.h*4);for(let i=0;i<b.length;i++)b[i]=Math.round(src.d[i]*255);
  const nh=Math.round(src.h*sq),{data}=await sharp(b,{raw:{width:src.w,height:src.h,channels:4}}).resize(src.w,nh,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
  const im=blank(src.w,nh);for(let i=0;i<data.length;i++)im.d[i]=data[i]/255;return im;})();
 const [cx,cy,hw,hh]=[o.face[0]*k,o.face[1]*k*sq,o.face[2]*k,o.face[3]*k*sq],s=seed+=101,lip=o.lip??.07,M=Math.ceil(hw*lip*2)+4;
 const w=img0.w+2*M,h=img0.h+2*M,out=blank(w,h),C=[cx+M,cy+M];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const ex=(x-C[0])/hw,ey=(y-C[1])/hh,dn=Math.abs(ex)+Math.abs(ey),ang=Math.atan2(ey,ex);
  // Outline: low-frequency wander plus a few deeper bites.
  let r=o.edge[0]-o.edge[1]*fbm(x/(30*R),y/(30*R),s);for(const b of o.bites??[]){const d=Math.hypot(ex-b[0],ey-b[1]);r-=b[2]*smooth(b[3],0,d);}
  r+=(fbm(Math.cos(ang)*3+5,Math.sin(ang)*3+5,s+3)-.5)*.05;
  const sx=x-M,sy=y-M,si=(sy*img0.w+sx)*4,inSrc=sx>=0&&sy>=0&&sx<img0.w&&sy<img0.h;
  if(dn<r&&inSrc&&img0.d[si+3]>.5){
   const e=(r-dn)/.13;let c=jointSnow([img0.d[si]*255,img0.d[si+1]*255,img0.d[si+2]*255],fbm(x/(2*R),y/(2*R),s+7));
   // Shadow cast by the far lip onto the stone (far = upper edges), a touch of grime all round the edge.
   const far=clamp(.5-ey*1.6),dark=.26*clamp(1-e/.38)*far+.08*clamp(1-e);c=c.map((v,i)=>v*(1-dark*(i===2?.8:1)));
   // Holes (missing slabs) and drifted snow.
   const hole=o.holes?smooth(o.holes,o.holes+.06,fbm(x/(9*R),y/(9*R),s+21)):0;
   const n=fbm(x/(4*R),y/(4*R),s+5),snow=clamp(Math.max(smooth(1,0,e)*(.35+1.1*(n-.5)+.5),hole,o.drift?smooth(o.drift,o.drift+.08,fbm(x/(16*R),y/(16*R),s+9))*clamp(.5+(n-.5)*2):0));
   c=mix(c,snowAt(.25+.5*(1-e),n),snow);put(out,x,y,c,1);
  }else if(dn<r+lip){// The snow lip the floor lies under: bright crest, cool on the far side.
   const t=(dn-r)/lip,n=fbm(x/(3*R),y/(3*R),s+11);let al=Math.pow(1-t,1.4)*clamp(.75+(n-.5)*1.2);
   if(!inSrc||img0.d[si+3]<.5)al*=clamp(1-t*1.6);const c=mix(snowAt(.15+t*.6,n),SNOW.low,clamp(-ey*.8)*(1-t)*.6);put(out,x,y,c,al);}
 }
 const {img,pivot:p}=crop(out,C);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:0,footprintM:o.footprintM,source:`${V1}/${a.file}`,recipe:{kind:'sunk',...o}});
}

// ---- Flagstone clusters and stone chips cut from the paving (squashed to 2:1).
const PAVING={from:'paving',face:[384,265,383,263],squash:.728};
async function pavingTexture(){const a=v1.find(x=>x.id==='paving'),k=a.scale*R,src=await load(`${V1}/${a.file}`,k);
 const b=Buffer.alloc(src.w*src.h*4);for(let i=0;i<b.length;i++)b[i]=Math.round(src.d[i]*255);const nh=Math.round(src.h*PAVING.squash);
 const {data}=await sharp(b,{raw:{width:src.w,height:src.h,channels:4}}).resize(src.w,nh,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
 const im=blank(src.w,nh);for(let i=0;i<data.length;i++)im.d[i]=data[i]/255;return {im,C:[PAVING.face[0]*k,PAVING.face[1]*k*PAVING.squash]};}
const pave=await pavingTexture();
// A round-ish patch of flagstones on the ground plane (a: half width in world px), edge broken by noise and snow.
async function flagstones(id,o){
 const {im,C}=pave,s=seed+=101,A=o.a*R,Bq=A*o.b,M=Math.ceil(A*.25),w=Math.ceil(2*A+2*M),h=Math.ceil(Bq+2*M),out=blank(w,h),c0=[w/2,h/2];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=(x-c0[0])/A,gy=(y-c0[1])/(Bq/2),d=Math.hypot(gx,gy),ang=Math.atan2(gy,gx);
  const r=1-.3*fbm(Math.cos(ang)*2.2+o.off[0],Math.sin(ang)*2.2+o.off[1],s)-.12*fbm(x/(6*R),y/(6*R),s+1);
  const sx=Math.round(C[0]+o.off[0]*R*10+(x-c0[0])),sy=Math.round(C[1]+o.off[1]*R*5+(y-c0[1])),si=(sy*im.w+sx)*4;
  const ok=sx>=0&&sy>=0&&sx<im.w&&sy<im.h&&im.d[si+3]>.5;
  if(d<r&&ok){const e=(r-d)/.3,n=fbm(x/(3.5*R),y/(3.5*R),s+5);let c=jointSnow([im.d[si]*255,im.d[si+1]*255,im.d[si+2]*255],n);
   const far=clamp(.5-gy*.8);c=c.map((v,i)=>v*(1-(.12*clamp(1-e/.5)*far+.04)*(i===2?.8:1)));
   const hole=smooth(.66,.72,fbm(x/(7*R),y/(7*R),s+21)),snow=clamp(Math.max(smooth(1,0,e)*(.3+1.2*(n-.5)+.45),hole));
   put(out,x,y,mix(c,snowAt(.3+.4*(1-e),n),snow),1);}
  else if(d<r+.14){const t=(d-r)/.14,n=fbm(x/(3*R),y/(3*R),s+11);put(out,x,y,snowAt(.55+t*.45,n),Math.pow(1-t,1.8)*clamp(.7+(n-.5)*1.4)*.5);}
 }
 const {img,pivot:p}=crop(out,c0);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:0,footprintM:[o.a*2/43,o.a*o.b/43],source:`${V1}/assets/paving.png`,recipe:{kind:'flagstones',...o}});
}
// A few broken stones lying in the snow, each with a dusting of snow and a small shadow.
async function chips(id,o){
 const {im,C}=pave,s=seed+=101,w=o.w*R,h=o.h*R,out=blank(w,h),shadow=new Float32Array(w*h),stones=[];
 for(let i=0;i<o.n;i++){const r=(o.r[0]+(o.r[1]-o.r[0])*hash(i,1,s))*R,x=r*1.2+hash(i,2,s)*(w-r*2.4),y=r*.7+hash(i,3,s)*(h-r*1.4-2*R);stones.push({x,y,r,sx:C[0]+(hash(i,4,s)-.5)*300,sy:C[1]+(hash(i,5,s)-.5)*150});}
 stones.sort((p,q)=>p.y-q.y);
 for(const st of stones)for(let y=Math.floor(st.y-st.r);y<st.y+st.r;y++)for(let x=Math.floor(st.x-st.r*1.3);x<st.x+st.r*1.3;x++){const d=Math.hypot((x-st.x)/(st.r*1.25),(y-st.y)/(st.r*.6));
  const xx=Math.round(x+2*R),yy=Math.round(y+1.2*R);if(d<1.1&&xx<w&&yy<h&&xx>=0&&yy>=0)shadow[yy*w+xx]=1;}
 const sh=await blur(shadow,w,h,1.6*R);for(let i=0;i<w*h;i++)put(out,i%w,(i/w)|0,SNOW.shadow,sh[i]*.42);
 for(const st of stones)for(let y=Math.floor(st.y-st.r);y<st.y+st.r;y++)for(let x=Math.floor(st.x-st.r*1.3);x<st.x+st.r*1.3;x++){
  const gx=(x-st.x)/(st.r*1.25),gy=(y-st.y)/(st.r*.6),ang=Math.atan2(gy,gx),d=Math.hypot(gx,gy),edge=.75+.35*fbm(Math.cos(ang)*1.7+st.x,Math.sin(ang)*1.7,s);
  if(d>=edge)continue;const sx=Math.round(st.sx+x-st.x),sy=Math.round(st.sy+y-st.y),si=(sy*im.w+sx)*4;if(sx<0||sy<0||sx>=im.w||sy>=im.h)continue;
  // Lit from the upper left: lighter top-left, a darker front face along the lower edge.
  let c=[im.d[si]*255,im.d[si+1]*255,im.d[si+2]*255];const lit=1+.18*clamp(-gx*.5-gy*.7),front=gy>.35*edge?.72:1;c=c.map(v=>v*lit*front);
  const n=fbm(x/(2*R),y/(2*R),s+3);if(gy<0&&n>.52)c=mix(c,SNOW.crest,clamp((n-.52)*4)*.85);put(out,x,y,c,clamp((edge-d)*R*1.5));}
 const {img,pivot:p}=crop(out,[w/2,h*.6]);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:.15,footprintM:[o.w/43,o.h/43],source:`${V1}/assets/paving.png`,recipe:{kind:'chips',...o}});
}

// ---- Snow drifts: a heightfield mound on the ground plane, splatted back to front and lit from the upper left.
// a, b: ground half-axes in world px (b along the screen's depth), axis: 'ne'|'se'|'round', hmax: crest height.
async function drift(id,o){
 const s=seed+=101,A=o.a*R,Bq=o.b*R,H=o.hmax*R,cs=Math.SQRT1_2,w=Math.ceil(2.4*A+8*R),h=Math.ceil(1.4*A+H+8*R),out=blank(w,h),c0=[w/2,h-Math.ceil(.7*A)-4*R];
 const rot=o.axis==='ne'?-Math.atan(.5):o.axis==='se'?Math.atan(.5):0,L=[-.55,-.5,.68],ln=Math.hypot(...L);
 const height=(gx,gy)=>{const u=(gx*Math.cos(rot)+gy*Math.sin(rot))/A,v=(-gx*Math.sin(rot)+gy*Math.cos(rot))/Bq,ang=Math.atan2(v,u),d=Math.hypot(u,v)/(1-.25*fbm(Math.cos(ang)*2+3,Math.sin(ang)*2,s));
  return d>=1?0:H*Math.pow(1-d*d,1.3)*(.75+.5*fbm(u*2.5,v*2.5,s+3));};
 const zb=new Float32Array(w*h).fill(-1e9);
 // Ground y runs toward the viewer; screen = (gx, gy/2 - z). Splat front-to-back order doesn't matter with a z test on ground y.
 for(let gy=-1.2*A;gy<=1.2*A;gy+=.5)for(let gx=-1.2*A;gx<=1.2*A;gx+=.5){const z=height(gx,gy);if(z<=0)continue;
  const nx=-(height(gx+1,gy)-height(gx-1,gy))/2,ny=-(height(gx,gy+1)-height(gx,gy-1))/2,nl=Math.hypot(nx,ny,1),lit=(nx*L[0]+ny*L[1]+L[2])/(nl*ln);
  const x=Math.round(c0[0]+gx),y=Math.round(c0[1]+gy/2-z);if(x<0||y<0||x>=w||y>=h)continue;const i=y*w+x;if(gy<=zb[i])continue;zb[i]=gy;
  const n=fbm(gx/(3*R),gy/(3*R),s+5);let c=mix(SNOW.shade,SNOW.crest,clamp(.25+lit*.85+(n-.5)*.15));c=c.map(v=>v+(hash(x,y,s)-.5)*5);
  out.d[i*4]=c[0]/255;out.d[i*4+1]=c[1]/255;out.d[i*4+2]=c[2]/255;out.d[i*4+3]=clamp(z/(1.2*R));}
 // A faint cool shadow on the lee (lower right) side.
 const m=new Float32Array(w*h);for(let i=0;i<w*h;i++)m[i]=out.d[i*4+3]>.5?1:0;const cast=new Float32Array(w*h);for(let y=0;y+R<h;y++)for(let x=0;x+3*R<w;x++)cast[(y+R)*w+x+3*R]=m[y*w+x];
 const sh=await blur(cast,w,h,2.5*R),fin=blank(w,h);for(let i=0;i<w*h;i++)put(fin,i%w,(i/w)|0,SNOW.shade,sh[i]*.35);over(fin,out);
 const {img,pivot:p}=crop(fin,c0);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:o.hmax/37,footprintM:[o.a*2/43,o.b*2/43],density:1.6,source:'procedural',recipe:{kind:'drift',...o}});
}
// ---- Trampled snow: a soft patch of packed snow with frozen earth and dry grass showing through.
async function scuff(id,o){
 const s=seed+=101,A=o.a*R,Bq=o.b*R,w=Math.ceil(2*A),h=Math.ceil(Bq),out=blank(w,h),c0=[w/2,h/2];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const gx=(x-c0[0])/A,gy=(y-c0[1])/(Bq/2),ang=Math.atan2(gy,gx),d=Math.hypot(gx,gy)/(1-.35*fbm(Math.cos(ang)*2.5+s%7,Math.sin(ang)*2.5,s));
  if(d>=1)continue;const f=smooth(1,.55,d),n=fbm(x/(7*R),y/(7*R),s+3),m=fbm(x/(2.5*R),y/(2.5*R),s+5);
  put(out,x,y,mix([196,205,217],[178,186,196],n),f*(.38+.3*(m-.5)));
  const earth=smooth(.56,.66,n*.7+m*.3)*f;if(earth>0)put(out,x,y,mix([122,120,108],[146,140,124],m),earth*.55);}
 // Dry grass flecks and pebbles.
 for(let i=0;i<o.grass;i++){const gx=(hash(i,1,s)*2-1)*.8,gy=(hash(i,2,s)*2-1)*.8;if(gx*gx+gy*gy>.64)continue;const x0=c0[0]+gx*A,y0=c0[1]+gy*Bq/2,len=(1.5+hash(i,3,s)*2.5)*R,lean=(hash(i,4,s)-.5)*1.2;
  const c=mix([176,142,86],[204,176,120],hash(i,5,s));for(let t=0;t<len;t++)put(out,Math.round(x0+lean*t),Math.round(y0-t),c,.8*(1-t/len*.5));}
 for(let i=0;i<o.pebbles;i++){const gx=(hash(i,7,s)*2-1)*.75,gy=(hash(i,8,s)*2-1)*.75;if(gx*gx+gy*gy>.56)continue;const x0=Math.round(c0[0]+gx*A),y0=Math.round(c0[1]+gy*Bq/2),r=Math.round((.6+hash(i,9,s))*R*.6);
  for(let y=-r;y<=r;y++)for(let x=-2*r;x<=2*r;x++)if(x*x/4+y*y<=r*r)put(out,x0+x,y0+y,y<0?[150,146,140]:[96,94,96],.85);}
 const {img,pivot:p}=crop(out,c0);await save(img,`${OUT}/assets/${id}.png`);
 record(id,img,p,{heightM:0,footprintM:[o.a*2/43,o.b/43],density:1.2,source:'procedural',recipe:{kind:'scuff',...o}});
}

// ---- Pillars, stairs and fallen columns in true 2:1 isometric (iso-solid.mjs). The v1 pillars were drawn face-on
// (one flat front, a rectangular plinth) and the v1 stairs in perspective (steep, non-parallel step edges), so they
// read as cut-outs beside the 2:1 walls and floors. They are modelled here as stone blocks on the map grid instead:
// a square shaft with two visible faces on diamond plinths and capital, flights whose step edges run parallel to the
// edge they climb onto, and fallen shaft pieces. The stone is the v1 pillar's own (its face-on shaft and carved
// capital band), the top faces the paving's, lit like the walls (iso-solid.mjs LIGHT); grounded() then adds the same
// snow bank, contact shadow and snow cap as every other upright.
const pillarArt=await load(`${V1}/assets/pillar-intact.png`,1);
// Face-on windows of the v1 pillar: the shaft's front face (its right edge is the shaft's corner) and the carved band.
const SHAFT=faceTexture(pillarArt,{x0:160,x1:422,yt:470,yb:1592,ppm:500}),SHAFT_BARE=faceTexture(pillarArt,{x0:160,x1:422,yt:470,yb:1592,ppm:500,desnow:true}),ORNAMENT=faceTexture(pillarArt,{x0:142,x1:438,yt:302,yb:418,ppm:480});
const tri=(x,a)=>{let m=(x+a)%(4*a);if(m<0)m+=4*a;return m<2*a?m-a:3*a-m;};
// Top faces sample the paving (already a 2:1 ground-plane texture) at the face's own map position, with snow lying
// on them: snow sets the cover, back (m) piles more against the back edges, where wind leaves it and nobody treads.
// Snow settles thickest along the back edges, where it crests (the walls' cap seen from above).
const stoneTop=(snow,s,{back=0,off=[0,0]}={})=>(u,v,b)=>{
 const x=(u-v)*64*R+off[0],y=(u+v)*32*R+off[1],n=fbm(u*26+s%9,v*26,s),m=fbm(u*70,v*70,s+3);
 const c=jointSnow(sample(pave.im,pave.C[0]+tri(x,300),pave.C[1]+tri(y,140)).slice(0,3),m);
 const e=Math.min(u-b.u0,v-b.v0)*64,bk=back?clamp(1-Math.min(u-b.u0,v-b.v0)/M/back):0,cov=smooth(.5,.62,snow+(n-.5)*.8+bk*.4+(e<1.2?.25:0));
 return mix(c,snowAt(e<.8?0:.12+.45*(1-bk)*m,m),cov);};
const side=(tex,{dt=0,ds=0,k=1}={})=>(f,s,t)=>tex(s+ds,t+dt).slice(0,3).map(x=>x*k);
// A square block centred on the pivot: half side h (m), from z0 to z1 (m); texture t counts from its own foot.
const sq=(h,z0,z1,o)=>({u0:-h*M,v0:-h*M,u1:h*M,v1:h*M,z0:z0*PX_M,z1:z1*PX_M,tref:z0*PX_M,...o});
function pillar(broken){
 const base=[sq(.44,0,.17,{side:side(SHAFT,{dt:.31}),top:stoneTop(.3,71,{back:.1})}),sq(.36,.17,.32,{side:side(SHAFT,{dt:.62}),top:stoneTop(.3,73,{back:.1})})];
 if(!broken)return [...base,sq(.27,.32,2.0,{side:side(SHAFT),top:stoneTop(.9,75)}),sq(.31,2.0,2.06,{side:side(SHAFT,{dt:.95,k:1.04}),top:stoneTop(.55,77)}),
  sq(.31,2.06,2.27,{side:side(ORNAMENT),top:stoneTop(.6,79)}),sq(.39,2.27,2.42,{side:side(SHAFT,{dt:.4}),top:stoneTop(.62,81,{back:.25})})];
 // The broken shaft: whole courses below, then what is left of the upper ones, fallen away from the front corner:
 // [u0, v0, u1, v1 (m, the shaft spans ±.27), z0, z1 (m)].
 const COURSES=[[-.27,-.27,.27,.27,.32,.8],[-.27,-.27,0,.27,.8,1.17],[0,-.27,.27,0,.8,1.12],[0,0,.27,.27,.8,.96],[-.27,-.27,0,.06,1.17,1.42]];
 const cells=COURSES.map(([u0,v0,u1,v1,z0,z1],k)=>({u0:u0*M,v0:v0*M,u1:u1*M,v1:v1*M,z0:z0*PX_M,z1:z1*PX_M,tref:.32*PX_M,sref:.27*M,
  side:(f,s,t,b)=>{const outer=f==='pv'?b.v1>=.27*M-1e-9:b.u1>=.27*M-1e-9;return SHAFT(s,t).slice(0,3).map(x=>x*(outer?1:.8));},top:stoneTop(.55,83+k*5,{back:.1})}));
 return [...base,...cells];
}
// A flight climbing toward -u onto an edge at u = -run/2 (tiles), centred on v = 0: n steps rising H (world px)
// over run, width w, with stepped cheek walls cw wide standing ch px proud of the treads. Treads and cheeks are
// columns from the ground, so every riser, tread and cheek edge lies on the grid; one texture runs across them.
function flight({n,H,run,w,cw,ch}){
 const t=run/n,out=[];
 for(let i=0;i<n;i++){const u1=run/2-i*t,u0=u1-t-(i===n-1?.03:0),z=H*(i+1)/n;
  out.push({u0,u1,v0:-w/2+cw,v1:w/2-cw,z0:0,z1:z,sref:1,side:side(SHAFT,{dt:.4+i*.23}),top:stoneTop(.34,91+i,{back:.18})});
  for(const sd of [-1,1])out.push({u0,u1,v0:sd<0?-w/2:w/2-cw,v1:sd<0?-w/2+cw:w/2,z0:0,z1:z+ch,sref:1,side:side(SHAFT,{dt:.1}),top:stoneTop(.62,97+i)});}
 return out;
}
// A fallen column lying along u: the shaft broke into drums as it fell (each the shaft's square section, the last
// half sunk into the snow, the middle one knocked a little off line), with the carved capital at its +u end.
function fallen(){
 const drum=(u0,u1,v0,v1,z1,dt)=>({u0:u0*M,u1:u1*M,v0:v0*M,v1:v1*M,z0:0,z1:z1*PX_M,side:(f,s,t,b)=>(f==='pv'?SHAFT_BARE(t+.05,(b.u1-b.u0)/M-s+dt):SHAFT_BARE(s+.1,t+dt+.6).map(x=>x*.9)).slice(0,3),
  // Snow lies evenly on a lying block, thinning only at its front arrises.
  top:(u,v,b)=>{const p=SHAFT_BARE((v-b.v0)/M,(b.u1-u)/M+dt).slice(0,3),n=fbm(u*30,v*30,401+dt*10),e=Math.min(b.u1-u,b.v1-v)*57.2;return mix(p,snowAt(.15+.3*n,n),e<.9?.55:.97);}});
 return [drum(-1.25,-.6,-.29,.25,.4,.2),drum(-.53,.18,-.24,.3,.54,.9),drum(.25,.85,-.27,.27,.54,1.5),
  {u0:.93*M,u1:1.38*M,v0:-.31*M,v1:.31*M,z0:0,z1:.3*PX_M,side:side(ORNAMENT,{ds:.05}),top:stoneTop(.9,405,{back:.12})}];
}
const ISO={
 'pillar-intact':{boxes:pillar(false),rough:.7,heightM:2.42,footprintM:[.88,.88]},
 'pillar-broken':{boxes:pillar(true),rough:1,heightM:1.3,footprintM:[.88,.88]},
 // Temple: climbs onto the podium's +u edge, rising its lift (25.3 px: the v1 foundation's top face sits 76/3 px above
 // its pivot). Watchtower: climbs -v to the tower door's sill (39 px above the tower's pivot ground).
 'stairs-nw':{rough:.8,boxes:flight({n:4,H:25.3,run:.6,w:1.2,cw:.11,ch:3}),heightM:.77,footprintM:[1.8,3.6],params:{climbs:'-u',n:4,H:25.3,run:.6,w:1.2}},
 'stairs-ne':{rough:.8,boxes:flight({n:6,H:39,run:.78,w:.66,cw:.09,ch:3}).map(swapUV),heightM:1.13,footprintM:[1.98,2.34],params:{climbs:'-v',n:6,H:39,run:.78,w:.66}},
 'column-fallen':{boxes:fallen(),rough:1,heightM:.5,footprintM:[2.66,.7],grounded:{bank:[1.5,3.5],spill:3,tail:5,band:8,cap:false}},
 'column-fallen-v':{boxes:fallen().map(swapUV),rough:1,heightM:.5,footprintM:[.7,2.66],grounded:{bank:[1.5,3.5],spill:3,tail:5,band:8,cap:false}},
};
const isoSource=id=>{const o=ISO[id],{img,pivot}=renderBoxes(o.boxes.map(b=>({rough:o.rough,...b})),{R});
 return {img,pivot,heightM:o.heightM,footprintM:o.footprintM,source:'procedural 2:1 isometric blocks (iso-solid.mjs), stone from v1 pillar-intact and paving',recipe:{boxes:o.boxes.length,...o.params}};};
for(const [id,o] of Object.entries(GROUNDED))await grounded(id,o,ISO[id]&&isoSource(id));
// The raised foundation's top face is the diamond (384, 208) ±376 x ±196 in its 768 px export; the paving's spans
// the whole export but is drawn steeper than 2:1, so it is squashed first.
await sunk('floor-sunk',{from:'foundation',face:[384,208,376,196],edge:[.9,.16],bites:[[.55,-.3,.2,.32],[-.2,.62,.16,.3]],holes:.7,footprintM:[6,6]});
await sunk('paving',{from:'paving',face:PAVING.face,squash:PAVING.squash,edge:[.84,.2],bites:[[-.5,-.3,.22,.35],[.45,.4,.18,.3]],holes:.66,drift:.62,footprintM:[6,6]});
await flagstones('flagstones-a',{a:46,b:.9,off:[0,0]});
await flagstones('flagstones-b',{a:40,b:.8,off:[-6,3]});
await flagstones('flagstones-c',{a:52,b:.75,off:[5,-2]});
await flagstones('flagstones-d',{a:36,b:.95,off:[3,5]});
await chips('stone-chips-a',{w:56,h:26,n:7,r:[2.5,6]});
await chips('stone-chips-b',{w:44,h:22,n:5,r:[3,7]});
await drift('drift-ne',{a:46,b:15,axis:'ne',hmax:8});
await drift('drift-se',{a:46,b:15,axis:'se',hmax:8});
await drift('drift-mound',{a:24,b:20,axis:'round',hmax:6});
await scuff('ground-scuff-a',{a:110,b:84,grass:70,pebbles:24});
await scuff('ground-scuff-b',{a:70,b:46,grass:34,pebbles:12});
// New pieces go last, so the modules and decals above keep their seeds.
for(const id of ['column-fallen','column-fallen-v'])await grounded(id,ISO[id].grounded,isoSource(id));
// Cemetery stones (were cemetery-kit.mjs's v4 kit): the same 2:1 blocks in the bare shaft stone, with an engraved
// panel on the faces. They used to stand on the snow with only a faint halo, so they read as floating; grounded()
// banks snow against their plinths and gives them the kit's contact shadow, like the pillars beside them.
const grave=(u0,v0,u1,v1,z0,z1,k)=>({u0,v0,u1,v1,z0,z1,rough:.45,top:stoneTop(.72,501+k*7,{back:.12}),
 side:(_f,s,t)=>{const engraving=t>.45&&t<.68&&s>.15&&s<.48?.65:1;return SHAFT_BARE(s,t).slice(0,3).map(x=>x*engraving);}});
const plinth=()=>grave(-.18,-.28,.18,.28,0,9,0);
const GRAVES={
 'grave-headstone':{boxes:[plinth(),grave(-.14,-.25,.14,-.08,9,52,1),grave(-.1,-.25,.1,-.08,52,59,2),grave(-.16,-.27,.16,-.06,9,14,3)],bank:[3.5,6]},
 'grave-cross':{boxes:[plinth(),grave(-.055,-.24,.055,-.08,9,68,1),grave(-.18,-.24,.18,-.08,45,55,2)],bank:[3.5,6]},
 'grave-sarcophagus':{boxes:[grave(-.24,-.42,.24,.42,0,8,0),grave(-.2,-.38,.2,.38,8,30,1),grave(-.25,-.43,.25,.43,30,37,2)],bank:[4,7]},
 'grave-memorial':{boxes:[grave(-.5,-.5,.5,.5,0,7,0),grave(-.37,-.37,.37,.37,7,14,1),grave(-.23,-.23,.23,.23,14,35,2),grave(-.11,-.11,.11,.11,35,88,3),grave(-.17,-.17,.17,.17,88,93,4)],bank:[3.5,6]},
};
for(const [id,o] of Object.entries(GRAVES)){const {img,pivot}=renderBoxes(o.boxes,{R}),b=o.boxes[0];
 // gaps: the sarcophagus lid overhangs its chest; no snow under the overhang.
 await grounded(id,{bank:o.bank,spill:3,tail:5,band:10,cap:false,gaps:true},{img,pivot,heightM:+(Math.max(...o.boxes.map(q=>q.z1))/37).toFixed(2),footprintM:[+((b.u1-b.u0)*3).toFixed(2),+((b.v1-b.v0)*3).toFixed(2)],
  source:'procedural 2:1 isometric blocks (iso-solid.mjs), stone from v1 pillar-intact',recipe:{boxes:o.boxes.length}});}

await fs.writeFile(`${OUT}/manifest.json`,JSON.stringify({version:3,status:'in-game',retired:['snow-cap-ne','snow-cap-se'],generator:'scripts/frozen-frontier-map/ground-kit.mjs (deterministic, derived from the v1 kit art)',
 camera:{projection:'2:1 dimetric',halfWidth:64,halfHeight:32},lighting:'Soft upper-left daylight, matching v1/v2',
 note:'Grounded v1 modules replace their v1 exports in the game atlas (same ids, same ground pivot and footprint). The pillars, stairs and fallen columns are modelled in true 2:1 isometric (recipe.iso; their footprints are set in layout.mjs); the rest are new ground decals. Recipe parameters are recorded per asset.',assets:manifest},null,1)+'\n');
// The reviewed regenerated front corner replaces its legacy export on every rebuild.
await (await import('./build-lower-corner.mjs')).buildLowerCorner();
// Contact sheet on the game's snow colour.
{const cell=360,cols=6,rows=Math.ceil(manifest.length/cols),sheet=await Promise.all(manifest.map(async(m,i)=>{const im=sharp(`${OUT}/${m.file}`),meta=await im.metadata(),k=Math.min((cell-40)/meta.width,(cell-50)/meta.height,1);
  return [{input:await im.resize(Math.max(1,Math.round(meta.width*k)),Math.max(1,Math.round(meta.height*k))).png().toBuffer(),left:(i%cols)*cell+20,top:Math.floor(i/cols)*cell+30},
   {input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="28"><text x="8" y="20" font-family="sans-serif" font-size="18" fill="#1d3557">${m.id}</text></svg>`),left:(i%cols)*cell,top:Math.floor(i/cols)*cell}];}));
 await sharp({create:{width:cell*cols,height:cell*rows,channels:4,background:{r:222,g:230,b:240,alpha:1}}}).composite(sheet.flat()).webp({quality:85}).toFile(`${OUT}/contact-sheet.webp`);}
console.log(manifest.length,'v3 assets:',manifest.map(m=>m.id).join(', '));
