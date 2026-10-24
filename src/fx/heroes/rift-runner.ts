import {defineHeroFx} from '../cues';
// Rift Runner: Diablo-style arcane/void ShaderGraph VFX for all 5 skills + attack swing.
// Effects: vfx/recipes/rift-runner.mjs.
const R='rift-runner/';
export default defineHeroFx({id:'rift-runner',extends:'shared',cues:{
 'attack.swing':[{effect:R+'attack.swing.ground'},{effect:R+'attack.swing'}],
 'rift-bolt.cast':[{effect:R+'rift-bolt.cast'}],
 'rift-bolt.bolt':[{effect:R+'rift-bolt.bolt'}],
 'rift-bolt.impact':[{effect:R+'rift-bolt.impact'}],
 'rift-dash.cast':[{effect:R+'rift-dash.cast.ground'},{effect:R+'rift-dash.cast'}],
 'rift-dash.detonate':{baseRadius:1.35,layers:[{effect:R+'rift-dash.detonate.ground',scale:'radius'},{effect:R+'rift-dash.detonate',scale:'radius'}]},
 'rift-trap.telegraph':{baseRadius:1.45,layers:[{effect:R+'rift-trap.telegraph.ground',scale:'radius'},{effect:R+'rift-trap.telegraph',scale:'radius'}]},
 'rift-trap.detonate':{baseRadius:1.45,layers:[{effect:R+'rift-trap.detonate.ground',scale:'radius'},{effect:R+'rift-trap.detonate',scale:'radius'}]},
 'cleave.cast':{baseRadius:1.55,layers:[{effect:R+'cleave.cast.ground',scale:'radius'},{effect:R+'cleave.cast',scale:'radius'}]},
 'cleave.detonate':{baseRadius:1.55,layers:[{effect:R+'cleave.detonate.ground',scale:'radius'},{effect:R+'cleave.detonate',scale:'radius'}]},
 'shockwave.telegraph':{baseRadius:1.65,layers:[{effect:R+'shockwave.telegraph.ground',scale:'radius'},{effect:R+'shockwave.telegraph',scale:'radius'}]},
 'shockwave.detonate':{baseRadius:1.65,layers:[{effect:R+'shockwave.detonate.ground',scale:'radius'},{effect:R+'shockwave.detonate',scale:'radius'}]},
}});
