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
export function projectile(id,P,o={}){const hand=o.hand??[.28,.62,0],flight=o.flight??1.0;return [
 fx(id,'cast',title(id),[
  {name:'crescent void sheath',texture:'slash',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.95,bursts:[[0,2]],max:4,at:[.38,.58,0],life:.56,
   sizeXY:[1.46,.80],sizeOverLife:{curve:[[0,.75],[.18,1.02],[.78,.96],[1,.4]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#4416b4'],[.45,'#32128e'],[1,'#220864']],a:[[0,0],[.08,1],[.78,.95],[1,0]]},order:0},
  {name:'crescent violet blade',texture:'slash',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.98,bursts:[[0,2]],max:4,at:[.36,.58,0],life:.52,
   sizeXY:[1.24,.64],sizeOverLife:{curve:[[0,.78],[.18,1],[.76,.94],[1,.35]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#a472ff'],[.38,'#6c34eb'],[.78,'#4416b4'],[1,'#220864']],a:[[0,0],[.08,1],[.76,.95],[1,0]]},order:1},
  {name:'crescent cyan core',texture:'slash',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.98,bursts:[[0,1]],max:2,at:[.33,.58,0],life:.46,
   sizeXY:[.98,.44],sizeOverLife:{curve:[[0,.8],[.2,1],[.74,.9],[1,.3]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#eef8ff'],[.35,'#68d8ff'],[.75,'#6c34eb'],[1,'#32128e']],a:[[0,0],[.08,1],[.72,.94],[1,0]]},order:2},
  {name:'hand plasma orb',texture:'glow',blend:'alpha',alpha:.92,bursts:[[0,1]],max:2,at:hand,life:.44,size:.54,
   sizeOverLife:{curve:[[0,.65],[.2,1],[1,.25]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#eef8ff'],[.4,'#68d8ff'],[1,'#4416b4']],a:[[0,1],[.7,.9],[1,0]]},order:3},
  L.flash(P,{name:'forearm flash',at:hand,size:1.35,intensity:3.2,life:.42,order:2}),
  L.sparks(P,{name:'cast streaks',at:[.36,.58,0],count:36,spread:28,speed:[5,11],gravity:2.4,sizeXY:[[.048,.082],[.15,.28]],color:'#ffffff',
   colorOverLife:{c:[[0,'#eef8ff'],[.32,'#68d8ff'],[.68,'#6c34eb'],[1,'#32128e']],a:[[0,1],[.7,.94],[1,0]]},order:2}),
  L.glints(P,{name:'forearm dark glints',at:[.36,.64,0],count:5,radius:.28,size:[.20,.32],life:[.34,.56],color:'#ffffff',
   colorOverLife:{c:[[0,'#6c34eb'],[.45,'#4416b4'],[1,'#220864']],a:[[0,0],[.18,1],[.78,.95],[1,0]]},order:3}),
  L.glints(P,{name:'forearm cyan glints',at:[.32,.60,0],count:4,radius:.20,size:[.16,.28],life:[.30,.50],color:'#ffffff',
   colorOverLife:{c:[[0,'#eef8ff'],[.45,'#68d8ff'],[1,'#a472ff']],a:[[0,0],[.18,1],[.78,.95],[1,0]]},order:4}),
  L.embers(P,{name:'cast motes',at:[.34,.58,0],count:16,radius:.22,shape:{type:'cone',angle:38,radius:.08},rot:[0,0,-90],speed:[1,2.8]})],o),
 fx(id,'cast.ground',title(id)+' · ground',[
  {name:'arcane under-glow',texture:'glow',blend:'alpha',alpha:.24,bursts:[[0,1]],max:2,life:.82,size:2.28,
   sizeOverLife:{curve:[[0,.85],[.2,1],[.82,.95],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#4416b4'],[.55,'#32128e'],[1,'#220864']],a:[[0,0],[.12,1],[.8,1],[1,0]]},order:-2},
  {name:'arcane rim glow',texture:'shock',blend:'alpha',alpha:.26,bursts:[[0,1]],max:2,life:.78,size:2.16,
   sizeOverLife:{curve:[[0,.92],[.2,1],[.84,.98],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#a472ff'],[.45,'#6c34eb'],[1,'#32128e']],a:[[0,0],[.1,1],[.82,.95],[1,0]]},order:-1},
  ...L.magicCircle(P,{name:'cast circle',radius:1.08,duration:.54,spin:2.1,count:44}),
  L.pool(P,{name:'inner ring dots',radius:1.08,life:.78,intensity:.95}),
  L.shockRing(P,{name:'outer contrast ring',radius:1.08,life:.76,rot:[0,11.8,0]}),
  L.scorch(P,{name:'core rune dots',radius:1.05,life:.74})],o),
 fx(id,'bolt',title(id)+' · bolt',[
  {name:'bolt void sheath',texture:'streak',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.95,bursts:[[0,2]],max:4,local:true,at:[-.95,hand[1],0],life:flight+.18,
   sizeXY:[.52,2.35],sizeOverLife:{curve:[[0,.85],[.12,1],[.92,1],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#4416b4'],[.48,'#32128e'],[1,'#220864']],a:[[0,1],[.92,1],[1,0]]},order:0},
  {name:'bolt violet plasma beam',texture:'streak',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.96,bursts:[[0,2]],max:4,local:true,at:[-.90,hand[1],0],life:flight+.18,
   sizeXY:[.34,2.22],sizeOverLife:{curve:[[0,.88],[.12,1],[.92,1],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#a472ff'],[.42,'#6c34eb'],[1,'#4416b4']],a:[[0,1],[.92,1],[1,0]]},order:1},
  {name:'bolt cyan core beam',texture:'streak',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.98,bursts:[[0,2]],max:4,local:true,at:[-.84,hand[1],0],life:flight+.18,
   sizeXY:[.19,2.08],sizeOverLife:{curve:[[0,.90],[.12,1],[.92,1],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#eef8ff'],[.45,'#68d8ff'],[1,'#a472ff']],a:[[0,1],[.92,1],[1,0]]},order:2},
  L.comet(P,{name:'spearhead comet',at:[0,hand[1],0],size:.62,width:.28,trailLife:.18,life:flight+.18,color:'#ffffff',
   colorOverLife:{c:[[0,'#eef8ff'],[.45,'#68d8ff'],[1,'#6c34eb']],a:[[0,1],[.92,1],[1,0]]},order:3}),
  L.core(P,{name:'cyan spear core',texture:'streak',align:'velocity',velocity:{min:[.04,0,0],max:[.04,0,0]},local:false,at:[0,hand[1],0],rate:85,duration:flight,max:40,
   life:[.20,.30],sizeXY:[[.13,.19],[.56,.82]],color:'#ffffff',
   colorOverLife:{c:[[0,'#eef8ff'],[.36,'#68d8ff'],[.76,'#6c34eb'],[1,'#32128e']],a:[[0,1],[.68,.95],[1,0]]},order:2}),
  L.wake(P,{name:'violet particle wake',at:[0,hand[1],0],flame:false,rate:64,duration:flight,size:[.058,.092],color:'#ffffff',
   colorOverLife:{c:[[0,'#a472ff'],[.45,'#6c34eb'],[1,'#32128e']],a:[[0,1],[.75,.92],[1,0]]},order:1})],o),
 fx(id,'impact',title(id)+' · impact',[
  L.smoke(P,{name:'void impact smoke',at:[0,.50,0],count:12,radius:.34,size:[.48,.74],life:[.44,.72],speed:[.18,.48],gravity:-.12,alpha:.82,color:['#32128e','#220864'],order:-2}),
  {name:'arcane void burst',texture:'orb',blend:'alpha',alpha:.92,bursts:[[0,6]],max:8,at:[0,.50,0],shape:{type:'sphere',radius:.22},spherical:1,
   life:[.26,.44],speed:[.25,.65],spin:[-3,3],size:[.44,.68],sizeOverLife:{curve:[[0,.55],[.22,1],[.78,.92],[1,.3]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#a472ff'],[.38,'#6c34eb'],[.75,'#32128e'],[1,'#220864']],a:[[0,0],[.12,1],[.75,.94],[1,0]]},order:-1},
  L.flash(P,{name:'impact core flash',at:[0,.5,0],size:1.55,intensity:3.4,life:.32,order:2}),
  L.sparks(P,{name:'impact pixel streaks',at:[0,.5,0],count:38,rot:[0,0,0],spread:180,shape:{type:'sphere',radius:.08},spherical:1,speed:[3.2,8.2],gravity:3.5,
   sizeXY:[[.048,.080],[.18,.34]],color:'#ffffff',
   colorOverLife:{c:[[0,'#eef8ff'],[.32,'#68d8ff'],[.68,'#6c34eb'],[1,'#32128e']],a:[[0,1],[.72,.94],[1,0]]},order:1}),
  L.glints(P,{name:'impact core flare',at:[-.14,.54,0],count:5,radius:.12,size:[.52,.78],life:[.28,.46],color:'#ffffff',
   colorOverLife:{c:[[0,'#ffffff'],[.42,'#68d8ff'],[1,'#a472ff']],a:[[0,0],[.14,1],[.82,.96],[1,0]]},order:4}),
  L.embers(P,{name:'impact arcane motes',at:[0,.5,0],count:14,radius:.32,size:[.058,.094]})],o),
 fx(id,'impact.ground',title(id)+' · impact ground',[
  {name:'impact void scorch',texture:'glow',blend:'alpha',alpha:.26,bursts:[[0,1]],max:2,life:.68,size:2.12,
   sizeOverLife:{curve:[[0,.85],[.2,1],[.82,.94],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#4416b4'],[.5,'#32128e'],[1,'#220864']],a:[[0,0],[.12,1],[.8,.95],[1,0]]},order:-2},
  {name:'impact rim glow',texture:'shock',blend:'alpha',alpha:.28,bursts:[[0,1]],max:2,life:.64,size:1.96,
   sizeOverLife:{curve:[[0,.9],[.2,1],[.82,.96],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#a472ff'],[.45,'#6c34eb'],[1,'#32128e']],a:[[0,0],[.1,1],[.82,.95],[1,0]]},order:-1},
  ...L.magicCircle(P,{name:'impact shock circle',radius:.98,duration:.44,spin:1.9,count:40}),
  L.shockRing(P,{name:'impact outer shockRing',radius:.98,life:.62,rot:[0,11.8,0]}),
  L.pool(P,{name:'impact inner pool',radius:.98,life:.62})],o)];}

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

// Sweeping cleaves: a crescent wind-up toward the aim (cast) and a multi-ribbon crescent wave with 3D faceted crystal shards (detonate).
export function cleave(id,P,o={}){const R=o.radius??1.55,arc=o.arc??130,dark=P.dark??'#1e085c',mid=P.mid??'#381ca8';return [
 fx(id,'cast',title(id),[
  {name:'windup nebula aura',texture:'slash',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.58,bursts:[[0,1]],max:2,at:[.32,.48,0],life:.34,
   sizeXY:[1.56,.92],sizeOverLife:{curve:[[0,.72],[.2,1],[.8,.95],[1,.35]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,P.light],[.5,mid],[1,dark]],a:[[0,0],[.1,1],[.78,.92],[1,0]]},order:0},
  {name:'windup astral blade',texture:'slash',align:'velocity',velocity:{min:[.02,0,0],max:[.02,0,0]},blend:'alpha',alpha:.95,bursts:[[0,1]],max:2,at:[.30,.48,0],life:.32,
   sizeXY:[1.28,.74],sizeOverLife:{curve:[[0,.76],[.2,1],[.78,.92],[1,.3]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#ffffff'],[.35,P.spark],[.75,P.light],[1,mid]],a:[[0,0],[.1,1],[.76,.94],[1,0]]},order:1},
  L.glints(P,{count:6,shape:{type:'circle',radius:R*.68,thickness:.18,arc,arcMode:'burstSpread'},rot:[0,-arc/2,0],at:[.10,.44,0],size:[.18,.32]}),
  L.embers(P,{at:[.20,.42,0],count:14,radius:.35,speed:[.6,1.8]})],o),
 fx(id,'cast.ground',title(id)+' · arc',[
  {name:'windup ground crescent glow',texture:'slash',align:'velocity',velocity:{min:[.01,0,0],max:[.01,0,0]},blend:'alpha',alpha:.32,bursts:[[0,1]],max:2,at:[R*.36,0,0],life:.34,
   sizeXY:[1.72,1.02],sizeOverLife:{curve:[[0,.8],[.2,1],[.82,.94],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,P.light],[.5,mid],[1,dark]],a:[[0,0],[.12,1],[.8,.9],[1,0]]},order:-1}],o),
 fx(id,'detonate',title(id)+' · strike',[
  L.smoke(P,{name:'trailing stardust nebula',at:[-.28,.24,0],shape:{type:'box',box:[.92,.14,.48]},count:8,size:[.38,.62],life:[.38,.60],speed:[.15,.40],gravity:-.10,alpha:.44,color:['#4828b8','#281078'],order:-2}),
  {name:'cleave violet nebula aura',texture:'slash',align:'velocity',velocity:{min:[.03,0,0],max:[.03,0,0]},blend:'alpha',alpha:.74,bursts:[[0,2]],max:4,at:[R*.40,.46,0],life:.48,
   sizeXY:[2.40,1.48],sizeOverLife:{curve:[[0,.76],[.16,1.02],[.80,.96],[1,.38]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#4c28d8'],[.48,mid],[1,dark]],a:[[0,0],[.08,1],[.80,.94],[1,0]]},order:0},
  {name:'cleave royal astral ribbon',texture:'slash',align:'velocity',velocity:{min:[.03,0,0],max:[.03,0,0]},blend:'alpha',alpha:.96,bursts:[[0,2]],max:4,at:[R*.46,.46,0],life:.45,
   sizeXY:[2.14,1.26],sizeOverLife:{curve:[[0,.78],[.16,1],[.78,.94],[1,.34]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#2468ff'],[.46,mid],[1,dark]],a:[[0,0],[.08,1],[.78,.96],[1,0]]},order:1},
  {name:'cleave inner curved ribbon',texture:'slash',align:'velocity',velocity:{min:[.025,0,0],max:[.025,0,0]},blend:'alpha',alpha:.94,bursts:[[0,2]],max:4,at:[R*.22,.45,0],life:.44,
   sizeXY:[1.66,.92],sizeOverLife:{curve:[[0,.78],[.18,1],[.76,.92],[1,.32]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,P.spark],[.42,P.light],[1,mid]],a:[[0,0],[.08,1],[.76,.94],[1,0]]},order:2},
  {name:'cleave cyan-white leading edge',texture:'slash',align:'velocity',velocity:{min:[.03,0,0],max:[.03,0,0]},blend:'alpha',alpha:.98,bursts:[[0,2]],max:4,at:[R*.50,.46,0],life:.43,
   sizeXY:[1.88,.64],sizeOverLife:{curve:[[0,.80],[.18,1],[.76,.92],[1,.30]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,'#d8fbff'],[.36,P.spark],[.76,P.light],[1,mid]],a:[[0,0],[.08,1],[.74,.95],[1,0]]},order:3},
  {name:'arc crystal shards',texture:'shard',blend:'alpha',alpha:.98,bursts:[[0,16]],max:20,
   at:[R*.10,.46,0],rot:[0,-arc/2,0],shape:{type:'circle',radius:R*.70,thickness:.38,arc,arcMode:'burstSpread'},
   life:[.38,.58],speed:[.4,1.4],spherical:.25,drag:2.2,gravity:.6,rotation:[0,6.28],spin:[-3.5,3.5],
   sizeXY:[[.16,.24],[.26,.38]],sizeOverLife:{curve:[[0,.84],[.18,1],[.82,.94],[1,.25]]},
   color:['#8c6cff','#6240e8'],intensity:1.0,
   colorOverLife:{c:[[0,'#bca8ff'],[.34,'#6c44ec'],[.74,'#381ca8'],[1,'#180650']],a:[[0,0],[.08,1],[.82,.96],[1,0]]},order:4},
  {name:'trailing crystal shards',texture:'shard',blend:'alpha',alpha:.96,bursts:[[0,6]],max:8,
   at:[-.34,.24,0],shape:{type:'box',box:[.88,.18,.52]},
   life:[.36,.56],speed:[.3,1.0],drag:2.0,gravity:.5,rotation:[0,6.28],spin:[-3,3],
   sizeXY:[[.14,.20],[.22,.32]],sizeOverLife:{curve:[[0,.82],[.18,1],[.80,.92],[1,.25]]},
   color:['#8c6cff','#6240e8'],intensity:1.0,
   colorOverLife:{c:[[0,'#bca8ff'],[.36,'#6c44ec'],[.76,'#381ca8'],[1,'#180650']],a:[[0,0],[.08,1],[.80,.94],[1,0]]},order:4},
  L.glints(P,{name:'astral starlight flares',at:[R*.12,.48,0],count:11,shape:{type:'circle',radius:R*.68,thickness:.30,arc,arcMode:'burstSpread'},rot:[0,-arc/2,0],
   size:[.26,.44],life:[.28,.48],color:'#ffffff',
   colorOverLife:{c:[[0,'#ffffff'],[.45,P.spark],[1,P.light]],a:[[0,0],[.14,1],[.82,.96],[1,0]]},order:5}),
  L.glints(P,{name:'trailing starlight flares',at:[-.32,.24,0],count:5,shape:{type:'box',box:[.85,.16,.48]},
   size:[.22,.36],life:[.28,.46],color:'#ffffff',
   colorOverLife:{c:[[0,'#ffffff'],[.45,P.spark],[1,P.light]],a:[[0,0],[.14,1],[.82,.96],[1,0]]},order:5}),
  L.sparks(P,{name:'cleave energy streaks',at:[.28,.46,0],count:20,spread:arc*.42,speed:[4.8,9.6],gravity:1.8,
   sizeXY:[[.040,.066],[.14,.24]],color:'#ffffff',
   colorOverLife:{c:[[0,P.spark],[.42,P.light],[1,mid]],a:[[0,1],[.74,.92],[1,0]]},order:3}),
  L.embers(P,{name:'stardust motes',at:[.05,.36,0],shape:{type:'box',box:[1.35,.28,.85]},count:22,size:[.055,.092],speed:[.4,1.4]})],o),
 fx(id,'detonate.ground',title(id)+' · strike ground',[
  {name:'cleave ground crescent glow',texture:'slash',align:'velocity',velocity:{min:[.01,0,0],max:[.01,0,0]},blend:'alpha',alpha:.38,bursts:[[0,1]],max:2,at:[R*.42,0,0],life:.48,
   sizeXY:[2.24,1.34],sizeOverLife:{curve:[[0,.84],[.18,1],[.82,.94],[1,0]]},color:'#ffffff',intensity:1.0,
   colorOverLife:{c:[[0,P.light],[.48,mid],[1,dark]],a:[[0,0],[.10,1],[.80,.92],[1,0]]},order:-2}],o)];}
