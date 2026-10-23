// Rift Runner — arcane rifts in the RIFT palette, all from the shared kits.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import * as K from '../../scripts/vfx/lib/kits.mjs';
import {RIFT as P} from '../../scripts/vfx/lib/palettes.mjs';
export default [
 ...K.swing('rift-runner.attack.swing',P),
 ...K.projectile('rift-runner.rift-bolt',P,{flight:1,extra:{
  bolt:[L.shards(P,{at:[0,.62,0],local:false,rate:24,bursts:[],duration:1,max:16,speed:[.4,1],life:[.2,.35]})],
  impact:[L.shards(P,{at:[0,.5,0],count:10,speed:[2.5,5]}),L.arcs(P,{at:[0,.5,0],radius:.3,thickness:1,rate:60,duration:.15,size:.4})]}}),
 ...K.dash('rift-runner.rift-dash',P,{reach:1.5,flame:false}),
 ...K.trap('rift-runner.rift-trap',P,{radius:1.45,charge:.64,rimFlames:false,flames:false,rock:false,power:3.5,extra:{
  detonate:[L.vortex(P,{radius:1.4,rate:0,bursts:[[0,60]],max:64,duration:.1,lift:.4,swirl:6,pull:-6,life:[.25,.4]}),
   L.arcs(P,{radius:.9,thickness:1,rate:90,duration:.25,size:.8,at:[0,.4,0]}),L.shards(P,{at:[0,.4,0],count:16,speed:[3,7]})]}}),
];
