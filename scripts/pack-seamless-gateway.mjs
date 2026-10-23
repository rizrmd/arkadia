import sharp from 'sharp';
import fs from 'node:fs/promises';
import {stoneMean,matchStone} from './gateway-palette.mjs';

// Register the painted material pass to the existing silhouette. Its generated
// backdrop is deliberately discarded; authored alpha and moving doors stay exact.
const root='public/modular-stronghold/v2/';
const meta=JSON.parse(await fs.readFile(root+'full-gateway-v4-sheet.json','utf8'));
const {w,h}=meta.frame,ap=meta.stabilization.aperture;
// Match the walls' effective texel density instead of retaining generated microdetail.
const softened=await sharp('assets-src/gate-seamless/wall-matched-source.png').resize(600,400,{fit:'fill'}).png().toBuffer();
const art=await sharp(softened).resize(w,h,{fit:'fill',kernel:'linear'}).ensureAlpha().raw().toBuffer();
matchStone(art,await stoneMean(root+'full-gateway-v6-closed.webp',{left:177,top:183,width:90,height:180}));

// Seamlessly blend the outer tower edges and outer plinth steps directly into the
// world-aligned diagonal ramparts (rampart-se.png and rampart-ne.png) so no
// freestanding rim highlight, intermediate pilaster or bright step border separates them.
const closedBase=await sharp(root+'full-gateway-v4-closed.webp').ensureAlpha().raw().toBuffer();
const ww=1200,wh=960;
const wallLeft=await sharp(root+'rampart-se.png').ensureAlpha().raw().toBuffer();
const wallRight=await sharp(root+'rampart-ne.png').ensureAlpha().raw().toBuffer();
const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

function sampleWall(side,gx,gy){
 const wx=442+gx*(270/768),wy=623.2+gy*(180/512);
 const px=side==='left'?305:849,py=696,shear=side==='left'?.03:-.03;
 const dx=wx-px,dy=(wy-py)-dx*Math.tan(shear);
 const scale=1200/356;
 const fx=(dx+178)*scale;
 let fy=(dy+284.8*.70)*scale;
 const x0=Math.floor(fx);
 if(x0<0||x0+1>=ww)return null;
 const buf=side==='left'?wallLeft:wallRight;
 const idx=(x,y)=>(y*ww+x)*4;
 let y0=Math.floor(fy);
 if(y0<0||y0+1>=wh)return null;
 // If closedBase extends 1-3 px below the wall plinth's bottom contour, clamp to the mossy base edge.
 if(gy>395&&buf[idx(x0,y0)+3]<200){
  for(let sy=y0;sy>=Math.max(0,y0-18);sy--){
   if(buf[idx(x0,sy)+3]>=220&&buf[idx(x0+1,sy)+3]>=220){fy=Math.max(0,sy-1.5);y0=Math.floor(fy);break;}
  }
 }
 const tx=fx-x0,ty=fy-y0;
 const i00=idx(x0,y0),i10=idx(x0+1,y0),i01=idx(x0,y0+1),i11=idx(x0+1,y0+1);
 const minA=Math.min(buf[i00+3],buf[i10+3],buf[i01+3],buf[i11+3]);
 if(minA<160)return null;
 const out=[0,0,0,minA/255];
 for(let c=0;c<3;c++){
  const top=buf[i00+c]*(1-tx)+buf[i10+c]*tx;
  const bot=buf[i01+c]*(1-tx)+buf[i11+c]*tx;
  out[c]=top*(1-ty)+bot*ty;
 }
 return out;
}

const origArt=Buffer.from(art);
for(let i=0;i<w*h*4;i+=4)art[i+3]=closedBase[i+3];
for(let y=125;y<445;y++){
 let firstX=-1,lastX=-1;
 for(let x=0;x<w;x++)if(closedBase[(y*w+x)*4+3]>16){if(firstX<0)firstX=x;lastX=x;}
 if(firstX<0)continue;
 const corbelClear=smoothstep(134,142,y);
 const plinthT=smoothstep(315,345,y);
 for(const side of ['left','right']){
  const targetPlinthX=side==='left'?35.5:732.5;
  const joinEdgeX=side==='left'?firstX*(1-plinthT)+targetPlinthX*plinthT:lastX*(1-plinthT)+targetPlinthX*plinthT;
  let refR=0,refG=0,refB=0,refN=0;
  for(let dy=-3;dy<=3;dy++){
   const sy=Math.max(125,Math.min(440,y+dy));
   for(let d=18;d<=34;d++){
    const sx=Math.round(side==='left'?joinEdgeX+d:joinEdgeX-d);
    if(sx<0||sx>=w)continue;
    const si=(sy*w+sx)*4;
    if(closedBase[si+3]<200||origArt[si+2]>origArt[si]*.92)continue;
    refR+=origArt[si];refG+=origArt[si+1];refB+=origArt[si+2];refN++;
   }
  }
  if(!refN)continue;
  refR/=refN;refG/=refN;refB/=refN;
  let refL=.299*refR+.587*refG+.114*refB;
  const maxAllowedLuma=85-7*plinthT;
  if(refL>maxAllowedLuma){const s=maxAllowedLuma/refL;refR*=s;refG*=s;refB*=s;refL=maxAllowedLuma;}
  const maxD=side==='left'?Math.round(joinEdgeX-firstX+26):Math.round(lastX-joinEdgeX+26);
  for(let d=0;d<maxD;d++){
   const x=side==='left'?firstX+d:lastX-d;
   if(x<0||x>=w)continue;
   const i=(y*w+x)*4;
   if(!closedBase[i+3]||origArt[i+2]>origArt[i]*.92)continue;
   const distInsideMain=side==='left'?x-joinEdgeX:joinEdgeX-x;
   let r=origArt[i],g=origArt[i+1],b=origArt[i+2];
   const luma=.299*r+.587*g+.114*b;
   let locL=0,locN=0;
   for(let ky=-2;ky<=2;ky++)for(let kx=-2;kx<=2;kx++){
    const nx=Math.max(0,Math.min(w-1,x+kx)),ny=Math.max(0,Math.min(h-1,y+ky)),ni=(ny*w+nx)*4;
    if(closedBase[ni+3]>180){locL+=.299*origArt[ni]+.587*origArt[ni+1]+.114*origArt[ni+2];locN++;}
   }
   locL=locN?locL/locN:luma;
   const grain=luma-locL;
   if(distInsideMain<24&&locL>refL){
    const u=Math.max(0,Math.min(1,1-distInsideMain/24))*corbelClear,pull=u*u*(3-2*u);
    const newEnvL=locL*(1-pull)+refL*pull,targetL=Math.max(24,newEnvL+grain*(1-.25*pull));
    const scale=luma>1?targetL/luma:1;
    r=r*scale*(1-pull*.35)+refR*(targetL/Math.max(1,refL))*(pull*.35);
    g=g*scale*(1-pull*.35)+refG*(targetL/Math.max(1,refL))*(pull*.35);
    b=b*scale*(1-pull*.35)+refB*(targetL/Math.max(1,refL))*(pull*.35);
   }
   const wallPx=sampleWall(side,x,y);
   if(wallPx&&corbelClear>0){
    const shaftT=smoothstep(138,162,y),innerReach=2.5+4.5*shaftT;
    const blend=(1-smoothstep(-2,innerReach,distInsideMain))*wallPx[3]*corbelClear;
    const cornerDist=Math.abs(distInsideMain-2.0)/3.5;
    const mortarDip=cornerDist<1?1-.07*corbelClear*(1-cornerDist*cornerDist):1;
    r=(r*(1-blend)+wallPx[0]*blend)*mortarDip;
    g=(g*(1-blend)+wallPx[1]*blend)*mortarDip;
    b=(b*(1-blend)+wallPx[2]*blend)*mortarDip;
   }
   if(plinthT>0&&distInsideMain<1.5){
    const keepA=smoothstep(-1.5,1.5,distInsideMain);
    art[i+3]=Math.round(closedBase[i+3]*(1-plinthT+plinthT*keepA));
   }
   art[i]=Math.max(0,Math.min(255,Math.round(r)));
   art[i+1]=Math.max(0,Math.min(255,Math.round(g)));
   art[i+2]=Math.max(0,Math.min(255,Math.round(b)));
  }
 }
}

const atlas=await fs.readFile(root+meta.image),parts=[];
function material(pixels){
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const archY=201+50*Math.pow(Math.abs(x-384)/104,2);
  if(x>=ap.left&&x<=ap.right&&y>=archY&&y<=ap.bottom)continue;
  const p=(y*w+x)*4;
  for(let c=0;c<4;c++)pixels[p+c]=art[p+c];
 }
 return pixels;
}
for(let i=0;i<meta.frames;i++){
 const pixels=material(await sharp(atlas).extract({left:i%meta.columns*w,top:Math.floor(i/meta.columns)*h,width:w,height:h}).ensureAlpha().raw().toBuffer());
 const png=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
 parts.push({input:png,left:i%meta.columns*w,top:Math.floor(i/meta.columns)*h});
 if(i===meta.frames-1)await sharp(png).webp({lossless:true}).toFile(root+'full-gateway-v7-open.webp');
}
const closed=material(Buffer.from(closedBase));
await sharp(closed,{raw:{width:w,height:h,channels:4}}).webp({lossless:true}).toFile(root+'full-gateway-v7-closed.webp');
await sharp({create:{width:w*meta.columns,height:h*Math.ceil(meta.frames/meta.columns),channels:4,background:'#00000000'}}).composite(parts).webp({lossless:true}).toFile(root+'full-gateway-v7-sheet.webp');
await fs.writeFile(root+'full-gateway-v7-sheet.json',JSON.stringify({...meta,image:'full-gateway-v7-sheet.webp',threshold:{x:577,y:778}},null,2));
console.log('Packed weathered gateway: original alpha, aperture and 16 moving door poses preserved.');
