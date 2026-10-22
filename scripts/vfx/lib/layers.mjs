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

// W · Bright flash at the origin: one or two quick glows that bloom and fade.
export const flash=(P,o={})=>mix({texture:'glow',bursts:[[0,o.count??1]],max:4,life:o.life??.2,size:(o.size??1.2)*.5,
 sizeOverLife:{curve:[[0,.6],[.25,1],[1,1.25]]},color:P.light,intensity:o.intensity??1.6,colorOverLife:grad(P.hot,[[0,1],[.4,.8],[1,0]]),at:o.at},pick(o,['size','intensity','life','count',...OWN]));
// W · Lingering hot core that pulses (charge-up, projectile heads, eruption cores).
export const core=(P,o={})=>mix({texture:'glow',rate:o.rate??30,duration:o.duration??.4,loop:o.loop??false,max:24,life:[.12,.2],size:[(o.size??.8)*.8,(o.size??.8)*1.1],
 color:P.light,intensity:o.intensity??1.6,colorOverLife:grad(P.hot,[[0,0],[.2,1],[1,0]]),local:o.local??true},pick(o,['size','intensity','rate',...OWN]));
// W · Velocity-stretched sparks sprayed in a cone along +X (spread = cone half-angle in degrees; 90 = hemisphere fan).
export const sparks=(P,o={})=>mix({texture:'streak',align:'velocity',bursts:[[0,o.count??40]],max:(o.count??40)+8,
 shape:{type:'cone',angle:o.spread??30,radius:.04},rot:AIM,life:[.22,.55],speed:o.speed??[4,10],
 sizeXY:[[.04,.07],[.3,.62]],sizeOverLife:{curve:[[0,1],[1,.15]]},gravity:o.gravity??5,drag:o.drag??2.2,
 color:[P.spark,P.light],intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[.6,.9],[1,0]])},pick(o,['intensity','gravity','drag','speed',...OWN]));
// W · Floating embers: small hot dots that drift up on curl noise and twinkle out.
export const embers=(P,o={})=>mix({texture:'ember',bursts:o.rate?[]:[[0,o.count??18]],rate:o.rate??0,duration:o.duration??.5,max:(o.count??18)+(o.rate?Math.ceil(o.rate*1.6):0)+4,
 shape:{type:'sphere',radius:o.radius??.35},life:[.7,1.5],speed:[.2,.9],spherical:1,gravity:o.gravity??-1.2,drag:1.2,
 noise:{strength:o.turbulence??1.4,frequency:1.8,speed:1.2,octaves:2},size:[.05,.12],color:[P.spark,P.accent],intensity:o.intensity??1.8,
 colorOverLife:grad(P.hot,[[0,0],[.08,1],[.5,.85],[.7,.35],[.8,.9],[1,0]])},pick(o,['intensity','gravity','turbulence','rate',...OWN]));
// W · Flipbook flame tongues licking upward (+Y). Use `shape` to spread them over an area or a ring.
export const flames=(P,o={})=>mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},blend:'alpha',sort:'oldestFirst',bursts:o.rate?[]:[[0,o.count??10]],rate:o.rate??0,duration:o.duration??.4,
 max:(o.count??10)+(o.rate?Math.ceil(o.rate*.8):0)+4,shape:{type:'circle',radius:o.radius??.15},life:[.35,.6],speed:[.4,1.1],spherical:0,
 rotation:[-.25,.25],size:[(o.size??.6)*.75,(o.size??.6)*1.2],sizeOverLife:{curve:[[0,.35],[.25,1],[.7,.9],[1,.45]]},
 color:'#ffffff',alpha:o.alpha??1,intensity:o.intensity??1,colorOverLife:grad(flameOf(P),[[0,0],[.08,1],[.8,1],[1,0]])},pick(o,['size','intensity','rate','alpha',...OWN]));
// W · Fire stream: licking flame tongues poured along +X in a cone, each pointing where it flies (breath, fans, jets).
export const stream=(P,o={})=>mix({texture:'flame',tiles:[4,4],frames:{random:true,cycles:1},align:'velocity',blend:'alpha',sort:'oldestFirst',alpha:o.alpha??1,bursts:o.rate?[]:[[0,o.count??24]],rate:o.rate??0,duration:o.duration??.25,max:(o.count??24)+(o.rate?Math.ceil(o.rate*.6):0)+6,
 shape:{type:'cone',angle:o.spread??25,radius:.06},rot:AIM,life:[.3,.55],speed:o.speed??[7,13],drag:o.drag??2.2,gravity:-.6,
 sizeXY:[[.3,.42],[.62,.92]],sizeOverLife:{curve:[[0,.4],[.3,1],[1,.75]]},noise:{strength:.8,frequency:2,speed:2},
 color:'#ffffff',intensity:o.intensity??1,colorOverLife:grad(flameOf(P),[[0,1],[.8,1],[1,0]])},pick(o,['intensity','speed','drag','rate','alpha',...OWN]));
// W · Smoke/dust: alpha-blended billowing puffs that rise and spread (residue after fire or impacts).
export const smoke=(P,o={})=>mix({texture:'smoke',tiles:[2,2],frames:{random:true,still:true},blend:'alpha',sort:'oldestFirst',bursts:[[o.delay0??0,o.count??6]],max:(o.count??6)+2,
 shape:{type:'sphere',radius:o.radius??.3},life:[.9,1.6],speed:[.2,.6],spherical:1,gravity:o.gravity??-.5,drag:1.5,
 rotation:[0,6.28],spin:[-.8,.8],size:[(o.size??.7)*.7,(o.size??.7)*1.1],sizeOverLife:{curve:[[0,.45],[1,1.5]]},
 color:o.color??P.smoke,alpha:o.alpha??.55,colorOverLife:{c:[[0,'#ffffff'],[1,'#ffffff']],a:[[0,0],[.15,1],[1,0]]},order:-2},pick(o,['size','alpha','color','gravity','delay0',...OWN]));
// W · Debris chunks thrown up and out; they fall back, bounce on the ground plane and settle.
export const debris=(P,o={})=>mix({texture:'debris',tiles:[2,2],frames:{random:true,still:true},blend:'alpha',bursts:[[0,o.count??16]],max:(o.count??16)+4,
 shape:{type:'hemisphere',radius:o.radius??.3,thickness:1},life:[.8,1.3],speed:o.speed??[2.2,4.6],spherical:.6,gravity:o.gravity??11,drag:.4,
 collide:{y:0,bounce:.32,dampen:.55},rotation:[0,6.28],spin:[-9,9],size:[(o.size??.14)*.6,(o.size??.14)*1.4],
 color:o.color??P.rock,colorOverLife:{c:[[0,'#ffffff'],[1,'#ffffff']],a:[[0,1],[.8,1],[1,0]]},order:-1},pick(o,['size','speed','gravity','color',...OWN]));
// W · Molten/energised chunks: like debris but glowing additively, for eruptions.
export const cinders=(P,o={})=>mix(debris(P,o),{texture:'ember',tiles:undefined,frames:undefined,blend:'additive',color:[P.spark,P.light],intensity:1.6,
 colorOverLife:grad(P.hot,[[0,1],[.7,.8],[1,0]]),trail:{life:.18,width:.06,colorOverTrail:grad(P.body,[[0,.9],[1,0]])},...pick(o,['count','size','speed','gravity','color',...OWN])});
// W · Crackling arcs: lightning/flame tendrils flickering over a ring or area.
export const arcs=(P,o={})=>mix({texture:'arc',tiles:[2,2],frames:{random:true,still:true},rate:o.rate??40,duration:o.duration??.5,max:Math.ceil((o.rate??40)*.25)+6,
 shape:{type:'circle',radius:o.radius??1,thickness:0},life:[.06,.14],rotation:[0,6.28],size:[(o.size??.55)*.7,(o.size??.55)*1.2],
 color:[P.spark,P.light],intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['rate','size','intensity',...OWN]));
// W · Star glints: four-point flares that pop on and twinkle out.
export const glints=(P,o={})=>mix({texture:'flare',bursts:[[0,o.count??6]],max:(o.count??6)+2,shape:{type:'sphere',radius:o.radius??.5},life:[.25,.5],
 rotation:[0,.8],size:[(o.size??.35)*.6,(o.size??.35)*1.2],sizeOverLife:{curve:[[0,0],[.25,1],[1,0]]},color:[P.accent,P.spark],intensity:o.intensity??2,
 colorOverLife:grad(P.hot,[[0,1],[1,.6]])},pick(o,['size','intensity',...OWN]));
// W · Projectile carrier: a hot head that follows the effect position ({ribbon:true} adds a NixieFX ribbon trail,
// which reads as a flat smear over bright snow, so heads normally pair with wake() instead).
export const comet=(P,o={})=>mix({texture:'glow',bursts:[[0,1]],max:2,life:o.life??1.2,local:true,size:o.size??.5,sizeOverLife:{curve:[[0,.7],[.1,1],[1,1]]},
 color:P.light,intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,1],[.92,1],[1,0]]),
 ...(o.ribbon?{trail:{life:o.trailLife??.22,width:o.width??.3,widthOverTrail:{curve:[[0,1],[1,0]]},colorOverTrail:grad(P.body,[[0,1],[.5,.7],[1,0]]),texture:'glow',minVertexDistance:.02,worldSpace:true}}:{})},pick(o,['size','intensity','life','trailLife','width','ribbon',...OWN]));
// W · Continuous shedding behind a moving origin (fire trail, rift dust): world-space particles left in its wake.
export const wake=(P,o={})=>mix(o.flame===false?{texture:'ember',rate:o.rate??60,duration:o.duration??1.2,max:Math.ceil((o.rate??60)*.5)+8,life:[.2,.45],speed:[.2,.8],
 shape:{type:'sphere',radius:.08},spherical:1,gravity:-1,drag:2,size:[.05,.1],color:[P.spark,P.accent],intensity:1.8,colorOverLife:grad(P.hot,[[0,1],[1,0]])}
 :{texture:'flame',tiles:[4,4],frames:{random:true},blend:'alpha',alpha:1,rate:o.rate??55,duration:o.duration??1.2,max:Math.ceil((o.rate??55)*.4)+8,life:[.16,.3],speed:[.1,.5],
 shape:{type:'sphere',radius:.1},spherical:1,gravity:-1.8,rotation:[-.4,.4],size:[(o.size??.35)*.8,(o.size??.35)*1.2],sizeOverLife:{curve:[[0,1],[1,.3]]},
 color:'#ffffff',intensity:1.1,colorOverLife:grad(flameOf(P),[[0,1],[.8,1],[1,0]])},pick(o,['rate','size','flame','duration',...OWN]));
// W · Vertical light column (eruptions, level-ups): tall stretched glows rising from the origin.
export const pillar=(P,o={})=>mix({texture:'wisp',align:'velocity',blend:'alpha',alpha:.85,bursts:o.rate?[]:[[0,o.count??10]],rate:o.rate??0,duration:o.duration??.3,max:(o.count??10)+(o.rate?Math.ceil(o.rate*.8):0)+4,
 shape:{type:'circle',radius:o.radius??.25},life:[.35,.6],velocity:{min:[0,o.power??3.5,0],max:[0,(o.power??3.5)*1.8,0]},drag:1.5,
 sizeXY:[[.35,.55],[1.2,2.2]],sizeOverLife:{curve:[[0,.4],[.3,1],[1,.6]]},color:'#ffffff',intensity:o.intensity??1.1,colorOverLife:grad(flameOf(P),[[0,0],[.15,1],[1,0]])},pick(o,['intensity','rate',...OWN]));
// W · Motes spiralling around the vertical axis (summons, level-ups, traps): orbit + optional inward pull.
export const vortex=(P,o={})=>mix({texture:'ember',rate:o.rate??40,duration:o.duration??.6,max:Math.ceil((o.rate??40)*1.2)+6,shape:{type:'circle',radius:o.radius??1.2,thickness:.2},
 life:[.5,.9],velocity:{min:[0,o.lift??.6,0],max:[0,(o.lift??.6)*2,0]},orbit:[0,o.swirl??3.2,0],radial:o.pull??-1.2,
 size:[.05,.11],color:[P.spark,P.accent],intensity:o.intensity??1.8,colorOverLife:grad(P.hot,[[0,0],[.15,1],[1,0]]),trail:o.trail===false?undefined:{life:.16,width:.05,inheritColor:true}},pick(o,['rate','lift','swirl','pull','intensity','trail',...OWN]));
// W · Shards bursting outward and tumbling (crystal or bone splinters).
export const shards=(P,o={})=>mix({texture:'shard',align:'velocity',bursts:[[0,o.count??12]],max:(o.count??12)+2,shape:{type:'sphere',radius:.15},life:[.3,.55],speed:o.speed??[3,6],spherical:1,
 drag:2.5,gravity:2,sizeXY:[[.08,.14],[.22,.38]],sizeOverLife:{curve:[[0,1],[1,.2]]},color:[P.accent,P.spark],intensity:o.intensity??1.5,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['intensity','speed',...OWN]));
// W · Ground-skimming ring of sparks or dust flying outward from the origin (shock fronts).
export const radialSkim=(P,o={})=>mix({texture:'streak',align:'velocity',bursts:[[0,o.count??36]],max:(o.count??36)+4,shape:{type:'circle',radius:o.radius??.3,thickness:0,arcMode:'burstSpread'},
 spherical:1,life:[.25,.45],speed:o.speed??[5,8],drag:3,gravity:0,at:[0,.05,0],sizeXY:[[.05,.09],[.35,.6]],sizeOverLife:{curve:[[0,1],[1,.2]]},
 color:[P.spark,P.light],intensity:o.intensity??1.7,colorOverLife:grad(P.hot,[[0,1],[1,0]])},pick(o,['intensity','speed',...OWN]));

// G · Shock ring expanding over the ground. radius = final radius in tiles.
export const shockRing=(P,o={})=>mix({texture:'shock',blend:'alpha',bursts:[[0,1]],max:2,life:o.life??.45,size:2*(o.radius??1.5),sizeOverLife:{curve:[[0,.15],[.35,.75],[1,1]]},
 color:P.light,alpha:o.alpha??.85,intensity:o.intensity??1.15,colorOverLife:grad(flameOf(P),[[0,1],[.5,.7],[1,0]])},pick(o,['life','intensity','alpha',...OWN]));
// G · Thin bright ring, expanding (grow>1) or contracting (grow<1).
export const ring=(P,o={})=>mix({texture:'ring',blend:'alpha',bursts:[[0,1]],max:2,life:o.life??.5,size:2*(o.radius??1.2),sizeOverLife:{curve:[[0,o.grow===undefined?.3:1],[1,o.grow===undefined?1:o.grow]]},
 color:P.light,intensity:o.intensity??1.15,colorOverLife:grad(flameOf(P),[[0,0],[.15,1],[1,0]])},pick(o,['life','intensity',...OWN]));
// G · Rune circle: fades in, spins, holds and fades out. hold = seconds at full strength.
export const sigil=(P,o={})=>{const life=(o.fadeIn??.12)+(o.hold??.4)+(o.fadeOut??.35),i=(o.fadeIn??.12)/life,h=((o.fadeIn??.12)+(o.hold??.4))/life;
 return mix({texture:o.texture??'sigil-sun',blend:'alpha',bursts:[[0,1]],max:2,life,size:2*(o.radius??1.3),rotation:o.rotation??0,spin:o.spin??1.1,
  sizeOverLife:{curve:[[0,o.from??.6],[i,1],[1,o.to??1.06]]},color:P.light,intensity:o.intensity??1.15,colorOverLife:grad(flameOf(P),[[0,0],[i,1],[h,.9],[1,0]])},pick(o,['texture','fadeIn','hold','fadeOut','spin','from','to','intensity','rotation',...OWN]));};
// G · Under-glow: a broad soft light pool on the ground (heat, magic charge).
export const pool=(P,o={})=>mix({texture:'glow',bursts:[[0,1]],max:2,life:o.life??.6,size:2.4*(o.radius??1.2),sizeOverLife:{curve:[[0,.6],[.3,1],[1,1.05]]},
 color:P.light,intensity:o.intensity??.7,colorOverLife:grad(P.body,[[0,0],[.2,.8],[1,0]])},pick(o,['life','intensity',...OWN]));
// G · Ground cracks that flare bright and cool down.
export const cracks=(P,o={})=>mix({texture:'crack',blend:'alpha',bursts:[[0,1]],max:2,life:o.life??1.1,size:2*(o.radius??1.4),rotation:[0,6.28],sizeOverLife:{curve:[[0,.55],[.12,1],[1,1]]},
 color:P.light,intensity:o.intensity??1.15,colorOverLife:grad(flameOf(P),[[0,1],[.25,.9],[1,0]])},pick(o,['life','intensity',...OWN]));
// G · Scorch/dust decal left behind (alpha-blended, dark).
export const scorch=(P,o={})=>mix({texture:'scorch',blend:'alpha',bursts:[[0,1]],max:2,life:o.life??1.6,size:2*(o.radius??.9),rotation:[0,6.28],
 color:o.color??'#1a1210',alpha:o.alpha??.7,colorOverLife:{c:[[0,'#ffffff'],[1,'#ffffff']],a:[[0,0],[.06,1],[.7,.8],[1,0]]},order:-5},pick(o,['life','alpha','color',...OWN]));
// G · Ground-aligned slash crescent bulging toward +X (the texture top is pinned to the aim).
// The crescent's centre is the texture's bottom edge, so the decal sits half its height ahead of the anchor.
export const slashDecal=(P,o={})=>mix({texture:'slash',align:'vector',blend:'alpha',bursts:[[0,1]],max:2,life:o.life??.26,at:[(o.at?.[0]??0)+(o.radius??1.2)/2,0,o.at?.[2]??0],
 sizeXY:[2*(o.radius??1.2),o.radius??1.2],sizeOverLife:{curve:[[0,.7],[.3,1],[1,1.08]]},color:P.light,intensity:o.intensity??1.2,colorOverLife:grad(flameOf(P),[[0,1],[.5,.8],[1,0]])},pick(o,['life','intensity','at',...OWN]));
// G · Ground arcs crackling along a ring (flat version of arcs()).
export const groundArcs=(P,o={})=>mix(arcs(P,o),{...pick(o,['rate','size','intensity',...OWN])});
// G · Additive glow copy of a decal layer (sigil, ring, slash…): put it over the alpha-blended one so the decal
// also lights up at night. strength scales its intensity.
export const glow=(spec,strength=.55)=>({...spec,blend:'additive',intensity:(spec.intensity??1)*strength,order:(spec.order??0)+1,name:spec.name?spec.name+' glow':undefined});
