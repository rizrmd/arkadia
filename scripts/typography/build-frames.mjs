// Bronze HUD frames, icons and skill art for the typography sample: drawn as SVG in design pixels (the 1672 × 941
// reference), rasterised once at @3x and downscaled to @2x/@1x. The material follows the Choosing Hero kit
// (docs/choosing-hero): dark gold rails with a pale top highlight, near-black fills, four-point compass stars as finials.
//   node scripts/typography/build-frames.mjs
// Writes public/typography/v2/hud/{@1x,@2x,@3x}/<name>.png and hud/manifest.json. A manifest entry's `slice`
// [left, top, right, bottom] is in @1x pixels: NineSliceSprite keeps those borders unscaled when a frame stretches.
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const out='public/typography/v2/hud',kit='assets-src/choosing-hero/v1';
const SCALES=[1,2,3];

// Material: rails are a dark outline, a gold gradient stroke and a pale hairline on top.
const C={ink:'#1c1006',deep:'#5a3612',mid:'#b88236',gold:'#e2b866',pale:'#fbe7b5',fill0:'#16110e',fill1:'#080605'};
const gradients=h=>`
 <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${h}"><stop offset="0" stop-color="${C.pale}"/><stop offset=".3" stop-color="${C.gold}"/><stop offset=".62" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>
 <linearGradient id="goldH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.pale}"/><stop offset=".35" stop-color="${C.gold}"/><stop offset=".7" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>
 <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.fill0}" stop-opacity=".95"/><stop offset="1" stop-color="${C.fill1}" stop-opacity=".95"/></linearGradient>
 <radialGradient id="star" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#fff4cf"/><stop offset=".35" stop-color="${C.gold}"/><stop offset=".8" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.deep}"/></radialGradient>`;
const rail=(d,w=1.6,extra='')=>`<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w+1.3}" stroke-linecap="round" stroke-linejoin="round" ${extra}/><path d="${d}" fill="none" stroke="url(#gold)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const hair=(d,o=.55,w=.55)=>`<path d="${d}" fill="none" stroke="${C.pale}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
// Four-point compass star: rx/ry are the horizontal/vertical reach, k the waist.
function star(cx,cy,rx,ry,k=null,gem=false){
 k??=Math.min(rx,ry)*.32;
 const p=[[cx,cy-ry],[cx+k,cy-k],[cx+rx,cy],[cx+k,cy+k],[cx,cy+ry],[cx-k,cy+k],[cx-rx,cy],[cx-k,cy-k]].map(q=>q.map(v=>+v.toFixed(2)).join(',')).join(' ');
 const facets=`<path d="M${cx},${cy-ry} L${cx},${cy+ry} M${cx-rx},${cy} L${cx+rx},${cy}" stroke="${C.deep}" stroke-opacity=".55" stroke-width=".45"/>`;
 return `<polygon points="${p}" fill="url(#star)" stroke="${C.ink}" stroke-width=".7" stroke-linejoin="round"/>${facets}`+(gem?`<circle cx="${cx}" cy="${cy}" r="${Math.min(rx,ry)*.22}" fill="#7d1408" stroke="${C.pale}" stroke-width=".35"/>`:'');
}
const capsule=(x,y,w,h,r)=>`M${x+r},${y} H${x+w-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} H${x+r} A${r},${r} 0 0 1 ${x+r},${y} Z`;
const rrect=(x,y,w,h,r)=>`M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} H${x+r} Q${x},${y+h} ${x},${y+h-r} V${y+r} Q${x},${y} ${x+r},${y} Z`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w*3}" height="${h*3}" viewBox="0 0 ${w} ${h}"><defs>${gradients(h)}</defs>${body}</svg>`;

// Ornamental pill (gold/time/zone values and the key-hint plates): capsule, offset hairline, star finials and curls at both ends.
function pill(w,h){
 const m=13,r=(h-8)/2,y=4,cy=h/2;
 // A bracket concentric with each rounded end, 3.5 px outside it, curling back in at both tips.
 const bracket=s=>{const ex=s<0?m+r:w-m-r,R=r+3.5,a=t=>[ex+s*R*Math.cos(t),cy+R*Math.sin(t)],[x0,y0]=a(-1.05),[x1,y1]=a(1.05);
  return rail(`M${x0+s*-2.5},${y0-1.6} Q${x0},${y0} ${x0},${y0} A${R},${R} 0 0 ${s>0?1:0} ${x1},${y1} Q${x1+s*-2.5},${y1+1.6} ${x1+s*-2.5},${y1+1.6}`,1.05);};
 return svg(w,h,`<path d="${capsule(m,y,w-2*m,h-2*y,r)}" fill="url(#plate)"/>`+rail(capsule(m,y,w-2*m,h-2*y,r),1.5)+hair(capsule(m+3.2,y+3.2,w-2*m-6.4,h-2*y-6.4,r-3.2),.28)+
  bracket(-1)+bracket(1)+star(6,cy,6,4.2)+star(w-6,cy,6,4.2));
}
function keycap(w,h){
 return svg(w,h,`<path d="${rrect(1,1,w-2,h-2,4)}" fill="#0d0a08" fill-opacity=".92"/><path d="${rrect(2.4,2.4,w-4.8,(h-4.8)*.45,3)}" fill="#fff3d0" fill-opacity=".05"/>`+
  `<path d="${rrect(1,1,w-2,h-2,4)}" fill="none" stroke="${C.ink}" stroke-width="2.4"/><path d="${rrect(1,1,w-2,h-2,4)}" fill="none" stroke="#d9bd86" stroke-width="1.25"/>`+hair(rrect(3,3,w-6,h-6,2.6),.22,.5));
}
function hpFrame(w,h){
 const cy=h/2,tx=8,tw=w-tx-34,ty=cy-11;
 return svg(w,h,`<path d="${rrect(tx-3,ty-3,tw+6,28,7)}" fill="#090505" fill-opacity=".95"/>`+rail(rrect(tx-3,ty-3,tw+6,28,7),1.5)+hair(rrect(tx-.6,ty-.6,tw+1.2,23.2,5),.3)+
  rail(`M${tx+tw+3},${cy} H${w-24}`,1.2)+rail(`M${tx+tw-6},${ty-3} C${tx+tw+6},${ty-3} ${w-26},${cy-8} ${w-20},${cy-3}`,1)+rail(`M${tx+tw-6},${ty+25} C${tx+tw+6},${ty+25} ${w-26},${cy+8} ${w-20},${cy+3}`,1)+
  star(w-13,cy,12.5,9.5,null,true)+star(tx+tw+3,ty-3.5,3,4.5)+star(tx+tw+3,ty+25.5,3,4.5));
}
function fill(w,h,stops,tip){
 const g=`<linearGradient id="f" x1="0" y1="0" x2="0" y2="1">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
 return svg(w,h,`<defs>${g}</defs><path d="${rrect(0,0,w,h,3)}" fill="url(#f)"/><path d="M3,1.6 H${w-3}" stroke="#fff6dc" stroke-opacity=".38" stroke-width="1"/><path d="M3,${h-1.2} H${w-3}" stroke="#000" stroke-opacity=".35" stroke-width="1"/>`+
  `<rect x="${w-2.6}" y="1" width="1.8" height="${h-2}" rx=".9" fill="${tip}" fill-opacity=".9"/>`);
}
// Dark band behind the hero name and health bar; only the middle stretches.
function heroPlate(w,h){
 const top=8,bot=h-8;
 return svg(w,h,`<linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#070505" stop-opacity=".9"/><stop offset=".85" stop-color="#0b0807" stop-opacity=".86"/><stop offset="1" stop-color="#0b0807" stop-opacity=".0"/></linearGradient>`+
  `<path d="M0,${top} H${w-30} L${w-6},${h/2} L${w-30},${bot} H0 Z" fill="url(#band)"/>`+rail(`M0,${top} H${w-36}`,1.1)+rail(`M0,${bot} H${w-36}`,1.1)+hair(`M0,${top+3.2} H${w-44}`,.18)+
  star(w-34,top,5,3.2)+star(w-34,bot,5,3.2));
}
function ring(size,{outer,inner,stars,arc}){
 const c=size/2;const ringBand=`<circle cx="${c}" cy="${c}" r="${(outer+inner)/2}" fill="none" stroke="#120c08" stroke-width="${outer-inner}"/>`;
 const arcPath=a=>{const [a0,a1]=a.map(d=>(d-90)*Math.PI/180),r=(outer+inner)/2;return `M${c+r*Math.cos(a0)},${c+r*Math.sin(a0)} A${r},${r} 0 0 1 ${c+r*Math.cos(a1)},${c+r*Math.sin(a1)}`;};
 const glow=arc?`<path d="${arcPath(arc)}" fill="none" stroke="#ffd36a" stroke-width="${outer-inner-1.6}" stroke-linecap="butt"/><path d="${arcPath(arc)}" fill="none" stroke="#fff3c8" stroke-opacity=".55" stroke-width="${(outer-inner)*.25}"/>`:'';
 return svg(size,size,ringBand+glow+rail(`M${c-outer},${c} a${outer},${outer} 0 1 0 ${outer*2},0 a${outer},${outer} 0 1 0 ${-outer*2},0`,1.7)+rail(`M${c-inner},${c} a${inner},${inner} 0 1 0 ${inner*2},0 a${inner},${inner} 0 1 0 ${-inner*2},0`,1.2)+
  hair(`M${c-outer-3.2},${c} a${outer+3.2},${outer+3.2} 0 1 0 ${(outer+3.2)*2},0 a${outer+3.2},${outer+3.2} 0 1 0 ${-(outer+3.2)*2},0`,.35,.6)+stars.map(([a,rx,ry])=>{const t=(a-90)*Math.PI/180,R=outer+2;return star(c+R*Math.cos(t),c+R*Math.sin(t),rx,ry,null,a%180!==0);}).join(''));
}
function medallion(size){
 const c=size/2,r=size/2-6;
 return svg(size,size,`<circle cx="${c}" cy="${c}" r="${r}" fill="#070505" fill-opacity=".96"/>`+rail(`M${c-r},${c} a${r},${r} 0 1 0 ${2*r},0 a${r},${r} 0 1 0 ${-2*r},0`,1.8)+hair(`M${c-r+3.4},${c} a${r-3.4},${r-3.4} 0 1 0 ${2*(r-3.4)},0 a${r-3.4},${r-3.4} 0 1 0 ${-2*(r-3.4)},0`,.4,.6)+
  hair(`M${c-r-3},${c} a${r+3},${r+3} 0 1 0 ${2*(r+3)},0 a${r+3},${r+3} 0 1 0 ${-2*(r+3)},0`,.3,.5));
}
function badgeLevel(w,h){
 return svg(w,h,`<path d="${capsule(1.5,1.5,w-3,h-3,(h-3)/2)}" fill="#0a0807" fill-opacity=".94"/>`+rail(capsule(1.5,1.5,w-3,h-3,(h-3)/2),.9)+hair(capsule(4,4,w-8,h-8,(h-8)/2),.22,.5));
}
function badgeAuto(w,h){
 const cy=h/2,shape=`M14,3 H${w-14} L${w-6},${cy} L${w-14},${h-3} H14 L6,${cy} Z`;
 return svg(w,h,`<linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a0c"/><stop offset="1" stop-color="#0c0806"/></linearGradient><path d="${shape}" fill="url(#af)" fill-opacity=".96"/>`+rail(shape,1.5)+
  hair(`M15.5,6 H${w-15.5} L${w-9.5},${cy} L${w-15.5},${h-6} H15.5 L9.5,${cy} Z`,.3,.5)+star(3.4,cy,3.4,3)+star(w-3.4,cy,3.4,3));
}
function xpFrame(w,h){
 const cy=h/2,tx=44,tw=w-88,ty=cy-12,th=24;
 const cap=s=>{const x=s<0?0:w,o=v=>x-s*v;return rail(`M${o(tx-3)},${ty-3} C${o(30)},${ty-3} ${o(27)},${cy-9} ${o(16)},${cy-2.5}`,1.1)+rail(`M${o(tx-3)},${ty+th+3} C${o(30)},${ty+th+3} ${o(27)},${cy+9} ${o(16)},${cy+2.5}`,1.1)+
  rail(`M${o(tx-3)},${ty-3} C${o(tx-8)},${ty-8} ${o(tx-12)},${ty-9} ${o(tx-16)},${ty-12}`,.9)+rail(`M${o(tx-3)},${ty+th+3} C${o(tx-8)},${ty+th+8} ${o(tx-12)},${ty+th+9} ${o(tx-16)},${ty+th+12}`,.9)+
  star(o(12.5),cy,12.5,8.5,null,true)+star(o(tx-3),ty-3.5,2.8,4.5)+star(o(tx-3),ty+th+3.5,2.8,4.5);};
 return svg(w,h,`<path d="${rrect(tx-3,ty-3,tw+6,th+6,6)}" fill="#070505" fill-opacity=".94"/>`+rail(rrect(tx-3,ty-3,tw+6,th+6,6),1.5)+hair(rrect(tx-.6,ty-.6,tw+1.2,th+1.2,4),.3)+cap(-1)+cap(1));
}
// Corner filigree that frames the portrait against the screen corner.
function corner(w,h){
 return svg(w,h,rail(`M0,5 H${w-26}`,1.2)+star(w-20,5,6,3)+hair(`M0,9 H${w-60}`,.25)+rail(`M5,0 V${h-24}`,1.2)+star(5,h-18,3,6)+
  rail(`M150,5 C176,5 182,20 200,24`,1)+rail(`M205,5 C226,5 232,15 246,15 H${w-120}`,1)+rail(`M5,150 C5,170 15,178 20,190`,1)+
  rail(`M16,16 C40,6 70,8 92,4`,.9)+rail(`M16,16 C6,40 8,70 4,92`,.9)+star(16,16,5,5));
}
// Icons for the stat pills.
function coins(w,h){
 const coin=(x,y)=>`<path d="M${x-8},${y} v2.6 a8,3.2 0 0 0 16,0 v-2.6" fill="#8f5a14" stroke="${C.ink}" stroke-width=".6"/><ellipse cx="${x}" cy="${y}" rx="8" ry="3.2" fill="url(#star)" stroke="${C.ink}" stroke-width=".6"/><ellipse cx="${x}" cy="${y}" rx="5" ry="1.8" fill="none" stroke="#fff1c0" stroke-opacity=".45" stroke-width=".5"/>`;
 const stack=(x,base,n)=>[...Array(n)].map((_,i)=>coin(x,base-i*3.4)).join('');
 return svg(w,h,stack(10,h-6,3)+stack(28,h-4,2)+stack(19,h-3,4));
}
const clock=(s)=>svg(s,s,`<circle cx="${s/2}" cy="${s/2}" r="${s/2-2.2}" fill="none" stroke="${C.ink}" stroke-width="3.6"/><circle cx="${s/2}" cy="${s/2}" r="${s/2-2.2}" fill="none" stroke="url(#gold)" stroke-width="2.1"/>`+
 `<path d="M${s/2},${s/2-7} V${s/2} L${s/2+5},${s/2+3.5}" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${s/2},${s/2-7} V${s/2} L${s/2+5},${s/2+3.5}" fill="none" stroke="url(#gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
const pin=(w,h)=>svg(w,h,`<path d="M${w/2},${h-1.5} C${w/2-3},${h-8} 2,${h*.5} 2,${w/2-.5+2} A${w/2-2},${w/2-2} 0 1 1 ${w-2},${w/2+1.5} C${w-2},${h*.5} ${w/2+3},${h-8} ${w/2},${h-1.5} Z" fill="url(#star)" stroke="${C.ink}" stroke-width=".8"/><circle cx="${w/2}" cy="${w/2+1}" r="3.4" fill="#120b06"/>`);

// Skill art inside the rings: Flame Fan reuses the kit master; the other two are painted here.
const riftTrap=s=>{const c=s/2,sp=(x,y,r)=>`<path d="M${x},${y-r} L${x+r*.22},${y-r*.22} L${x+r},${y} L${x+r*.22},${y+r*.22} L${x},${y+r} L${x-r*.22},${y+r*.22} L${x-r},${y} L${x-r*.22},${y-r*.22} Z" fill="#f6e8ff"/>`;
 return svg(s,s,`<radialGradient id="bg" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#5b2bd0"/><stop offset=".55" stop-color="#2a0f78"/><stop offset="1" stop-color="#0c0526"/></radialGradient>
 <radialGradient id="orb" cx=".38" cy=".32" r=".72"><stop offset="0" stop-color="#f4e9ff"/><stop offset=".18" stop-color="#c49bff"/><stop offset=".55" stop-color="#7b3cf0"/><stop offset=".85" stop-color="#3d12a8"/><stop offset="1" stop-color="#1c0660"/></radialGradient>
 <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#b98cff" stop-opacity=".0"/><stop offset=".7" stop-color="#b98cff" stop-opacity=".55"/><stop offset="1" stop-color="#b98cff" stop-opacity="0"/></radialGradient>
 <rect width="${s}" height="${s}" fill="url(#bg)"/><circle cx="${c}" cy="${c}" r="${s*.46}" fill="url(#halo)"/>`+
 [...Array(7)].map((_,i)=>`<path d="M${c},${c} m${-s*.42},0 a${s*.42},${s*.3} ${i*26} 0 1 ${s*.84},0" fill="none" stroke="#a678ff" stroke-opacity="${.12+.04*i}" stroke-width=".9" transform="rotate(${i*26} ${c} ${c})"/>`).join('')+
 `<circle cx="${c}" cy="${c}" r="${s*.33}" fill="url(#orb)"/><circle cx="${c}" cy="${c}" r="${s*.33}" fill="none" stroke="#e7d4ff" stroke-opacity=".7" stroke-width="1.2"/><ellipse cx="${c-s*.1}" cy="${c-s*.13}" rx="${s*.11}" ry="${s*.065}" fill="#ffffff" fill-opacity=".75" transform="rotate(-35 ${c-s*.1} ${c-s*.13})"/>`+
 `<path d="M${c+s*.02},${c-s*.18} c${s*.08},${s*.05} ${s*.12},${s*.15} ${s*.06},${s*.27}" fill="none" stroke="#f2e6ff" stroke-opacity=".45" stroke-width="1.6"/>`+
 sp(c+s*.15,c-s*.08,4.5)+sp(c-s*.05,c+s*.12,3)+sp(c+s*.3,c+s*.28,3.4)+sp(c-s*.32,c-s*.28,2.8)+sp(c+s*.34,c-s*.33,2.2));};
const seismicSlam=s=>{const c=s/2,rays=[...Array(18)].map((_,i)=>{const a=i/18*Math.PI*2+.1,l=s*(.42+.12*(i%3===0)),w=.09;return `<path d="M${c},${c+s*.08} L${c+l*Math.cos(a-w)},${c+s*.08+l*Math.sin(a-w)} L${c+l*Math.cos(a+w)},${c+s*.08+l*Math.sin(a+w)} Z" fill="#fff0b0" fill-opacity="${.25+.2*(i%2)}"/>`;}).join('');
 const rock=(pts,shade)=>{const P=pts.map(([x,y])=>[c+x*s,c+y*s]),top=P.slice(0,3).map(p=>p.join(',')).join(' L');
  return `<polygon points="${P.map(p=>p.join(',')).join(' ')}" fill="${shade}" stroke="#1a0a03" stroke-width=".8" stroke-linejoin="round"/><path d="M${top}" fill="none" stroke="#ffcf7a" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round"/>`;};
 return svg(s,s,`<radialGradient id="bg" cx=".5" cy=".58" r=".6"><stop offset="0" stop-color="#fff2b8"/><stop offset=".18" stop-color="#ffc24a"/><stop offset=".45" stop-color="#e57a12"/><stop offset=".8" stop-color="#7a2c04"/><stop offset="1" stop-color="#2a0c02"/></radialGradient>
 <rect width="${s}" height="${s}" fill="url(#bg)"/>${rays}<circle cx="${c}" cy="${c+s*.08}" r="${s*.1}" fill="#fffbe6" fill-opacity=".85"/>`+
 rock([[-.36,.22],[-.27,.12],[-.15,.15],[-.11,.27],[-.22,.34],[-.35,.31]],'#4a2610')+rock([[-.13,.24],[-.04,.13],[.07,.16],[.13,.27],[.03,.35],[-.1,.34]],'#5c3014')+rock([[.1,.2],[.2,.1],[.33,.17],[.37,.28],[.25,.34],[.13,.31]],'#43220d')+
 rock([[-.27,.01],[-.2,-.07],[-.12,-.04],[-.13,.04],[-.22,.06]],'#6a3a17')+rock([[.15,-.03],[.23,-.13],[.31,-.06],[.28,.03],[.19,.04]],'#5a3012')+rock([[.02,-.17],[.07,-.23],[.12,-.17],[.08,-.12]],'#5a3012')+
 rock([[-.46,.36],[-.36,.3],[-.27,.34],[-.3,.44],[-.44,.45]],'#3a1c0a')+rock([[.27,.37],[.37,.31],[.46,.35],[.44,.45],[.3,.45]],'#3a1c0a')+rock([[-.06,.38],[.03,.35],[.1,.4],[.04,.47],[-.06,.46]],'#2e1607')+
 [[-.3,-.3,1.8],[.32,-.26,1.5],[-.05,-.38,1.4],[.4,.05,1.2],[-.42,.02,1.3]].map(([x,y,r])=>`<circle cx="${c+x*s}" cy="${c+y*s}" r="${r}" fill="#ffe7a0"/>`).join(''));};

// Circular crops of kit masters: [file, centre x, centre y, radius] in master pixels.
async function circleArt(file,[cx,cy,r],size,underlay){
 const px=size*3,src=await sharp(path.join(kit,file)).extract({left:Math.round(cx-r),top:Math.round(cy-r),width:Math.round(2*r),height:Math.round(2*r)}).resize(px,px,{kernel:'lanczos3'}).png().toBuffer();
 const bg=underlay?await sharp(Buffer.from(underlay)).resize(px,px).png().toBuffer():null;
 const base=bg?await sharp(bg).composite([{input:src}]).png().toBuffer():src;
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><circle cx="${px/2}" cy="${px/2}" r="${px/2}" fill="#fff"/></svg>`);
 return sharp(base).ensureAlpha().composite([{input:await sharp(mask).png().toBuffer(),blend:'dest-in'}]).png().toBuffer();
}
const circleMask=async(buf,size)=>{const px=size*3,mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><circle cx="${px/2}" cy="${px/2}" r="${px/2}" fill="#fff"/></svg>`);return sharp(buf).resize(px,px).ensureAlpha().composite([{input:await sharp(mask).png().toBuffer(),blend:'dest-in'}]).png().toBuffer();};
const redUnderlay=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><radialGradient id="r" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ff5a2e"/><stop offset=".55" stop-color="#b3150a"/><stop offset="1" stop-color="#3c0503"/></radialGradient><rect width="100" height="100" fill="url(#r)"/></svg>`;

// name: [width, height, svg | async buffer, slice?]
const ART=124,ORB=114;
const assets={
 'pill':[120,48,pill(120,48),[34,24,34,24]],
 'pill-wide':[120,60,pill(120,60),[36,30,36,30]],
 'keycap':[28,28,keycap(28,28),[9,9,9,9]],
 'hp-frame':[200,40,hpFrame(200,40),[18,20,46,20]],
 'hp-fill':[40,18,fill(40,18,[[0,'#ff6a4f'],[.32,'#e3241a'],[.72,'#a50d0a'],[1,'#590404']],'#ffb08a'),[6,9,6,9]],
 'xp-frame':[200,50,xpFrame(200,50),[62,25,62,25]],
 'xp-fill':[40,24,fill(40,24,[[0,'#ffcf6a'],[.35,'#f5a21f'],[.72,'#cf7409'],[1,'#7c4003']],'#fff0b0'),[6,12,6,12]],
 'hero-plate':[200,104,heroPlate(200,104),[24,52,64,52]],
 'portrait-ring':[176,176,ring(176,{outer:70,inner:62,stars:[[0,6.5,13],[90,12,7],[180,6.5,13],[270,12,7]]}),null],
 'level-medallion':[60,60,medallion(60),null],
 'corner':[470,230,corner(470,230),null],
 'skill-ring':[156,156,ring(156,{outer:65,inner:56,stars:[[0,4.5,9],[90,9,5.5],[270,9,5.5]],arc:[0,92]}),null],
 'badge-level':[64,26,badgeLevel(64,26),[13,13,13,13]],
 'badge-auto':[84,28,badgeAuto(84,28),[20,14,20,14]],
 'icon-coins':[40,30,coins(40,30),null],
 'icon-clock':[26,26,clock(26),null],
 'icon-pin':[22,28,pin(22,28),null],
 'portrait-ember-warden':[ART,ART,()=>circleArt('ember-warden.png',[560,245,190],ART,redUnderlay),null],
 'skill-flame-fan':[ORB,ORB,()=>circleArt('skill-flame-fan.png',[628,612,352],ORB),null],
 'skill-rift-trap':[ORB,ORB,async()=>circleMask(await sharp(Buffer.from(riftTrap(ORB))).png().toBuffer(),ORB),null],
 'skill-seismic-slam':[ORB,ORB,async()=>circleMask(await sharp(Buffer.from(seismicSlam(ORB))).png().toBuffer(),ORB),null],
};

const manifest={scales:SCALES,note:'Sizes and slices in @1x pixels; @Nx files are N times larger.',frames:{}};
for(const s of SCALES)fs.mkdirSync(path.join(out,`@${s}x`),{recursive:true});
for(const [name,[w,h,art,slice]] of Object.entries(assets)){
 const master=typeof art==='function'?await art():await sharp(Buffer.from(art)).png().toBuffer();
 const meta=await sharp(master).metadata();if(meta.width!==w*3||meta.height!==h*3)throw Error(`${name}: master ${meta.width}×${meta.height}, expected ${w*3}×${h*3}`);
 for(const s of SCALES){const file=path.join(out,`@${s}x`,name+'.png');await (s===3?sharp(master):sharp(master).resize(w*s,h*s,{kernel:'lanczos3'})).png({compressionLevel:9}).toFile(file);}
 manifest.frames[name]={width:w,height:h,...(slice?{slice}:{})};
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(Object.keys(assets).length,'assets ×',SCALES.length,'scales →',out);

// Contact sheet of the @3x masters with 9-slice guides (dashed), for the Knowledge page.
const sheet=[];let sx=24,sy=60,rowH=0;const SW=2400;
for(const [name,f] of Object.entries(manifest.frames)){
 const w=f.width*3,h=f.height*3,k=Math.min(1,560/w),dw=Math.round(w*k),dh=Math.round(h*k);
 if(sx+dw>SW-24){sx=24;sy+=rowH+64;rowH=0;}
 const guides=f.slice?`<g stroke="#4fd1ff" stroke-width="2" stroke-dasharray="8 6" fill="none"><line x1="${f.slice[0]*3*k}" y1="0" x2="${f.slice[0]*3*k}" y2="${dh}"/><line x1="${dw-f.slice[2]*3*k}" y1="0" x2="${dw-f.slice[2]*3*k}" y2="${dh}"/>${f.slice[1]+f.slice[3]<f.height?`<line x1="0" y1="${f.slice[1]*3*k}" x2="${dw}" y2="${f.slice[1]*3*k}"/><line x1="0" y1="${dh-f.slice[3]*3*k}" x2="${dw}" y2="${dh-f.slice[3]*3*k}"/>`:''}</g>`:'';
 sheet.push({input:await sharp(path.join(out,'@3x',name+'.png')).resize(dw,dh).png().toBuffer(),left:sx,top:sy});
 sheet.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(dw,260)}" height="${dh+40}">${guides}<text x="0" y="${dh+30}" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#f1e2c0">${name} · ${f.width}×${f.height}${f.slice?' · 9-slice':''}</text></svg>`),left:sx,top:sy});
 sx+=Math.max(dw,260)+40;rowH=Math.max(rowH,dh);
}
fs.mkdirSync('docs/typography/v2',{recursive:true});
await sharp({create:{width:SW,height:sy+rowH+64,channels:3,background:'#3b4656'}}).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="48"><text x="24" y="34" font-family="DejaVu Sans, sans-serif" font-size="24" fill="#fff">HUD frames, icons and art · @3x masters · dashed lines = 9-slice borders (corners never stretch)</text></svg>`),left:0,top:0},...sheet]).png().toFile('docs/typography/v2/hud-frames-sheet.png');
console.log('contact sheet → docs/typography/v2/hud-frames-sheet.png');
