// Ember Warden — fire, in the EMBER palette (MAGMA for her Seismic Slam). Flame Fan is hand-built for the
// reference look: a roaring fan of fire and sparks from her hands over a burning rune circle. The other skills
// start from the shared kits and add fire layers on top.
// Origins: the caster's feet (cast) or the target's feet (impact/detonation); +X is the aim. ".ground" lies flat.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import * as K from '../../scripts/vfx/lib/kits.mjs';
import {EMBER as P,MAGMA} from '../../scripts/vfx/lib/palettes.mjs';
const HAND=[.28,.62,0],FLIGHT=.8;
export default [
 ...K.swing('ember-warden.attack.swing',P,{extra:{'':[L.flames(P,{at:[.45,.45,0],count:4,size:.35,radius:.15,speed:[.3,.8]}),L.embers(P,{at:[.45,.5,0],count:6,radius:.2})]}}),

 // Flame Fan — 3/4/5 fire bolts (rank) poured out in a fan.
 {id:'ember-warden.flame-fan.cast',name:'Flame Fan · cast',emitters:[
  L.flash(P,{name:'hand flash',at:HAND,size:1.7,intensity:3.4,life:.24}),
  L.flash(P,{name:'hand core',at:HAND,size:.7,intensity:5,life:.12}),
  L.stream(P,{name:'fire fan',at:HAND,count:0,rate:120,duration:.16,spread:28,speed:[10,16],drag:1.2,life:[.18,.3],sizeXY:[[.17,.24],[.36,.55]],sizeOverLife:{curve:[[0,.45],[.3,1],[1,.9]]}}),
  L.glow(L.stream(P,{name:'fire fan core',at:HAND,count:0,rate:90,duration:.16,spread:22,speed:[10,15],drag:1.2,life:[.16,.26],sizeXY:[[.12,.16],[.3,.42]]}),.9),
  L.core(P,{name:'fan heat',local:false,at:[1.1,.5,0],shape:{type:'box',box:[1.6,.2,.6]},rate:40,duration:.2,life:[.22,.35],size:[.7,1],intensity:.6}),
  L.sparks(P,{name:'fire lines',at:HAND,count:44,spread:26,speed:[11,17],drag:1.5,gravity:0,life:[.16,.28],sizeXY:[[.04,.07],[.8,1.5]],intensity:2.4}),
  L.sparks(P,{name:'fan sparks',at:HAND,count:70,spread:34,speed:[6,13],gravity:3}),
  L.sparks(P,{name:'spill sparks',at:HAND,count:22,spread:75,speed:[2,5],gravity:6,life:[.3,.7]}),
  L.flames(P,{name:'hand flames',at:HAND,count:4,radius:.05,size:.24,speed:[.6,1.4]}),
  L.glints(P,{name:'hand glints',at:HAND,count:3,radius:.1,size:.6}),
  L.embers(P,{name:'drift embers',at:HAND,count:26,shape:{type:'cone',angle:40,radius:.1},rot:[0,0,-90],speed:[1,3.2]}),
  L.smoke(P,{name:'smoke',at:[.6,.75,0],count:4,size:.5,alpha:.32,delay:.14})]},
 {id:'ember-warden.flame-fan.cast.ground',name:'Flame Fan · burning circle',emitters:[
  L.sigil(P,{name:'rune circle',radius:1.35,hold:.4,spin:1.6}),
  L.glow(L.sigil(P,{name:'rune circle',radius:1.35,hold:.4,spin:1.6}),.7),
  L.sigil(P,{name:'inner rune',radius:.8,hold:.35,spin:-2.6,intensity:1.3,rotation:.4}),
  L.ring(P,{name:'outer ring',radius:1.6,life:.6,intensity:2.2}),
  L.pool(P,{name:'heat',radius:1.15,life:.65}),
  L.groundArcs(P,{name:'rim crackle',radius:1.35,rate:80,duration:.5,size:.5})]},
 {id:'ember-warden.flame-fan.cast.rim',name:'Flame Fan · rim fire',emitters:[
  L.flames(P,{name:'rim flames',shape:{type:'circle',radius:1.33,thickness:0},rate:44,duration:.45,size:.24,speed:[.3,.9]}),
  L.embers(P,{name:'rim embers',shape:{type:'circle',radius:1.35,thickness:0},rate:50,duration:.5,count:0,speed:[.3,.9]})]},
 {id:'ember-warden.flame-fan.bolt',name:'Flame Fan · fire bolt',emitters:[
  L.comet(P,{name:'head',at:[0,.55,0],size:.5,life:FLIGHT+.2}),
  L.core(P,{name:'core',at:[0,.55,0],size:.5,rate:40,duration:FLIGHT,intensity:2.6}),
  L.wake(P,{name:'flame wake',at:[0,.55,0],rate:45,size:.22,duration:FLIGHT}),
  L.wake(P,{name:'ember wake',at:[0,.55,0],flame:false,rate:70,duration:FLIGHT})]},
 {id:'ember-warden.flame-fan.impact',name:'Flame Fan · impact',emitters:[
  L.flash(P,{at:[0,.5,0],size:1.6,intensity:3.6}),
  L.flames(P,{at:[0,.35,0],count:6,shape:{type:'sphere',radius:.15},spherical:1,speed:[.8,2],size:.34}),
  L.glints(P,{at:[0,.5,0],count:2,radius:.1,size:.5}),
  L.sparks(P,{at:[0,.5,0],count:50,spread:90,rot:[0,0,0],shape:{type:'sphere',radius:.05},spherical:1,speed:[3,8],gravity:6}),
  L.embers(P,{at:[0,.5,0],count:14,radius:.25}),
  L.smoke(P,{at:[0,.6,0],count:2,size:.45,alpha:.3,delay:.08})]},
 {id:'ember-warden.flame-fan.impact.ground',name:'Flame Fan · scorch',emitters:[
  L.shockRing(P,{radius:.8,life:.32}),L.scorch(P,{radius:.55,life:1.4}),L.pool(P,{radius:.6,life:.4})]},

 // Cinder Step — a burning lunge that leaves fire standing in its path.
 ...K.dash('ember-warden.cinder-step',P,{reach:1.5,radius:1.35,extra:{
  cast:[L.flames(P,{name:'path fire',at:[.75,0,0],shape:{type:'box',box:[1.5,0,.3]},count:0,rate:50,duration:.4,size:.5,speed:[.4,1.2]})],
  'cast.ground':[L.groundArcs(P,{at:[.75,0,0],shape:{type:'box',box:[1.5,0,.3]},rate:40,duration:.35,size:.45})]}}),

 // Ember Snare — a sun rune charges under the target and erupts into a pillar of fire.
 ...K.trap('ember-warden.ember-snare',P,{radius:1.5,charge:.64,sigil:'sigil-sun',power:5,extra:{
  detonate:[L.stream(P,{name:'fire column',at:[0,.1,0],rot:[0,0,0],spread:10,count:16,speed:[5,9],drag:2.2,sizeXY:[[.2,.28],[.5,.75]]}),
   L.glow(L.stream(P,{name:'fire column core',at:[0,.1,0],rot:[0,0,0],spread:8,count:12,speed:[6,10],drag:2.2,sizeXY:[[.14,.2],[.4,.6]]}),.9),
   L.flames(P,{name:'column flames',at:[0,.3,0],shape:{type:'cone',angle:10,radius:.3},count:7,size:.55,speed:[2,4]})],
  'detonate.ground':[L.groundArcs(P,{radius:1.2,thickness:1,rate:90,duration:.3,size:.6})]}}),

 // Seismic Slam, molten: the shared slam re-skinned with magma, flames and glowing cinders.
 ...K.slam('ember-warden.shockwave',MAGMA,{radius:1.65,charge:.46,molten:true,dust:'#3a2a24',scar:'#1a100c'}),
];
