// Rift Runner — arcane rifts in the RIFT palette, all from the shared kits.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import * as K from '../../scripts/vfx/lib/kits.mjs';
import {RIFT as P} from '../../scripts/vfx/lib/palettes.mjs';
export default [
 ...K.swing('rift-runner.attack.swing',P),
 ...K.projectile('rift-runner.rift-bolt',P,{flight:1,extra:{
  bolt:[L.shards(P,{name:'bolt crystal shards',at:[0,.62,0],local:false,rate:34,bursts:[[0,5]],duration:1,max:28,speed:[.5,1.5],life:[.24,.42],
   sizeXY:[[.065,.102],[.14,.22]],color:'#ffffff',
   colorOverLife:{c:[[0,'#a472ff'],[.4,'#6c34eb'],[.8,'#4416b4'],[1,'#220864']],a:[[0,1],[.8,.95],[1,0]]},order:2})],
  impact:[
   L.shards(P,{name:'impact crystal shards',at:[0,.54,0],count:16,speed:[2.6,6.0],life:[.34,.58],
    sizeXY:[[.080,.125],[.18,.30]],color:'#ffffff',
    colorOverLife:{c:[[0,'#a472ff'],[.35,'#6c34eb'],[.72,'#4416b4'],[1,'#220864']],a:[[0,1],[.8,.96],[1,0]]},order:2}),
   L.arcs(P,{name:'impact electric arcs',at:[0,.50,0],radius:.48,thickness:.85,rate:75,bursts:[[0,10]],duration:.32,
    size:[.30,.48],life:[.10,.22],color:'#ffffff',
    colorOverLife:{c:[[0,'#eef8ff'],[.4,'#a472ff'],[.8,'#6c34eb'],[1,'#32128e']],a:[[0,1],[.8,.95],[1,0]]},order:3})]}}),
 ...K.dash('rift-runner.rift-dash',P,{reach:1.5,flame:false}),
 ...K.trap('rift-runner.rift-trap',P,{radius:1.45,charge:.64,rimFlames:false,flames:false,rock:false,power:3.5,extra:{
  detonate:[L.vortex(P,{radius:1.4,rate:0,bursts:[[0,60]],max:64,duration:.1,lift:.4,swirl:6,pull:-6,life:[.25,.4]}),
   L.arcs(P,{radius:.9,thickness:1,rate:90,duration:.25,size:.8,at:[0,.4,0]}),L.shards(P,{at:[0,.4,0],count:16,speed:[3,7]})]}}),
];
