// High-resolution ARKADIA compass logo (extracted from the generated master in assets-src/loading/logo-source.jpg)
// plus the loading screen background artwork and sleek antique-gold progress bar assets at @1x, @2x and @3x.
//   node scripts/typography/build-logo.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const HERO_OUT='public/typography/v2/hero';
const LOAD_OUT='public/typography/v2/loading';
fs.mkdirSync(HERO_OUT,{recursive:true});
fs.mkdirSync(LOAD_OUT,{recursive:true});
fs.mkdirSync('assets-src/typography',{recursive:true});

// 1. Extract straight-alpha high-resolution ARKADIA logo from assets-src/loading/logo-source.jpg
const {data,info}=await sharp('assets-src/loading/logo-source.jpg').raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,ch=info.channels;
const fg=Buffer.alloc(W*H*4);
let minX=W,minY=H,maxX=0,maxY=0;
const cx=W*0.5,cy=H*0.5;
for(let y=0;y<H;y++){
 for(let x=0;x<W;x++){
  const i=(y*W+x)*ch,oi=(y*W+x)*4;
  const r=data[i],g=data[i+1],b=data[i+2];
  const m=Math.max(r,g,b);
  const distCenter=Math.hypot(x-cx,y-cy);
  let a=0;
  if(distCenter<28){
   a=255;
  }else if(m>8){
   a=Math.min(255,Math.round((m-8)/40*255));
  }
  if(a>0){
   const af=a/255;
   const scale=af<1?Math.min(2.4,1/Math.max(0.36,af)):1;
   fg[oi]=Math.min(255,Math.round(r*scale));
   fg[oi+1]=Math.min(255,Math.round(g*scale));
   fg[oi+2]=Math.min(255,Math.round(b*scale));
   fg[oi+3]=a;
   if(a>20){
    if(x<minX)minX=x;if(x>maxX)maxX=x;
    if(y<minY)minY=y;if(y>maxY)maxY=y;
   }
  }
 }
}
const pad=24;
minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
maxX=Math.min(W-1,maxX+pad);maxY=Math.min(H-1,maxY+pad);
const cw=maxX-minX+1,ch2=maxY-minY+1;

const croppedFg=await sharp(fg,{raw:{width:W,height:H,channels:4}})
 .extract({left:minX,top:minY,width:cw,height:ch2})
 .png()
 .toBuffer();

// Create a soft dark drop shadow behind the transparent logo so it reads cleanly over any background artwork.
const shadowRaw=Buffer.alloc(cw*ch2*4);
const {data:fgData}=await sharp(croppedFg).raw().toBuffer({resolveWithObject:true});
for(let p=0;p<cw*ch2;p++){
 const a=fgData[p*4+3];
 shadowRaw[p*4]=4;
 shadowRaw[p*4+1]=3;
 shadowRaw[p*4+2]=2;
 shadowRaw[p*4+3]=Math.min(255,Math.round(a*0.85));
}
const blurredShadow=await sharp(shadowRaw,{raw:{width:cw,height:ch2,channels:4}})
 .blur(6)
 .png()
 .toBuffer();

const masterLogo=await sharp({create:{width:cw,height:ch2+6,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
 .composite([
  {input:blurredShadow,left:0,top:5},
  {input:croppedFg,left:0,top:0},
 ])
 .png({compressionLevel:9})
 .toBuffer();

await sharp(masterLogo).toFile('assets-src/typography/arkadia-logo-master.png');

// Export hero logo (@1x: 270 x 70) and loading screen centerpiece logo (@1x: 390 x 120)
const HERO_W=270,HERO_H=70;
const LOAD_LOGO_W=390,LOAD_LOGO_H=120;
for(const s of [1,2,3]){
 await sharp(masterLogo)
  .resize(HERO_W*s,HERO_H*s,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'})
  .png({compressionLevel:9})
  .toFile(`${HERO_OUT}/logo@${s}x.png`);
 await sharp(masterLogo)
  .resize(LOAD_LOGO_W*s,LOAD_LOGO_H*s,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'})
  .png({compressionLevel:9})
  .toFile(`${LOAD_OUT}/logo@${s}x.png`);
}

// 2. Export full-bleed background paintings for desktop and mobile loading screens
await sharp('assets-src/loading/bg-desktop.jpg')
 .webp({quality:90})
 .toFile(`${LOAD_OUT}/bg-desktop.webp`);
await sharp('assets-src/loading/bg-mobile.jpg')
 .webp({quality:90})
 .toFile(`${LOAD_OUT}/bg-mobile.webp`);

// 3. Build sleek antique-gold loading bar track, fill, leading spark crest, and ornamental divider (@1x, @2x, @3x)
const C={ink:'#140b04',deep:'#4f2e0e',mid:'#b88236',gold:'#e5bc6a',pale:'#fff0c4'};
function star(cx,cy,rx,ry,k=null,gem=null){
 k??=Math.min(rx,ry)*0.3;
 const pts=[[cx,cy-ry],[cx+k,cy-k],[cx+rx,cy],[cx+k,cy+k],[cx,cy+ry],[cx-k,cy+k],[cx-rx,cy],[cx-k,cy-k]]
  .map(q=>q.map(v=>+v.toFixed(2)).join(',')).join(' ');
 const facets=`<path d="M${cx},${cy-ry} L${cx},${cy+ry} M${cx-rx},${cy} L${cx+rx},${cy}" stroke="${C.deep}" stroke-opacity=".6" stroke-width=".45"/>`;
 const jewel=gem?`<polygon points="${cx},${cy-2.4} ${cx+2.4},${cy} ${cx},${cy+2.4} ${cx-2.4},${cy}" fill="${gem}" stroke="${C.pale}" stroke-width=".35"/>`:'';
 return `<polygon points="${pts}" fill="url(#star)" stroke="${C.ink}" stroke-width=".75" stroke-linejoin="round"/>${facets}${jewel}`;
}

// Track @1x: 460 x 28. Inner cavity: x=26..434 (width 408), y=9..19 (height 10).
const TRACK_W=460,TRACK_H=28,INNER_X=26,INNER_Y=9,INNER_W=408,INNER_H=10;
const trackSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${TRACK_W*3}" height="${TRACK_H*3}" viewBox="0 0 ${TRACK_W} ${TRACK_H}">
 <defs>
  <linearGradient id="gold" x1="0" y1="4" x2="0" y2="24" gradientUnits="userSpaceOnUse">
   <stop offset="0" stop-color="${C.pale}"/>
   <stop offset=".32" stop-color="${C.gold}"/>
   <stop offset=".68" stop-color="${C.mid}"/>
   <stop offset="1" stop-color="${C.deep}"/>
  </linearGradient>
  <linearGradient id="cavity" x1="0" y1="${INNER_Y}" x2="0" y2="${INNER_Y+INNER_H}" gradientUnits="userSpaceOnUse">
   <stop offset="0" stop-color="#040303" stop-opacity=".96"/>
   <stop offset=".45" stop-color="#0a0806" stop-opacity=".94"/>
   <stop offset="1" stop-color="#17110c" stop-opacity=".96"/>
  </linearGradient>
  <radialGradient id="star" cx=".42" cy=".35" r=".75">
   <stop offset="0" stop-color="#fff7d6"/>
   <stop offset=".38" stop-color="${C.gold}"/>
   <stop offset=".8" stop-color="${C.mid}"/>
   <stop offset="1" stop-color="${C.deep}"/>
  </radialGradient>
  <filter id="drop" x="-8%" y="-30%" width="116%" height="170%">
   <feDropShadow dx="0" dy="1.8" stdDeviation="1.6" flood-color="#000" flood-opacity=".85"/>
  </filter>
 </defs>
 <g filter="url(#drop)">
  <!-- Outer chamfered bronze plate -->
  <polygon points="18,14 25,6 435,6 442,14 435,22 25,22" fill="#120c08" fill-opacity=".95" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>
  <polygon points="18,14 25,6 435,6 442,14 435,22 25,22" fill="none" stroke="url(#gold)" stroke-width="1.35" stroke-linejoin="round"/>
  <polyline points="25.5,7.2 434.5,7.2" fill="none" stroke="${C.pale}" stroke-opacity=".48" stroke-width=".55" stroke-linecap="round"/>
  <!-- Inner recessed cavity -->
  <rect x="${INNER_X}" y="${INNER_Y}" width="${INNER_W}" height="${INNER_H}" rx="2" fill="url(#cavity)" stroke="${C.ink}" stroke-width="1.2"/>
  <rect x="${INNER_X-.5}" y="${INNER_Y-.5}" width="${INNER_W+1}" height="${INNER_H+1}" rx="2.4" fill="none" stroke="url(#gold)" stroke-width=".85" stroke-opacity=".85"/>
  <!-- Subtle 25 / 50 / 75% tick marks inside the groove -->
  <line x1="${INNER_X+INNER_W*.25}" y1="${INNER_Y+1.5}" x2="${INNER_X+INNER_W*.25}" y2="${INNER_Y+INNER_H-1.5}" stroke="${C.gold}" stroke-opacity=".18" stroke-width=".6"/>
  <line x1="${INNER_X+INNER_W*.5}" y1="${INNER_Y+1}" x2="${INNER_X+INNER_W*.5}" y2="${INNER_Y+INNER_H-1}" stroke="${C.gold}" stroke-opacity=".28" stroke-width=".7"/>
  <line x1="${INNER_X+INNER_W*.75}" y1="${INNER_Y+1.5}" x2="${INNER_X+INNER_W*.75}" y2="${INNER_Y+INNER_H-1.5}" stroke="${C.gold}" stroke-opacity=".18" stroke-width=".6"/>
  <!-- Center top & bottom small compass diamond ticks -->
  ${star(TRACK_W/2,5.5,3.2,3.2)}
  ${star(TRACK_W/2,22.5,3.2,3.2)}
  <!-- Left & right ornate compass finials with teal crystal center matching the ARKADIA logo -->
  ${star(11,14,10,7,2.4,'#146678')}
  ${star(TRACK_W-11,14,10,7,2.4,'#146678')}
 </g>
</svg>`;

// Fill @1x: 408 x 10 (fits strictly inside INNER_X..INNER_X+INNER_W, INNER_Y..INNER_Y+INNER_H)
const fillSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${INNER_W*3}" height="${INNER_H*3}" viewBox="0 0 ${INNER_W} ${INNER_H}">
 <defs>
  <linearGradient id="fh" x1="0" y1="0" x2="1" y2="0">
   <stop offset="0" stop-color="#8a5216"/>
   <stop offset=".45" stop-color="#ce9134"/>
   <stop offset=".85" stop-color="#eec165"/>
   <stop offset="1" stop-color="#fff3c4"/>
  </linearGradient>
  <linearGradient id="fv" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#fff8dc" stop-opacity=".65"/>
   <stop offset=".28" stop-color="#f5c96b" stop-opacity=".15"/>
   <stop offset=".72" stop-color="#000000" stop-opacity=".18"/>
   <stop offset="1" stop-color="#2b1403" stop-opacity=".55"/>
  </linearGradient>
 </defs>
 <rect x="0" y="0" width="${INNER_W}" height="${INNER_H}" rx="1.5" fill="url(#fh)"/>
 <rect x="0" y="0" width="${INNER_W}" height="${INNER_H}" rx="1.5" fill="url(#fv)"/>
 <line x1="1" y1="1.1" x2="${INNER_W-1}" y2="1.1" stroke="#fffbe6" stroke-opacity=".65" stroke-width=".8" stroke-linecap="round"/>
</svg>`;

// Leading edge spark crest @1x: 24 x 24
const CREST_S=24;
const crestSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${CREST_S*3}" height="${CREST_S*3}" viewBox="0 0 ${CREST_S} ${CREST_S}">
 <defs>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
   <stop offset="0" stop-color="#fff9df" stop-opacity=".95"/>
   <stop offset=".35" stop-color="#f5c663" stop-opacity=".55"/>
   <stop offset="1" stop-color="#f5c663" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="star" cx=".45" cy=".4" r=".7">
   <stop offset="0" stop-color="#ffffff"/>
   <stop offset=".45" stop-color="#ffe699"/>
   <stop offset="1" stop-color="#c48225"/>
  </radialGradient>
 </defs>
 <circle cx="${CREST_S/2}" cy="${CREST_S/2}" r="${CREST_S/2}" fill="url(#glow)"/>
 ${star(CREST_S/2,CREST_S/2,6.5,8.5,1.8)}
</svg>`;

// Ornamental divider @1x: 340 x 16
const DIV_W=340,DIV_H=16;
const divSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${DIV_W*3}" height="${DIV_H*3}" viewBox="0 0 ${DIV_W} ${DIV_H}">
 <defs>
  <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
   <stop offset="0" stop-color="${C.gold}" stop-opacity="0"/>
   <stop offset=".18" stop-color="${C.mid}" stop-opacity=".75"/>
   <stop offset=".5" stop-color="${C.pale}" stop-opacity="1"/>
   <stop offset=".82" stop-color="${C.mid}" stop-opacity=".75"/>
   <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="star" cx=".42" cy=".35" r=".75">
   <stop offset="0" stop-color="#fff7d6"/>
   <stop offset=".4" stop-color="${C.gold}"/>
   <stop offset="1" stop-color="${C.deep}"/>
  </radialGradient>
 </defs>
 <line x1="8" y1="${DIV_H/2}" x2="${DIV_W-8}" y2="${DIV_H/2}" stroke="url(#dg)" stroke-width="1.2"/>
 ${star(DIV_W/2,DIV_H/2,7.5,5.5,1.9,'#146678')}
 ${star(DIV_W/2-28,DIV_H/2,3,2.4,0.9)}
 ${star(DIV_W/2+28,DIV_H/2,3,2.4,0.9)}
</svg>`;

for(const [name,w,h,svgStr] of [
 ['bar-track',TRACK_W,TRACK_H,trackSvg],
 ['bar-fill',INNER_W,INNER_H,fillSvg],
 ['bar-crest',CREST_S,CREST_S,crestSvg],
 ['divider',DIV_W,DIV_H,divSvg],
]){
 const master=await sharp(Buffer.from(svgStr)).png().toBuffer();
 for(const s of [1,2,3]){
  await (s===3?sharp(master):sharp(master).resize(w*s,h*s,{kernel:'lanczos3'}))
   .png({compressionLevel:9})
   .toFile(`${LOAD_OUT}/${name}@${s}x.png`);
 }
}

// Smooth feathered radial vignette sprite (no hard edges) to sit softly behind the logo, bar, and status text.
const VIG_W=680,VIG_H=340;
const vigSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${VIG_W}" height="${VIG_H}" viewBox="0 0 ${VIG_W} ${VIG_H}">
 <defs>
  <radialGradient id="vg" cx=".5" cy=".5" r=".5">
   <stop offset="0" stop-color="#05070a" stop-opacity=".68"/>
   <stop offset=".45" stop-color="#05070a" stop-opacity=".46"/>
   <stop offset=".78" stop-color="#05070a" stop-opacity=".14"/>
   <stop offset="1" stop-color="#05070a" stop-opacity="0"/>
  </radialGradient>
 </defs>
 <ellipse cx="${VIG_W/2}" cy="${VIG_H/2}" rx="${VIG_W/2}" ry="${VIG_H/2}" fill="url(#vg)"/>
</svg>`;
await sharp(Buffer.from(vigSvg)).png({compressionLevel:9}).toFile(`${LOAD_OUT}/vignette.png`);

// 4. Build pure HTML instant loading screen in index.html (renders at t=0ms before JS/Pixi download)
const bgDeskLqip=await sharp(`${LOAD_OUT}/bg-desktop.webp`).resize(64,36,{fit:'cover'}).webp({quality:55}).toBuffer();
const bgMobLqip=await sharp(`${LOAD_OUT}/bg-mobile.webp`).resize(36,64,{fit:'cover'}).webp({quality:55}).toBuffer();
const logoInlineBuf=await sharp(`${LOAD_OUT}/logo@1x.png`).webp({quality:78,alphaQuality:85}).toBuffer();

const bgDeskData=`data:image/webp;base64,${bgDeskLqip.toString('base64')}`;
const bgMobData=`data:image/webp;base64,${bgMobLqip.toString('base64')}`;
const logoInlineData=`data:image/webp;base64,${logoInlineBuf.toString('base64')}`;

const minifySvg=s=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/\s+/g,' ').replace(/> </g,'><').trim();

const inlineDivSvg=minifySvg(
 divSvg
  .replace(`width="${DIV_W*3}" height="${DIV_H*3}"`,'id="loading-divider" aria-hidden="true"')
  .replaceAll('id="dg"','id="ld-div-g"')
  .replaceAll('url(#dg)','url(#ld-div-g)')
  .replaceAll('id="star"','id="ld-div-star"')
  .replaceAll('url(#star)','url(#ld-div-star)'),
);

const inlineTrackSvg=minifySvg(
 trackSvg
  .replace(`width="${TRACK_W*3}" height="${TRACK_H*3}"`,'id="loading-track" aria-hidden="true"')
  .replaceAll('id="gold"','id="ld-trk-gold"')
  .replaceAll('url(#gold)','url(#ld-trk-gold)')
  .replaceAll('id="cavity"','id="ld-trk-cav"')
  .replaceAll('url(#cavity)','url(#ld-trk-cav)')
  .replaceAll('id="star"','id="ld-trk-star"')
  .replaceAll('url(#star)','url(#ld-trk-star)')
  .replaceAll('id="drop"','id="ld-trk-drop"')
  .replaceAll('url(#drop)','url(#ld-trk-drop)'),
);

const inlineFillSvg=minifySvg(
 fillSvg
  .replace(`width="${INNER_W*3}" height="${INNER_H*3}"`,'id="loading-fill" aria-hidden="true"')
  .replaceAll('id="fh"','id="ld-fill-h"')
  .replaceAll('url(#fh)','url(#ld-fill-h)')
  .replaceAll('id="fv"','id="ld-fill-v"')
  .replaceAll('url(#fv)','url(#ld-fill-v)'),
);

const inlineCrestSvg=minifySvg(
 crestSvg
  .replace(`width="${CREST_S*3}" height="${CREST_S*3}"`,'id="loading-crest" aria-hidden="true"')
  .replaceAll('id="glow"','id="ld-cr-glow"')
  .replaceAll('url(#glow)','url(#ld-cr-glow)')
  .replaceAll('id="star"','id="ld-cr-star"')
  .replaceAll('url(#star)','url(#ld-cr-star)'),
);

const indexHtml=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arkadia · Stronghold</title>
<link rel="preload" as="image" href="/typography/v2/loading/bg-mobile.webp" media="(orientation: portrait)" fetchpriority="high">
<link rel="preload" as="image" href="/typography/v2/loading/bg-desktop.webp" media="(orientation: landscape)" fetchpriority="high">
<style>
html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:#080b0e;touch-action:none;user-select:none;-webkit-user-select:none}
canvas{display:block;width:100%;height:100%}
#loading-screen{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#080b0e;transition:opacity 180ms ease-out;will-change:opacity}
#loading-bg{position:absolute;inset:0;background-color:#080b0e;background-image:url('/typography/v2/loading/bg-desktop.webp'),url('${bgDeskData}');background-size:cover;background-position:center;background-repeat:no-repeat}
@media (max-aspect-ratio: 9999/10000), (orientation: portrait){
 #loading-bg{background-image:url('/typography/v2/loading/bg-mobile.webp'),url('${bgMobData}')}
}
#loading-dim{position:absolute;inset:0;background:rgba(5,7,10,0.18);pointer-events:none}
#loading-stage{position:absolute;left:50%;top:54%;width:460px;height:230px;transform:translate(-50%,-50%) scale(var(--loading-scale,1));transform-origin:center center}
@media (max-aspect-ratio: 9999/10000), (orientation: portrait){
 #loading-stage{top:52%}
}
#loading-vignette{position:absolute;left:-110px;top:-47px;width:680px;height:340px;pointer-events:none;background:radial-gradient(50% 50% at 50% 50%,rgba(5,7,10,0.68) 0%,rgba(5,7,10,0.46) 45%,rgba(5,7,10,0.14) 78%,rgba(5,7,10,0) 100%)}
#loading-logo{position:absolute;left:35px;top:0;width:390px;height:120px;display:block;object-fit:contain;pointer-events:none}
#loading-divider{position:absolute;left:60px;top:124px;width:340px;height:16px;display:block;pointer-events:none}
#loading-bar-wrap{position:absolute;left:0;top:150px;width:460px;height:28px;pointer-events:none}
#loading-track{position:absolute;left:0;top:0;width:460px;height:28px;display:block}
#loading-cavity{position:absolute;left:26px;top:9px;width:408px;height:10px;border-radius:1.5px;overflow:hidden}
#loading-fill-clip{width:8px;height:10px;border-radius:1.5px;overflow:hidden;position:relative}
#loading-fill{width:408px;height:10px;display:block}
#loading-crest{position:absolute;top:2px;left:22px;width:24px;height:24px;display:block;pointer-events:none}
#loading-meta{position:absolute;left:26px;right:26px;top:185px;display:flex;justify-content:space-between;align-items:baseline;pointer-events:none}
#loading-label{font:500 17.5px/1.2 "EB Garamond","Palatino Linotype","Book Antiqua",Palatino,Georgia,"Times New Roman",serif;color:#f1e3c6;letter-spacing:0.015em;text-shadow:0 1.5px 3px rgba(0,0,0,0.95),0 0 8px rgba(0,0,0,0.8)}
#loading-pct{font:600 18px/1.2 "Cinzel","EB Garamond","Palatino Linotype",Palatino,Georgia,serif;color:#f2c665;letter-spacing:0.02em;font-variant-numeric:tabular-nums;text-shadow:0 1.5px 3px rgba(0,0,0,0.95),0 0 8px rgba(0,0,0,0.8)}
#loading-retry{position:absolute;left:50%;top:214px;transform:translateX(-50%);width:168px;height:42px;display:none;align-items:center;justify-content:center;cursor:pointer;border:1.5px solid #d9ab55;border-radius:4px;background:linear-gradient(180deg,#2d1c0d 0%,#160d06 100%);box-shadow:0 3px 10px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,240,196,0.35);font:600 15px/1 "Cinzel","EB Garamond",Georgia,serif;color:#f5e4bc;letter-spacing:0.04em;text-shadow:0 1px 2px #000}
#loading-retry:hover{filter:brightness(1.12)}
</style></head><body><div id="app"></div>
<div id="loading-screen" role="status" aria-live="polite" aria-label="Loading Arkadia">
 <div id="loading-bg"></div>
 <div id="loading-dim"></div>
 <div id="loading-stage">
  <div id="loading-vignette"></div>
  <img id="loading-logo" alt="ARKADIA" width="390" height="120" src="${logoInlineData}">
  ${inlineDivSvg}
  <div id="loading-bar-wrap">
   ${inlineTrackSvg}
   <div id="loading-cavity"><div id="loading-fill-clip">${inlineFillSvg}</div></div>
   ${inlineCrestSvg}
  </div>
  <div id="loading-meta">
   <span id="loading-label">Loading the game</span>
   <span id="loading-pct">1%</span>
  </div>
  <button id="loading-retry" type="button">Try Again</button>
 </div>
</div>
<script>
(function(){
 var screen=document.getElementById('loading-screen');
 var stage=document.getElementById('loading-stage');
 var logo=document.getElementById('loading-logo');
 var fillClip=document.getElementById('loading-fill-clip');
 var crest=document.getElementById('loading-crest');
 var labelEl=document.getElementById('loading-label');
 var pctEl=document.getElementById('loading-pct');
 var retryBtn=document.getElementById('loading-retry');
 if(!screen||!stage)return;

 var params=typeof location!=='undefined'?new URLSearchParams(location.search):null;
 var holdLoading=Boolean(params&&params.get('holdLoading')==='1');
 var rawPct=params?params.get('loadingPct'):null;
 var pinnedPct=rawPct!==null&&rawPct!==''&&!Number.isNaN(Number(rawPct))?Number(rawPct):null;
 var pinnedText=params?params.get('loadingText'):null;

 var shown=pinnedPct!==null?Math.max(0,Math.min(100,Math.round(pinnedPct))):1;
 var statusText=pinnedText||'Loading the game';
 var failed=false,finished=false;

 function syncLayout(){
  var w=window.innerWidth||390,h=window.innerHeight||844;
  var s=Math.min(1.06,Math.min((w-28)/460,(h-36)/230));
  stage.style.setProperty('--loading-scale',s.toFixed(4));
 }
 function syncState(){
  var displayPct=pinnedPct!==null?Math.max(0,Math.min(100,Math.round(pinnedPct))):shown;
  var ratio=failed?1:Math.max(0.02,Math.min(1,displayPct/100));
  var fillW=Math.round(408*ratio);
  if(fillClip)fillClip.style.width=fillW+'px';
  if(crest){
   crest.style.display=!failed&&displayPct>0?'block':'none';
   crest.style.left=(26+fillW-12)+'px';
  }
  if(labelEl)labelEl.textContent=statusText;
  if(pctEl)pctEl.textContent=failed?'':(displayPct+'%');
  if(retryBtn)retryBtn.style.display=failed?'flex':'none';
 }
 syncLayout();
 syncState();
 window.addEventListener('resize',syncLayout);
 if(retryBtn)retryBtn.addEventListener('click',function(){location.reload();});

 var bootTimer=pinnedPct===null?setInterval(function(){
  if(failed||finished||shown>=10){clearInterval(bootTimer);return;}
  shown+=1;
  syncState();
 },120):0;

 function removeScreen(){
  clearInterval(bootTimer);
  window.removeEventListener('resize',syncLayout);
  if(screen.parentNode)screen.parentNode.removeChild(screen);
 }

 window.__LOADING_SCREEN__={
  set:function(pct,text){
   shown=Math.max(0,Math.min(100,Math.round(pct)));
   if(typeof text==='string')statusText=text;
   syncLayout();
   syncState();
  },
  progress:function(done,total,text){
   if(failed||pinnedPct!==null)return;
   var pct=Math.round(100*Math.min(1,Math.max(0,done/Math.max(1,total))));
   if(pct>shown)shown=pct;
   if(text)statusText=pinnedText||text;
   syncState();
  },
  done:function(){
   clearInterval(bootTimer);
   if(!failed&&pinnedPct===null){
    shown=100;
    statusText=pinnedText||'Ready';
    syncState();
   }
   finished=true;
   if(!failed&&!holdLoading){
    screen.style.pointerEvents='none';
    screen.style.opacity='0';
    setTimeout(removeScreen,190);
   }
  },
  fail:function(msg){
   clearInterval(bootTimer);
   failed=true;
   statusText=msg;
   syncState();
  }
 };

 var dpr=window.devicePixelRatio||1;
 var scale=dpr>=2.25?3:dpr>=1.35?2:1;
 function preloadImg(url,onLoad){
  var im=new Image();
  im.src=url;
  var p=im.decode?im.decode():new Promise(function(r){im.onload=im.onerror=r;});
  return p.then(function(){if(onLoad)onLoad(im);}).catch(function(){});
 }
 var isPortrait=(window.innerWidth||390)<(window.innerHeight||844);
 var primaryBg=isPortrait?'/typography/v2/loading/bg-mobile.webp':'/typography/v2/loading/bg-desktop.webp';
 var secondaryBg=isPortrait?'/typography/v2/loading/bg-desktop.webp':'/typography/v2/loading/bg-mobile.webp';
 var logoP=preloadImg('/typography/v2/loading/logo@'+scale+'x.png',function(im){if(logo)logo.src=im.src;});
 var bgP=preloadImg(primaryBg).then(function(){return preloadImg(secondaryBg);});
 Promise.race([
  Promise.all([logoP,bgP]),
  new Promise(function(r){setTimeout(r,4000);})
 ]).then(function(){
  window.__LOADING_READY__=true;
 });
})();
</script>
<script type="module" src="/src/app/main.ts"></script></body></html>
`;

fs.writeFileSync('index.html',indexHtml);
console.log('Built high-res ARKADIA logo, loading backgrounds, loading bar assets, and pure HTML index.html in',HERO_OUT,'and',LOAD_OUT);
