// Reusable emitter layers. A skill effect is a stack of these, coloured by a palette (palettes.mjs) and tuned with
// overrides: layer(P, {count, spread, …, any emitter field}). Each returns a compact spec for nixie.mjs `emitter()`.
// World-plane layers (W) are volumetric: they rise, fall and spray in 3D. Ground-plane layers (G) are decals lying
// flat on the snow and must go in an effect whose id ends in ".ground" (vfx/README.md).
// Blending: the snow is bright by day, where additive light washes out to white. Soft bodies (flames, streams,
// rings, runes, cracks) are therefore alpha-blended in deep colours, and only thin highlights (sparks, embers,
// glints, arcs, cores) add light. Any layer takes {blend:'additive'|'alpha'} to change that.
const fade=(...a)=>({a}),grad=(g,a)=>({...g,a}),flameOf=P=>P.flame??P.body;
const AIM=[0,0,-90]; // cone axis (+Y) turned onto the aim direction (+X)
// Merge overrides; `shape` merges field by field so callers can change one shape parameter.
const mix=(base,o={})=>{const {shape,...rest}=o;return {...base,...rest,shape:{...base.shape,...shape}};};
const pick=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
const OWN=['count','spread','reach','radius','height','power','grow'];

// W · Bright pixel burst at the origin: crisp pixel motes that pop and fade without blurry radial glow smudges on walls.
export const flash=(P,o={})=>{
 const raw=(o.size??1.2)*.5,cnt=o.count??Math.max(5,Math.min(10,Math.ceil(raw*6)));
 return mix({texture:'ember',blend:'alpha',alpha:.96,bursts:[[0,cnt]],max:cnt+2,life:o.life??.22,
  shape:{type:'circle',radius:Math.min(.24,raw*.24),thickness:.85,arcMode:'burstSpread'},
  size:[.055,.088],sizeOverLife:{curve:[[0,.7],[.25,1],[1,.2]]},
  color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.55,.94],[1,0]]),at:o.at},pick(o,['size','sizeXY','intensity','life','count',...OWN]));
};
// W · Lingering hot pixel core that pulses (charge-up, projectile heads, eruption cores).
export const core=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.95,rate:o.rate??24,duration:o.duration??.4,loop:o.loop??false,max:20,life:[.12,.2],size:o.size??[.068,.105],...(o.sizeXY?{sizeXY:o.sizeXY}:{}),
 color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,0],[.2,1],[1,0]]),local:o.local??true},pick(o,['size','sizeXY','intensity','rate',...OWN]));
// W · Velocity-aligned pixel spark cluster sprayed in a cone along +X (spread = cone half-angle in degrees; 90 = hemisphere fan).
export const sparks=(P,o={})=>mix({texture:'streak',align:'velocity',blend:'alpha',alpha:.95,bursts:[[0,o.count??40]],max:(o.count??40)+8,
 shape:{type:'cone',angle:o.spread??30,radius:.04},rot:AIM,life:[.22,.55],speed:o.speed??[4,10],
 sizeXY:o.sizeXY??[[.038,.065],[.11,.20]],sizeOverLife:{curve:[[0,1],[.65,.82],[1,.2]]},gravity:o.gravity??5,drag:o.drag??2.2,
 collide:{y:0,bounce:.28,dampen:.5},
 noise:{strength:o.turbulence??.85,frequency:2.2,speed:2.5,octaves:2},
 color:[P.spark,P.light],intensity:1.0,colorOverLife:grad(P.hot,[[0,1],[.65,.94],[1,0]])},pick(o,['sizeXY','intensity','gravity','drag','speed','turbulence',...OWN]));
// W · Floating embers: small hot dots that drift up on curl noise and twinkle out.
export const embers=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.95,bursts:o.rate?[]:[[0,o.count??18]],rate:o.rate??0,duration:o.duration??.5,max:(o.count??18)+(o.rate?Math.ceil(o.rate*1.6):0)+4,
 shape:{type:'sphere',radius:o.radius??.35},life:[.7,1.5],speed:[.2,.9],spherical:1,gravity:o.gravity??-1.2,drag:1.2,
 noise:{strength:o.turbulence??1.4,frequency:1.8,speed:1.2,octaves:2},size:[.045,.075],color:[P.spark,P.light],intensity:1.0,
 colorOverLife:grad(P.hot,[[0,0],[.08,1],[.5,.92],[.7,.55],[.8,.95],[1,0]])},pick(o,['intensity','gravity','turbulence','rate',...OWN]));
// W · Flipbook flame tongues licking upward (+Y) with buoyancy and curl turbulence, sized compactly so many small flame particles combine into organic Diablo-like fire.
export const flames=(P,o={})=>{const cnt=Math.max(18,Math.round((o.count??12)*1.6)),rt=o.rate?Math.max(48,Math.round(o.rate*1.2)):0;return mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',bursts:rt?[]:[[0,cnt]],rate:rt,duration:o.duration??.4,
 max:cnt+(rt?Math.ceil(rt*.85):0)+8,shape:{type:'circle',radius:Math.max(.16,o.radius??.20),thickness:.85},life:[.28,.52],speed:o.speed??[.45,1.25],spherical:.12,
 gravity:o.gravity??-1.8,drag:o.drag??1.5,noise:{strength:o.turbulence??.9,frequency:2.2,speed:2.5,octaves:2},
 rotation:[-.28,.28],spin:[-.9,.9],sizeXY:[[.18,.28],[.28,.42]],
 sizeOverLife:{curve:[[0,.48],[.25,1],[.68,.88],[1,.30]]},
 color:'#ffffff',alpha:o.alpha??.96,intensity:1.0,colorOverLife:grad(flameOf(P),[[0,0],[.08,1],[.58,.96],[.85,.62],[1,0]])},pick(o,['size','sizeXY','intensity','rate','alpha','gravity','drag','turbulence','speed',...OWN]));};
// W · Fire stream: compact licking flame tongues poured along +X in a cone, each pointing where it flies (breath, fans, jets).
export const stream=(P,o={})=>{const cnt=o.rate?0:Math.max(24,Math.round((o.count??22)*1.3)),rt=o.rate?Math.max(90,o.rate):0;return mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},align:'velocity',blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.96,bursts:rt?[]:[[0,cnt]],rate:rt,duration:o.duration??.25,max:cnt+(rt?Math.ceil(rt*.65):0)+8,
 shape:{type:'cone',angle:o.spread??25,radius:.08},rot:AIM,life:[.22,.40],speed:o.speed??[5.5,11],drag:o.drag??2.2,gravity:o.gravity??-.65,
 sizeXY:[[.17,.27],[.26,.42]],sizeOverLife:{curve:[[0,.44],[.24,1],[.66,.88],[1,.28]]},
 noise:{strength:o.turbulence??.95,frequency:2.1,speed:2.5,octaves:2},
 color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,0],[.08,1],[.55,.96],[.84,.60],[1,0]])},pick(o,['size','sizeXY','intensity','speed','drag','gravity','turbulence','rate','alpha',...OWN]));};
// W · Whipping flame/energy wisp stream: compact high-velocity incandescent flame wisps poured along +X in a cone for fiery jets and bursts.
export const wispStream=(P,o={})=>{const cnt=o.rate?0:Math.max(20,Math.round((o.count??18)*1.25)),rt=o.rate?Math.max(80,o.rate):0;return mix({texture:'wisp',align:'velocity',blend:'alpha',alpha:o.alpha??.95,bursts:rt?[]:[[0,cnt]],rate:rt,duration:o.duration??.22,max:cnt+(rt?Math.ceil(rt*.55):0)+6,
 shape:{type:'cone',angle:o.spread??24,radius:.06},rot:AIM,life:[.18,.34],speed:o.speed??[6,11.5],drag:o.drag??2,gravity:o.gravity??-.55,
 sizeXY:[[.13,.22],[.22,.36]],sizeOverLife:{curve:[[0,.4],[.22,1],[.65,.85],[1,.25]]},noise:{strength:o.turbulence??.9,frequency:2.2,speed:2.6,octaves:2},
 color:P.light,intensity:1.0,colorOverLife:grad(P.hot,[[0,0],[.08,1],[.60,.92],[1,0]])},pick(o,['size','sizeXY','intensity','speed','drag','gravity','turbulence','rate','alpha','blend',...OWN]));};
// W · Smoke/dust: compact alpha-blended billowing puffs that rise and spread (residue after fire or impacts).
export const smoke=(P,o={})=>mix({texture:'smoke',tiles:[2,2],frames:{random:true,still:true},blend:'alpha',sort:'oldestFirst',bursts:[[o.delay0??0,o.count??6]],max:(o.count??6)+2,
 shape:{type:'sphere',radius:o.radius??.28},life:[.75,1.35],speed:[.2,.55],spherical:1,gravity:o.gravity??-.45,drag:1.5,
 rotation:[0,6.28],spin:[-.7,.7],size:o.size??[.22,.36],...(o.sizeXY?{sizeXY:o.sizeXY}:{}),sizeOverLife:{curve:[[0,.5],[1,1.15]]},
 color:o.color??P.smoke,alpha:o.alpha??.42,colorOverLife:{c:[[0,'#ffffff'],[1,'#ffffff']],a:[[0,0],[.15,1],[1,0]]},order:-2},pick(o,['size','sizeXY','alpha','color','gravity','delay0',...OWN]));
// W · Debris chunks thrown up and out; they fall back, bounce on the ground plane and settle as incandescent pixel shards.
export const debris=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.96,bursts:[[0,o.count??16]],max:(o.count??16)+4,
 shape:{type:'hemisphere',radius:o.radius??.3,thickness:1},life:[.55,.95],speed:o.speed??[2.2,4.6],spherical:.6,gravity:o.gravity??11,drag:.4,
 collide:{y:0,bounce:.32,dampen:.55},rotation:[0,6.28],spin:[-9,9],size:[.050,.082],
 color:[P.spark,P.light,P.accent],intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.58,.92],[1,0]]),order:-1},pick(o,['size','sizeXY','speed','gravity','color',...OWN]));
// W · Molten/energised pixel chunks: like debris but glowing, for eruptions (pixel clusters without ribbon lines).
export const cinders=(P,o={})=>mix(debris(P,o),{texture:'ember',tiles:undefined,frames:undefined,blend:'alpha',alpha:.96,color:[P.spark,P.light],intensity:1.0,
 colorOverLife:grad(P.hot,[[0,1],[.72,.88],[1,0]]),...pick(o,['count','size','sizeXY','speed','gravity','color',...OWN])});
// W · Crackling arcs: fine lightning/flame tendrils flickering over a ring or area.
export const arcs=(P,o={})=>mix({texture:'arc',tiles:[2,2],frames:{random:true,still:true},blend:'alpha',alpha:.95,rate:o.rate??40,duration:o.duration??.5,max:Math.ceil((o.rate??40)*.35)+10,
 shape:{type:'circle',radius:o.radius??1,thickness:0},life:[.08,.18],rotation:[0,6.28],size:o.size??[.22,.36],...(o.sizeXY?{sizeXY:o.sizeXY}:{}),
 color:[P.spark,P.light],intensity:1.0,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['rate','size','sizeXY','intensity',...OWN]));
// W · Star glints: compact four-point flares that pop on and twinkle out.
export const glints=(P,o={})=>mix({texture:'flare',blend:'alpha',alpha:.95,bursts:[[0,o.count??6]],max:(o.count??6)+2,shape:{type:'sphere',radius:o.radius??.45},life:[.26,.50],
 rotation:[0,.8],size:o.size??[.14,.24],...(o.sizeXY?{sizeXY:o.sizeXY}:{}),sizeOverLife:{curve:[[0,0],[.22,1],[.75,.92],[1,0]]},color:[P.accent,P.spark],intensity:1.0,
 colorOverLife:grad(P.hot,[[0,1],[1,.6]])},pick(o,['size','sizeXY','intensity',...OWN]));
// W · Projectile carrier: a compact hot head that follows the effect position.
export const comet=(P,o={})=>mix({texture:'glow',blend:'alpha',alpha:.98,bursts:[[0,1]],max:2,life:o.life??1.2,local:true,size:o.size??.38,...(o.sizeXY?{sizeXY:o.sizeXY}:{}),sizeOverLife:{curve:[[0,.7],[.1,1],[1,1]]},
 color:P.light,intensity:1.0,colorOverLife:grad(P.hot,[[0,1],[.92,1],[1,0]])},pick(o,['size','sizeXY','intensity','life','trailLife','width','ribbon',...OWN]));
// W · Continuous shedding behind a moving origin (fire trail, rift dust): compact world-space particles left in its wake.
export const wake=(P,o={})=>mix(o.flame===false?{texture:'ember',blend:'alpha',alpha:.96,rate:o.rate??60,duration:o.duration??1.2,max:Math.ceil((o.rate??60)*.5)+8,life:[.22,.46],speed:[.2,.8],
 shape:{type:'sphere',radius:.08},spherical:1,gravity:-1,drag:2,noise:{strength:.9,frequency:2.2,speed:2.4,octaves:2},size:o.size??[.058,.094],...(o.sizeXY?{sizeXY:o.sizeXY}:{}),color:[P.spark,P.light],intensity:1.0,colorOverLife:grad(P.hot,[[0,1],[1,0]])}
 :{texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.96,rate:o.rate??90,duration:o.duration??1.2,max:Math.ceil((o.rate??90)*.38)+10,life:[.11,.22],speed:[.08,.32],
 shape:{type:'sphere',radius:.05},spherical:1,gravity:-1.1,drag:2.2,noise:{strength:.58,frequency:2.2,speed:2.5,octaves:2},rotation:[0,6.28],spin:[-3.5,3.5],size:[.13,.22],sizeOverLife:{curve:[[0,.96],[.26,1.02],[.65,.48],[1,.1]]},
 color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,.98],[.40,.92],[.75,.55],[1,0]])},pick(o,['rate','size','sizeXY','flame','duration','alpha',...OWN]));
// W · Vertical light/flame column (eruptions, level-ups): compact billowing flames rising upright from the origin (never oversized billboards).
export const pillar=(P,o={})=>{const cnt=o.rate?0:Math.max(22,Math.round((o.count??14)*1.6)),rt=o.rate?Math.max(48,o.rate):0;return mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.96,bursts:rt?[]:[[0,cnt]],rate:rt,duration:o.duration??.3,max:cnt+(rt?Math.ceil(rt*.8):0)+8,
 shape:{type:'circle',radius:Math.max(.24,o.radius??.28),thickness:.8},life:[.30,.52],velocity:{min:[0,1.6,0],max:[0,Math.min(3.8,(o.power??3.2)*.9),0]},drag:1.6,
 noise:{strength:.65,frequency:2.0,speed:2.3,octaves:2},rotation:[-.2,.2],spin:[-.55,.55],
 sizeXY:[[.19,.30],[.30,.48]],sizeOverLife:{curve:[[0,.44],[.24,1],[.68,.88],[1,.30]]},color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,0],[.10,1],[.58,.94],[1,0]])},pick(o,['size','sizeXY','sizeOverLifeY','intensity','rate','alpha',...OWN]));};
// W · Motes spiralling around the vertical axis (summons, level-ups, traps): orbit + optional inward pull (pixel particle cluster, no ribbon line).
export const vortex=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.95,rate:o.rate??48,duration:o.duration??.6,max:Math.ceil((o.rate??48)*1.3)+8,shape:{type:'circle',radius:o.radius??1.2,thickness:.22},
 life:[.5,.9],velocity:{min:[0,o.lift??.6,0],max:[0,(o.lift??.6)*2,0]},orbit:[0,o.swirl??3.2,0],radial:o.pull??-1.2,
 size:[.048,.078],color:[P.spark,P.light],intensity:1.0,colorOverLife:grad(P.hot,[[0,0],[.15,1],[1,0]])},pick(o,['size','sizeXY','rate','lift','swirl','pull','intensity','trail',...OWN]));
// W · Shards bursting outward and tumbling (compact crystal or bone splinters).
export const shards=(P,o={})=>mix({texture:'shard',align:'velocity',blend:'alpha',alpha:.98,bursts:[[0,o.count??12]],max:(o.count??12)+4,shape:{type:'sphere',radius:.15},life:[.30,.54],speed:o.speed??[3,6],spherical:1,
 drag:2.5,gravity:2,sizeXY:o.sizeXY??(typeof o.size==='number'?[o.size*.55,o.size]:[[.058,.094],[.13,.22]]),sizeOverLife:{curve:[[0,1],[.75,.9],[1,.25]]},color:[P.accent,P.spark],intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.8,.95],[1,0]])},pick(o,['size','sizeXY','intensity','speed',...OWN]));
// W · Ground-skimming ring of pixel sparks flying outward from the origin (shock fronts).
export const radialSkim=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.95,bursts:[[0,o.count??36]],max:(o.count??36)+4,shape:{type:'circle',radius:o.radius??.3,thickness:0,arcMode:'burstSpread'},
 spherical:1,life:[.25,.45],speed:o.speed??[4.5,7.5],drag:3,gravity:0,at:[0,.05,0],size:[.048,.078],sizeOverLife:{curve:[[0,1],[1,.2]]},
 color:[P.spark,P.light],intensity:1.0,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['size','sizeXY','intensity','speed',...OWN]));

// G · Fine irregular dashed/dotted perimeter ring on the ground marking the outer blast radius.
export const shockRing=(P,o={})=>{
 const R=o.radius??1.5,life=o.life??.48,count=Math.min(32,Math.max(20,Math.round(R*22)));
 return mix({name:o.name??'pixel shock wave',texture:'ember',blend:'alpha',alpha:.98,
  bursts:[[0,count]],rate:0,max:count+4,rot:o.rot??[0,11.8,0],
  shape:{type:'circle',radius:R*.995,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,life:[life*.9,life*1.1],speed:0,spherical:0,
  size:o.size??[.042,.056],sizeOverLife:{curve:[[0,1],[.85,.98],[1,0]]},
  color:'#ffffff',intensity:1.0,
  colorOverLife:grad(flameOf(P),[[0,1],[.82,.96],[1,0]])},pick(o,['name','count','life','intensity','alpha','blend','rot','size','sizeOverLife',...OWN]));
};
// G · Particle ring: circumference of fine irregular dashed pixel clusters (replaces single-quad ring decals).
export const ring=(P,o={})=>magicCircle(P,{radius:o.radius??1.2,duration:o.life??.5,intensity:1.0,name:o.name??'particle ring'})[0];
// G · Diablo-like fine irregular dashed/dotted ground circle:
// Staggered-angle emitters place discrete pixel dots along each dash followed by a clear gap before the next dash,
// reinforced by dark-rim under-dots for daytime snow readability, plus an inner dashed ring at 0.66 R.
export const magicCircle=(P,o={})=>{
 const R=o.radius??1.35,dur=o.duration??((o.fadeIn??.12)+(o.hold??.4)+(o.fadeOut??.1)),n=o.name??'magic circle';
 const dashes=Math.min(30,Math.max(20,Math.round(R*22))),innerDashes=Math.min(24,Math.max(16,Math.round(R*16)));
 const fullLife=dur+.28;
 const pass=['name','count','texture','fadeIn','hold','fadeOut','spin','from','to','intensity','rotation','alpha','duration','life','radial','size','sizeOverLife',...OWN];
 const darkGrad={c:[[0,P.mid??'#4416b4'],[.45,P.dark??'#220864'],[1,P.smoke??'#1d1838']]};
 const mkRimShadow=(idx,rotDeg,rScale,cnt,sz)=>mix({
  name:`${n} shadow ${idx}`,texture:'ember',blend:'alpha',alpha:.92,
  bursts:[[0,cnt]],rate:0,duration:dur,max:cnt+4,rot:[0,rotDeg,0],
  shape:{type:'circle',radius:R*rScale,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,life:fullLife,speed:0,spherical:0,
  size:sz,sizeOverLife:{curve:[[0,.95],[.86,1],[1,0]]},
  color:'#ffffff',intensity:1.0,order:-1,
  colorOverLife:grad(darkGrad,[[0,.95],[.84,.92],[1,0]])
 },pick(o,pass));
 const mkDashDot=(idx,rotDeg,rScale,sz)=>mix({
  name:`${n} dash ${idx}`,texture:'ember',blend:'alpha',alpha:.98,
  bursts:[[0,dashes]],rate:0,duration:dur,max:dashes+4,rot:[0,rotDeg,0],
  shape:{type:'circle',radius:R*rScale,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,life:fullLife,speed:0,spherical:0,
  size:o.size??sz,sizeOverLife:{curve:[[0,1],[.86,1],[1,0]]},
  color:'#ffffff',intensity:1.0,
  colorOverLife:grad(flameOf(P),[[0,1],[.84,.98],[1,0]])
 },pick(o,pass));
 const mkInnerDot=(idx,rotDeg,rScale)=>mix({
  name:`${n} inner ${idx}`,texture:'ember',blend:'alpha',alpha:.96,
  bursts:[[0,innerDashes]],rate:0,duration:dur,max:innerDashes+4,rot:[0,rotDeg,0],
  shape:{type:'circle',radius:R*rScale,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,life:fullLife,speed:0,spherical:0,
  size:[.038,.052],sizeOverLife:{curve:[[0,1],[.85,.96],[1,0]]},
  color:'#ffffff',intensity:1.0,
  colorOverLife:grad(flameOf(P),[[0,1],[.82,.94],[1,0]])
 },pick(o,pass));
 return [
  mkRimShadow(1,1.20,1.000,dashes,[.064,.082]),
  mkRimShadow(2,6.00,1.000,dashes,[.064,.082]),
  mkDashDot(1,0.00,1.000,[.042,.056]),
  mkDashDot(2,2.35,1.003,[.040,.052]),
  mkDashDot(3,4.70,1.005,[.042,.056]),
  mkDashDot(4,7.05,1.002,[.040,.052]),
  mkDashDot(5,9.40,0.998,[.042,.054]),
  mkRimShadow(3,3.20,0.660,innerDashes,[.058,.074]),
  mkInnerDot(1,0.00,0.660),
  mkInnerDot(2,3.20,0.664),
  mkInnerDot(3,6.40,0.658),
 ];
};
// G · Backwards-compatible single-layer alias for custom callers; prefer magicCircle() spread for full multi-ring particle circles.
export const sigil=(P,o={})=>magicCircle(P,o)[0];
// G · Companion dot in the inner dashed ring at 0.66 R (+9.60° offset so inner dashes are 4 discrete dots long).
export const pool=(P,o={})=>{
 const R=o.radius??1.2,cnt=Math.min(24,Math.max(16,Math.round(R*16))),life=o.life??.6;
 return mix({name:o.name??'pool dots',texture:'ember',blend:'alpha',alpha:.96,bursts:o.bursts??[[0,cnt]],rate:0,max:(o.max??cnt)+4,life,
  rot:[0,9.60,0],shape:o.shape??{type:'circle',radius:R*.661,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,
  size:o.size??[.038,.052],sizeOverLife:{curve:[[0,1],[.84,.96],[1,0]]},
  color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.82,.94],[1,0]])},pick(o,['name','count','life','intensity','alpha','bursts','max','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Companion dot in the outer dashed ring (+4.55° offset).
export const cracks=(P,o={})=>{
 const R=o.radius??1.4,life=o.life??.8,count=Math.min(30,Math.max(20,Math.round(R*22)));
 return mix({name:o.name??'crack dots',texture:'ember',blend:'alpha',alpha:.96,bursts:[[0,count]],rate:0,max:count+4,life:[life*.85,life],
  rot:[0,11.8,0],shape:{type:'circle',radius:R*.999,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,size:[.042,.056],
  sizeOverLife:{curve:[[0,1],[.84,.96],[1,0]]},
  color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.80,.94],[1,0]])},pick(o,['name','count','life','intensity','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Fine inner dashed ring at 0.38 R.
export const scorch=(P,o={})=>{
 const R=o.radius??.9,count=Math.min(20,Math.max(14,Math.round(R*14))),life=o.life??.75;
 return mix({name:o.name??'scorch dots',texture:'ember',blend:'alpha',alpha:.92,bursts:o.bursts??[[0,count]],rate:0,max:(o.max??count)+4,life,
  shape:o.shape??{type:'circle',radius:R*.38,thickness:.005,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,size:o.size??[.036,.048],
  sizeOverLife:{curve:[[0,1],[.82,.94],[1,0]]},
  color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.78,.90],[1,0]])},pick(o,['name','count','life','alpha','color','bursts','max','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Ground-aligned crescent arc of fine, slightly irregular dashed pixel dots toward +X marking directional cone AoEs.
export const slashDecal=(P,o={})=>{
 const R=o.radius??1.2,life=o.life??.42,arc=o.arc??120,count=Math.min(36,Math.max(20,Math.round(R*18)));
 const off=o.dashOffset??0;
 return mix({name:o.name??'pixel slash arc',texture:'ember',blend:'alpha',alpha:.98,
  bursts:[[0,count]],rate:0,max:count+4,life:[life*.9,life*1.1],
  at:o.at??[0,0,0],rot:[0,-arc/2+off,0],
  shape:{type:'circle',radius:R*.94,thickness:.004,arc,arcMode:'burstSpread'},
  jitter:.0025,speed:0,spherical:0,
  size:[.072,.098],
  sizeOverLife:{curve:[[0,1],[.84,.96],[1,0]]},
  color:'#ffffff',intensity:1.0,
  colorOverLife:grad(flameOf(P),[[0,1],[.80,.94],[1,0]])},pick(o,['name','count','dashOffset','life','intensity','at','alpha','size','sizeOverLife',...OWN]));
};
// G · Companion dot in the outer dashed ring (+4.55° offset).
export const groundArcs=(P,o={})=>{
 const R=o.radius??1.3,dur=o.duration??.5,cnt=Math.min(46,Math.max(30,Math.round(R*26)));
 return mix({name:o.name??'rim dots',texture:'ember',blend:'alpha',alpha:.96,
  bursts:[[0,cnt]],rate:0,duration:dur,max:cnt+4,life:dur+.2,
  rot:[0,4.55,0],shape:o.shape??{type:'circle',radius:R*.999,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,size:[.072,.098],
  sizeOverLife:{curve:[[0,1],[.84,.96],[1,0]]},
  color:'#ffffff',intensity:1.0,colorOverLife:grad(flameOf(P),[[0,1],[.82,.94],[1,0]])},pick(o,['name','count','rate','size','sizeOverLife','intensity','duration','thickness',...OWN]));
};
// G · High-contrast reinforcement copy of a decal layer (sigil, ring, slash…): alpha-blended so decals stay crisp on bright snow by day as well as glowing at night.
export const glow=(spec,strength=.75)=>({...spec,blend:'alpha',alpha:Math.min(1,(spec.alpha??.9)*strength),intensity:1.0,order:(spec.order??0)+1,name:spec.name?spec.name+' glow':undefined});
