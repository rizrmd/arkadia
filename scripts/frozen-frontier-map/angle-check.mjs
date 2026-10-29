import sharp from 'sharp';import fs from 'node:fs/promises';import path from 'node:path';
// Angle check for the Frozen Frontier kit: a piece built on the map grid must have its edges vertical or at 2:1
// (screen slope ±1/2, ±26.57°), like the map's tiles and floors. The edges measured are the sprite's outline (snow
// caps included: they follow the top faces' back edges) and luminance steps inside the stone (face against face,
// course against course). Left out, because they are soft and organic by design: everything at and below the lowest
// stone of each column (the snow bank's crest, the bank, the contact shadow) and the outlines of snow lying on the
// stone (a luminance step counts only where all its neighbours are stone; stone is warm grey, snow blue-white).
// A gradient-guided Hough transform finds the straight lines, each traced into its longest run of edge pixels
// (MIN_LEN world px or more) and measured by the principal axis through those pixels.
// Vertical lines are right in any projection, so the measure is on the others: a sprite passes when its TOP longest
// non-vertical lines all run within TOL degrees of ±26.57° and at least MIN_SHARE of their total length does.
// The v1 pillars (face-on: 14-16° tops and plinths) and stairs (perspective: 16°, 135°, 159° steps) fail; the 2:1
// pieces measure within 3°. Gated: the pieces modelled in 2:1 (ground-kit.mjs ISO). Reported only: the other
// v1-derived uprights (their generated art runs 10-20° rather than 26.57°).
//   node scripts/frozen-frontier-map/angle-check.mjs [assets dir=public/frozen-frontier/v3/assets] [out dir]
// Writes <out>/angle-check.json and angle-check.webp (traced lines: green on the grid, red off it). Exit 1 on failure.
const DIR=process.argv[2]||'public/frozen-frontier/v3/assets',OUT=process.argv[3]||'docs/frozen-frontier-map';
const GATED=['pillar-intact','pillar-broken','stairs-nw','stairs-ne','column-fallen','column-fallen-v'];
const INFO=['wall-ne','wall-se','corner-n','corner-s','arch-ne','arch-se','rubble'];
const PX=4,ISO=Math.atan(.5)*180/Math.PI,GRID=[90,ISO,180-ISO],TOL=5,MIN_LEN=7,TOP=3,MIN_SHARE=.7,KEEP=.2,BLUR=2,VERT=10;
const off=a=>Math.min(...GRID.map(g=>Math.min(Math.abs(a-g),180-Math.abs(a-g))));

// At the sprite's own PX px per world px: alpha and stone luminance, blurred so stone grain and hairline cracks
// don't make edges.
async function edges(file){
 const m=await sharp(file).metadata(),w=m.width,h=m.height;
 const {data}=await sharp(file).ensureAlpha().blur(BLUR).raw().toBuffer({resolveWithObject:true});
 const L=new Float32Array(w*h),A=new Float32Array(w*h),S=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++){const r=data[i*4],b=data[i*4+2],a=data[i*4+3]/255;A[i]=a;L[i]=(r*.3+data[i*4+1]*.59+b*.11)/255*a;S[i]=a>.6&&b-r<6?1:0;}
 const mag=new Float32Array(w*h),dir=new Float32Array(w*h);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const g=(f,dx,dy)=>f[(y+dy)*w+x+dx];
  const sob=f=>[g(f,1,-1)+2*g(f,1,0)+g(f,1,1)-g(f,-1,-1)-2*g(f,-1,0)-g(f,-1,1),g(f,-1,1)+2*g(f,0,1)+g(f,1,1)-g(f,-1,-1)-2*g(f,0,-1)-g(f,1,-1)];
  let stone=1;for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)stone&=S[(y+j)*w+x+k];
  const [lx,ly]=stone?sob(L):[0,0],[ax,ay]=sob(A),gx=lx+ax*.6,gy=ly+ay*.6,i=y*w+x;mag[i]=Math.hypot(gx,gy);dir[i]=Math.atan2(gy,gx);}
 // At and below the lowest stone in each column: the bank's crest, the bank and the shadow.
 for(let x=0;x<w;x++){let lo=-1;for(let y=h-1;y>=0;y--)if(S[y*w+x]){lo=y;break;}for(let y=Math.max(0,lo-2);y<h;y++)mag[y*w+x]=0;}
 // Strong edges only: the top KEEP of gradient magnitude.
 const sorted=Float32Array.from(mag).filter(v=>v>0).sort(),thr=Math.max(.35,sorted[Math.floor(sorted.length*(1-KEEP))]??1);
 const on=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(mag[i]>=thr)on[i]=1;
 return {w,h,on,dir};
}
// Strongest line first: Hough over the remaining edge pixels (each votes only near its own gradient's normal), trace
// the peak into its longest run (gaps up to 2 px), remove those pixels, repeat.
function lines({w,h,on,dir}){
 on=Uint8Array.from(on);
 const NT=180,D=Math.ceil(Math.hypot(w,h)),cos=[],sin=[];for(let t=0;t<NT;t++){cos.push(Math.cos(t*Math.PI/NT));sin.push(Math.sin(t*Math.PI/NT));}
 const out=[];
 for(let iter=0;iter<60;iter++){
  const acc=new Uint16Array(NT*(2*D+1));let best=0,bt=0,br=0;
  for(let i=0;i<w*h;i++){if(!on[i])continue;const x=i%w,y=(i/w)|0;let g=dir[i]*180/Math.PI;if(g<0)g+=180;
   for(let dt=-10;dt<=10;dt++){const t=((Math.round(g)+dt)%NT+NT)%NT,r=Math.round(x*cos[t]+y*sin[t])+D,k=t*(2*D+1)+r,v=++acc[k];if(v>best){best=v;bt=t;br=r-D;}}}
  if(best<MIN_LEN*PX)break;
  // Trace: walk along the line; an edge pixel within 1 px of it counts.
  const dx=-sin[bt],dy=cos[bt],x0=br*cos[bt],y0=br*sin[bt],hits=[];
  for(let s=-D;s<=D;s++){const x=x0+dx*s,y=y0+dy*s;let hit=-1;for(const o of [0,-1,1]){const xx=Math.round(x+cos[bt]*o),yy=Math.round(y+sin[bt]*o);if(xx>=0&&yy>=0&&xx<w&&yy<h&&on[yy*w+xx]){hit=yy*w+xx;break;}}hits.push(hit);}
  let run=[],longest=[],gap=0;for(const k of hits){if(k>=0){run.push(k);gap=0;}else if(run.length&&++gap>2){if(run.length>longest.length)longest=run;run=[];gap=0;}}if(run.length>longest.length)longest=run;
  const pts=longest.map(k=>[k%w,(k/w)|0]);
  for(const k of hits)if(k>=0)on[k]=0;// this line's pixels are spent either way
  if(pts.length<2)continue;const [a,b]=[pts[0],pts[pts.length-1]],len=Math.hypot(b[0]-a[0],b[1]-a[1])/PX;if(len<MIN_LEN)continue;
  // The angle of the principal axis through all its pixels (endpoints alone swing a short line by degrees).
  const n=pts.length,mx=pts.reduce((s,p)=>s+p[0],0)/n,my=pts.reduce((s,p)=>s+p[1],0)/n;let sxx=0,syy=0,sxy=0;for(const [x,y] of pts){sxx+=(x-mx)**2;syy+=(y-my)**2;sxy+=(x-mx)*(y-my);}
  let ang=.5*Math.atan2(2*sxy,sxx-syy)*180/Math.PI;if(ang<0)ang+=180;if(ang>=180)ang-=180;
  out.push({from:a.map(v=>+(v/PX).toFixed(1)),to:b.map(v=>+(v/PX).toFixed(1)),lengthPx:+len.toFixed(1),angle:+ang.toFixed(1),offGrid:+off(ang).toFixed(1)});
 }
 return out;
}
const report={tool:'scripts/frozen-frontier-map/angle-check.mjs',assets:DIR,grid:'vertical or screen slope ±1/2 (±26.57°)',toleranceDeg:TOL,minLinePx:MIN_LEN,top:TOP,minShare:MIN_SHARE,sprites:{},ok:true};
const sheets=[];
for(const id of [...GATED,...INFO]){
 const file=path.join(DIR,`${id}.png`);try{await fs.access(file);}catch{continue;}
 const segs=lines(await edges(file)),slant=segs.filter(q=>Math.abs(q.angle-90)>VERT).sort((p,q)=>q.lengthPx-p.lengthPx),gated=GATED.includes(id);
 const total=slant.reduce((s,q)=>s+q.lengthPx,0),share=total?slant.filter(q=>q.offGrid<=TOL).reduce((s,q)=>s+q.lengthPx,0)/total:0;
 const longest=slant.slice(0,TOP),pass=slant.length>0&&longest.every(q=>q.offGrid<=TOL)&&share>=MIN_SHARE;
 report.sprites[id]={gated,pass,longestSlantLines:longest.map(q=>({angle:q.angle,lengthPx:q.lengthPx,offGridDeg:q.offGrid})),slantOnGridShare:+share.toFixed(3),lines:segs};
 if(gated&&!pass)report.ok=false;
 console.log(`${gated?(pass?'PASS':'FAIL'):(pass?'info: on grid ':'info: off grid')} ${id.padEnd(16)} longest slant lines ${longest.map(q=>`${q.angle}° x ${q.lengthPx}px${q.offGrid>TOL?' (off)':''}`).join(', ')}; on grid ${(share*100).toFixed(0)}% of ${total.toFixed(0)} px`);
 // Annotated tile for the evidence sheet.
 const m=await sharp(file).metadata(),k=.5,W=Math.round(m.width*k),H=Math.round(m.height*k),Z=k*PX;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H+30}">${segs.map(q=>`<line x1="${q.from[0]*Z}" y1="${q.from[1]*Z+30}" x2="${q.to[0]*Z}" y2="${q.to[1]*Z+30}" stroke="${q.offGrid<=TOL?'#1fbf4a':'#ff2a2a'}" stroke-width="3" stroke-opacity=".85"/>`).join('')}
  <text x="4" y="21" font-family="sans-serif" font-size="18" font-weight="700" fill="${pass?'#137a30':'#c0161b'}">${id}: ${pass?'on grid':'off grid'} ${(share*100).toFixed(0)}%</text></svg>`;
 sheets.push({w:Math.max(W,330),h:H+30,img:await sharp(file).resize(W,H).extend({top:30,right:Math.max(0,330-W),background:{r:0,g:0,b:0,alpha:0}}).composite([{input:Buffer.from(svg),left:0,top:0}]).png().toBuffer()});
}
await fs.mkdir(OUT,{recursive:true});
await fs.writeFile(`${OUT}/angle-check.json`,JSON.stringify(report,null,1)+'\n');
{let x=0,y=0,row=0,W=2400;const pos=sheets.map(s=>{if(x+s.w>W){x=0;y+=row+10;row=0;}const p={input:s.img,left:x,top:y};x+=s.w+10;row=Math.max(row,s.h);return p;});
 await sharp({create:{width:W,height:y+row,channels:4,background:{r:222,g:230,b:240,alpha:1}}}).composite(pos).webp({quality:82}).toFile(`${OUT}/angle-check.webp`);}
console.log(report.ok?'angle check passed':'angle check FAILED',`(${OUT}/angle-check.json)`);
if(!report.ok)process.exit(1);
