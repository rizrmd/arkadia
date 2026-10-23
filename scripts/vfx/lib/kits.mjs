// Skill archetypes: each kit returns the full set of effects one kind of skill needs (cast, travel, impact,
// telegraph, detonation; world + ground), built from layers.mjs and coloured by a palette. Hero recipes call a
// kit with their palette and tune it, or extend its layer stacks with extra layers of their own:
//   ...kits.trap('rift-runner.rift-trap',RIFT,{radius:1.45,charge:.64})
// o.extra = {'<suffix>':[layers…]} appends layers to one effect of the kit (suffix: 'cast', 'detonate.ground', …;
// '' for a kit's unsuffixed effect, e.g. the swing's spark burst).
import * as L from './layers.mjs';
const fx=(base,suffix,name,emitters,o)=>({id:suffix?`${base}.${suffix}`:base,name,emitters:[...emitters,...(o?.extra?.[suffix]??[])]});
const title=id=>id.split('.').slice(1).map(s=>s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())).join(' · ');

// Basic weapon swing: a ground crescent toward the aim plus a spit of sparks off the blade.
export function swing(id,P,o={}){const r=o.radius??.95;return [
 fx(id,'',title(id),[L.sparks(P,{at:[.35,.5,0],count:16,spread:55,speed:[2.5,6],gravity:4,intensity:2}),L.glints(P,{at:[.5,.55,0],count:1,radius:.05,size:.4})],o),
 fx(id,'ground',title(id)+' · arc',[L.slashDecal(P,{at:[.12,0,0],radius:r,life:.22}),L.slashDecal(P,{at:[.12,0,0],radius:r*.82,life:.18,delay:.03,intensity:1.6})],o)];}

// Projectile skills: muzzle burst at the caster, a travelling bolt (moved by the game), an impact on hit.
export function projectile(id,P,o={}){const hand=o.hand??[.28,.62,0];return [
 fx(id,'cast',title(id),[L.flash(P,{at:hand,size:1.3,intensity:3.2,life:.2}),L.flash(P,{at:hand,size:.6,intensity:5,life:.1}),
  L.sparks(P,{at:hand,count:34,spread:30,speed:[5,11],gravity:3}),L.glints(P,{at:hand,count:2,radius:.08,size:.5}),
  L.embers(P,{at:hand,count:12,radius:.2,shape:{type:'cone',angle:40,radius:.08},rot:[0,0,-90],speed:[.8,2.4]})],o),
 fx(id,'cast.ground',title(id)+' · ground',[...L.magicCircle(P,{name:'cast circle',radius:1.05,duration:.42,spin:2.1,count:44}),L.pool(P,{radius:.8,life:.45,intensity:.85})],o),
 fx(id,'bolt',title(id)+' · bolt',[L.comet(P,{at:[0,hand[1],0],size:.4,width:.28,trailLife:.18,life:o.flight??1.4}),
  L.core(P,{at:[0,hand[1],0],size:.48,rate:40,duration:o.flight??1.4,intensity:2.6}),
  L.wake(P,{at:[0,hand[1],0],flame:false,rate:50,duration:o.flight??1.4})],o),
 fx(id,'impact',title(id)+' · impact',[L.flash(P,{at:[0,.5,0],size:1.4,intensity:3.4}),
  L.sparks(P,{at:[0,.5,0],count:34,rot:[0,0,0],spread:90,shape:{type:'sphere',radius:.05},spherical:1,speed:[3,7],gravity:5}),
  L.glints(P,{at:[0,.55,0],count:3,radius:.2,size:.45}),L.embers(P,{at:[0,.5,0],count:10,radius:.25})],o),
 fx(id,'impact.ground',title(id)+' · impact ground',[L.shockRing(P,{radius:.75,life:.3}),L.pool(P,{radius:.55,life:.35})],o)];}

// Lunges: afterimages and a streaming wake along the path (0 → reach along +X), and a cone burst at its end.
export function dash(id,P,o={}){const reach=o.reach??1.5,mid=reach/2;return [
 fx(id,'cast',title(id),[
  L.core(P,{name:'afterimages',local:false,at:[mid,.58,0],shape:{type:'box',box:[reach,.05,.05]},bursts:[[0,3],[.04,3],[.08,3]],rate:0,max:12,life:[.24,.36],
   sizeXY:[[.32,.44],[.82,1.08]],intensity:1.25}),
  ...(o.flame===false?[
    L.stream(P,{name:'rift pixel stream',at:[0,.48,0],count:18,spread:15,speed:[6,10.5],sizeXY:[[.42,.64],[.56,.82]]}),
    L.embers(P,{name:'rift pixel motes',at:[0,.48,0],count:28,shape:{type:'cone',angle:14,radius:.08},rot:[0,0,-90],speed:[7,12],life:[.18,.32],intensity:2.1})]
   :[L.stream(P,{at:[0,.48,0],count:24,spread:15,speed:[6,11],sizeXY:[[.52,.78],[.68,.98]]}),
    L.glow(L.stream(P,{name:'dash fire core',at:[0,.48,0],count:18,spread:12,speed:[6.5,11.5],sizeXY:[[.4,.62],[.54,.82]]}),1.15),
    L.wispStream(P,{name:'dash wisps',at:[0,.48,0],count:14,spread:14,speed:[6.8,12],sizeXY:[[.44,.65],[.62,.92]]})]),
  L.sparks(P,{at:[reach*.6,.5,0],count:30,spread:24,speed:[6,12],gravity:2}),
  L.wake(P,{at:[mid,.28,0],flame:o.flame!==false,rate:0,bursts:[[0,16]],max:20,shape:{type:'box',box:[reach,.1,.25]},duration:.22}),
  L.embers(P,{at:[mid,.3,0],count:20,shape:{type:'box',box:[reach,.2,.4]}})],o),
 fx(id,'cast.ground',title(id)+' · trail',[L.scorch(P,{at:[mid,0,0],radius:.4,shape:{type:'box',box:[reach,0,.15]},bursts:[[0,5]],max:6,life:1.2,alpha:.55}),
  L.pool(P,{at:[mid,0,0],radius:.5,shape:{type:'box',box:[reach,0,.1]},bursts:[[0,3]],max:4,life:.35}),
  ...L.magicCircle(P,{name:'dash circle',radius:.7,duration:.3,spin:2.4,count:32})],o),
 fx(id,'detonate',title(id)+' · burst',[L.flash(P,{at:[reach*.75,.45,0],size:1.6,intensity:3}),
  ...(o.flame===false?[L.shards(P,{at:[reach*.6,.45,0],count:10,speed:[3,6]})]
   :[L.stream(P,{at:[.2,.45,0],count:18,spread:36,speed:[4.8,9],sizeXY:[[.52,.78],[.66,.96]]}),
    L.glow(L.stream(P,{name:'burst fire core',at:[.2,.45,0],count:14,spread:30,speed:[5.2,9.5],sizeXY:[[.4,.6],[.52,.8]]}),1.2),
    L.wispStream(P,{name:'burst wisps',at:[.2,.45,0],count:12,spread:34,speed:[5.5,10],sizeXY:[[.42,.64],[.58,.88]]})]),
  L.sparks(P,{at:[.2,.45,0],count:46,spread:40,speed:[5,10],gravity:4}),
  L.smoke(P,{at:[reach*.7,.4,0],count:3,size:.5,alpha:.28})],o),
 fx(id,'detonate.ground',title(id)+' · burst ground',[L.slashDecal(P,{at:[.15,0,0],radius:o.radius??1.3,life:.28,intensity:2.2}),L.pool(P,{at:[.7,0,0],radius:.8,life:.35})],o)];}

// Ground traps: a charging rune circle (telegraph, `charge` seconds) that erupts (detonate). radius = base radius.
export function trap(id,P,o={}){const R=o.radius??1.5,c=o.charge??.64,isFire=o.rimFlames!==false;return [
 fx(id,'telegraph',title(id)+' · charge',[
  L.vortex(P,{radius:R,rate:70,duration:c,lift:.5,swirl:2.8,pull:-1.6}),
  L.arcs(P,{name:'rim arcs',radius:R*.98,rate:isFire?18:30,duration:c,size:isFire?.26:.45,at:[0,.06,0]}),
  ...(o.rimFlames===false?[]:[
   L.flames(P,{name:'rim flames',shape:{type:'circle',radius:R*.95,thickness:0},rate:52,duration:c,size:.32,speed:[.45,1.15],gravity:-2.2,turbulence:1.25,alpha:.82}),
   L.glow(L.flames(P,{name:'rim flame core',shape:{type:'circle',radius:R*.95,thickness:0},rate:36,duration:c,size:.22,speed:[.5,1.2],gravity:-2.2,turbulence:1.2}),.85)])],o),
 fx(id,'telegraph.ground',title(id)+' · rune',[
  ...L.magicCircle(P,{name:'trap circle',radius:R,duration:c,spin:isFire?1.8:2.1,count:Math.round(R*50)}),
  L.pool(P,{radius:R,life:c+.1,intensity:.9}),
  L.groundArcs(P,{radius:R,rate:isFire?24:50,duration:c,size:isFire?.28:.5})],o),
 fx(id,'detonate',title(id)+' · eruption',[
  L.flash(P,{at:[0,.4,0],size:3*R,intensity:3.4,life:.28}),L.flash(P,{at:[0,.3,0],size:1.4*R,intensity:5,life:.14}),
  L.pillar(P,{radius:R*.35,count:16,power:o.power??4.5}),
  L.glow(L.pillar(P,{name:'pillar core',radius:R*.24,count:12,power:(o.power??4.5)*1.1}),1.1),
  L.sparks(P,{at:[0,.2,0],rot:[0,0,0],spread:55,count:70,speed:[4,10],gravity:7,shape:{type:'cone',angle:55,radius:R*.3}}),
  L.radialSkim(P,{radius:R*.3,count:40,speed:[5,9]}),
  ...(o.rock===false?[]:[L.cinders(P,{count:14,radius:R*.4,speed:[2.5,5.5]})]),
  ...(o.flames===false?[]:[
   L.flames(P,{shape:{type:'circle',radius:R*.68},count:14,size:.46,speed:[.9,2.2],gravity:-2.4,turbulence:1.3}),
   L.glow(L.flames(P,{name:'eruption flame core',shape:{type:'circle',radius:R*.5},count:10,size:.34,speed:[1.1,2.4],gravity:-2.5}),1.15)]),
  L.embers(P,{count:34,radius:R*.6,speed:[.8,2.4]}),
  L.smoke(P,{at:[0,.5,0],count:7,radius:R*.5,size:.9,alpha:.38,delay:.1})],o),
 fx(id,'detonate.ground',title(id)+' · scar',[...L.magicCircle(P,{name:'detonate circle',radius:R,duration:.55}),
  L.pool(P,{radius:R,life:.55,intensity:1.1})],o)];}

// Slams around the caster: cracks gather while the blow winds up (telegraph), then the ground bursts (detonate).
export function slam(id,P,o={}){const R=o.radius??1.65,c=o.charge??.46;return [
 fx(id,'telegraph',title(id)+' · wind-up',[L.vortex(P,{radius:R*.9,rate:50,duration:c,lift:.2,swirl:1.5,pull:-2.4,trail:false}),
  L.smoke(P,{count:5,size:.5,alpha:.25,shape:{type:'circle',radius:R*.85,thickness:0},speed:0,spherical:0,radial:-1.4,gravity:-.2})],o),
 fx(id,'telegraph.ground',title(id)+' · fracture',[
  ...L.magicCircle(P,{name:'slam circle',radius:R,duration:c,spin:1.6,radial:-.18,count:Math.round(R*44)}),
  L.cracks(P,{radius:R,life:c+.05,intensity:1.2}),
  L.pool(P,{radius:R,life:c,intensity:.8})],o),
 fx(id,'detonate',title(id)+' · burst',[L.flash(P,{at:[0,.3,0],size:2.6*R,intensity:3,life:.24}),
  L.debris(P,{count:o.debris??26,radius:R*.45,speed:[2.6,5.4]}),
  ...(o.molten?[
   L.cinders(P,{count:20,radius:R*.45,speed:[2.5,5.2]}),
   L.flames(P,{shape:{type:'circle',radius:R*.62,thickness:.45},count:14,size:.4,speed:[.7,1.8],gravity:-2.2,turbulence:1.3}),
   L.glow(L.flames(P,{name:'molten flame core',shape:{type:'circle',radius:R*.52,thickness:.4},count:10,size:.28,speed:[.8,2],gravity:-2.4}),1.15)]:[]),
  L.radialSkim(P,{radius:R*.25,count:48,speed:[6,10]}),
  L.smoke(P,{name:'dust ring',count:12,shape:{type:'circle',radius:R*.4,thickness:0},spherical:1,speed:[2,3.4],drag:2.6,gravity:-.2,size:.75,alpha:.4,color:o.dust??P.smoke}),
  L.glints(P,{count:4,radius:R*.5,size:.45,at:[0,.3,0]})],o),
 fx(id,'detonate.ground',title(id)+' · shock',[...L.magicCircle(P,{name:'slam detonate circle',radius:R,duration:.55}),
  L.pool(P,{radius:R,life:.55,intensity:1.1})],o)];}

// Sweeping cleaves: a crescent wind-up toward the aim (cast) and the blow landing in a cone (detonate).
export function cleave(id,P,o={}){const R=o.radius??1.55,arc=o.arc??120;return [
 fx(id,'cast',title(id),[L.glints(P,{count:7,shape:{type:'circle',radius:R*.8,thickness:.1,arc,arcMode:'burstSpread'},rot:[0,-arc/2,0],at:[0,.35,0],size:.45}),
  L.sparks(P,{at:[.2,.4,0],count:28,spread:arc/2,speed:[4,8],gravity:2,intensity:2})],o),
 fx(id,'cast.ground',title(id)+' · arc',[L.slashDecal(P,{radius:R*.9,life:.3}),L.slashDecal(P,{radius:R*.7,life:.24,delay:.06,intensity:1.8})],o),
 fx(id,'detonate',title(id)+' · strike',[L.flash(P,{at:[R*.55,.4,0],size:1.8,intensity:3}),
  L.sparks(P,{at:[.2,.4,0],count:46,spread:arc/2,speed:[6,12],gravity:3}),L.shards(P,{at:[R*.5,.4,0],count:10,speed:[2,5]})],o),
 fx(id,'detonate.ground',title(id)+' · strike ground',[L.slashDecal(P,{radius:R*1.05,life:.32,intensity:3}),L.shockRing(P,{at:[R*.5,0,0],radius:.8,life:.3})],o)];}
