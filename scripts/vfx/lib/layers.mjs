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
 return mix({texture:'ember',blend:'alpha',alpha:.9,bursts:[[0,cnt]],max:cnt+2,life:o.life??.2,
  shape:{type:'circle',radius:Math.min(.24,raw*.24),thickness:.85,arcMode:'burstSpread'},
  size:[.045,.075],sizeOverLife:{curve:[[0,.7],[.25,1],[1,.2]]},
  color:'#ffffff',intensity:1.15,colorOverLife:grad(flameOf(P),[[0,1],[.45,.88],[1,0]]),at:o.at},pick(o,['size','sizeXY','intensity','life','count',...OWN]));
};
// W · Lingering hot pixel core that pulses (charge-up, projectile heads, eruption cores).
export const core=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.88,rate:o.rate??24,duration:o.duration??.4,loop:o.loop??false,max:20,life:[.12,.2],size:[.048,.078],
 color:'#ffffff',intensity:1.15,colorOverLife:grad(flameOf(P),[[0,0],[.2,1],[1,0]]),local:o.local??true},pick(o,['size','sizeXY','intensity','rate',...OWN]));
// W ·Velocity-aligned pixel spark cluster sprayed in a cone along +X (spread = cone half-angle in degrees; 90 = hemisphere fan).
export const sparks=(P,o={})=>mix({texture:'streak',align:'velocity',bursts:[[0,o.count??40]],max:(o.count??40)+8,
 shape:{type:'cone',angle:o.spread??30,radius:.04},rot:AIM,life:[.22,.55],speed:o.speed??[4,10],
 sizeXY:[[.028,.048],[.08,.15]],sizeOverLife:{curve:[[0,1],[.65,.78],[1,.2]]},gravity:o.gravity??5,drag:o.drag??2.2,
 collide:{y:0,bounce:.28,dampen:.5},
 noise:{strength:o.turbulence??.85,frequency:2.2,speed:2.5,octaves:2},
 color:[P.spark,P.light],intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[.6,.9],[1,0]])},pick(o,['intensity','gravity','drag','speed','turbulence',...OWN]));
// W · Floating embers: small hot dots that drift up on curl noise and twinkle out.
export const embers=(P,o={})=>mix({texture:'ember',bursts:o.rate?[]:[[0,o.count??18]],rate:o.rate??0,duration:o.duration??.5,max:(o.count??18)+(o.rate?Math.ceil(o.rate*1.6):0)+4,
 shape:{type:'sphere',radius:o.radius??.35},life:[.7,1.5],speed:[.2,.9],spherical:1,gravity:o.gravity??-1.2,drag:1.2,
 noise:{strength:o.turbulence??1.4,frequency:1.8,speed:1.2,octaves:2},size:[.032,.058],color:[P.spark,P.accent],intensity:o.intensity??1.6,
 colorOverLife:grad(P.hot,[[0,0],[.08,1],[.5,.85],[.7,.35],[.8,.9],[1,0]])},pick(o,['intensity','gravity','turbulence','rate',...OWN]));
// W · Flipbook flame tongues licking upward (+Y) with buoyancy and curl turbulence. Use `shape` to spread them over an area or a ring.
export const flames=(P,o={})=>{const s=o.size??.6;return mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',bursts:o.rate?[]:[[0,o.count??10]],rate:o.rate??0,duration:o.duration??.4,
 max:(o.count??10)+(o.rate?Math.ceil(o.rate*.85):0)+6,shape:{type:'circle',radius:o.radius??.15},life:[.32,.56],speed:o.speed??[.42,1.15],spherical:0,
 gravity:o.gravity??-1.8,drag:o.drag??1.5,noise:{strength:o.turbulence??.85,frequency:2,speed:2.4,octaves:2},
 rotation:[-.32,.32],spin:[-1,1],sizeXY:[[s*.78,s*1.08],[s*.92,s*1.32]],
 sizeOverLife:{curve:[[0,.46],[.25,1],[.68,.88],[1,.34]]},
 color:'#ffffff',alpha:o.alpha??.9,intensity:o.intensity??1.05,colorOverLife:grad(flameOf(P),[[0,0],[.1,1],[.5,.92],[.8,.48],[1,0]])},pick(o,['size','intensity','rate','alpha','gravity','drag','turbulence','speed',...OWN]));};
// W · Fire stream: licking flame tongues poured along +X in a cone, each pointing where it flies (breath, fans, jets).
export const stream=(P,o={})=>mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},align:'velocity',blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.9,bursts:o.rate?[]:[[0,o.count??24]],rate:o.rate??0,duration:o.duration??.25,max:(o.count??24)+(o.rate?Math.ceil(o.rate*.65):0)+8,
 shape:{type:'cone',angle:o.spread??25,radius:.06},rot:AIM,life:[.24,.44],speed:o.speed??[6,11.5],drag:o.drag??2.2,gravity:o.gravity??-.7,
 sizeXY:[[.56,.82],[.74,1.08]],sizeOverLife:{curve:[[0,.42],[.24,1],[.66,.88],[1,.32]]},
 noise:{strength:o.turbulence??.95,frequency:2,speed:2.5,octaves:2},
 color:'#ffffff',intensity:o.intensity??1.05,colorOverLife:grad(flameOf(P),[[0,0],[.08,1],[.48,.92],[.8,.45],[1,0]])},pick(o,['intensity','speed','drag','gravity','turbulence','rate','alpha',...OWN]));
// W · Whipping flame/energy wisp stream: high-velocity incandescent flame tongues poured along +X in a cone for fiery jets and bursts.
export const wispStream=(P,o={})=>mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},align:'velocity',blend:o.blend??'additive',alpha:o.alpha??.85,bursts:o.rate?[]:[[0,o.count??18]],rate:o.rate??0,duration:o.duration??.22,max:(o.count??18)+(o.rate?Math.ceil(o.rate*.55):0)+6,
 shape:{type:'cone',angle:o.spread??24,radius:.05},rot:AIM,life:[.18,.34],speed:o.speed??[6.2,11.8],drag:o.drag??2,gravity:o.gravity??-.6,
 sizeXY:[[.46,.68],[.66,.96]],sizeOverLife:{curve:[[0,.38],[.22,1],[.65,.85],[1,.25]]},noise:{strength:o.turbulence??.9,frequency:2.2,speed:2.6,octaves:2},
 color:P.light,intensity:o.intensity??1.65,colorOverLife:grad(P.hot,[[0,0],[.08,1],[.55,.85],[1,0]])},pick(o,['intensity','speed','drag','gravity','turbulence','rate','alpha','blend',...OWN]));
// W · Smoke/dust: alpha-blended billowing puffs that rise and spread (residue after fire or impacts).
export const smoke=(P,o={})=>mix({texture:'smoke',tiles:[2,2],frames:{random:true,still:true},blend:'alpha',sort:'oldestFirst',bursts:[[o.delay0??0,o.count??6]],max:(o.count??6)+2,
 shape:{type:'sphere',radius:o.radius??.3},life:[.9,1.6],speed:[.2,.6],spherical:1,gravity:o.gravity??-.5,drag:1.5,
 rotation:[0,6.28],spin:[-.8,.8],size:[(o.size??.7)*.7,(o.size??.7)*1.1],sizeOverLife:{curve:[[0,.45],[1,1.5]]},
 color:o.color??P.smoke,alpha:o.alpha??.55,colorOverLife:{c:[[0,'#ffffff'],[1,'#ffffff']],a:[[0,0],[.15,1],[1,0]]},order:-2},pick(o,['size','alpha','color','gravity','delay0',...OWN]));
// W · Debris chunks thrown up and out; they fall back, bounce on the ground plane and settle as incandescent pixel shards.
export const debris=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.9,bursts:[[0,o.count??16]],max:(o.count??16)+4,
 shape:{type:'hemisphere',radius:o.radius??.3,thickness:1},life:[.55,.95],speed:o.speed??[2.2,4.6],spherical:.6,gravity:o.gravity??11,drag:.4,
 collide:{y:0,bounce:.32,dampen:.55},rotation:[0,6.28],spin:[-9,9],size:[.036,.062],
 color:[P.spark,P.light,P.accent],intensity:1.2,colorOverLife:grad(flameOf(P),[[0,1],[.55,.85],[1,0]]),order:-1},pick(o,['size','speed','gravity','color',...OWN]));
// W · Molten/energised pixel chunks: like debris but glowing additively, for eruptions (pixel clusters without ribbon lines).
export const cinders=(P,o={})=>mix(debris(P,o),{texture:'ember',tiles:undefined,frames:undefined,blend:'alpha',alpha:.9,color:[P.spark,P.light],intensity:1.15,
 colorOverLife:grad(P.hot,[[0,1],[.7,.8],[1,0]]),...pick(o,['count','size','speed','gravity','color',...OWN])});
// W · Crackling arcs: lightning/flame tendrils flickering over a ring or area.
export const arcs=(P,o={})=>mix({texture:'arc',tiles:[2,2],frames:{random:true,still:true},rate:o.rate??40,duration:o.duration??.5,max:Math.ceil((o.rate??40)*.25)+6,
 shape:{type:'circle',radius:o.radius??1,thickness:0},life:[.06,.14],rotation:[0,6.28],size:[.12,.22],
 color:[P.spark,P.light],intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['rate','size','intensity',...OWN]));
// W · Star glints: four-point flares that pop on and twinkle out.
export const glints=(P,o={})=>mix({texture:'flare',bursts:[[0,o.count??6]],max:(o.count??6)+2,shape:{type:'sphere',radius:o.radius??.5},life:[.25,.5],
 rotation:[0,.8],size:[.075,.13],sizeOverLife:{curve:[[0,0],[.25,1],[1,0]]},color:[P.accent,P.spark],intensity:o.intensity??1.8,
 colorOverLife:grad(P.hot,[[0,1],[1,.6]])},pick(o,['size','intensity',...OWN]));
// W · Projectile carrier: a hot head that follows the effect position ({ribbon:true} adds a NixieFX ribbon trail,
// which reads as a flat smear over bright snow, so heads normally pair with wake() instead).
export const comet=(P,o={})=>mix({texture:'glow',bursts:[[0,1]],max:2,life:o.life??1.2,local:true,size:.22,sizeOverLife:{curve:[[0,.7],[.1,1],[1,1]]},
 color:P.light,intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[.92,1],[1,0]]),
 ...(o.ribbon?{trail:{life:o.trailLife??.22,width:o.width??.3,widthOverTrail:{curve:[[0,1],[1,0]]},colorOverTrail:grad(P.body,[[0,1],[.5,.7],[1,0]]),texture:'glow',minVertexDistance:.02,worldSpace:true}}:{})},pick(o,['size','intensity','life','trailLife','width','ribbon',...OWN]));
// W · Continuous shedding behind a moving origin (fire trail, rift dust): world-space particles left in its wake.
export const wake=(P,o={})=>mix(o.flame===false?{texture:'ember',rate:o.rate??60,duration:o.duration??1.2,max:Math.ceil((o.rate??60)*.5)+8,life:[.2,.45],speed:[.2,.8],
 shape:{type:'sphere',radius:.08},spherical:1,gravity:-1,drag:2,noise:{strength:.9,frequency:2.2,speed:2.4,octaves:2},size:[.032,.056],color:[P.spark,P.accent],intensity:1.6,colorOverLife:grad(P.hot,[[0,1],[1,0]])}
 :{texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.9,rate:o.rate??90,duration:o.duration??1.2,max:Math.ceil((o.rate??90)*.38)+10,life:[.11,.22],speed:[.08,.32],
 shape:{type:'sphere',radius:.05},spherical:1,gravity:-1.1,drag:2.2,noise:{strength:.58,frequency:2.2,speed:2.5,octaves:2},rotation:[0,6.28],spin:[-3.5,3.5],size:[(o.size??.38)*.88,(o.size??.38)*1.28],sizeOverLife:{curve:[[0,.96],[.26,1.02],[.65,.48],[1,.1]]},
 color:'#ffffff',intensity:1.05,colorOverLife:grad(flameOf(P),[[0,.98],[.35,.88],[.72,.45],[1,0]])},pick(o,['rate','size','flame','duration','alpha',...OWN]));
// W · Vertical light/flame column (eruptions, level-ups): tall billowing flames rising upright from the origin.
export const pillar=(P,o={})=>mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',alpha:o.alpha??.9,bursts:o.rate?[]:[[0,o.count??14]],rate:o.rate??0,duration:o.duration??.3,max:(o.count??14)+(o.rate?Math.ceil(o.rate*.8):0)+6,
 shape:{type:'circle',radius:o.radius??.25},life:[.34,.56],velocity:{min:[0,o.power??3.2,0],max:[0,(o.power??3.2)*1.65,0]},drag:1.6,
 noise:{strength:.55,frequency:1.8,speed:2.2,octaves:2},rotation:[-.2,.2],spin:[-.55,.55],
 sizeXY:[[.68,.96],[1.05,1.52]],sizeOverLife:{curve:[[0,.42],[.24,1],[.68,.88],[1,.32]]},sizeOverLifeY:{curve:[[0,.48],[.3,1.14],[1,.76]]},color:'#ffffff',intensity:o.intensity??1.1,colorOverLife:grad(flameOf(P),[[0,0],[.12,1],[.55,.9],[1,0]])},pick(o,['intensity','rate','alpha',...OWN]));
// W · Motes spiralling around the vertical axis (summons, level-ups, traps): orbit + optional inward pull (pixel particle cluster, no ribbon line).
export const vortex=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.9,rate:o.rate??48,duration:o.duration??.6,max:Math.ceil((o.rate??48)*1.3)+8,shape:{type:'circle',radius:o.radius??1.2,thickness:.22},
 life:[.5,.9],velocity:{min:[0,o.lift??.6,0],max:[0,(o.lift??.6)*2,0]},orbit:[0,o.swirl??3.2,0],radial:o.pull??-1.2,
 size:[.034,.058],color:[P.spark,P.accent],intensity:o.intensity??1.2,colorOverLife:grad(P.hot,[[0,0],[.15,1],[1,0]])},pick(o,['rate','lift','swirl','pull','intensity','trail',...OWN]));
// W · Shards bursting outward and tumbling (crystal or bone splinters).
export const shards=(P,o={})=>mix({texture:'shard',align:'velocity',bursts:[[0,o.count??12]],max:(o.count??12)+2,shape:{type:'sphere',radius:.15},life:[.3,.55],speed:o.speed??[3,6],spherical:1,
 drag:2.5,gravity:2,sizeXY:[[.032,.055],[.085,.14]],sizeOverLife:{curve:[[0,1],[1,.2]]},color:[P.accent,P.spark],intensity:o.intensity??1.5,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['intensity','speed',...OWN]));
// W · Ground-skimming ring of pixel sparks flying outward from the origin (shock fronts).
export const radialSkim=(P,o={})=>mix({texture:'ember',blend:'alpha',alpha:.9,bursts:[[0,o.count??36]],max:(o.count??36)+4,shape:{type:'circle',radius:o.radius??.3,thickness:0,arcMode:'burstSpread'},
 spherical:1,life:[.25,.45],speed:o.speed??[4.5,7.5],drag:3,gravity:0,at:[0,.05,0],size:[.035,.060],sizeOverLife:{curve:[[0,1],[1,.2]]},
 color:[P.spark,P.light],intensity:o.intensity??1.2,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['intensity','speed',...OWN]));

// G · Fine irregular dashed/dotted perimeter ring on the ground marking the outer blast radius.
export const shockRing=(P,o={})=>{
 const R=o.radius??1.5,life=o.life??.48,count=Math.min(44,Math.max(28,Math.round(R*24)));
 return mix({name:o.name??'pixel shock wave',texture:'ember',blend:o.blend??'alpha',alpha:o.alpha??.95,
  bursts:[[0,count]],rate:0,max:count+4,rot:o.rot??[0,0,0],
  shape:{type:'circle',radius:R*.98,thickness:.004,arcMode:'burstSpread'},
  jitter:.0025,life:[life*.9,life*1.1],speed:0,spherical:0,
  size:[.042,.058],sizeOverLife:{curve:[[0,1],[.82,.96],[1,0]]},
  color:'#ffffff',intensity:o.intensity??1.15,
  colorOverLife:grad(flameOf(P),[[0,1],[.78,.94],[1,0]])},pick(o,['name','count','life','intensity','alpha','blend','rot','size','sizeOverLife',...OWN]));
};
// G · Particle ring: circumference of fine irregular dashed pixel clusters (replaces single-quad ring decals).
export const ring=(P,o={})=>magicCircle(P,{radius:o.radius??1.2,duration:o.life??.5,intensity:o.intensity??1.6,name:o.name??'particle ring'})[0];
// G · Diablo-like fine irregular dashed/dotted ground circle:
// 7 staggered-angle emitters (+0°, +0.65°, +1.30°, +1.95°, +2.60°, +3.25°, +3.90° with smooth correlated radial wave)
// place 7 tiny pixel dots closely along each dash followed by a clear gap before the next dash,
// plus 3 staggered emitters for the inner dashed ring at 0.66 R.
export const magicCircle=(P,o={})=>{
 const R=o.radius??1.35,dur=o.duration??((o.fadeIn??.12)+(o.hold??.4)+(o.fadeOut??.1)),n=o.name??'magic circle';
 const dashes=Math.min(46,Math.max(30,Math.round(R*26))),innerDashes=Math.min(34,Math.max(22,Math.round(R*19)));
 const fullLife=dur+.28;
 const pass=['name','count','texture','fadeIn','hold','fadeOut','spin','from','to','intensity','rotation','alpha','duration','life','radial','size','sizeOverLife',...OWN];
 const mkDashDot=(idx,rotDeg,rScale,sz)=>mix({
  name:`${n} dash ${idx}`,texture:'ember',blend:'alpha',alpha:o.alpha??.96,
  bursts:[[0,dashes]],rate:0,duration:dur,max:dashes+4,rot:[0,rotDeg,0],
  shape:{type:'circle',radius:R*rScale,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,life:fullLife,speed:0,spherical:0,
  size:sz,sizeOverLife:{curve:[[0,1],[.85,1],[1,0]]},
  color:'#ffffff',intensity:1.15,
  colorOverLife:grad(flameOf(P),[[0,1],[.82,.96],[1,0]])
 },pick(o,pass));
 const mkInnerDot=(idx,rotDeg,rScale)=>mix({
  name:`${n} inner ${idx}`,texture:'ember',blend:'alpha',alpha:(o.alpha??.9)*.88,
  bursts:[[0,innerDashes]],rate:0,duration:dur,max:innerDashes+4,rot:[0,rotDeg,0],
  shape:{type:'circle',radius:R*rScale,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,life:fullLife,speed:0,spherical:0,
  size:[.038,.052],sizeOverLife:{curve:[[0,1],[.84,.95],[1,0]]},
  color:'#ffffff',intensity:1.1,
  colorOverLife:grad(flameOf(P),[[0,1],[.8,.9],[1,0]])
 },pick(o,pass));
 return [
  mkDashDot(1,0.00,1.000,[.044,.060]),
  mkDashDot(2,0.65,1.004,[.040,.056]),
  mkDashDot(3,1.30,1.007,[.044,.058]),
  mkDashDot(4,1.95,1.004,[.040,.055]),
  mkDashDot(5,2.60,0.998,[.043,.058]),
  mkDashDot(6,3.25,0.994,[.040,.055]),
  mkDashDot(7,3.90,0.997,[.042,.057]),
  mkInnerDot(1,0.00,0.660),
  mkInnerDot(2,0.85,0.665),
  mkInnerDot(3,1.70,0.657),
 ];
};
// G · Backwards-compatible single-layer alias for custom callers; prefer magicCircle() spread for full multi-ring particle circles.
export const sigil=(P,o={})=>magicCircle(P,o)[0];
// G · Companion dot in the inner dashed ring at 0.66 R (+2.55° offset so inner dashes are 4 tiny dots long).
export const pool=(P,o={})=>{
 const R=o.radius??1.2,cnt=Math.min(34,Math.max(22,Math.round(R*19))),life=o.life??.6;
 return mix({name:o.name??'pool dots',texture:'ember',blend:'alpha',alpha:o.alpha??.88,bursts:o.bursts??[[0,cnt]],rate:0,max:(o.max??cnt)+4,life,
  rot:[0,2.55,0],shape:o.shape??{type:'circle',radius:R*.661,thickness:.004,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,
  size:[.038,.052],sizeOverLife:{curve:[[0,1],[.82,.95],[1,0]]},
  color:'#ffffff',intensity:1.08,colorOverLife:grad(flameOf(P),[[0,1],[.8,.9],[1,0]])},pick(o,['name','count','life','intensity','alpha','bursts','max','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Companion dot in the outer dashed ring (+4.55° offset).
export const cracks=(P,o={})=>{
 const R=o.radius??1.4,life=o.life??.8,count=Math.min(46,Math.max(30,Math.round(R*26)));
 return mix({name:o.name??'crack dots',texture:'ember',blend:'alpha',alpha:.92,bursts:[[0,count]],rate:0,max:count+4,life:[life*.85,life],
  rot:[0,4.55,0],shape:{type:'circle',radius:R*.999,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,size:[.040,.056],
  sizeOverLife:{curve:[[0,1],[.82,.94],[1,0]]},
  color:'#ffffff',intensity:1.1,colorOverLife:grad(flameOf(P),[[0,1],[.78,.9],[1,0]])},pick(o,['name','count','life','intensity','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Fine inner dashed ring at 0.38 R.
export const scorch=(P,o={})=>{
 const R=o.radius??.9,count=Math.min(26,Math.max(16,Math.round(R*15))),life=o.life??.75;
 return mix({name:o.name??'scorch dots',texture:'ember',blend:'alpha',alpha:.84,bursts:o.bursts??[[0,count]],rate:0,max:(o.max??count)+4,life,
  shape:o.shape??{type:'circle',radius:R*.38,thickness:.005,arcMode:'burstSpread'},
  jitter:.0025,speed:0,spherical:0,size:[.036,.050],
  sizeOverLife:{curve:[[0,1],[.8,.9],[1,0]]},
  color:'#ffffff',intensity:1.05,colorOverLife:grad(flameOf(P),[[0,1],[.75,.85],[1,0]])},pick(o,['name','count','life','alpha','color','bursts','max','size','sizeOverLife','rate','thickness',...OWN]));
};
// G · Ground-aligned crescent arc of fine, slightly irregular dashed pixel dots toward +X marking directional cone AoEs.
export const slashDecal=(P,o={})=>{
 const R=o.radius??1.2,life=o.life??.42,arc=o.arc??120,count=Math.min(36,Math.max(20,Math.round(R*18)));
 const off=o.dashOffset??0;
 return mix({name:o.name??'pixel slash arc',texture:'ember',blend:'alpha',alpha:o.alpha??.95,
  bursts:[[0,count]],rate:0,max:count+4,life:[life*.9,life*1.1],
  at:o.at??[0,0,0],rot:[0,-arc/2+off,0],
  shape:{type:'circle',radius:R*.94,thickness:.004,arc,arcMode:'burstSpread'},
  jitter:.0025,speed:0,spherical:0,
  size:[.042,.058],
  sizeOverLife:{curve:[[0,1],[.82,.96],[1,0]]},
  color:'#ffffff',intensity:o.intensity??1.15,
  colorOverLife:grad(flameOf(P),[[0,1],[.78,.92],[1,0]])},pick(o,['name','count','dashOffset','life','intensity','at','alpha','size','sizeOverLife',...OWN]));
};
// G · Companion dot in the outer dashed ring (+4.55° offset).
export const groundArcs=(P,o={})=>{
 const R=o.radius??1.3,dur=o.duration??.5,cnt=Math.min(46,Math.max(30,Math.round(R*26)));
 return mix({name:o.name??'rim dots',texture:'ember',blend:'alpha',alpha:.92,
  bursts:[[0,cnt]],rate:0,duration:dur,max:cnt+4,life:dur+.2,
  rot:[0,4.55,0],shape:o.shape??{type:'circle',radius:R*.999,thickness:.003,arcMode:'burstSpread'},
  jitter:.002,speed:0,spherical:0,size:[.040,.056],
  sizeOverLife:{curve:[[0,1],[.82,.95],[1,0]]},
  color:'#ffffff',intensity:1.1,colorOverLife:grad(flameOf(P),[[0,1],[.8,.92],[1,0]])},pick(o,['name','count','rate','size','sizeOverLife','intensity','duration','thickness',...OWN]));
};
// G · Additive glow copy of a decal layer (sigil, ring, slash…): put it over the alpha-blended one so the decal
// also lights up at night. strength scales its intensity.
export const glow=(spec,strength=.55)=>({...spec,blend:'additive',intensity:(spec.intensity??1)*strength,order:(spec.order??0)+1,name:spec.name?spec.name+' glow':undefined});
