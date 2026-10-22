import {defineHeroFx} from '../cues';
// Ember Warden: fire versions of her swing and her own skills; Seismic Slam turns molten. Astral Cleave and the
// hit/level-up cues come from "shared". Effects: vfx/recipes/ember-warden.mjs.
const E='ember-warden/';
export default defineHeroFx({id:'ember-warden',extends:'shared',cues:{
 'attack.swing':[{effect:E+'attack.swing.ground'},{effect:E+'attack.swing'}],
 'flame-fan.cast':[{effect:E+'flame-fan.cast.ground',follow:true},{effect:E+'flame-fan.cast.rim',follow:true},{effect:E+'flame-fan.cast'}],
 'flame-fan.bolt':[{effect:E+'flame-fan.bolt'}],
 'flame-fan.impact':[{effect:E+'flame-fan.impact.ground'},{effect:E+'flame-fan.impact'}],
 'cinder-step.cast':[{effect:E+'cinder-step.cast.ground'},{effect:E+'cinder-step.cast'}],
 'cinder-step.detonate':{baseRadius:1.35,layers:[{effect:E+'cinder-step.detonate.ground',scale:'radius'},{effect:E+'cinder-step.detonate',scale:'radius'}]},
 'ember-snare.telegraph':{baseRadius:1.5,layers:[{effect:E+'ember-snare.telegraph.ground',scale:'radius'},{effect:E+'ember-snare.telegraph',scale:'radius'}]},
 'ember-snare.detonate':{baseRadius:1.5,layers:[{effect:E+'ember-snare.detonate.ground',scale:'radius'},{effect:E+'ember-snare.detonate',scale:'radius'}]},
 'shockwave.telegraph':{baseRadius:1.65,layers:[{effect:E+'shockwave.telegraph.ground',scale:'radius'},{effect:E+'shockwave.telegraph',scale:'radius'}]},
 'shockwave.detonate':{baseRadius:1.65,layers:[{effect:E+'shockwave.detonate.ground',scale:'radius'},{effect:E+'shockwave.detonate',scale:'radius'}]},
}});
