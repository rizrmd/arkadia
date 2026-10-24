// Choose Your Hero highlights (src/stronghold/choose-hero-fx.ts): selection and button effects drawn over the UI, not
// the world. Each effect is authored in its control's own frame, centred on the origin with +Y up, and the screen
// stretches that frame onto the control's box: a card is 3 × 4 units (rails about ±1.29, ±1.72), the Begin Journey
// button 4.8 × 1.2 units (face ±2.0, ±.36; centre finials at ±.55 on Y). Everything is additive light on dark frames.
import * as L from '../../scripts/vfx/lib/layers.mjs';
import {EMBER,GOLD,RIFT} from '../../scripts/vfx/lib/palettes.mjs';
const CARD={x:1.29,y:1.72},BUTTON={x:2,y:.36};
// Thin boxes along a frame's four rails: glints and motes trace the outline instead of filling the face.
const rails=(f,layer,o={})=>[
 {at:[0,f.y,0],box:[f.x*2,.04,.04]},{at:[0,-f.y,0],box:[f.x*2,.04,.04]},
 {at:[-f.x,0,0],box:[.04,f.y*2,.04]},{at:[f.x,0,0],box:[.04,f.y*2,.04]},
].map((r,i)=>layer({...o,at:r.at,shape:{type:'box',box:r.box,emitFrom:'volume'},name:`${o.name??'rail'} ${i+1}`}));
const omni={shape:{type:'sphere',radius:.12},spherical:1,rot:[0,0,0]};
// World layers are sized for ground tiles; on a card or button their motes would be a few pixels, so UI sizes run larger.
const MOTE=[.14,.28],STREAK=[[.08,.14],[.5,.9]];
const select=(id,P,extra=[])=>({id,name:`Choose Your Hero · select ${id.split('.').pop()}`,emitters:[
 L.flash(P,{at:[0,-.3,0],size:3.2,intensity:1.2,life:.32}),
 L.flash(GOLD,{at:[0,CARD.y,0],size:1.4,intensity:1.6,life:.24}),L.flash(GOLD,{at:[0,-CARD.y,0],size:1.4,intensity:1.6,life:.24,delay:.04}),
 ...rails(CARD,o=>L.glints(GOLD,{count:4,size:.34,life:[.3,.6],intensity:1.8,...o}),{name:'rail glint'}),
 L.sparks(P,{...omni,at:[0,-.4,0],count:28,speed:[2.5,6],gravity:3,drag:2.6,life:[.3,.7],intensity:1.8,sizeXY:STREAK}),
 L.embers(P,{at:[0,-1.2,0],count:22,radius:1.1,gravity:-1.6,turbulence:1.2,intensity:2,size:MOTE}),
 ...extra]});
// Looping while a card stays selected (replayed when it ends): a few element motes rising inside the frame, and
// occasional glints on its rails.
const aura=(id,P)=>({id,name:`Choose Your Hero · selected aura ${id.split('.').pop()}`,emitters:[
 L.embers(P,{at:[0,-1.1,0],shape:{type:'box',box:[2.2,.6,.1],emitFrom:'volume'},rate:12,duration:2.4,count:0,gravity:-.9,turbulence:1,intensity:2,size:MOTE}),
 ...rails(CARD,o=>L.glints(GOLD,{bursts:[[.25,1],[1.3,1]],count:2,size:.26,life:[.35,.6],intensity:1.5,...o}),{name:'aura glint'}),
]});
export default [
 select('ui.card.select.ember-warden',EMBER,[L.embers(EMBER,{at:[0,-1.6,0],shape:{type:'box',box:[2.4,.1,.1],emitFrom:'volume'},count:16,gravity:-2.4,turbulence:1.6,intensity:2,size:MOTE})]),
 select('ui.card.select.rift-runner',RIFT,[L.shards(RIFT,{at:[0,-.4,0],count:10,speed:[2,4.5],gravity:1}),L.arcs(RIFT,{at:[0,-.4,0],radius:.9,rate:30,duration:.3,size:.5})]),
 aura('ui.card.aura.ember-warden',EMBER),
 aura('ui.card.aura.rift-runner',RIFT),
 // Hover on an unselected card: a light trace of glints along its rails.
 {id:'ui.card.hover',name:'Choose Your Hero · card hover',emitters:rails(CARD,o=>L.glints(GOLD,{count:3,size:.32,life:[.3,.55],intensity:1.7,...o}),{name:'hover glint'})},
 // Begin Journey while hovered or focused (replayed while it lasts): embers lifting off the red face, glints on its rails.
 {id:'ui.button.glow',name:'Choose Your Hero · button highlight',emitters:[
  L.core(EMBER,{shape:{type:'box',box:[3.2,.2,.1],emitFrom:'volume'},rate:9,duration:1.4,size:.9,intensity:.55,local:true,life:[.5,.8]}),
  L.embers(EMBER,{at:[0,-.15,0],shape:{type:'box',box:[3.6,.3,.1],emitFrom:'volume'},rate:26,duration:1.4,count:0,gravity:-.9,turbulence:1,intensity:2,size:MOTE}),
  L.glints(GOLD,{at:[0,BUTTON.y,0],shape:{type:'box',box:[3.8,.03,.03],emitFrom:'volume'},bursts:[[0,3],[.7,3]],count:6,size:.3,life:[.3,.55],intensity:1.8}),
  L.glints(GOLD,{at:[0,-BUTTON.y,0],shape:{type:'box',box:[3.8,.03,.03],emitFrom:'volume'},bursts:[[.35,3],[1.05,3]],count:6,size:.3,life:[.3,.55],intensity:1.8}),
 ]},
 // Begin Journey pressed: a flash on the face, the centre finials flaring and sparks thrown out along the rails.
 {id:'ui.button.press',name:'Choose Your Hero · button press',emitters:[
  L.flash(EMBER,{size:3.4,intensity:1.3,life:.3}),L.flash(GOLD,{at:[0,.55,0],size:1.2,intensity:2,life:.25}),L.flash(GOLD,{at:[0,-.55,0],size:1.2,intensity:2,life:.25}),
  L.sparks(GOLD,{at:[.2,0,0],spread:18,count:18,speed:[4,8],gravity:0,drag:3,life:[.2,.4],sizeXY:STREAK}),
  L.sparks(GOLD,{at:[-.2,0,0],rot:[0,0,90],spread:18,count:18,speed:[4,8],gravity:0,drag:3,life:[.2,.4],sizeXY:STREAK}),
  L.embers(EMBER,{shape:{type:'box',box:[3.6,.5,.1],emitFrom:'volume'},count:18,gravity:-1.4,intensity:2,size:MOTE}),
 ]},
];
