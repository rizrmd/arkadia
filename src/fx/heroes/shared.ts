import {defineHeroFx} from '../cues';
// What every hero plays unless its own profile says otherwise (effects: vfx/recipes/shared.mjs).
export default defineHeroFx({id:'shared',cues:{
 'attack.swing':[{effect:'shared/attack.swing.ground'},{effect:'shared/attack.swing'}],
 'hit.normal':[{effect:'shared/hit.normal',aim:'random'}],
 'hit.crit':[{effect:'shared/hit.crit.ground'},{effect:'shared/hit.crit',aim:'random'}],
 'hit.incoming':[{effect:'shared/hit.incoming',aim:'random'}],
 'hit.fire':[{effect:'shared/hit.fire',aim:'random'}],
 'hit.arcane':[{effect:'shared/hit.arcane',aim:'random'}],
 'hit.seismic':[{effect:'shared/hit.seismic',aim:'random'}],
 'heal':[{effect:'shared/heal',follow:true}],
 'level-up':[{effect:'shared/level-up.ground',follow:true},{effect:'shared/level-up',follow:true}],
 'combo.dual':[{effect:'shared/combo.dual.ground',follow:true}],
 'combo.trinity':[{effect:'shared/combo.trinity.ground',follow:true},{effect:'shared/combo.trinity',follow:true}],
 'cleave.cast':{baseRadius:1.55,layers:[{effect:'shared/cleave.cast.ground',scale:'radius'},{effect:'shared/cleave.cast',scale:'radius'}]},
 'cleave.detonate':{baseRadius:1.55,layers:[{effect:'shared/cleave.detonate.ground',scale:'radius'},{effect:'shared/cleave.detonate',scale:'radius'}]},
 'shockwave.telegraph':{baseRadius:1.65,layers:[{effect:'shared/shockwave.telegraph.ground',scale:'radius'},{effect:'shared/shockwave.telegraph',scale:'radius'}]},
 'shockwave.detonate':{baseRadius:1.65,layers:[{effect:'shared/shockwave.detonate.ground',scale:'radius'},{effect:'shared/shockwave.detonate',scale:'radius'}]},
}});
