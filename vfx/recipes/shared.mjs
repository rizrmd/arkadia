// Effects every hero inherits: hits, healing, level-ups, auto-cast combos and the two shared skills
// (Astral Cleave, Seismic Slam). Heroes override any of them in their own recipe and FX profile.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import * as K from '../../scripts/vfx/lib/kits.mjs';
import {ASTRAL,BLOOD,GOLD,LIFE,RIFT,EMBER,SEISMIC,STEEL} from '../../scripts/vfx/lib/palettes.mjs';
const HIT=[0,.5,0],burst=(P,o={})=>L.sparks(P,{at:HIT,rot:[0,0,0],spread:90,shape:{type:'sphere',radius:.06},spherical:1,...o});
export default [
 {id:'shared.hit.normal',name:'Hit · normal',emitters:[L.flash(STEEL,{at:HIT,size:.8,intensity:2.6,life:.14}),burst(STEEL,{count:14,speed:[2,5],gravity:4,life:[.15,.3]}),L.glints(STEEL,{at:HIT,count:1,radius:.05,size:.4})]},
 {id:'shared.hit.crit',name:'Hit · critical',emitters:[L.flash(GOLD,{at:HIT,size:1.8,intensity:4,life:.2}),L.flash(BLOOD,{at:HIT,size:1.1,intensity:3,life:.26,delay:.03}),
  L.glints(GOLD,{at:HIT,count:2,radius:.05,size:1.1,life:[.3,.4]}),burst(GOLD,{count:30,speed:[3,8],gravity:5}),burst(BLOOD,{count:16,speed:[2,5],gravity:7,life:[.3,.5]}),
  L.radialSkim(GOLD,{at:[0,.45,0],count:18,radius:.1,speed:[4,6]})]},
 {id:'shared.hit.crit.ground',name:'Hit · critical ground',emitters:[L.shockRing(GOLD,{radius:.7,life:.3}),L.pool(BLOOD,{radius:.5,life:.3})]},
 {id:'shared.hit.incoming',name:'Hit · hero wounded',emitters:[L.flash(BLOOD,{at:HIT,size:1,intensity:2.6,life:.16}),burst(BLOOD,{count:14,speed:[2,5],gravity:7,life:[.2,.4]})]},
 {id:'shared.hit.fire',name:'Hit · fire',emitters:[L.flash(EMBER,{at:HIT,size:1,intensity:3,life:.16}),burst(EMBER,{count:18,speed:[2.2,6.5],gravity:4}),
  L.flames(EMBER,{at:[0,.35,0],count:6,size:.38,radius:.14,speed:[.5,1.4]}),
  L.glow(L.flames(EMBER,{name:'hit flame core',at:[0,.38,0],count:4,size:.26,radius:.1,speed:[.6,1.6]}),1.15),
  L.embers(EMBER,{at:HIT,count:8,radius:.16})]},
 {id:'shared.hit.arcane',name:'Hit · arcane',emitters:[L.flash(RIFT,{at:HIT,size:1,intensity:3,life:.16}),burst(RIFT,{count:12,speed:[2,6],gravity:1}),L.shards(RIFT,{at:HIT,count:6,speed:[2,4]})]},
 {id:'shared.hit.seismic',name:'Hit · seismic',emitters:[L.flash(SEISMIC,{at:HIT,size:.9,intensity:2.6,life:.14}),burst(SEISMIC,{count:10,speed:[2,5],gravity:6}),
  L.smoke(SEISMIC,{at:[0,.3,0],count:2,size:.4,alpha:.3})]},
 {id:'shared.heal',name:'Heal',emitters:[L.vortex(LIFE,{radius:.45,rate:40,duration:.5,lift:1.4,swirl:3,pull:-.2}),L.glints(LIFE,{at:[0,.9,0],count:3,radius:.35,size:.35}),L.flash(LIFE,{at:[0,.5,0],size:1,intensity:1.8,life:.3})]},
 {id:'shared.level-up',name:'Level up · light',emitters:[L.flash(GOLD,{at:[0,.6,0],size:2.4,intensity:3.4,life:.35}),
  L.pillar(GOLD,{radius:.3,rate:40,duration:.8,power:5,intensity:2}),L.vortex(GOLD,{radius:.8,rate:70,duration:1,lift:1.8,swirl:3.4,pull:-.5}),
  L.glints(GOLD,{at:[0,1.1,0],count:10,radius:.7,size:.45,life:[.5,.9]}),L.embers({...GOLD,spark:'#bff6ff'},{at:[0,.4,0],count:24,radius:.5,gravity:-2.2,speed:[.5,1.5]})]},
 {id:'shared.level-up.ground',name:'Level up · rune',emitters:[
  ...L.magicCircle(GOLD,{name:'level-up circle',radius:1.25,duration:1.1,spin:1.6,count:64}),
  ...L.magicCircle({...GOLD,light:'#7ce8ff'},{name:'level-up outer circle',radius:1.75,duration:.95,spin:-1.4,count:56,delay:.14}),
  L.pool(GOLD,{radius:1,life:1.2})]},
 {id:'shared.combo.dual.ground',name:'Dual auto-cast',emitters:[
  ...L.magicCircle(GOLD,{name:'dual gold circle',radius:1.35,duration:.55,spin:2.2,count:56}),
  ...L.magicCircle(RIFT,{name:'dual rift circle',radius:1.65,duration:.6,spin:-2.4,count:56,delay:.06})]},
 {id:'shared.combo.trinity.ground',name:'Trinity auto-cast',emitters:[
  ...L.magicCircle(GOLD,{name:'trinity gold circle',radius:1.35,duration:.65,spin:2.4,count:60}),
  ...L.magicCircle(RIFT,{name:'trinity rift circle',radius:1.7,duration:.7,spin:-2.6,count:60,delay:.06}),
  ...L.magicCircle(EMBER,{name:'trinity ember circle',radius:2.0,duration:.75,spin:2.8,count:64,delay:.12})]},
 {id:'shared.combo.trinity',name:'Trinity auto-cast · sparks',emitters:[L.radialSkim(GOLD,{count:36,radius:.4,speed:[5,8]}),L.glints(GOLD,{at:[0,.8,0],count:6,radius:.6,size:.5})]},
 ...K.swing('shared.attack.swing',STEEL),
 ...K.cleave('shared.cleave',ASTRAL,{radius:1.55}),
 ...K.slam('shared.shockwave',SEISMIC,{radius:1.65,charge:.46}),
];
