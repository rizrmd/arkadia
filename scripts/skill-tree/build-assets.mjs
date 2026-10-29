// Rift Runner Skill Tree kit: node frames, pips, slot badges, connectors, panel frame, scrollbar, chevrons, edge fades
// and one painted icon per node (src/stronghold/skill-tree.ts). Same pipeline as scripts/typography/build-frames.mjs:
// SVG in design pixels, rasterised once at @3x, downscaled to @2x/@1x, with a manifest FrameSet.load() reads.
//   node scripts/skill-tree/build-assets.mjs
// Icons: Rift Bolt reuses the painted Choosing Hero master; every other node is cut from the approved Ascension Tree
// mockups in assets-src/skill-tree (Knowledge "Rift Runner — Ascension Tree Concept"). The mockups paint unlearned
// nodes in grey, so the learned colour is a gradient map of that grey through each node's palette; `-dim` keeps the grey.
// Writes public/skill-tree/v1/{@1x,@2x,@3x}/<name>.png, public/skill-tree/v1/manifest.json and docs/skill-tree/kit-sheet.png.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
// Slot numbers and the sheet labels are set in Cinzel from the repo's own font files (librsvg reads fontconfig).
const fontsConf=path.join(os.tmpdir(),'arkodia-skill-tree-fonts.conf');
fs.writeFileSync(fontsConf,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.resolve('assets-src/typography/fonts')}</dir><cachedir>${path.join(os.tmpdir(),'arkodia-fc-cache')}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE=fontsConf;
const {default:sharp}=await import('sharp');

const out='public/skill-tree/v1',src='assets-src/skill-tree',kit='assets-src/choosing-hero/v1';
const SCALES=[1,2,3];
for(const s of SCALES)fs.mkdirSync(path.join(out,`@${s}x`),{recursive:true});
fs.mkdirSync('docs/skill-tree',{recursive:true});

// Material of the mockups: thick orange-gold rings with bright rails, diamond studs, near-black charcoal panels.
const C={ink:'#140a03',deep:'#5a3110',mid:'#b4661c',gold:'#f0b648',bright:'#ffd978',pale:'#fff0c2',fill0:'#121010',fill1:'#060505'};
const defs=`<defs>
 <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.pale}"/><stop offset=".28" stop-color="${C.bright}"/><stop offset=".6" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.mid}"/></linearGradient>
 <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.mid}"/><stop offset=".5" stop-color="${C.bright}"/><stop offset="1" stop-color="${C.mid}"/></linearGradient>
 <radialGradient id="band" cx=".5" cy=".5" r=".5"><stop offset=".76" stop-color="#7a3a0c"/><stop offset=".83" stop-color="#d27a22"/><stop offset=".9" stop-color="#ffcf6a"/><stop offset=".96" stop-color="#b4661c"/><stop offset="1" stop-color="#5a2a08"/></radialGradient>
 <radialGradient id="gem" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="${C.bright}"/><stop offset=".75" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.deep}"/></radialGradient>
 <radialGradient id="disc" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2a2420"/><stop offset="1" stop-color="#090706"/></radialGradient>
 <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#ffd36a" stop-opacity="0"/><stop offset=".66" stop-color="#ffd36a" stop-opacity=".95"/><stop offset=".74" stop-color="#ffb43a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a1a" stop-opacity="0"/></radialGradient>
 <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.fill0}"/><stop offset="1" stop-color="${C.fill1}"/></linearGradient>
</defs>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w*3}" height="${h*3}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;
const circle=(cx,cy,r)=>`M${cx-r},${cy} a${r},${r} 0 1 0 ${2*r},0 a${r},${r} 0 1 0 ${-2*r},0 Z`;
const rail=(d,w=1.6)=>`<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w+1.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="url(#gold)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const hair=(d,o=.5,w=.6)=>`<path d="${d}" fill="none" stroke="${C.pale}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
// Faceted diamond stud: rx/ry are the half-width/half-height.
function diamond(cx,cy,rx,ry){
 const p=`${cx},${cy-ry} ${cx+rx},${cy} ${cx},${cy+ry} ${cx-rx},${cy}`;
 return `<polygon points="${p}" fill="url(#gem)" stroke="${C.ink}" stroke-width="1" stroke-linejoin="round"/>`+
  `<polygon points="${cx},${cy-ry*.5} ${cx+rx*.5},${cy} ${cx},${cy+ry*.5} ${cx-rx*.5},${cy}" fill="none" stroke="${C.deep}" stroke-opacity=".7" stroke-width=".7"/>`+
  `<path d="M${cx-rx*.55},${cy-ry*.2} L${cx},${cy-ry*.75}" stroke="#fff8e0" stroke-opacity=".8" stroke-width=".8" stroke-linecap="round"/>`;
}
function star4(cx,cy,r){
 const k=r*.3,p=[[cx,cy-r],[cx+k,cy-k],[cx+r,cy],[cx+k,cy+k],[cx,cy+r],[cx-k,cy+k],[cx-r,cy],[cx-k,cy-k]].map(q=>q.join(',')).join(' ');
 return `<polygon points="${p}" fill="url(#gem)" stroke="${C.ink}" stroke-width=".9" stroke-linejoin="round"/>`;
}
function star8(cx,cy,r){
 const pts=[];for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,rr=i%2?r*.42:(i%4?r*.72:r);pts.push(`${(cx+rr*Math.cos(a)).toFixed(2)},${(cy+rr*Math.sin(a)).toFixed(2)}`);}
 return `<polygon points="${pts.join(' ')}" fill="url(#gem)" stroke="${C.ink}" stroke-width=".9" stroke-linejoin="round"/>`;
}

// Active ring: a thick orange-gold band between two bright rails, with diamond studs on the four axes (the connectors
// meet the top/left studs). The icon disc sits under it at radius 46 of 128.
const RING=128,RC=RING/2,RO=55,RI=45;
function ring({evolution=false}={}){
 const band=`<circle cx="${RC}" cy="${RC}" r="${(RO+RI)/2}" fill="none" stroke="url(#band)" stroke-width="${RO-RI}"/>`;
 const shade=`<circle cx="${RC}" cy="${RC}" r="${(RO+RI)/2}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="${RO-RI}" stroke-dasharray="0 ${Math.PI*(RO+RI)*.55} ${Math.PI*(RO+RI)*.45}" transform="rotate(20 ${RC} ${RC})"/>`;
 const shine=`<path d="M${RC-RO+3},${RC-14} A${RO-3},${RO-3} 0 0 1 ${RC+14},${RC-RO+3}" fill="none" stroke="#fff3cc" stroke-opacity=".65" stroke-width="2.2" stroke-linecap="round"/>`;
 const studs=[[RC,RC-RO-1],[RC+RO+1,RC],[RC,RC+RO+1],[RC-RO-1,RC]].map(([x,y],i)=>i===0&&evolution?star8(x,y-1,11):diamond(x,y,7,8.5)).join('');
 return svg(RING,RING,band+shade+rail(circle(RC,RC,RO),1.8)+rail(circle(RC,RC,RI),1.5)+hair(circle(RC,RC,RI+2.4),.35)+shine+studs);
}
// Gold halo drawn behind a highlighted node; skill-tree.ts pulses its alpha and scale.
const glow=s=>svg(s,s,`<circle cx="${s/2}" cy="${s/2}" r="${s/2}" fill="url(#halo)"/>`);
// Rank pips: five small diamonds under an active node, filled up to the rank.
const pip=on=>svg(14,14,on?diamond(7,7,5.4,6.2):`<polygon points="7,1 12.4,7 7,13 1.6,7" fill="#0b0806" fill-opacity=".9" stroke="${C.gold}" stroke-width="1.1" stroke-linejoin="round"/>`);
// Slot badges 1/2/3: round black coin with a gold rim and a Cinzel numeral, pinned to the top-right of an equipped ring.
const slot=n=>svg(36,36,`<circle cx="18" cy="18" r="15.5" fill="#0a0806"/>`+rail(circle(18,18,15.5),1.7)+hair(circle(18,18,12.6),.35)+
 `<text x="18" y="25.2" text-anchor="middle" font-family="Cinzel" font-weight="600" font-size="20" fill="${C.pale}" stroke="${C.ink}" stroke-width=".6">${n}</text>`);
// "Lv. N" plate under a learned node (the text is MSDF so any rank fits); a chamfered tab like the mockups.
function levelPlate(w,h){
 const c=6,shape=`M${c},1.5 H${w-c} L${w-1.5},${h/2} L${w-c},${h-1.5} H${c} L1.5,${h/2} Z`;
 return svg(w,h,`<path d="${shape}" fill="url(#plate)" fill-opacity=".96"/>`+rail(shape,1.3)+hair(`M${c+2},4.2 H${w-c-2}`,.3));
}
// Connector lines: a gold rail with a dark outline; 9-sliced along their length so they stretch to any span.
const lineH=svg(24,8,`<rect x="0" y="1.6" width="24" height="4.8" fill="${C.ink}"/><rect x="0" y="2.5" width="24" height="3" fill="url(#gold)"/><rect x="0" y="2.6" width="24" height=".9" fill="${C.pale}" fill-opacity=".7"/>`);
const lineV=svg(8,24,`<rect x="1.6" y="0" width="4.8" height="24" fill="${C.ink}"/><rect x="2.5" y="0" width="3" height="24" fill="url(#goldH)"/><rect x="2.6" y="0" width=".9" height="24" fill="${C.pale}" fill-opacity=".7"/>`);
const junction=svg(20,20,diamond(10,10,8,9));
const stud=svg(12,12,diamond(6,6,4.6,5.2));

// Panel frame: double gold rail, filigree corner brackets, a diamond finial at the top centre; 9-sliced so the corners
// never stretch. The inside is clear: the painted backdrop (panel-stone, panel-vignette, panel-arcane) shows through.
const PF=160,PC=44;
function panelFrame(){
 const o=6,i=12;
 const corner=(x,y,sx,sy)=>{
  const t=(px,py)=>`${x+sx*px},${y+sy*py}`;
  return rail(`M${t(4,34)} L${t(4,4)} L${t(34,4)}`,2)+rail(`M${t(12,26)} Q${t(12,12)} ${t(26,12)}`,1.1)+
   rail(`M${t(4,20)} C${t(-1,13)} ${t(13,-1)} ${t(20,4)}`,1)+star4(x+sx*7,y+sy*7,5.2);
 };
 return svg(PF,PF,`<rect x="${i+1}" y="${i+1}" width="${PF-2*i-2}" height="${PF-2*i-2}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="3"/>`+
  rail(`M${o},${o} H${PF-o} V${PF-o} H${o} Z`,2.2)+rail(`M${i},${i} H${PF-i} V${PF-i} H${i} Z`,1)+hair(`M${i+3},${i+3} H${PF-i-3}`,.2)+
  corner(0,0,1,1)+corner(PF,0,-1,1)+corner(0,PF,1,-1)+corner(PF,PF,-1,-1));
}
// Title rule under "Skill Tree": thin rails leading to small stars, a diamond in the middle; and the top finial.
function titleRule(w,h){
 const cy=h/2;
 return svg(w,h,rail(`M8,${cy} H${w/2-14}`,1)+rail(`M${w/2+14},${cy} H${w-8}`,1)+star4(6,cy,4.5)+star4(w-6,cy,4.5)+diamond(w/2,cy,9,8)+
  rail(`M${w*.18},${cy-4} Q${w*.24},${cy} ${w*.3},${cy-4}`,.8)+rail(`M${w*.7},${cy-4} Q${w*.76},${cy} ${w*.82},${cy-4}`,.8));
}
const finial=svg(44,26,rail('M2,22 Q12,22 16,14 M42,22 Q32,22 28,14',1.1)+diamond(22,13,10,11));
// Close button: gold ring around a dark coin with an engraved X.
const close=svg(48,48,`<circle cx="24" cy="24" r="20" fill="#0a0806"/>`+rail(circle(24,24,20),2)+hair(circle(24,24,16.6),.35)+
 rail('M16.5,16.5 L31.5,31.5 M31.5,16.5 L16.5,31.5',2.4));
// Thin gold scrollbar: dark track with a gold rim, a bright gold thumb; both 9-slice along their length.
const trackV=svg(10,40,`<rect x="2.5" y="1" width="5" height="38" rx="2.5" fill="#050403" stroke="${C.mid}" stroke-opacity=".75" stroke-width="1"/>`);
const thumbV=svg(10,40,`<rect x="2" y="1" width="6" height="38" rx="3" fill="url(#goldH)" stroke="${C.ink}" stroke-width=".9"/><rect x="3.4" y="4" width="1.2" height="32" rx=".6" fill="${C.pale}" fill-opacity=".7"/>`);
const trackH=svg(40,10,`<rect x="1" y="2.5" width="38" height="5" rx="2.5" fill="#050403" stroke="${C.mid}" stroke-opacity=".75" stroke-width="1"/>`);
const thumbH=svg(40,10,`<rect x="1" y="2" width="38" height="6" rx="3" fill="url(#gold)" stroke="${C.ink}" stroke-width=".9"/><rect x="4" y="3.2" width="32" height="1.2" rx=".6" fill="${C.pale}" fill-opacity=".7"/>`);
// Chevron hints at the edge where more tree continues.
const chevronUp=svg(36,22,rail('M5,17 L18,5 L31,17',3));
const chevronRight=svg(22,36,rail('M5,5 L17,18 L5,31',3));
// Edge fades: charcoal to transparent, stretched along the cut-off edge.
const fadeV=svg(8,48,`<linearGradient id="fv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070605"/><stop offset=".35" stop-color="#070605" stop-opacity=".75"/><stop offset="1" stop-color="#070605" stop-opacity="0"/></linearGradient><rect width="8" height="48" fill="url(#fv)"/>`);
const fadeH=svg(48,8,`<linearGradient id="fh" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#070605"/><stop offset=".35" stop-color="#070605" stop-opacity=".75"/><stop offset="1" stop-color="#070605" stop-opacity="0"/></linearGradient><rect width="48" height="8" fill="url(#fh)"/>`);
// Faint compass geometry for the panel's corners, like the mockups' background drawing.
function compass(s){
 const c=s/2,R=s*.36;
 const spokes=[0,45,90,135].map(a=>{const t=a*Math.PI/180,dx=Math.cos(t)*s*.48,dy=Math.sin(t)*s*.48;return `M${c-dx},${c-dy} L${c+dx},${c+dy}`;}).join(' ');
 return svg(s,s,`<g fill="none" stroke="${C.gold}" stroke-opacity=".5" stroke-width=".9"><path d="${circle(c,c,R)}"/><path d="${circle(c,c,R*.62)}"/><path d="${spokes}" stroke-opacity=".32"/>`+
  `<path d="M${c},${c-R*1.3} L${c+R*.16},${c-R*.16} L${c+R*1.3},${c} L${c+R*.16},${c+R*.16} L${c},${c+R*1.3} L${c-R*.16},${c+R*.16} L${c-R*1.3},${c} L${c-R*.16},${c-R*.16} Z" stroke-opacity=".7"/></g>`);
}

// Backdrop, like the mockups' charcoal stone: soft low-contrast mottling and faint hairline cracks, plus fine grain.
// librsvg's stitchTiles leaves a visible band at tile edges, so each layer is rendered `o` px larger than the tile and
// the overflow is cross-faded back into the opposite edge (x, then y), which makes the tile wrap exactly.
async function seamless(svgText,w,o){
 const n=w+o,{data}=await sharp(Buffer.from(svgText)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const pass=(src,sw,sh,horizontal)=>{
  const ow=horizontal?sw-o:sw,oh=horizontal?sh:sh-o,out=Buffer.alloc(ow*oh*4);
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
   const t=horizontal?x:y,k=t<o?t/o:1,i=(y*sw+x)*4,j=horizontal?(y*sw+x+ow)*4:((y+oh)*sw+x)*4,d=(y*ow+x)*4;
   for(let c=0;c<4;c++)out[d+c]=Math.round(src[i+c]*k+(t<o?src[j+c]*(1-k):0));
  }
  return out;
 };
 const tile=pass(pass(data,n,n,true),w,n,false);
 return sharp(tile,{raw:{width:w,height:w,channels:4}}).png().toBuffer();
}
async function stone(s){
 const raw=(w,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">${body}</svg>`;
 const o=48,n=s+o,g=s*3,go=96;
 const low=await seamless(raw(n,`<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${4/s}" numOctaves="4" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 .16  0 0 0 0 .14  0 0 0 0 .115  0 0 0 -1.6 1.05"/></filter>`+
  `<filter id="cracks" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="${8/s}" numOctaves="2" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -9 0 0 0 1.05"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 .5 .85"/></feComponentTransfer></filter>`+
  `<rect width="${n}" height="${n}" fill="#0c0b0a"/><rect width="${n}" height="${n}" filter="url(#mottle)" opacity=".5"/><rect width="${n}" height="${n}" filter="url(#cracks)" opacity=".3"/>`),s,o);
 const grain=await seamless(raw(g+go,`<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".3" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .46  0 0 0 0 .4  0 0 0 -1.2 .95"/></filter><rect width="${g+go}" height="${g+go}" filter="url(#grain)" opacity=".1"/>`),g,go);
 // Upscale a 3 × 3 tiling and keep the middle, so the resampling wraps across the tile edges too.
 const big=await sharp({create:{width:s*3,height:s*3,channels:4,background:'#000'}}).composite([{input:low,tile:true,left:0,top:0}]).png().toBuffer();
 const base=await sharp(await sharp(big).resize(s*9,s*9,{kernel:'cubic'}).png().toBuffer()).extract({left:s*3,top:s*3,width:s*3,height:s*3}).png().toBuffer();
 return sharp(base).composite([{input:grain}]).png().toBuffer();
}
// Edge darkening over the backdrop: clear in the middle, near black at the rails.
const vignette=svg(128,128,`<radialGradient id="vg" cx=".5" cy=".5" r=".72"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient><rect width="128" height="128" fill="url(#vg)"/>`);
// Arcane astrolabe drawn faintly in gold behind the tree (corners of the panel): graduated rings, crosshairs that run
// past the rim, an eight-point star, a few star-chart dots and offset arcs.
function arcane(s){
 const c=s/2,R=s*.3,ln=(a,r0,r1)=>{const t=a*Math.PI/180;return `M${(c+r0*Math.cos(t)).toFixed(1)},${(c+r0*Math.sin(t)).toFixed(1)} L${(c+r1*Math.cos(t)).toFixed(1)},${(c+r1*Math.sin(t)).toFixed(1)}`;};
 const ticks=Array.from({length:72},(_,i)=>ln(i*5,R*(i%6?1.02:.96),R*1.1)).join(' ');
 const rays=[0,45,90,135,180,225,270,315].map(a=>ln(a,R*.2,a%90?R*1.25:s*.5)).join(' ');
 const k=R*.14,st=(r)=>[[0,-r],[k,-k],[r,0],[k,k],[0,r],[-k,k],[-r,0],[-k,-k]].map(([x,y])=>`${(c+x).toFixed(1)},${(c+y).toFixed(1)}`).join(' ');
 const dots=[[.18,.22,1.6],[.8,.16,1.2],[.86,.7,1.8],[.24,.84,1.3],[.62,.9,1],[.1,.55,1.1],[.7,.32,.9]].map(([x,y,r])=>`<circle cx="${x*s}" cy="${y*s}" r="${r}" fill="${C.pale}" fill-opacity=".8"/>`).join('');
 return svg(s,s,`<g fill="none" stroke="${C.gold}" stroke-linecap="round">`+
  `<circle cx="${c}" cy="${c}" r="${R*1.1}" stroke-width="1.1" stroke-opacity=".7"/><circle cx="${c}" cy="${c}" r="${R}" stroke-width=".7" stroke-opacity=".6"/>`+
  `<circle cx="${c}" cy="${c}" r="${R*.62}" stroke-width=".8" stroke-opacity=".55"/><circle cx="${c}" cy="${c}" r="${R*.3}" stroke-width=".6" stroke-opacity=".5"/>`+
  `<path d="${ticks}" stroke-width=".6" stroke-opacity=".55"/><path d="${rays}" stroke-width=".6" stroke-opacity=".38"/>`+
  `<circle cx="${c+R*.55}" cy="${c-R*.35}" r="${R*.85}" stroke-width=".5" stroke-opacity=".28" stroke-dasharray="3 5"/><circle cx="${c-R*.7}" cy="${c+R*.6}" r="${R*.45}" stroke-width=".5" stroke-opacity=".3"/>`+
  `<polygon points="${st(R*.95)}" stroke-width=".9" stroke-opacity=".75"/><polygon points="${st(R*.55)}" transform="rotate(45 ${c} ${c})" stroke-width=".7" stroke-opacity=".55"/>`+
  `<path d="M${c-s*.48},${c+R*1.42} H${c+s*.48} M${c-R*1.42},${c-s*.48} V${c+s*.48}" stroke-width=".5" stroke-opacity=".3"/></g>${dots}`);
}

// Gradient maps (grey → colour) per node, dark to light.
const PAL={
 rift:['#020510','#0a2266','#1a5fd8','#58c4ff','#effaff'],
 violet:['#07030f','#2a0d63','#6a32d8','#b98cff','#f6efff'],
 earth:['#0c0502','#4a1d06','#b0561a','#ffbe5c','#fff6dc'],
 spectral:['#020b0c','#08404a','#1b9aa2','#7fe8e0','#f0fffd'],
 horizon:['#06020c','#2e0b4f','#7a2fc4','#d68cff','#fff0ff'],
 lance:['#020611','#0b2f6e','#2a8de6','#9fe6ff','#ffffff'],
 storm:['#0b0702','#463004','#b98a1a','#ffe08a','#fffbe8'],
 crimson:['#0e0204','#4c0814','#b81c36','#ff8a96','#fff0f0'],
 chrono:['#020a0d','#0c3a4c','#1f93b8','#9cf0ff','#ffffff'],
 ember:['#0e0402','#5a1306','#e0501a','#ffc163','#fff6dc'],
 star:['#0a0702','#4a3208','#c99a2a','#ffe9a6','#ffffff'],
};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lut=stops=>{const c=stops.map(hex),t=new Uint8Array(256*3);for(let v=0;v<256;v++){const f=v/255*(c.length-1),i=Math.min(c.length-2,Math.floor(f)),k=f-i;for(let j=0;j<3;j++)t[v*3+j]=Math.round(c[i][j]+(c[i+1][j]-c[i][j])*k);}return t;};

// Every node: [file, cx, cy, r] in source pixels, the palette, and whether it is a round active (disc) or a passive emblem.
const M='mockup-mobile-tree.png',D='mockup-desktop-tree.png';
const NODES={
 'rift-bolt':{kind:'active',master:[path.join(kit,'skill-rift-bolt.png'),627,625,300],color:'native'},
 'rift-dash':{kind:'active',crop:[M,138,1218,63],pal:'rift'},
 'rift-trap':{kind:'active',crop:[D,430,447,61],pal:'violet'},
 'astral-cleave':{kind:'active',crop:[M,138,960,63],pal:'rift'},
 'seismic-slam':{kind:'active',crop:[M,352,960,63],pal:'earth'},
 'phantom-legion':{kind:'active',crop:[M,288,694,69],pal:'spectral'},
 'event-horizon':{kind:'active',crop:[M,650,694,69],pal:'horizon'},
 'rift-lance':{kind:'active',crop:[M,470,423,58],pal:'lance'},
 'second-wind':{kind:'passive',crop:[M,585,1222,84],pal:'rift'},
 'titan-strike':{kind:'passive',crop:[M,805,1222,86],pal:'storm'},
 'arc-nova':{kind:'passive',crop:[M,585,968,84],pal:'violet'},
 'soul-feast':{kind:'passive',crop:[M,805,968,84],pal:'crimson'},
 'chrono-surge':{kind:'passive',crop:[M,208,420,86],pal:'chrono'},
 'furnace-heart':{kind:'passive',crop:[M,732,418,88],pal:'ember'},
 'ascendant-star':{kind:'passive',crop:[M,470,138,104],pal:'star'},
};
const ICON_ACTIVE=94,ICON_PASSIVE=112;
const disc=px=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><circle cx="${px/2}" cy="${px/2}" r="${px/2}" fill="#fff"/></svg>`);
async function icon(id){
 const n=NODES[id],size=n.kind==='active'?ICON_ACTIVE:ICON_PASSIVE,px=size*3;
 const [file,cx,cy,r]=n.master??[path.join(src,n.crop[0]),...n.crop.slice(1)];
 const cut=await sharp(file).extract({left:cx-r,top:cy-r,width:2*r,height:2*r}).resize(px,px,{kernel:'lanczos3'}).removeAlpha().toBuffer();
 const grey=await sharp(cut).greyscale().raw().toBuffer();
 // Actives: a hard disc under the ring. Passives (no frame): the radial feather times a brightness key, so the mockup's
 // dark backing fades to a soft shadow on the stone backdrop while the glow and the silhouettes stay.
 const mask=n.kind==='active'?await sharp(disc(px)).extractChannel(0).raw().toBuffer():(()=>{
  const m=Buffer.alloc(px*px),c=(px-1)/2,ramp=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
  for(let y=0;y<px;y++)for(let x=0;x<px;x++){
   const r=Math.hypot(x-c,y-c)/(px/2),edge=r<.56?1:r<.74?1-.45*ramp(r,.56,.74):r<.88?.55*(1-ramp(r,.74,.88)):0;
   const key=.42+.58*ramp(grey[y*px+x],6,70);
   m[y*px+x]=Math.round(255*edge*key);
  }
  return m;})();
 const finish=async rgb=>{const out=Buffer.alloc(px*px*4);for(let i=0;i<px*px;i++){out[i*4]=rgb[i*3];out[i*4+1]=rgb[i*3+1];out[i*4+2]=rgb[i*3+2];out[i*4+3]=mask[i];}return sharp(out,{raw:{width:px,height:px,channels:4}}).png().toBuffer();};
 const rgbGrey=Buffer.alloc(px*px*3);for(let i=0;i<px*px;i++)rgbGrey[i*3]=rgbGrey[i*3+1]=rgbGrey[i*3+2]=grey[i];
 let colour;
 if(n.color==='native')colour=await sharp(cut).raw().toBuffer();
 else{const t=lut(PAL[n.pal]);colour=Buffer.alloc(px*px*3);for(let i=0;i<px*px;i++){const v=grey[i];colour[i*3]=t[v*3];colour[i*3+1]=t[v*3+1];colour[i*3+2]=t[v*3+2];}}
 return {size,colour:await finish(colour),grey:await finish(rgbGrey)};
}

const frames={
 'ring-active':[RING,RING,ring(),null],
 'ring-evolution':[RING,RING,ring({evolution:true}),null],
 'node-glow':[192,192,glow(192),null],
 'pip-on':[14,14,pip(true),null],
 'pip-off':[14,14,pip(false),null],
 'slot-1':[36,36,slot(1),null],
 'slot-2':[36,36,slot(2),null],
 'slot-3':[36,36,slot(3),null],
 'level-plate':[56,22,levelPlate(56,22),[10,0,10,0]],
 'line-h':[24,8,lineH,[4,0,4,0]],
 'line-v':[8,24,lineV,[0,4,0,4]],
 'line-junction':[20,20,junction,null],
 'line-stud':[12,12,stud,null],
 'panel-frame':[PF,PF,panelFrame(),[PC,PC,PC,PC]],
 'panel-title-rule':[320,20,titleRule(320,20),[40,0,40,0]],
 'panel-finial':[44,26,finial,null],
 'panel-compass':[140,140,compass(140),null],
 'panel-stone':[256,256,()=>stone(256),null],
 'panel-vignette':[128,128,vignette,[0,0,0,0]],
 'panel-arcane':[320,320,arcane(320),null],
 'button-close':[48,48,close,null],
 'scroll-track-v':[10,40,trackV,[0,6,0,6]],
 'scroll-thumb-v':[10,40,thumbV,[0,6,0,6]],
 'scroll-track-h':[40,10,trackH,[6,0,6,0]],
 'scroll-thumb-h':[40,10,thumbH,[6,0,6,0]],
 'chevron-up':[36,22,chevronUp,null],
 'chevron-right':[22,36,chevronRight,null],
 'fade-v':[8,48,fadeV,[0,0,0,0]],
 'fade-h':[48,8,fadeH,[0,0,0,0]],
};

const manifest={frames:{}};
async function write(name,w,h,master,slice){
 const meta=await sharp(master).metadata();if(meta.width!==w*3||meta.height!==h*3)throw Error(`${name}: master ${meta.width}×${meta.height}, expected ${w*3}×${h*3}`);
 for(const s of SCALES)await (s===3?sharp(master):sharp(master).resize(w*s,h*s,{kernel:'lanczos3'})).png({compressionLevel:9}).toFile(path.join(out,`@${s}x`,name+'.png'));
 manifest.frames[name]=slice?{width:w,height:h,slice}:{width:w,height:h};
}
for(const [name,[w,h,art,slice]] of Object.entries(frames))await write(name,w,h,typeof art==='function'?await art():await sharp(Buffer.from(art)).png().toBuffer(),slice);
for(const id of Object.keys(NODES)){
 const {size,colour,grey}=await icon(id);
 await write(`icon-${id}`,size,size,colour,null);
 await write(`icon-${id}-dim`,size,size,grey,null);
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');

// Contact sheet for review (docs/skill-tree/kit-sheet.png): every frame and both states of every icon on charcoal.
const names=Object.keys(manifest.frames),cell=150,cols=8,rows=Math.ceil(names.length/cols),sheet=[];
for(const [i,name] of names.entries()){
 const {width:w,height:h}=manifest.frames[name],k=Math.min(1,(cell-40)/Math.max(w*2,h*2)),dw=Math.max(1,Math.round(w*2*k)),dh=Math.max(1,Math.round(h*2*k));
 const x=(i%cols)*cell,y=60+Math.floor(i/cols)*cell;
 sheet.push({input:await sharp(path.join(out,'@2x',name+'.png')).resize(dw,dh).png().toBuffer(),left:x+Math.round((cell-dw)/2),top:y+Math.round((cell-24-dh)/2)});
 sheet.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="20"><text x="${cell/2}" y="14" text-anchor="middle" font-family="Cinzel" font-size="11" fill="#e8d6a8">${name}</text></svg>`),left:x,top:y+cell-24});
}
await sharp({create:{width:cols*cell,height:60+rows*cell,channels:3,background:'#0d0b0a'}}).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cell}" height="50"><text x="20" y="34" font-family="Cinzel" font-weight="600" font-size="24" fill="#f3d58a">Rift Runner Skill Tree kit · public/skill-tree/v1 · @2x</text></svg>`),left:0,top:0},...sheet]).png().toFile('docs/skill-tree/kit-sheet.png');
console.log(`Wrote ${names.length} frames to ${out} and docs/skill-tree/kit-sheet.png`);
