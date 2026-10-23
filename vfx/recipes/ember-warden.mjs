// Ember Warden — fire, in the EMBER palette (MAGMA for her Seismic Slam). Flame Fan is hand-built for the
// reference look: a roaring fan of fire and sparks from her hands over a burning rune circle. The other skills
// start from the shared kits and add fire layers on top.
// Origins: the caster's feet (cast) or the target's feet (impact/detonation); +X is the aim. ".ground" lies flat.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import * as K from '../../scripts/vfx/lib/kits.mjs';
import {EMBER as P,MAGMA} from '../../scripts/vfx/lib/palettes.mjs';
const HAND=[.28,.62,0],FLIGHT=.8;
export default [
 ...K.swing('ember-warden.attack.swing',P,{extra:{'':[
  L.flames(P,{at:[.45,.45,0],count:6,size:.36,radius:.16,speed:[.4,.95]}),
  L.glow(L.flames(P,{name:'swing flame core',at:[.45,.45,0],count:4,size:.25,radius:.12,speed:[.5,1.1]}),1.1),
  L.embers(P,{at:[.45,.5,0],count:8,radius:.22})]}}),

 // Flame Fan — 3/4/5 fire bolts (rank) poured out in a fan.
 {id:'ember-warden.flame-fan.cast',name:'Flame Fan · cast',emitters:[
  L.flash(P,{name:'hand flash',at:HAND,size:1.6,intensity:3.4,life:.22}),
  L.flash(P,{name:'hand core',at:HAND,size:.68,intensity:5,life:.14}),
  L.stream(P,{name:'fire fan',at:HAND,count:0,rate:180,duration:.18,spread:28,speed:[5.8,11.2],drag:2.2,life:[.16,.26],sizeXY:[[.58,.86],[.76,1.12]]}),
  L.glow(L.stream(P,{name:'fire fan core',at:HAND,count:0,rate:145,duration:.18,spread:22,speed:[6.2,11.8],drag:2.2,life:[.14,.24],sizeXY:[[.42,.66],[.58,.9]]}),1.25),
  L.wispStream(P,{name:'fire fan wisps',at:HAND,rate:115,duration:.16,spread:25,speed:[6.5,12],drag:2,life:[.14,.22],sizeXY:[[.46,.7],[.65,.98]],intensity:1.8}),
  L.core(P,{name:'fan heat',local:false,at:[1.1,.5,0],shape:{type:'box',box:[1.6,.2,.6]},rate:40,duration:.18,life:[.18,.28],size:[.7,1],intensity:.65}),
  L.sparks(P,{name:'fan sparks',at:HAND,count:75,spread:34,speed:[5.5,12.5],gravity:2.6,turbulence:1.5}),
  L.sparks(P,{name:'spill sparks',at:HAND,count:24,spread:70,speed:[2,5],gravity:5.5,life:[.3,.7]}),
  L.flames(P,{name:'hand flames',at:HAND,count:8,radius:.08,size:.34,speed:[.6,1.4]}),
  L.glow(L.flames(P,{name:'hand flames core',at:HAND,count:6,radius:.05,size:.24,speed:[.7,1.5]}),1.15),
  L.glints(P,{name:'hand glints',at:HAND,count:3,radius:.1,size:.55}),
  L.embers(P,{name:'drift embers',at:HAND,count:30,shape:{type:'cone',angle:40,radius:.1},rot:[0,0,-90],speed:[1,3.4]}),
  L.smoke(P,{name:'smoke',at:[.6,.75,0],count:4,size:.5,alpha:.24,delay:.14})]},
 {id:'ember-warden.flame-fan.cast.ground',name:'Flame Fan · burning circle',emitters:[
  ...L.magicCircle(P,{name:'burning circle',radius:1.35,duration:.54,spin:1.9,count:48}),
  L.slashDecal(P,{name:'fan outer arc',radius:2.25,arc:72,life:.56}),
  L.slashDecal(P,{name:'fan inner arc',radius:1.75,arc:68,life:.52}),
  L.pool(P,{name:'heat',radius:1.2,life:.65,intensity:.75})]},
 {id:'ember-warden.flame-fan.cast.rim',name:'Flame Fan · rim fire',emitters:[
  L.flames(P,{name:'rim flames',shape:{type:'circle',radius:1.34,thickness:0},rate:56,duration:.46,size:.3,speed:[.4,1.05],gravity:-2,turbulence:1.15,alpha:.85}),
  L.glow(L.flames(P,{name:'rim flame core',shape:{type:'circle',radius:1.34,thickness:0},rate:38,duration:.46,size:.22,speed:[.45,1.15],gravity:-2,turbulence:1.1}),.9),
  L.embers(P,{name:'rim embers',shape:{type:'circle',radius:1.35,thickness:0},rate:64,duration:.52,count:0,speed:[.35,1.05],gravity:-1.5,turbulence:1.5})]},
 {id:'ember-warden.flame-fan.bolt',name:'Flame Fan · fire bolt',emitters:[
  L.comet(P,{name:'head',at:[0,.55,0],size:.56,intensity:2.6,life:FLIGHT+.2}),
  L.flames(P,{name:'bolt flame',at:[0,.55,0],local:true,rate:72,count:0,duration:FLIGHT,life:[.08,.15],size:.44,speed:[.08,.25],radius:.04,rotation:[0,6.28],spin:[-4,4],alpha:.94}),
  L.glow(L.flames(P,{name:'bolt flame core',at:[0,.55,0],local:true,rate:54,count:0,duration:FLIGHT,life:[.07,.13],size:.32,speed:[.06,.2],radius:.03,rotation:[0,6.28]}),1.4),
  L.core(P,{name:'core',at:[0,.55,0],size:.54,rate:55,duration:FLIGHT,intensity:2.9}),
  L.wake(P,{name:'flame wake',at:[0,.55,0],rate:110,size:.28,life:[.09,.18],speed:[.04,.18],duration:FLIGHT}),
  L.glow(L.wake(P,{name:'hot wake',at:[0,.55,0],rate:80,size:.2,life:[.08,.15],speed:[.04,.15],duration:FLIGHT}),1.2),
  L.wake(P,{name:'ember wake',at:[0,.55,0],flame:false,rate:85,duration:FLIGHT})]},
 {id:'ember-warden.flame-fan.impact',name:'Flame Fan · impact',emitters:[
  L.flash(P,{at:[0,.5,0],size:1.55,intensity:3.6}),
  L.stream(P,{name:'impact tongues',at:[0,.45,0],count:14,spread:68,speed:[2.8,6.2],drag:2.8,life:[.18,.32],sizeXY:[[.42,.64],[.54,.82]]}),
  L.glow(L.stream(P,{name:'impact core tongues',at:[0,.45,0],count:10,spread:58,speed:[3.2,6.8],drag:2.8,life:[.16,.28],sizeXY:[[.32,.48],[.42,.68]]}),1.25),
  L.wispStream(P,{name:'impact wisps',at:[0,.45,0],count:10,spread:64,speed:[3.5,7.2],drag:2.4,life:[.15,.26],sizeXY:[[.36,.54],[.48,.76]]}),
  L.flames(P,{at:[0,.35,0],count:10,shape:{type:'sphere',radius:.16},spherical:1,speed:[.8,2],size:.4}),
  L.glow(L.flames(P,{name:'impact flame core',at:[0,.38,0],count:7,shape:{type:'sphere',radius:.12},spherical:1,speed:[.9,2.2],size:.28}),1.2),
  L.glints(P,{at:[0,.5,0],count:2,radius:.1,size:.48}),
  L.sparks(P,{at:[0,.5,0],count:52,spread:90,rot:[0,0,0],shape:{type:'sphere',radius:.05},spherical:1,speed:[3,8.5],gravity:5.5}),
  L.embers(P,{at:[0,.5,0],count:18,radius:.26}),
  L.smoke(P,{at:[0,.6,0],count:2,size:.45,alpha:.24,delay:.08})]},
 {id:'ember-warden.flame-fan.impact.ground',name:'Flame Fan · scorch',emitters:[
  L.shockRing(P,{radius:.8,life:.32}),L.scorch(P,{radius:.55,life:1.4}),L.pool(P,{radius:.6,life:.4})]},

 // Cinder Step — a burning lunge that leaves fire standing in its path.
 ...K.dash('ember-warden.cinder-step',P,{reach:1.5,radius:1.35,extra:{
  cast:[
   L.flames(P,{name:'path fire',at:[.75,0,0],shape:{type:'box',box:[1.5,0,.3]},count:0,rate:60,duration:.4,size:.44,speed:[.5,1.3],gravity:-2,turbulence:1.1}),
   L.glow(L.flames(P,{name:'path fire core',at:[.75,0,0],shape:{type:'box',box:[1.5,0,.24]},count:0,rate:42,duration:.38,size:.32,speed:[.6,1.4],gravity:-2.1}),1.2)],
  'cast.ground':[L.groundArcs(P,{at:[.75,0,0],shape:{type:'box',box:[1.5,0,.3]},rate:20,duration:.35,size:.24})]}}),

 // Ember Snare — a burning particle circle charges under the target and erupts into a pillar of fire.
 ...K.trap('ember-warden.ember-snare',P,{radius:1.5,charge:.64,power:4.5,extra:{
  detonate:[
   L.flames(P,{name:'fire column',at:[0,.15,0],shape:{type:'circle',radius:.34},count:18,size:.56,speed:[2.2,4.8],gravity:-2.6,turbulence:.85}),
   L.glow(L.flames(P,{name:'fire column core',at:[0,.18,0],shape:{type:'circle',radius:.24},count:14,size:.42,speed:[2.5,5.2],gravity:-2.8,turbulence:.75}),1.25),
   L.flames(P,{name:'column crown',at:[0,.45,0],shape:{type:'circle',radius:.28},count:12,size:.48,speed:[1.8,4],gravity:-2.4,turbulence:.9}),
   L.glow(L.flames(P,{name:'column crown core',at:[0,.48,0],shape:{type:'circle',radius:.2},count:9,size:.34,speed:[2,4.2],gravity:-2.5,turbulence:.8}),1.2)],
  'detonate.ground':[L.groundArcs(P,{radius:1.5,duration:.3})]}}),

 // Seismic Slam, molten: the shared slam re-skinned with magma, flames and glowing cinders.
 ...K.slam('ember-warden.shockwave',MAGMA,{radius:1.65,charge:.46,molten:true,dust:'#3a2a24',scar:'#1a100c'}),
];
