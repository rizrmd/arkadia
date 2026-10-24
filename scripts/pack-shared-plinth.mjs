import sharp from 'sharp';

// Build buttress-free, end-pillar-free diagonal crenellated ramparts (rampart-se.png
// and rampart-ne.png) from the clean 2-bay masonry span of the v2 rampart source.
// Period Px = 1200 * 80 / 356 = 269.6629213 source px (80 world px = 2 bays) and
// source slope m = 0.470000 (world slope 0.47 + 0.03 = 0.500000) phase-lock all
// perimeter segments (320 world px = 8 bays, 240 world px = 6 bays) and align the
// wall courses, battlements and mossy base plinth flush into the gatehouse towers.
const srcFile='assets-src/modular-stronghold-v2/rampart-se.png';
const {data:src,info}=await sharp(srcFile)
 .trim({background:'#00000000',threshold:8})
 .resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true})
 .ensureAlpha().raw().toBuffer({resolveWithObject:true});

const SW=info.width,SH=info.height;
const W=1200,H=960;
const Px=1200*80/356;
const B=36,mOut=0.47;
// Inner parapet (yDetrend <= -290) and outer parapet + wall + plinth (yDetrend >= -268)
// have slightly different painted perspective convergence in the source sprite; blending
// their 2-bay periods across the flat paved walkway eliminates any step on either face.
const inner={x0:586,dx0:264,dy0:117,botAtX0:621-(117/264)*(700-586)};
const outer={x0:652,dx0:243,dy0:124,botAtX0:621-(124/243)*(700-652)};
const plinth={x0:668,dx0:116,dy0:60,botAtX0:604};
// Align sx=1111.7 (wx=456.8, left gate tower outer shaft) to src x=712 (crenel notch beside full merlon).
const uTarget=(712-outer.x0)/outer.dx0;
const xPhase=1111.7-uTarget*Px;
const outBotAt600=673.5;

const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

function sampleBilinear(buf,bw,bh,fx,fy){
 const x0=Math.floor(fx),y0=Math.floor(fy);
 if(x0<0||x0+1>=bw||y0<0||y0+1>=bh)return [0,0,0,0];
 const tx=fx-x0,ty=fy-y0;
 const i00=(y0*bw+x0)*4,i10=i00+4,i01=i00+bw*4,i11=i01+4;
 const a00=buf[i00+3],a10=buf[i10+3],a01=buf[i01+3],a11=buf[i11+3];
 const a=(a00*(1-tx)+a10*tx)*(1-ty)+(a01*(1-tx)+a11*tx)*ty;
 if(a<1)return [0,0,0,0];
 const w00=(1-tx)*(1-ty)*a00,w10=tx*(1-ty)*a10,w01=(1-tx)*ty*a01,w11=tx*ty*a11;
 const wSum=w00+w10+w01+w11||1;
 return [
  (buf[i00]*w00+buf[i10]*w10+buf[i01]*w01+buf[i11]*w11)/wSum,
  (buf[i00+1]*w00+buf[i10+1]*w10+buf[i01+1]*w01+buf[i11+1]*w11)/wSum,
  (buf[i00+2]*w00+buf[i10+2]*w10+buf[i01+2]*w01+buf[i11+2]*w11)/wSum,
  a
 ];
}

function sampleTile(spec,u,yDetrend){
 const {x0,dx0,dy0,botAtX0}=spec,mSrc=dy0/dx0;
 const qx=u*dx0,bw=B*(dx0/270);
 const sy1=botAtX0+mSrc*qx+yDetrend;
 const p1=sampleBilinear(src,SW,SH,x0+qx,sy1);
 if(qx>=bw)return p1;
 const w=smoothstep(0,bw,qx);
 const sy2=botAtX0+mSrc*(qx+dx0)+yDetrend;
 const p2=sampleBilinear(src,SW,SH,x0+qx+dx0,sy2);
 const a=p2[3]*(1-w)+p1[3]*w;
 const wa1=p1[3]*w,wa2=p2[3]*(1-w),wSum=wa1+wa2||1;
 return [
  (p2[0]*wa2+p1[0]*wa1)/wSum,
  (p2[1]*wa2+p1[1]*wa1)/wSum,
  (p2[2]*wa2+p1[2]*wa1)/wSum,
  a
 ];
}

const outSE=Buffer.alloc(W*H*4);
const outNE=Buffer.alloc(W*H*4);

for(let y=0;y<H;y++){
 for(let x=0;x<W;x++){
  if(x<14||x>W-15)continue;
  const endFade=smoothstep(14,22,x)*(1-smoothstep(W-23,W-15,x));
  if(endFade<=0)continue;
  const yDetrend=y-(outBotAt600+mOut*(x-600));
  let u=((x-xPhase)%Px)/Px;if(u<0)u+=1;
  const tWalk=smoothstep(-292,-268,yDetrend);
  const tPlinth=smoothstep(-86,-72,yDetrend);
  const uInner=(u+.232)%1;
  const uPlinth=(u*2)%1;
  let r,g,b,a;
  if(tWalk<=0){
   [r,g,b,a]=sampleTile(inner,uInner,yDetrend);
  }else if(tWalk<1){
   const pI=sampleTile(inner,uInner,yDetrend),pO=sampleTile(outer,u,yDetrend);
   a=pI[3]*(1-tWalk)+pO[3]*tWalk;
   const wI=pI[3]*(1-tWalk),wO=pO[3]*tWalk,wSum=wI+wO||1;
   r=(pI[0]*wI+pO[0]*wO)/wSum;
   g=(pI[1]*wI+pO[1]*wO)/wSum;
   b=(pI[2]*wI+pO[2]*wO)/wSum;
  }else if(tPlinth<=0){
   [r,g,b,a]=sampleTile(outer,u,yDetrend);
  }else if(tPlinth>=1){
   [r,g,b,a]=sampleTile(plinth,uPlinth,yDetrend);
  }else{
   const pO=sampleTile(outer,u,yDetrend),pP=sampleTile(plinth,uPlinth,yDetrend);
   a=pO[3]*(1-tPlinth)+pP[3]*tPlinth;
   const wO=pO[3]*(1-tPlinth),wP=pP[3]*tPlinth,wSum=wO+wP||1;
   r=(pO[0]*wO+pP[0]*wP)/wSum;
   g=(pO[1]*wO+pP[1]*wP)/wSum;
   b=(pO[2]*wO+pP[2]*wP)/wSum;
  }
  a*=endFade;
  if(a<1)continue;
  const iSE=(y*W+x)*4;
  outSE[iSE]=Math.max(0,Math.min(255,Math.round(r)));
  outSE[iSE+1]=Math.max(0,Math.min(255,Math.round(g)));
  outSE[iSE+2]=Math.max(0,Math.min(255,Math.round(b)));
  outSE[iSE+3]=Math.max(0,Math.min(255,Math.round(a)));

  const xNE=W-1-x;
  const iNE=(y*W+xNE)*4;
  let rNE=r,gNE=g,bNE=b;
  const parapetBand=smoothstep(-375,-345,yDetrend)*(1-smoothstep(-195,-165,yDetrend));
  if(parapetBand>0){
   const qxO=u*outer.dx0;
   const d1=Math.abs(qxO-76)/14,d2=Math.abs(qxO-214)/14;
   const returnBevel=Math.max(d1<1?1-d1*d1:0,d2<1?1-d2*d2:0)*parapetBand;
   const luma=.299*rNE+.587*gNE+.114*bNE;
   if(returnBevel>0&&luma<145){
    const lift=1+.28*returnBevel*(145-luma)/80;
    rNE*=lift*1.03;gNE*=lift;bNE*=lift*.96;
   }
  }
  outNE[iNE]=Math.max(0,Math.min(255,Math.round(rNE)));
  outNE[iNE+1]=Math.max(0,Math.min(255,Math.round(gNE)));
  outNE[iNE+2]=Math.max(0,Math.min(255,Math.round(bNE)));
  outNE[iNE+3]=Math.max(0,Math.min(255,Math.round(a)));
 }
}

await sharp(outSE,{raw:{width:W,height:H,channels:4}}).png().toFile('public/modular-stronghold/v2/rampart-se.png');
await sharp(outNE,{raw:{width:W,height:H,channels:4}}).png().toFile('public/modular-stronghold/v2/rampart-ne.png');
console.log('Packed buttress-free seamless rampart-se.png and rampart-ne.png (1200x960).');
