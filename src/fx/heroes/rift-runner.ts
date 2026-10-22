import {defineHeroFx} from '../cues';
// Rift Runner: arcane swing and rift skills; everything else from "shared". Effects: vfx/recipes/rift-runner.mjs.
const R='rift-runner/';
export default defineHeroFx({id:'rift-runner',extends:'shared',cues:{
 'attack.swing':[{effect:R+'attack.swing.ground'},{effect:R+'attack.swing'}],
 'rift-bolt.cast':[{effect:R+'rift-bolt.cast.ground'},{effect:R+'rift-bolt.cast'}],
 'rift-bolt.bolt':[{effect:R+'rift-bolt.bolt'}],
 'rift-bolt.impact':[{effect:R+'rift-bolt.impact.ground'},{effect:R+'rift-bolt.impact'}],
 'rift-dash.cast':[{effect:R+'rift-dash.cast.ground'},{effect:R+'rift-dash.cast'}],
 'rift-dash.detonate':{baseRadius:1.35,layers:[{effect:R+'rift-dash.detonate.ground',scale:'radius'},{effect:R+'rift-dash.detonate',scale:'radius'}]},
 'rift-trap.telegraph':{baseRadius:1.45,layers:[{effect:R+'rift-trap.telegraph.ground',scale:'radius'},{effect:R+'rift-trap.telegraph',scale:'radius'}]},
 'rift-trap.detonate':{baseRadius:1.45,layers:[{effect:R+'rift-trap.detonate.ground',scale:'radius'},{effect:R+'rift-trap.detonate',scale:'radius'}]},
}});
